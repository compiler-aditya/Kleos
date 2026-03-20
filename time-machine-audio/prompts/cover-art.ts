export function buildCoverArtPrompt(prompt: string): string {
  return `Create a cinematic, photorealistic painting for a historical audio documentary. Style: dramatic lighting, wide cinematic aspect ratio feel, muted period-appropriate color palette, slightly desaturated like a prestige documentary poster. NO TEXT OR LETTERS IN THE IMAGE.

Scene: ${prompt}`;
}
