import { NextRequest, NextResponse } from 'next/server';
import { getEpisode } from '@/lib/db';
import { getAgentSignedUrl } from '@/lib/agents';

// GET /api/agent-token?agentId=xxx
// GET /api/agent-token?episodeId=xxx&type=concierge
// GET /api/agent-token?episodeId=xxx&type=character&characterId=yyy

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const agentId = searchParams.get('agentId');
  if (agentId) {
    const signedUrl = await getAgentSignedUrl(agentId);
    return NextResponse.json({ signedUrl });
  }

  const episodeId = searchParams.get('episodeId');
  const type = searchParams.get('type');
  if (!episodeId || !type) {
    return NextResponse.json(
      { error: 'Provide agentId, or episodeId + type' },
      { status: 400 }
    );
  }

  const episode = await getEpisode(episodeId);
  if (!episode) {
    return NextResponse.json({ error: 'Episode not found' }, { status: 404 });
  }

  let resolvedAgentId: string | null = null;

  if (type === 'concierge') {
    resolvedAgentId = episode.concierge_agent_id;
  } else if (type === 'character') {
    const characterId = searchParams.get('characterId');
    if (!characterId) {
      return NextResponse.json({ error: 'characterId required for type=character' }, { status: 400 });
    }
    resolvedAgentId = episode.agent_ids?.[characterId] ?? null;
  }

  if (!resolvedAgentId) {
    return NextResponse.json({ error: 'Agent not found for this episode' }, { status: 404 });
  }

  const signedUrl = await getAgentSignedUrl(resolvedAgentId);
  return NextResponse.json({ signedUrl, agentId: resolvedAgentId });
}
