'use client';

import { useEffect, useRef } from 'react';
import type { AlignmentData } from '@/lib/types';

interface WordHighlightProps {
  alignmentData: AlignmentData;
  currentWordIndex: number;
}

export function WordHighlight({ alignmentData, currentWordIndex }: WordHighlightProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (activeRef.current && containerRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentWordIndex]);

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden max-h-32 leading-relaxed text-base text-zinc-400"
      style={{ maskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)' }}
    >
      <p className="flex flex-wrap gap-x-1 gap-y-0.5 px-4 py-2">
        {alignmentData.words.map((w, i) => {
          const isActive = i === currentWordIndex;
          const isPast = i < currentWordIndex;
          return (
            <span
              key={i}
              ref={isActive ? activeRef : undefined}
              className={
                isActive
                  ? 'text-amber-300 font-semibold transition-colors duration-100'
                  : isPast
                  ? 'text-zinc-500 transition-colors duration-200'
                  : 'text-zinc-500'
              }
            >
              {w.word}
            </span>
          );
        })}
      </p>
    </div>
  );
}
