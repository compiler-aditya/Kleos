import { GoogleGenAI } from '@google/genai';
import pLimit from 'p-limit';
import { env } from './env';
import { withRetry } from './retry';
import { uploadFromBase64 } from './storage';
import { buildCoverArtPrompt } from '@/prompts/cover-art';
import { buildSceneIllustrationPrompt } from '@/prompts/scene-illustration';
import { buildCharacterPortraitPrompt } from '@/prompts/character-portrait';
import type { Scene, Character, SceneIllustration } from './types';

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

// ── Cover Art ───────────────────────────────────────────────────

export async function generateCoverArt(
  prompt: string,
  episodeId: string
): Promise<string | null> {
  return withRetry(
    async () => {
      const response = await ai.models.generateImages({
        model: 'imagen-4.0-ultra-generate-001',
        prompt: buildCoverArtPrompt(prompt),
        config: { numberOfImages: 1, aspectRatio: '16:9' },
      });

      const imageBytes = response.generatedImages?.[0]?.image?.imageBytes;
      if (!imageBytes) throw new Error('No image bytes returned for cover art');

      const url = await uploadFromBase64(
        imageBytes,
        `episodes/${episodeId}/cover-art.jpg`,
        'image/jpeg'
      );
      console.log(`[imagen] Cover art uploaded: ${url}`);
      return url;
    },
    { maxRetries: 2, label: 'cover-art' }
  ).catch((err) => {
    console.error('[imagen] Cover art failed:', err);
    return null;
  });
}

// ── Scene Illustrations ─────────────────────────────────────────

export async function generateSceneIllustrations(
  scenes: Scene[],
  era: string,
  title: string,
  episodeId: string
): Promise<SceneIllustration[]> {
  const limit = pLimit(3);
  const results: SceneIllustration[] = [];

  await Promise.all(
    scenes.map((scene) =>
      limit(() =>
        withRetry(
          async () => {
            const prompt = buildSceneIllustrationPrompt(scene, era, title);
            const response = await ai.models.generateImages({
              model: 'imagen-4.0-fast-generate-001',
              prompt,
              config: { numberOfImages: 1, aspectRatio: '16:9' },
            });

            const imageBytes = response.generatedImages?.[0]?.image?.imageBytes;
            if (!imageBytes) throw new Error(`No image bytes for scene ${scene.scene_number}`);

            const url = await uploadFromBase64(
              imageBytes,
              `episodes/${episodeId}/scenes/scene-${scene.scene_number}.jpg`,
              'image/jpeg'
            );

            results.push({ scene_number: scene.scene_number, url, prompt });
            console.log(`[imagen] Scene ${scene.scene_number} uploaded`);
          },
          { maxRetries: 2, label: `scene-${scene.scene_number}` }
        ).catch((err) => {
          console.error(`[imagen] Scene ${scene.scene_number} failed:`, err);
        })
      )
    )
  );

  return results;
}

// ── Character Portraits ─────────────────────────────────────────

export async function generateCharacterPortraits(
  characters: Character[],
  era: string,
  episodeId: string
): Promise<Record<string, string>> {
  const nonNarrators = characters.filter((c) => c.role !== 'narrator');
  if (nonNarrators.length === 0) return {};

  const limit = pLimit(3);
  const portraits: Record<string, string> = {};

  await Promise.all(
    nonNarrators.map((character) =>
      limit(() =>
        withRetry(
          async () => {
            const prompt = buildCharacterPortraitPrompt(character, era);
            const response = await ai.models.generateImages({
              model: 'imagen-4.0-generate-001',
              prompt,
              config: { numberOfImages: 1, aspectRatio: '3:4' },
            });

            const imageBytes = response.generatedImages?.[0]?.image?.imageBytes;
            if (!imageBytes) throw new Error(`No image bytes for ${character.id}`);

            const url = await uploadFromBase64(
              imageBytes,
              `episodes/${episodeId}/portraits/${character.id}.jpg`,
              'image/jpeg'
            );

            portraits[character.id] = url;
            console.log(`[imagen] Portrait for ${character.name} uploaded`);
          },
          { maxRetries: 2, label: `portrait-${character.id}` }
        ).catch((err) => {
          console.error(`[imagen] Portrait ${character.id} failed:`, err);
        })
      )
    )
  );

  return portraits;
}
