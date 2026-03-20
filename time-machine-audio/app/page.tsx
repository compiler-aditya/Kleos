import { VoiceLanding } from '@/components/VoiceLanding';
import { EventInput } from '@/components/EventInput';

const CONCIERGE_AGENT_ID = process.env.NEXT_PUBLIC_CONCIERGE_AGENT_ID;

export default function HomePage() {
  return (
    <main className="min-h-screen bg-radial-gradient relative overflow-hidden flex flex-col items-center justify-center px-6">
      {/* Ambient light orb */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-tertiary/5 blur-[120px] rounded-full pointer-events-none" />

      {/* Bottom gradient */}
      <div className="absolute bottom-0 left-0 w-full h-64 bg-gradient-to-t from-surface-container-lowest to-transparent pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-3xl flex flex-col items-center text-center">
        {/* Brand */}
        <h1 className="font-headline text-7xl md:text-9xl font-extrabold tracking-tighter text-tertiary cinematic-glow mb-2 select-none">
          TIME MACHINE
        </h1>
        <p className="font-headline text-lg md:text-xl text-tertiary/60 tracking-[0.2em] font-light mb-16 uppercase">
          History you don&apos;t just hear. History you live.
        </p>

        {/* Voice-first Concierge */}
        <div className="mb-10">
          <VoiceLanding conciergeAgentId={CONCIERGE_AGENT_ID} />
        </div>

        {/* Text fallback */}
        <EventInput />
      </div>

      {/* Footer */}
      <footer className="absolute bottom-0 w-full py-8 z-10">
        <div className="flex flex-col items-center gap-2 opacity-40">
          <p className="text-xs tracking-[0.3em] uppercase text-on-surface-variant font-semibold">
            Built with ElevenLabs + Firecrawl + Google AI
          </p>
        </div>
      </footer>
    </main>
  );
}
