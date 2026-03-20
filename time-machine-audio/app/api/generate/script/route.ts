import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  // Verify internal secret
  const secret = req.headers.get('x-internal-secret');
  if (secret !== env.INTERNAL_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { episodeId } = await req.json();

  // TODO: Phase 2 — Script generation
  console.log(`[script] Stub: would generate script for episode ${episodeId}`);

  return NextResponse.json({ ok: true, episodeId });
}
