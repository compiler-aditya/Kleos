import type { Scene } from '@/lib/types';

export function buildSceneIllustrationPrompt(
  scene: Scene,
  era: string,
  eventTitle: string
): string {
  return `Historical scene illustration for an audio documentary.

Event: ${eventTitle}
Era: ${era}
Scene: "${scene.title}"
Mood: ${scene.illustration_mood}

Visual direction: ${scene.illustration_prompt}

Style requirements:
- Cinematic wide-angle composition
- Period-accurate details (clothing, technology, architecture)
- Dramatic lighting appropriate to the mood
- Slightly desaturated color palette like a prestige documentary
- Photorealistic with painterly quality
- NO text, letters, numbers, or watermarks in the image
- NO modern elements that would break period accuracy`;
}
