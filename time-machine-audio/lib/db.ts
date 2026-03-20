import { neon } from '@neondatabase/serverless';
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

function getSql() {
  return neon(env.DATABASE_URL);
}

// ── Create ─────────────────────────────────────────────────────

export async function createEpisode(eventQuery: string): Promise<string> {
  const sql = getSql();
  const rows = await sql`
    INSERT INTO episodes (event_query)
    VALUES (${eventQuery})
    RETURNING id
  `;
  return rows[0].id as string;
}

// ── Read ───────────────────────────────────────────────────────

export async function getEpisode(id: string): Promise<Episode | null> {
  const sql = getSql();
  const rows = await sql`SELECT * FROM episodes WHERE id = ${id}`;
  if (rows.length === 0) return null;
  return rows[0] as unknown as Episode;
}

// ── Phase-specific updates ─────────────────────────────────────

export async function saveResearch(
  id: string,
  researchData: string,
  sourceUrls: string[]
): Promise<void> {
  const sql = getSql();
  await sql`
    UPDATE episodes SET
      research_data = ${researchData},
      source_urls = ${JSON.stringify(sourceUrls)}::jsonb,
      status = 'scripting',
      updated_at = NOW()
    WHERE id = ${id}
  `;
}

export async function saveScript(
  id: string,
  script: DocumentaryScript,
  characters: Character[]
): Promise<void> {
  const sql = getSql();
  await sql`
    UPDATE episodes SET
      script = ${JSON.stringify(script)}::jsonb,
      title = ${script.title},
      subtitle = ${script.subtitle},
      era = ${script.era},
      share_tagline = ${script.share_tagline},
      characters = ${JSON.stringify(characters)}::jsonb,
      status = 'generating_media',
      updated_at = NOW()
    WHERE id = ${id}
  `;
}

export async function saveAudioAssets(
  id: string,
  audioUrl: string,
  musicUrl: string | null,
  sfxUrls: Record<string, string> | null,
  alignmentData: AlignmentData | null,
  voiceIds: Record<string, string>
): Promise<void> {
  const sql = getSql();
  await sql`
    UPDATE episodes SET
      audio_url = ${audioUrl},
      music_url = ${musicUrl},
      sfx_urls = ${sfxUrls ? JSON.stringify(sfxUrls) : null}::jsonb,
      alignment_data = ${alignmentData ? JSON.stringify(alignmentData) : null}::jsonb,
      voice_ids = ${JSON.stringify(voiceIds)}::jsonb,
      updated_at = NOW()
    WHERE id = ${id}
  `;
}

export async function saveVisualAssets(
  id: string,
  coverArtUrl: string | null,
  sceneIllustrations: SceneIllustration[] | null,
  characterPortraits: Record<string, string> | null,
  videoTeaserUrl: string | null
): Promise<void> {
  const sql = getSql();
  await sql`
    UPDATE episodes SET
      cover_art_url = ${coverArtUrl},
      scene_illustrations = ${sceneIllustrations ? JSON.stringify(sceneIllustrations) : null}::jsonb,
      character_portraits = ${characterPortraits ? JSON.stringify(characterPortraits) : null}::jsonb,
      video_teaser_url = ${videoTeaserUrl},
      updated_at = NOW()
    WHERE id = ${id}
  `;
}

export async function saveAgentIds(
  id: string,
  agentIds: Record<string, string>,
  knowledgeBaseId: string,
  conciergeAgentId: string | null
): Promise<void> {
  const sql = getSql();
  await sql`
    UPDATE episodes SET
      agent_ids = ${JSON.stringify(agentIds)}::jsonb,
      knowledge_base_id = ${knowledgeBaseId},
      concierge_agent_id = ${conciergeAgentId},
      status = 'ready',
      updated_at = NOW()
    WHERE id = ${id}
  `;
}

// ── Status & Progress ──────────────────────────────────────────

export async function updateEpisodeStatus(
  id: string,
  status: EpisodeStatus,
  errorInfo?: { error_phase: string; error_message: string; error_details?: Record<string, unknown> }
): Promise<void> {
  const sql = getSql();
  if (errorInfo) {
    await sql`
      UPDATE episodes SET
        status = ${status},
        error_phase = ${errorInfo.error_phase},
        error_message = ${errorInfo.error_message},
        error_details = ${errorInfo.error_details ? JSON.stringify(errorInfo.error_details) : null}::jsonb,
        updated_at = NOW()
      WHERE id = ${id}
    `;
  } else {
    await sql`
      UPDATE episodes SET status = ${status}, updated_at = NOW()
      WHERE id = ${id}
    `;
  }
}

export async function updateEpisodeProgress(
  id: string,
  progress: Partial<GenerationProgress>
): Promise<void> {
  const sql = getSql();
  await sql`
    UPDATE episodes
    SET progress = COALESCE(progress, '{}'::jsonb) || ${JSON.stringify(progress)}::jsonb,
        updated_at = NOW()
    WHERE id = ${id}
  `;
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
  const sql = getSql();
  const rows = await sql`
    INSERT INTO conversations (
      episode_id, agent_id, character_name,
      elevenlabs_conversation_id, transcript, analysis, duration_seconds
    ) VALUES (
      ${data.episode_id}, ${data.agent_id}, ${data.character_name ?? null},
      ${data.elevenlabs_conversation_id ?? null},
      ${data.transcript ? JSON.stringify(data.transcript) : null}::jsonb,
      ${data.analysis ? JSON.stringify(data.analysis) : null}::jsonb,
      ${data.duration_seconds ?? null}
    )
    RETURNING id
  `;
  return rows[0].id as string;
}

// ── Health ─────────────────────────────────────────────────────

export async function healthCheck(): Promise<boolean> {
  try {
    const sql = getSql();
    await sql`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
