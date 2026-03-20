import { NextRequest, NextResponse } from 'next/server';
import { createEpisode, saveResearch, updateEpisodeStatus, updateEpisodeProgress } from '@/lib/db';
import { firecrawlResearch, mergeResearch } from '@/lib/firecrawl';
import { deepResearch } from '@/lib/deep-research';
import { env } from '@/lib/env';

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  let episodeId: string | undefined;

  try {
    const body = await req.json();
    const eventQuery: string = body.eventQuery;

    if (!eventQuery || typeof eventQuery !== 'string') {
      return NextResponse.json({ error: 'eventQuery is required' }, { status: 400 });
    }

    // Create episode in DB
    episodeId = await createEpisode(eventQuery);

    await updateEpisodeProgress(episodeId, {
      phase: 'researching',
      message: 'Starting research...',
    });

    // Return episodeId immediately so frontend can start polling
    // Continue research in the background via the response
    const responsePromise = (async () => {
      // Run Firecrawl + Deep Research in parallel
      const [firecrawlData, deepResearchData] = await Promise.all([
        firecrawlResearch(eventQuery).catch((err) => {
          console.error('[generate] Firecrawl failed:', err);
          return { text: '', sources: [] as string[] };
        }),
        deepResearch(eventQuery),
      ]);

      await updateEpisodeProgress(episodeId!, {
        phase: 'researching',
        research_sources: firecrawlData.sources.slice(0, 5),
        message: `Found ${firecrawlData.sources.length} sources`,
      });

      // Merge research from both sources
      const { merged, sources } = mergeResearch(firecrawlData, deepResearchData);

      if (!merged || merged.length < 100) {
        throw new Error('Research returned insufficient data');
      }

      // Save research to DB
      await saveResearch(episodeId!, merged, sources);

      console.log(JSON.stringify({
        event: 'phase_complete',
        episodeId,
        phase: 'research',
        sources_found: sources.length,
        research_length: merged.length,
      }));

      // Fire-and-forget: trigger script generation
      fetch(`${env.NEXT_PUBLIC_APP_URL}/api/generate/script`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-secret': env.INTERNAL_SECRET,
        },
        body: JSON.stringify({ episodeId }),
      }).catch(() => {});
    })();

    // We don't await the full pipeline — return episodeId immediately
    // But we DO need to keep the serverless function alive
    // So we await the research phase (it's within maxDuration)
    await responsePromise;

    return NextResponse.json({ episodeId });
  } catch (err) {
    console.error('[generate] Error:', err);
    if (episodeId) {
      await updateEpisodeStatus(episodeId, 'error', {
        error_phase: 'research',
        error_message: err instanceof Error ? err.message : 'Research failed',
      });
    }
    return NextResponse.json(
      { error: 'Generation failed', episodeId },
      { status: 500 }
    );
  }
}
