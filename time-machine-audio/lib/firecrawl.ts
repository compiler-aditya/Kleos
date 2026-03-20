import FirecrawlApp from '@mendable/firecrawl-js';
import { env } from './env';
import { withRetry } from './retry';

const fc = new FirecrawlApp({ apiKey: env.FIRECRAWL_API_KEY });

export async function firecrawlResearch(eventQuery: string): Promise<{
  text: string;
  sources: string[];
}> {
  const result = await withRetry(
    () =>
      fc.agent({
        prompt: `Research "${eventQuery}". Find: minute-by-minute timeline,
        eyewitness quotes, primary source documents, names and roles of
        key people, sensory details (what it looked, sounded, smelled like),
        political context, and immediate aftermath.
        Focus on dramatic, vivid details for an audio documentary.`,
        model: 'spark-1-mini',
        maxCredits: 200,
        timeout: 90,
      }),
    { label: 'firecrawl-agent', maxRetries: 1 }
  );

  if (!result.success || result.status === 'failed') {
    throw new Error(`Firecrawl agent failed: ${result.error ?? 'unknown error'}`);
  }

  // Extract text and source URLs from agent result
  const data = result.data as { markdown?: string; sources?: string[] } | undefined;
  const text = typeof data === 'string'
    ? data
    : data?.markdown ?? JSON.stringify(data ?? '');
  const sources = Array.isArray(data?.sources) ? data.sources : [];

  return { text, sources };
}

export function mergeResearch(
  firecrawlData: { text: string; sources: string[] },
  deepResearchData: string
): { merged: string; sources: string[] } {
  const merged = [
    '=== FIRECRAWL RESEARCH ===',
    firecrawlData.text,
    '',
    '=== DEEP RESEARCH ===',
    deepResearchData || '(Deep Research unavailable)',
  ].join('\n');

  return { merged, sources: firecrawlData.sources };
}
