'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '@/lib/store';
import type { Episode } from '@/lib/types';

interface ShareCardProps {
  episode: Episode;
}

export function ShareCard({ episode }: ShareCardProps) {
  const { shareCardVisible, setShareCardVisible } = usePlayerStore();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: episode.title ?? 'Time Machine Audio',
          text: episode.share_tagline ?? episode.subtitle ?? 'History you don\'t just hear.',
          url: window.location.href,
        });
      } catch {
        // user cancelled
      }
    } else {
      handleCopy();
    }
  };

  const handleClose = () => {
    setShareCardVisible(false);
    setCopied(false);
  };

  if (!shareCardVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-surface/70 backdrop-blur-sm px-4"
        onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
      >
        <motion.div
          initial={{ scale: 0.95, y: 16 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 16 }}
          className="glass-panel border border-outline-variant/20 rounded-2xl p-6 w-full max-w-sm space-y-5"
        >
          {/* Header */}
          <div className="flex items-start justify-between">
            <h2 className="font-headline font-bold text-on-surface">Share This Experience</h2>
            <button
              onClick={handleClose}
              className="text-outline hover:text-on-surface transition-colors text-lg leading-none ml-4"
            >
              &#10005;
            </button>
          </div>

          {/* Cover art */}
          {episode.cover_art_url && (
            <div className="rounded-xl overflow-hidden aspect-video">
              <img
                src={episode.cover_art_url}
                alt={episode.title ?? 'Episode cover'}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Title + tagline */}
          <div className="space-y-1">
            <h3 className="font-headline text-lg font-bold text-on-surface leading-tight">
              {episode.title ?? episode.event_query}
            </h3>
            {(episode.share_tagline || episode.subtitle) && (
              <p className="text-sm text-on-surface-variant italic">
                {episode.share_tagline ?? episode.subtitle}
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleCopy}
              className="flex-1 py-3 rounded-xl border border-outline-variant hover:border-tertiary text-on-surface-variant hover:text-tertiary text-sm transition-all duration-200 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
              </svg>
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
            <button
              onClick={handleShare}
              className="flex-1 py-3 rounded-xl bg-tertiary hover:bg-tertiary-dim text-surface text-sm font-headline font-bold transition-colors flex items-center justify-center gap-2 uppercase tracking-wider"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
              </svg>
              Share
            </button>
          </div>

          {/* Branding */}
          <p className="text-xs text-on-surface-variant/40 text-center tracking-wider uppercase">
            Made with Time Machine Audio
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
