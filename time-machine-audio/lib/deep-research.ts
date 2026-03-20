import { GoogleGenAI } from '@google/genai';
import { env } from './env';

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

export async function deepResearch(eventQuery: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-05-20',
      contents: `Conduct deep research on the historical event: "${eventQuery}".
I need: exact dates and times, names of all key participants with their
exact roles, direct quotes from primary sources (speeches, letters,
radio transcripts), the political and cultural context of the era,
what happened immediately before and after, and any lesser-known
but dramatic details that most people don't know about.
Cite all sources.`,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    return response.text ?? '';
  } catch (err) {
    console.error('[deep-research] Failed (supplementary, continuing):', err);
    return '';
  }
}
