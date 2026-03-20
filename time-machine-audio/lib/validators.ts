import { z } from 'zod';

export const DocumentaryScriptSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string(),
  era: z.string(),
  duration_estimate_seconds: z.number(),
  characters: z.array(z.object({
    id: z.string(),
    name: z.string(),
    role: z.enum(['narrator', 'primary', 'secondary', 'bystander']),
    voice_description: z.string().min(10),
    personality_brief: z.string(),
    visual_description: z.string().min(10),
  })).min(2),
  scenes: z.array(z.object({
    scene_number: z.number(),
    title: z.string(),
    setting_description: z.string(),
    dialogue: z.array(z.object({
      character_id: z.string(),
      text: z.string(),
    })).min(1),
    sfx_cues: z.array(z.string()),
    illustration_prompt: z.string().min(10),
    illustration_mood: z.string(),
    timestamp_start_approx: z.coerce.number(),
  })).min(3),
  music_prompt: z.string().min(10),
  sfx_prompts: z.array(z.object({
    id: z.string(),
    description: z.string(),
    duration_seconds: z.number(),
    placement: z.string(),
  })),
  cover_art_prompt: z.string().min(10),
  video_teaser_prompt: z.string(),
  share_tagline: z.string(),
});
