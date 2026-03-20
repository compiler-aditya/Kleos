import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';
import {
  getEpisode,
  saveAudioAssets,
  saveVisualAssets,
  updateEpisodeStatus,
  updateEpisodeProgress,
} from '@/lib/db';
import { uploadFromBuffer } from '@/lib/storage';
import { designCharacterVoices, generateDialogueAudio, generateSFX, generateMusic } from '@/lib/elevenlabs';
import { generateCoverArt, generateSceneIllustrations, generateCharacterPortraits } from '@/lib/imagen';
import { mixAudio } from '@/lib/ffmpeg';

export const maxDuration = 300;

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

    if (!episode.script || !episode.characters) {
      return NextResponse.json({ error: 'Episode has no script' }, { status: 400 });
    }

    const { script, characters, era } = episode;

    await updateEpisodeProgress(episodeId, {
      phase: 'generating_media',
      message: 'Generating voices and visuals...',
    });

    // ── Phase 3+4: Audio + Visual in Parallel ──────────────────

    const [audioResult, visualResult] = await Promise.allSettled([
      // AUDIO pipeline
      (async () => {
        // Step A: Design voices for all characters
        const voiceIds = await designCharacterVoices(characters);
        console.log(`[media] Designed ${Object.keys(voiceIds).length} voices`);

        await updateEpisodeProgress(episodeId, {
          characters_voiced: Object.keys(voiceIds),
        });

        // Step B: Dialogue + SFX + Music in parallel
        const durationMs = (script.duration_estimate_seconds ?? 300) * 1000;

        const [dialogueResult, sfxBuffers, musicBuffer] = await Promise.all([
          generateDialogueAudio(script, voiceIds),
          generateSFX(script.sfx_prompts ?? []).catch((err) => {
            console.error('[media] SFX generation failed:', err);
            return {} as Record<string, Buffer>;
          }),
          generateMusic(script.music_prompt, durationMs).catch((err) => {
            console.error('[media] Music generation failed:', err);
            return null as Buffer | null;
          }),
        ]);

        const { audioBuffer: dialogueBuffer, alignmentData } = dialogueResult;

        // Step C: Mix audio
        const mixedBuffer = await mixAudio({ dialogueBuffer, musicBuffer, sfxBuffers });

        // Step D: Upload audio assets
        const [audioUrl, musicUrl] = await Promise.all([
          uploadFromBuffer(mixedBuffer, `episodes/${episodeId}/audio.mp3`, 'audio/mpeg'),
          musicBuffer
            ? uploadFromBuffer(musicBuffer, `episodes/${episodeId}/music.mp3`, 'audio/mpeg')
            : Promise.resolve(null as string | null),
        ]);

        // Upload SFX buffers
        const sfxUrls: Record<string, string> = {};
        await Promise.all(
          Object.entries(sfxBuffers).map(async ([sfxId, buf]) => {
            sfxUrls[sfxId] = await uploadFromBuffer(
              buf,
              `episodes/${episodeId}/sfx/${sfxId}.mp3`,
              'audio/mpeg'
            );
          })
        );

        return { audioUrl, musicUrl, sfxUrls, alignmentData, voiceIds };
      })(),

      // VISUAL pipeline
      (async () => {
        const episodeEra = era ?? script.era ?? '';

        const [coverArtUrl, sceneIllustrations, characterPortraits] = await Promise.all([
          generateCoverArt(script.cover_art_prompt, episodeId),
          generateSceneIllustrations(script.scenes, episodeEra, script.title, episodeId).catch(
            (err) => {
              console.error('[media] Scene illustrations failed:', err);
              return [];
            }
          ),
          generateCharacterPortraits(characters, episodeEra, episodeId).catch((err) => {
            console.error('[media] Character portraits failed:', err);
            return {} as Record<string, string>;
          }),
        ]);

        await updateEpisodeProgress(episodeId, {
          illustrations_completed: sceneIllustrations.map((s) => s.scene_number),
          illustrations_total: script.scenes.length,
        });

        return { coverArtUrl, sceneIllustrations, characterPortraits };
      })(),
    ]);

    // ── Extract results with fallbacks ─────────────────────────

    const audio =
      audioResult.status === 'fulfilled'
        ? audioResult.value
        : (() => {
            console.error('[media] Audio pipeline failed:', (audioResult as PromiseRejectedResult).reason);
            return null;
          })();

    const visual =
      visualResult.status === 'fulfilled'
        ? visualResult.value
        : (() => {
            console.error('[media] Visual pipeline failed:', (visualResult as PromiseRejectedResult).reason);
            return null;
          })();

    if (!audio) {
      throw new Error('Audio generation failed — cannot continue without audio');
    }

    // ── Save to DB ─────────────────────────────────────────────

    await saveAudioAssets(
      episodeId,
      audio.audioUrl,
      audio.musicUrl,
      Object.keys(audio.sfxUrls).length > 0 ? audio.sfxUrls : null,
      audio.alignmentData,
      audio.voiceIds
    );

    await saveVisualAssets(
      episodeId,
      visual?.coverArtUrl ?? null,
      visual?.sceneIllustrations && visual.sceneIllustrations.length > 0
        ? visual.sceneIllustrations
        : null,
      visual?.characterPortraits && Object.keys(visual.characterPortraits).length > 0
        ? visual.characterPortraits
        : null,
      null // video_teaser_url — skipped (Veo 3 requires GCS)
    );

    await updateEpisodeProgress(episodeId, {
      phase: 'setting_up_agents',
      message: 'Setting up agents...',
      audio_components: {
        dialogue: true,
        sfx: Object.keys(audio.sfxUrls).length > 0,
        music: audio.musicUrl !== null,
      },
    });

    await updateEpisodeStatus(episodeId, 'setting_up_agents');

    console.log(
      JSON.stringify({
        event: 'phase_complete',
        episodeId,
        phase: 'media',
        hasAudio: true,
        hasCoverArt: !!visual?.coverArtUrl,
        sceneCount: visual?.sceneIllustrations?.length ?? 0,
        portraitCount: Object.keys(visual?.characterPortraits ?? {}).length,
      })
    );

    // Fire-and-forget: trigger agent setup
    fetch(`${env.NEXT_PUBLIC_APP_URL}/api/generate/agents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': env.INTERNAL_SECRET,
      },
      body: JSON.stringify({ episodeId }),
    }).catch(() => {});

    return NextResponse.json({ ok: true, episodeId });
  } catch (err) {
    console.error('[media] Error:', err);
    await updateEpisodeStatus(episodeId, 'error', {
      error_phase: 'media',
      error_message: err instanceof Error ? err.message : 'Media generation failed',
    });
    return NextResponse.json(
      { error: 'Media generation failed', episodeId },
      { status: 500 }
    );
  }
}
