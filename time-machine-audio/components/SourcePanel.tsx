'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '@/lib/store';

interface SourcePanelProps {
  sourceUrls: string[];
}

export function SourcePanel({ sourceUrls }: SourcePanelProps) {
  const { sourcePanelOpen, setSourcePanelOpen } = usePlayerStore();

  return (
    <AnimatePresence>
      {sourcePanelOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-surface/50"
            onClick={() => setSourcePanelOpen(false)}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-80 md:w-96 z-40 glass-panel border-l border-outline-variant/20 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-outline-variant/20">
              <h2 className="font-headline font-bold text-on-surface">Sources</h2>
              <button
                onClick={() => setSourcePanelOpen(false)}
                className="text-outline hover:text-on-surface transition-colors text-lg leading-none"
              >
                &#10005;
              </button>
            </div>

            {/* Source list */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {sourceUrls.length === 0 ? (
                <p className="text-sm text-on-surface-variant/60 italic">No sources available.</p>
              ) : (
                sourceUrls.map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-start gap-3 p-3 rounded-lg border border-outline-variant/10 hover:border-primary/30 transition-colors"
                  >
                    <svg className="w-4 h-4 mt-0.5 text-on-surface-variant/60 group-hover:text-primary shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                    <span className="text-sm text-on-surface-variant group-hover:text-primary break-all leading-relaxed transition-colors">
                      {url}
                    </span>
                  </a>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-outline-variant/20">
              <p className="text-xs text-on-surface-variant/40 text-center">
                {sourceUrls.length} source{sourceUrls.length !== 1 ? 's' : ''} referenced
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
