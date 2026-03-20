'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

const SUGGESTED_EVENTS = [
  'Moon Landing, July 1969',
  'Fall of the Berlin Wall, 1989',
  'Titanic Sinking, 1912',
  "Gandhi's Salt March, 1930",
  'First Flight at Kitty Hawk, 1903',
  "Bhagat Singh's Trial, 1929",
];

interface EventInputProps {
  onGenerating?: (episodeId: string) => void;
}

export function EventInput({ onGenerating }: EventInputProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const submit = async (eventQuery: string) => {
    if (!eventQuery.trim() || loading) return;
    setLoading(true);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventQuery: eventQuery.trim() }),
      });
      const { episodeId } = await res.json();
      if (onGenerating) onGenerating(episodeId);
      router.push(`/episode/${episodeId}`);
    } catch {
      setLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit(query);
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-8">
      <form onSubmit={handleSubmit} className="relative group">
        <div className="relative flex items-center bg-surface-container-lowest/40 backdrop-blur-xl rounded-full border border-outline-variant/20 focus-within:border-tertiary transition-all duration-500 shadow-2xl shadow-black/50">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Travel back to..."
            disabled={loading}
            className="w-full bg-transparent border-none focus:ring-0 text-lg py-6 px-10 text-on-surface placeholder:text-on-surface-variant/40 font-light tracking-wide disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="mr-4 bg-tertiary hover:bg-tertiary-dim disabled:opacity-40 disabled:cursor-not-allowed text-surface font-headline font-bold text-sm px-6 py-3 rounded-full transition-colors whitespace-nowrap uppercase tracking-widest"
          >
            {loading ? 'Building...' : 'Travel'}
          </button>
        </div>
      </form>

      <div className="flex flex-wrap justify-center gap-3">
        {SUGGESTED_EVENTS.map((event) => (
          <button
            key={event}
            onClick={() => submit(event)}
            disabled={loading}
            className="px-5 py-2 rounded-full border border-outline-variant/30 text-sm tracking-wide text-on-surface-variant hover:border-tertiary/40 hover:text-tertiary transition-all duration-300 bg-surface-container-low/50 backdrop-blur-md disabled:opacity-40"
          >
            {event}
          </button>
        ))}
      </div>
    </div>
  );
}
