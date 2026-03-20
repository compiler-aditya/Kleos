import { NextRequest, NextResponse } from 'next/server';
import { getEpisode, saveUserVoice } from '@/lib/db';
import { instantVoiceClone, generateYouWereThereAudio } from '@/lib/elevenlabs';
import { generateYouWereThereStatement } from '@/lib/gemini';
import { generateUserPortrait } from '@/lib/imagen';
import { uploadFromBuffer } from '@/lib/storage';

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioBlob = formData.get('audio') as Blob | null;
    const episodeId = formData.get('episodeId') as string | null;

    if (!audioBlob || !episodeId) {
      return NextResponse.json({ error: 'audio and episodeId are required' }, { status: 400 });
    }

    const episode = await getEpisode(episodeId);
    if (!episode) {
      return NextResponse.json({ error: 'Episode not found' }, { status: 404 });
    }

    const audioBuffer = Buffer.from(await audioBlob.arrayBuffer());
    const era = episode.era ?? 'the historical period';
    const eventQuery = episode.event_query;
    const scriptTitle = episode.script?.title ?? episode.title ?? eventQuery;

    // Round 1: IVC + statement generation in parallel
    const [voiceId, statement] = await Promise.all([
      instantVoiceClone(audioBuffer, 'Your Voice'),
      generateYouWereThereStatement(eventQuery, era, scriptTitle),
    ]);

    // Round 2: TTS with cloned voice + user portrait in parallel
    const [youWereThereBuffer, portraitUrl] = await Promise.all([
      generateYouWereThereAudio(statement, voiceId),
      generateUserPortrait(era, scriptTitle, episodeId),
    ]);

    const audioUrl = await uploadFromBuffer(
      youWereThereBuffer,
      `episodes/${episodeId}/you-were-there.mp3`,
      'audio/mpeg'
    );

    await saveUserVoice(episodeId, voiceId, portraitUrl, audioUrl);

    return NextResponse.json({ portraitUrl, audioUrl, statement });
  } catch (err) {
    console.error('[voice-clone] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Voice clone failed' },
      { status: 500 }
    );
  }
}
