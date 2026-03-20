import { NextRequest, NextResponse } from 'next/server';
import { getEpisode } from '@/lib/db';

export const maxDuration = 120;

// TODO: Integrate ElevenLabs Dubbing API
// https://elevenlabs.io/docs/api-reference/dubbing
// client.dubbing.dubAVideoOrAnAudioFile({ ... })

export async function POST(req: NextRequest) {
  try {
    const { episodeId, languageCode } = await req.json();

    if (!episodeId || !languageCode) {
      return NextResponse.json(
        { error: 'episodeId and languageCode are required' },
        { status: 400 }
      );
    }

    const episode = await getEpisode(episodeId);
    if (!episode) {
      return NextResponse.json({ error: 'Episode not found' }, { status: 404 });
    }

    return NextResponse.json(
      {
        status: 'coming_soon',
        message: `Dubbing to ${languageCode} is not yet implemented. This feature will use ElevenLabs Dubbing API to translate the documentary audio.`,
        episodeId,
        languageCode,
      },
      { status: 501 }
    );
  } catch (err) {
    console.error('[dub] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Dubbing failed' },
      { status: 500 }
    );
  }
}
