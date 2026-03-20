import { VoiceLanding } from '@/components/VoiceLanding';
import { EventInput } from '@/components/EventInput';

const CONCIERGE_AGENT_ID = process.env.NEXT_PUBLIC_CONCIERGE_AGENT_ID;

export default function HomePage() {
  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-6 py-20">
      {/* Header */}
      <div className="text-center mb-16 space-y-3">
        <h1 className="text-4xl font-semibold tracking-tight text-zinc-100">
          Time Machine Audio
        </h1>
        <p className="text-base text-zinc-500 italic">
          &ldquo;History you don&apos;t just hear.&rdquo;
        </p>
      </div>

      {/* Voice-first Concierge */}
      <div className="mb-10">
        <VoiceLanding conciergeAgentId={CONCIERGE_AGENT_ID} />
      </div>

      {/* Text fallback — always visible */}
      <EventInput />

      {/* Subtle hint */}
      {CONCIERGE_AGENT_ID && (
        <p className="mt-10 text-xs text-zinc-700">
          Built with ElevenLabs · Firecrawl · Google AI
        </p>
      )}
    </main>
  );
}
