import { NextResponse } from 'next/server';
import { healthCheck } from '@/lib/db';

export async function GET() {
  const checks: Record<string, boolean> = {
    env_firecrawl: !!process.env.FIRECRAWL_API_KEY,
    env_gemini: !!process.env.GEMINI_API_KEY,
    env_elevenlabs: !!process.env.ELEVENLABS_API_KEY,
    env_database: !!process.env.DATABASE_URL,
    env_blob: !!process.env.BLOB_READ_WRITE_TOKEN,
    env_app_url: !!process.env.NEXT_PUBLIC_APP_URL,
    env_internal_secret: !!process.env.INTERNAL_SECRET,
    db_connected: false,
  };

  try {
    checks.db_connected = await healthCheck();
  } catch {
    checks.db_connected = false;
  }

  const allGreen = Object.values(checks).every(Boolean);

  return NextResponse.json(
    { status: allGreen ? 'healthy' : 'degraded', checks },
    { status: allGreen ? 200 : 503 }
  );
}
