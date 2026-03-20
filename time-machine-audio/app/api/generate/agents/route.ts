import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { getEpisode, saveAgentIds, updateEpisodeStatus } from '@/lib/db';
import { setupEpisodeAgents } from '@/lib/agents';

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-internal-secret');
  if (secret !== env.INTERNAL_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { episodeId } = await req.json();

  try {
    const episode = await getEpisode(episodeId);
    if (!episode) {
      return NextResponse.json({ error: 'Episode not found' }, { status: 404 });
    }

    if (!episode.script || !episode.characters) {
      return NextResponse.json({ error: 'Episode has no script' }, { status: 400 });
    }

    console.log(`[agents] Setting up agents for episode ${episodeId}`);

    const { agentIds, conciergeAgentId, knowledgeBaseId } = await setupEpisodeAgents(episode);

    await saveAgentIds(episodeId, agentIds, knowledgeBaseId, conciergeAgentId);

    console.log(
      JSON.stringify({
        event: 'phase_complete',
        episodeId,
        phase: 'agents',
        conciergeAgentId,
        historicalAgentCount: Object.keys(agentIds).length,
      })
    );

    return NextResponse.json({ ok: true, episodeId, conciergeAgentId });
  } catch (err) {
    console.error('[agents] Error:', err);
    await updateEpisodeStatus(episodeId, 'error', {
      error_phase: 'agents',
      error_message: err instanceof Error ? err.message : 'Agent setup failed',
    });
    return NextResponse.json(
      { error: 'Agent setup failed', episodeId },
      { status: 500 }
    );
  }
}
