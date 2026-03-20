import type { Character } from '@/lib/types';

export function buildCharacterPortraitPrompt(
  character: Character,
  era: string
): string {
  return `Historical figure portrait for a documentary.

Person: ${character.name} (${character.role})
Era: ${era}

Visual: ${character.visual_description}

Style:
- Dramatic portrait lighting
- Head and shoulders framing
- Period-appropriate clothing and grooming
- Photorealistic with documentary photography aesthetic
- Slightly desaturated, cinematic color grading
- Eye contact with camera (engaging the viewer)
- NO text, letters, or watermarks`;
}
