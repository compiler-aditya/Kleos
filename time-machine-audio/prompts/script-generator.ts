export const SCRIPT_JSON_SCHEMA = `{
  "type": "object",
  "required": ["title", "subtitle", "era", "duration_estimate_seconds", "characters", "scenes", "music_prompt", "sfx_prompts", "cover_art_prompt", "video_teaser_prompt", "share_tagline"],
  "properties": {
    "title": { "type": "string" },
    "subtitle": { "type": "string" },
    "era": { "type": "string" },
    "duration_estimate_seconds": { "type": "number" },
    "characters": {
      "type": "array",
      "minItems": 2,
      "items": {
        "type": "object",
        "required": ["id", "name", "role", "voice_description", "personality_brief", "visual_description"],
        "properties": {
          "id": { "type": "string" },
          "name": { "type": "string" },
          "role": { "type": "string", "enum": ["narrator", "primary", "secondary", "bystander"] },
          "voice_description": { "type": "string" },
          "personality_brief": { "type": "string" },
          "visual_description": { "type": "string" }
        }
      }
    },
    "scenes": {
      "type": "array",
      "minItems": 3,
      "items": {
        "type": "object",
        "required": ["scene_number", "title", "setting_description", "dialogue", "sfx_cues", "illustration_prompt", "illustration_mood", "timestamp_start_approx"],
        "properties": {
          "scene_number": { "type": "number" },
          "title": { "type": "string" },
          "setting_description": { "type": "string" },
          "dialogue": {
            "type": "array",
            "minItems": 1,
            "items": {
              "type": "object",
              "required": ["character_id", "text"],
              "properties": {
                "character_id": { "type": "string" },
                "text": { "type": "string" }
              }
            }
          },
          "sfx_cues": { "type": "array", "items": { "type": "string" } },
          "illustration_prompt": { "type": "string" },
          "illustration_mood": { "type": "string" },
          "timestamp_start_approx": { "type": "number" }
        }
      }
    },
    "music_prompt": { "type": "string" },
    "sfx_prompts": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "description", "duration_seconds", "placement"],
        "properties": {
          "id": { "type": "string" },
          "description": { "type": "string" },
          "duration_seconds": { "type": "number" },
          "placement": { "type": "string" }
        }
      }
    },
    "cover_art_prompt": { "type": "string" },
    "video_teaser_prompt": { "type": "string" },
    "share_tagline": { "type": "string" }
  }
}`;

export const SCRIPT_GENERATOR_PROMPT = `
You are an award-winning historical documentary scriptwriter, audio dramatist,
and art director. You create cinematic, emotionally gripping audio documentaries
that make listeners feel like they are THERE.

## Event
{event_query}

## Research Data
{research_data}

## Your Task
Write a complete documentary script as a JSON object.

## Script Requirements

### Title & Metadata
- title: A compelling, evocative title (not just the event name)
- subtitle: The date/era
- share_tagline: A single punchy sentence for social sharing
  (e.g., "The 13 minutes that changed humanity forever")

### Characters (3-5)
Each character needs:
- id: unique identifier
- name: real historical name
- role: their role in "narrator", "primary", "secondary", "bystander"
- voice_description: 2-3 sentences for AI voice generation
  (age, accent, tone, pace, personality)
- personality_brief: 3-4 sentences for conversational AI persona
  (how they talk, what they care about, their emotional state)
- visual_description: 2-3 sentences describing their physical appearance
  for AI portrait generation (age, features, clothing, setting,
  photography style matching the era)

### Scenes (6-8)
Each scene needs:
- title: short, evocative ("The Descent", "First Contact")
- setting_description: for narrator to set the scene
- dialogue: array of lines with audio tags embedded
  Use these ElevenLabs v3 tags:
  - Emotions: [nervous], [excited], [solemn], [defiant], [cautiously],
    [emotional], [confident], [exhausted], [whispering], [shouting]
  - Audio events: [radio static], [crowd cheering], [applause],
    [footsteps], [wind]
  - Flow: dashes for interruptions, ellipses for trailing off
  - Example: "[radio static] [tense] Eagle, you are go for descent."
  - Example: "[breathing] [cautiously] Houston... Tranquility Base here."
  - Example: "Wait-" / "[jumping in] Let me finish!"
- sfx_cues: which sound effects play during this scene
- illustration_prompt: 2-3 sentences describing the visual for this scene.
  Style: cinematic, period-accurate, dramatic lighting,
  no text/letters in the image. Describe the physical scene as a
  cinematographer would frame it.
- illustration_mood: "tense" | "triumphant" | "solemn" | "chaotic" |
  "intimate" | "awe"
- timestamp_start_approx: estimated seconds into the documentary

### Music
- music_prompt: 3-4 sentences describing the entire score
  (genre, instruments, tempo, emotional arc)

### Sound Effects (5-8)
Each needs: id, description (10-20 words optimized for AI generation),
duration_seconds, placement (scene reference)

### Visual Prompts
- cover_art_prompt: 2-3 sentences for the documentary's hero image.
  Cinematic, photorealistic painting style. The single most iconic
  moment from this event. NO TEXT.
- video_teaser_prompt: 1-2 sentences for a 5-second cinematic video.
  Slow motion, single dramatic moment, documentary film aesthetic. NO TEXT.

## Output
Return ONLY valid JSON matching the schema. No markdown fences.
No explanation.
{json_schema}
`;
