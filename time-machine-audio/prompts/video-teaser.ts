export function buildVideoTeaserPrompt(prompt: string): string {
  return `5-second cinematic video for a historical documentary teaser. Slow motion, dramatic lighting, documentary film aesthetic. NO TEXT OR LETTERS.

Scene: ${prompt}`;
}
