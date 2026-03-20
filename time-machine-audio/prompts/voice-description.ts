import type { Character } from '@/lib/types';

export function buildVoiceDesignPrompt(character: Character): string {
  return `${character.voice_description} This voice is for "${character.name}", a ${character.role} in a historical audio documentary.`;
}
