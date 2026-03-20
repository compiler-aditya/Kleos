import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { env } from '@/lib/env';
import { saveConversation } from '@/lib/db';

export const maxDuration = 10;

function verifySignature(body: string, signature: string | null): boolean {
  const secret = env.ELEVENLABS_WEBHOOK_SECRET;
  if (!secret || !signature) return !secret;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-elevenlabs-signature');

    if (!verifySignature(rawBody, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);

    const conversationId = payload.conversation_id;
    const agentId = payload.agent_id;
    const transcript = payload.transcript;
    const analysis = payload.analysis;
    const durationSeconds = payload.call_duration_secs;

    if (!conversationId || !agentId) {
      return NextResponse.json({ error: 'Missing conversation_id or agent_id' }, { status: 400 });
    }

    // Extract episode_id from agent metadata if available
    const episodeId = payload.metadata?.episode_id ?? payload.agent_config?.metadata?.episode_id;
    const characterName = payload.metadata?.character_name ?? payload.agent_config?.metadata?.character_name;

    if (episodeId) {
      await saveConversation({
        episode_id: episodeId,
        agent_id: agentId,
        character_name: characterName,
        elevenlabs_conversation_id: conversationId,
        transcript,
        analysis,
        duration_seconds: durationSeconds,
      });
      console.log(`[webhook] Saved conversation ${conversationId} for episode ${episodeId}`);
    } else {
      console.log(`[webhook] Received conversation ${conversationId} (no episode_id in metadata)`);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('[webhook] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
