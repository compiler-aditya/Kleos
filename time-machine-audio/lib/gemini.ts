import { GoogleGenAI } from '@google/genai';
import { env } from './env';
import { withRetry } from './retry';
import { DocumentaryScriptSchema } from './validators';
import { SCRIPT_GENERATOR_PROMPT, SCRIPT_JSON_SCHEMA } from '@/prompts/script-generator';
import type { DocumentaryScript } from './types';

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

const MODEL = 'gemini-3-flash-preview';

async function callGemini(prompt: string): Promise<unknown> {
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error('Gemini returned empty response');
  }
  return JSON.parse(text);
}

export async function generateScript(
  eventQuery: string,
  researchData: string
): Promise<DocumentaryScript> {
  const prompt = SCRIPT_GENERATOR_PROMPT
    .replace('{event_query}', eventQuery)
    .replace('{research_data}', researchData)
    .replace('{json_schema}', SCRIPT_JSON_SCHEMA);

  // First attempt — network + JSON parse retries
  const parsed = await withRetry(
    () => callGemini(prompt),
    { maxRetries: 2, label: 'gemini-script' }
  );

  const result = DocumentaryScriptSchema.safeParse(parsed);
  if (result.success) {
    return result.data as DocumentaryScript;
  }

  // Zod failed — retry ONCE with validation errors appended
  console.log('[gemini] Zod validation failed, retrying with error context');
  const zodErrors = result.error.issues
    .map((i) => `- ${i.path.join('.')}: ${i.message}`)
    .join('\n');

  const retryPrompt = `${prompt}

## IMPORTANT: Your previous response had validation errors. Fix them:
${zodErrors}

Return corrected JSON only.`;

  const retryParsed = await withRetry(
    () => callGemini(retryPrompt),
    { maxRetries: 1, label: 'gemini-script-retry' }
  );

  const retryResult = DocumentaryScriptSchema.safeParse(retryParsed);
  if (retryResult.success) {
    return retryResult.data as DocumentaryScript;
  }

  throw new Error(
    `Script validation failed after retry: ${retryResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`
  );
}
