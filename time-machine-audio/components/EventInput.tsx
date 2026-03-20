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
    <div className="w-full max-w-xl mx-auto space-y-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Or type: Travel back to..."
          disabled={loading}
          className="flex-1 bg-zinc-900 border border-zinc-700 rounded-full px-5 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-600 disabled:opacity-50 transition-colors"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold text-sm px-6 py-3 rounded-full transition-colors whitespace-nowrap"
        >
          {loading ? 'Building...' : 'Travel'}
        </button>
      </form>

      <div className="flex flex-wrap justify-center gap-2">
        {SUGGESTED_EVENTS.map((event) => (
          <button
            key={event}
            onClick={() => submit(event)}
            disabled={loading}
            className="text-xs text-zinc-400 border border-zinc-800 hover:border-amber-700 hover:text-amber-400 px-3 py-1.5 rounded-full transition-colors disabled:opacity-40"
          >
            {event}
          </button>
        ))}
      </div>
    </div>
  );
}
