import { NextRequest, NextResponse } from 'next/server';
import { getEpisode } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const episode = await getEpisode(id);
  if (!episode) {
    return NextResponse.json({ error: 'Episode not found' }, { status: 404 });
  }

  return NextResponse.json(episode);
}
