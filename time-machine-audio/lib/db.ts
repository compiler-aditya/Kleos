import { neon } from '@neondatabase/serverless';
import pg from 'pg';
import { env } from './env';
import type {
  Episode,
  EpisodeStatus,
  GenerationProgress,
  DocumentaryScript,
  Character,
  SceneIllustration,
  AlignmentData,
} from './types';

// Use Neon HTTP driver in production (Vercel), pg Pool locally
const isNeon = env.DATABASE_URL.includes('neon.tech');

type QueryResult = Record<string, unknown>[];

async function query(text: string, params: unknown[] = []): Promise<QueryResult> {
  if (isNeon) {
    // neon() with arrayMode false and fullResults false returns rows directly
    const sql = neon(env.DATABASE_URL, { arrayMode: false, fullResults: false });
    // Tagged template won't work with dynamic SQL, so use the raw query form
    // neon() returns a function that accepts (string, params) when called as function
    const rows = await (sql as unknown as (text: string, params: unknown[]) => Promise<QueryResult>)(text, params);
    return rows;
  }
  const pool = new pg.Pool({ connectionString: env.DATABASE_URL });
  try {
    const result = await pool.query(text, params);
    return result.rows;
  } finally {
    await pool.end();
  }
}

// ── Create ─────────────────────────────────────────────────────

export async function createEpisode(eventQuery: string): Promise<string> {
  const rows = await query(
    'INSERT INTO episodes (event_query) VALUES ($1) RETURNING id',
    [eventQuery]
  );
  return rows[0].id as string;
}

// ── Read ───────────────────────────────────────────────────────

export async function getEpisode(id: string): Promise<Episode | null> {
  const rows = await query('SELECT * FROM episodes WHERE id = $1', [id]);
  if (rows.length === 0) return null;
  return rows[0] as unknown as Episode;
}

// ── Phase-specific updates ─────────────────────────────────────

export async function saveResearch(
  id: string,
  researchData: string,
  sourceUrls: string[]
): Promise<void> {
  await query(
    `UPDATE episodes SET
      research_data = $2,
      source_urls = $3::jsonb,
      status = 'scripting',
      updated_at = NOW()
    WHERE id = $1`,
    [id, researchData, JSON.stringify(sourceUrls)]
  );
}

export async function saveScript(
  id: string,
  script: DocumentaryScript,
  characters: Character[]
): Promise<void> {
  await query(
    `UPDATE episodes SET
      script = $2::jsonb,
      title = $3,
      subtitle = $4,
      era = $5,
      share_tagline = $6,
      characters = $7::jsonb,
      status = 'generating_media',
      updated_at = NOW()
    WHERE id = $1`,
    [
      id,
      JSON.stringify(script),
      script.title,
      script.subtitle,
      script.era,
      script.share_tagline,
      JSON.stringify(characters),
    ]
  );
}

export async function saveAudioAssets(
  id: string,
  audioUrl: string,
  musicUrl: string | null,
  sfxUrls: Record<string, string> | null,
  alignmentData: AlignmentData | null,
  voiceIds: Record<string, string>
): Promise<void> {
  await query(
    `UPDATE episodes SET
      audio_url = $2,
      music_url = $3,
      sfx_urls = $4::jsonb,
      alignment_data = $5::jsonb,
      voice_ids = $6::jsonb,
      updated_at = NOW()
    WHERE id = $1`,
    [
      id,
      audioUrl,
      musicUrl,
      sfxUrls ? JSON.stringify(sfxUrls) : null,
      alignmentData ? JSON.stringify(alignmentData) : null,
      JSON.stringify(voiceIds),
    ]
  );
}

export async function saveVisualAssets(
  id: string,
  coverArtUrl: string | null,
  sceneIllustrations: SceneIllustration[] | null,
  characterPortraits: Record<string, string> | null,
  videoTeaserUrl: string | null
): Promise<void> {
  await query(
    `UPDATE episodes SET
      cover_art_url = $2,
      scene_illustrations = $3::jsonb,
      character_portraits = $4::jsonb,
      video_teaser_url = $5,
      updated_at = NOW()
    WHERE id = $1`,
    [
      id,
      coverArtUrl,
      sceneIllustrations ? JSON.stringify(sceneIllustrations) : null,
      characterPortraits ? JSON.stringify(characterPortraits) : null,
      videoTeaserUrl,
    ]
  );
}

export async function saveAgentIds(
  id: string,
  agentIds: Record<string, string>,
  knowledgeBaseId: string,
  conciergeAgentId: string | null
): Promise<void> {
  await query(
    `UPDATE episodes SET
      agent_ids = $2::jsonb,
      knowledge_base_id = $3,
      concierge_agent_id = $4,
      status = 'ready',
      updated_at = NOW()
    WHERE id = $1`,
    [id, JSON.stringify(agentIds), knowledgeBaseId, conciergeAgentId]
  );
}

// ── Status & Progress ──────────────────────────────────────────

export async function updateEpisodeStatus(
  id: string,
  status: EpisodeStatus,
  errorInfo?: { error_phase: string; error_message: string; error_details?: Record<string, unknown> }
): Promise<void> {
  if (errorInfo) {
    await query(
      `UPDATE episodes SET
        status = $2,
        error_phase = $3,
        error_message = $4,
        error_details = $5::jsonb,
        updated_at = NOW()
      WHERE id = $1`,
      [
        id,
        status,
        errorInfo.error_phase,
        errorInfo.error_message,
        errorInfo.error_details ? JSON.stringify(errorInfo.error_details) : null,
      ]
    );
  } else {
    await query(
      'UPDATE episodes SET status = $2, updated_at = NOW() WHERE id = $1',
      [id, status]
    );
  }
}

export async function updateEpisodeProgress(
  id: string,
  progress: Partial<GenerationProgress>
): Promise<void> {
  await query(
    `UPDATE episodes
     SET progress = COALESCE(progress, '{}'::jsonb) || $2::jsonb,
         updated_at = NOW()
     WHERE id = $1`,
    [id, JSON.stringify(progress)]
  );
}

// ── Voice Clone ────────────────────────────────────────────────

export async function saveUserVoice(
  id: string,
  voiceId: string,
  portraitUrl: string | null,
  audioUrl: string
): Promise<void> {
  await query(
    `UPDATE episodes SET
      user_voice_id = $2,
      user_character_role = 'bystander',
      character_portraits = COALESCE(character_portraits, '{}'::jsonb)
        || jsonb_build_object('user', $3),
      sfx_urls = COALESCE(sfx_urls, '{}'::jsonb)
        || jsonb_build_object('you_were_there', $4),
      updated_at = NOW()
    WHERE id = $1`,
    [id, voiceId, portraitUrl, audioUrl]
  );
}

// ── Conversations ──────────────────────────────────────────────

export async function saveConversation(data: {
  episode_id: string;
  agent_id: string;
  character_name?: string;
  elevenlabs_conversation_id?: string;
  transcript?: Record<string, unknown>;
  analysis?: Record<string, unknown>;
  duration_seconds?: number;
}): Promise<string> {
  const rows = await query(
    `INSERT INTO conversations (
      episode_id, agent_id, character_name,
      elevenlabs_conversation_id, transcript, analysis, duration_seconds
    ) VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7)
    RETURNING id`,
    [
      data.episode_id,
      data.agent_id,
      data.character_name ?? null,
      data.elevenlabs_conversation_id ?? null,
      data.transcript ? JSON.stringify(data.transcript) : null,
      data.analysis ? JSON.stringify(data.analysis) : null,
      data.duration_seconds ?? null,
    ]
  );
  return rows[0].id as string;
}

// ── Health ─────────────────────────────────────────────────────

export async function healthCheck(): Promise<boolean> {
  try {
    await query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}
