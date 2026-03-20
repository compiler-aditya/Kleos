// ── Core Script Types ──────────────────────────────────────────

export interface DocumentaryScript {
  title: string;
  subtitle: string;
  era: string;
  duration_estimate_seconds: number;
  characters: Character[];
  scenes: Scene[];
  music_prompt: string;
  sfx_prompts: SFXPrompt[];
  cover_art_prompt: string;
  video_teaser_prompt: string;
  share_tagline: string;
}

export interface Character {
  id: string;
  name: string;
  role: 'narrator' | 'primary' | 'secondary' | 'bystander';
  voice_description: string;
  personality_brief: string;
  visual_description: string;
}

export interface Scene {
  scene_number: number;
  title: string;
  setting_description: string;
  dialogue: DialogueLine[];
  sfx_cues: string[];
  illustration_prompt: string;
  illustration_mood: string;
  timestamp_start_approx: number;
}

export interface DialogueLine {
  character_id: string;
  text: string;
}

export interface SFXPrompt {
  id: string;
  description: string;
  duration_seconds: number;
  placement: string;
}

// ── Episode Types ──────────────────────────────────────────────

export type EpisodeStatus =
  | 'researching'
  | 'scripting'
  | 'generating_media'
  | 'setting_up_agents'
  | 'ready'
  | 'error';

export interface GenerationProgress {
  phase: EpisodeStatus;
  research_sources?: string[];
  characters_voiced?: string[];
  illustrations_completed?: number[];
  illustrations_total?: number;
  audio_components?: {
    dialogue: boolean;
    sfx: boolean;
    music: boolean;
  };
  message?: string;
}

export interface SceneIllustration {
  scene_number: number;
  url: string;
  prompt: string;
}

export interface Episode {
  id: string;
  event_query: string;
  title: string | null;
  subtitle: string | null;
  era: string | null;
  share_tagline: string | null;

  script: DocumentaryScript | null;

  audio_url: string | null;
  music_url: string | null;
  sfx_urls: Record<string, string> | null;
  alignment_data: AlignmentData | null;

  cover_art_url: string | null;
  scene_illustrations: SceneIllustration[] | null;
  character_portraits: Record<string, string> | null;
  video_teaser_url: string | null;

  characters: Character[] | null;
  voice_ids: Record<string, string> | null;
  agent_ids: Record<string, string> | null;
  concierge_agent_id: string | null;
  knowledge_base_id: string | null;

  research_data: string | null;
  source_urls: string[] | null;

  user_voice_id: string | null;
  user_character_role: string | null;

  status: EpisodeStatus;
  progress: GenerationProgress;
  error_phase: string | null;
  error_message: string | null;
  error_details: Record<string, unknown> | null;

  view_count: number;
  share_count: number;
  created_at: string;
  updated_at: string;
}

// ── Alignment Types ────────────────────────────────────────────

export interface AlignmentWord {
  word: string;
  start: number;
  end: number;
  character_id?: string;
  scene_number?: number;
}

export interface AlignmentData {
  words: AlignmentWord[];
  scenes: {
    scene_number: number;
    start: number;
    end: number;
  }[];
}

// ── Conversation Types ─────────────────────────────────────────

export interface Conversation {
  id: string;
  episode_id: string;
  agent_id: string;
  character_name: string | null;
  elevenlabs_conversation_id: string | null;
  transcript: Record<string, unknown> | null;
  analysis: Record<string, unknown> | null;
  duration_seconds: number | null;
  created_at: string;
}
