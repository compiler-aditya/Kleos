import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import pLimit from 'p-limit';
import { env } from './env';
import { withRetry } from './retry';
import type { Character, SFXPrompt, DocumentaryScript, AlignmentData, AlignmentWord } from './types';

const client = new ElevenLabsClient({ apiKey: env.ELEVENLABS_API_KEY });

async function streamToBuffer(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  const reader = stream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  return Buffer.concat(chunks.map((c) => Buffer.from(c)));
}

// ── Voice Design ────────────────────────────────────────────────

export async function designCharacterVoices(
  characters: Character[]
): Promise<Record<string, string>> {
  const voiceIds: Record<string, string> = {};

  await Promise.all(
    characters.map((character) =>
      withRetry(
        async () => {
          const previewResponse = await client.textToVoice.createPreviews({
            voiceDescription: character.voice_description,
            autoGenerateText: true,
          });

          const generatedVoiceId = previewResponse.previews[0]?.generatedVoiceId;
          if (!generatedVoiceId) {
            throw new Error(`No preview generated for character ${character.id}`);
          }

          const voice = await client.textToVoice.create({
            voiceName: character.name,
            voiceDescription: character.voice_description,
            generatedVoiceId,
          });

          voiceIds[character.id] = voice.voiceId;
          console.log(`[elevenlabs] Designed voice for ${character.name}: ${voice.voiceId}`);
        },
        { maxRetries: 2, label: `voice-design-${character.id}` }
      )
    )
  );

  return voiceIds;
}

// ── Dialogue Audio ──────────────────────────────────────────────

export async function generateDialogueAudio(
  script: DocumentaryScript,
  voiceIds: Record<string, string>
): Promise<{ audioBuffer: Buffer; alignmentData: AlignmentData }> {
  // Flatten all dialogue lines with their scene/character metadata
  const lineIndex: { character_id: string; scene_number: number; text: string }[] = [];

  for (const scene of script.scenes) {
    for (const line of scene.dialogue) {
      const voiceId = voiceIds[line.character_id];
      if (voiceId) {
        lineIndex.push({
          character_id: line.character_id,
          scene_number: scene.scene_number,
          text: line.text,
        });
      }
    }
  }

  if (lineIndex.length === 0) {
    throw new Error('No dialogue lines with assigned voices found');
  }

  const inputs = lineIndex.map((line) => ({
    text: line.text,
    voiceId: voiceIds[line.character_id],
  }));

  const response = await withRetry(
    () => client.textToDialogue.convertWithTimestamps({ inputs }),
    { maxRetries: 2, label: 'dialogue-audio' }
  );

  const audioBuffer = Buffer.from(response.audioBase64, 'base64');

  // Build alignment data from voiceSegments
  const words: AlignmentWord[] = [];
  const sceneTimings: Record<number, { start: number; end: number }> = {};

  for (let i = 0; i < response.voiceSegments.length; i++) {
    const segment = response.voiceSegments[i];
    const lineInfo = lineIndex[i];
    if (!lineInfo) continue;

    const segStart = segment.startTimeSeconds;
    const segEnd = segment.endTimeSeconds;
    const segDuration = segEnd - segStart;

    // Update scene timing
    const sceneNum = lineInfo.scene_number;
    if (!sceneTimings[sceneNum]) {
      sceneTimings[sceneNum] = { start: segStart, end: segEnd };
    } else {
      sceneTimings[sceneNum].start = Math.min(sceneTimings[sceneNum].start, segStart);
      sceneTimings[sceneNum].end = Math.max(sceneTimings[sceneNum].end, segEnd);
    }

    // Build approximate word-level timing from text
    const wordList = lineInfo.text.split(/\s+/).filter(Boolean);
    if (wordList.length === 0) continue;

    const wordDuration = segDuration / wordList.length;
    for (let w = 0; w < wordList.length; w++) {
      words.push({
        word: wordList[w],
        start: segStart + w * wordDuration,
        end: segStart + (w + 1) * wordDuration,
        character_id: lineInfo.character_id,
        scene_number: lineInfo.scene_number,
      });
    }
  }

  const scenes = Object.entries(sceneTimings).map(([num, timing]) => ({
    scene_number: Number(num),
    start: timing.start,
    end: timing.end,
  }));

  return { audioBuffer, alignmentData: { words, scenes } };
}

// ── Sound Effects ───────────────────────────────────────────────

export async function generateSFX(
  sfxPrompts: SFXPrompt[]
): Promise<Record<string, Buffer>> {
  if (sfxPrompts.length === 0) return {};

  const limit = pLimit(3);
  const results: Record<string, Buffer> = {};

  await Promise.all(
    sfxPrompts.map((prompt) =>
      limit(() =>
        withRetry(
          async () => {
            const stream = await client.textToSoundEffects.convert({
              text: prompt.description,
              durationSeconds: Math.min(prompt.duration_seconds, 5),
            });
            results[prompt.id] = await streamToBuffer(stream);
            console.log(`[elevenlabs] Generated SFX: ${prompt.id}`);
          },
          { maxRetries: 2, label: `sfx-${prompt.id}` }
        )
      )
    )
  );

  return results;
}

// ── Music ───────────────────────────────────────────────────────

export async function generateMusic(
  musicPrompt: string,
  durationMs: number
): Promise<Buffer> {
  const clampedMs = Math.max(3000, Math.min(durationMs, 600000));

  const stream = await withRetry(
    () =>
      client.music.compose({
        prompt: musicPrompt,
        musicLengthMs: clampedMs,
        modelId: 'music_v1',
      }),
    { maxRetries: 2, label: 'music-compose' }
  );

  return streamToBuffer(stream);
}
