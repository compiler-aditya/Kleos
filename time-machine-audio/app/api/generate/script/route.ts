import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';
import {
  getEpisode,
  saveScript,
  updateEpisodeStatus,
  updateEpisodeProgress,
} from '@/lib/db';
import { generateScript } from '@/lib/gemini';

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-internal-secret');
  if (secret !== env.INTERNAL_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { episodeId } = await req.json();

  try {
    const episode = await getEpisode(episodeId);
    if (!episode) {
      return NextResponse.json({ error: 'Episode not found' }, { status: 404 });
    }

    if (!episode.research_data) {
      return NextResponse.json(
        { error: 'Episode has no research data' },
        { status: 400 }
      );
    }

    await updateEpisodeProgress(episodeId, {
      phase: 'scripting',
      message: 'Generating documentary script...',
    });

    const script = await generateScript(
      episode.event_query,
      episode.research_data
    );

    await saveScript(episodeId, script, script.characters);

    await updateEpisodeProgress(episodeId, {
      phase: 'generating_media',
      message: `Script ready: "${script.title}" — ${script.characters.length} characters, ${script.scenes.length} scenes`,
    });

    console.log(
      JSON.stringify({
        event: 'phase_complete',
        episodeId,
        phase: 'script',
        title: script.title,
        characters: script.characters.length,
        scenes: script.scenes.length,
      })
    );

    // Fire-and-forget: trigger media generation
    fetch(`${env.NEXT_PUBLIC_APP_URL}/api/generate/media`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': env.INTERNAL_SECRET,
      },
      body: JSON.stringify({ episodeId }),
    }).catch(() => {});

    return NextResponse.json({ ok: true, episodeId, title: script.title });
  } catch (err) {
    console.error('[script] Error:', err);
    await updateEpisodeStatus(episodeId, 'error', {
      error_phase: 'script',
      error_message: err instanceof Error ? err.message : 'Script generation failed',
    });
    return NextResponse.json(
      { error: 'Script generation failed', episodeId },
      { status: 500 }
    );
  }
}
