'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import type { Episode } from '@/lib/types';

interface GenerationProgressProps {
  episodeId: string;
  initialEpisode: Episode;
}

const STATUS_LABELS: Record<string, { label: string; icon: string }> = {
  researching: { label: 'Researching historical sources...', icon: 'search' },
  scripting: { label: 'Writing your documentary script...', icon: 'edit_note' },
  generating_media: { label: 'Recording voices, painting scenes...', icon: 'movie' },
  setting_up_agents: { label: 'Preparing your historical guides...', icon: 'groups' },
  ready: { label: 'Your documentary is ready.', icon: 'play_circle' },
  error: { label: 'Something went wrong.', icon: 'error' },
};

export function GenerationProgress({ episodeId, initialEpisode }: GenerationProgressProps) {
  const [episode, setEpisode] = useState<Episode>(initialEpisode);
  const router = useRouter();

  useEffect(() => {
    if (episode.status === 'ready' || episode.status === 'error') return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/episodes/${episodeId}`);
        const updated: Episode = await res.json();
        setEpisode(updated);
        if (updated.status === 'ready') {
          clearInterval(interval);
          router.refresh();
        }
      } catch {
        // keep polling
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [episodeId, episode.status, router]);

  const { label } = STATUS_LABELS[episode.status] ?? STATUS_LABELS.researching;
  const progress = episode.progress;
  const characters = episode.characters ?? [];
  const portraits = episode.character_portraits ?? {};
  const illustrations = episode.scene_illustrations ?? [];
  const sources = progress?.research_sources ?? [];

  return (
    <div className="min-h-screen bg-radial-gradient text-on-surface flex flex-col items-center justify-center px-6 py-16 relative overflow-hidden">
      {/* Ambient light */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-tertiary/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 w-full max-w-2xl space-y-10">

        {/* Status header */}
        <div className="text-center space-y-3">
          <motion.p
            key={label}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-lg text-on-surface font-headline font-semibold"
          >
            {progress?.message ?? label}
          </motion.p>
        </div>

        {/* Phase progress dots */}
        <div className="flex justify-center gap-3">
          {(['researching', 'scripting', 'generating_media', 'setting_up_agents', 'ready'] as const).map((phase) => {
            const phases = ['researching', 'scripting', 'generating_media', 'setting_up_agents', 'ready'];
            const currentIdx = phases.indexOf(episode.status);
            const phaseIdx = phases.indexOf(phase);
            const isDone = phaseIdx < currentIdx;
            const isActive = phase === episode.status;
            return (
              <div
                key={phase}
                className={`w-2 h-2 rounded-full transition-all duration-500 ${
                  isDone ? 'bg-tertiary' : isActive ? 'bg-tertiary animate-pulse' : 'bg-outline-variant'
                }`}
              />
            );
          })}
        </div>

        {/* Sources found */}
        {sources.length > 0 && (
          <div className="glass-panel rounded-xl p-6 border border-outline-variant/20 space-y-3">
            <p className="text-xs text-on-surface-variant uppercase tracking-[0.2em] font-headline font-bold">Sources found</p>
            <div className="space-y-1">
              {sources.slice(0, 5).map((src, i) => (
                <motion.div
                  key={src}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="text-xs text-on-surface-variant truncate"
                >
                  &mdash; {src}
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Character portraits appearing */}
        {characters.length > 0 && (
          <div className="glass-panel rounded-xl p-6 border border-outline-variant/20 space-y-4">
            <p className="text-xs text-on-surface-variant uppercase tracking-[0.2em] font-headline font-bold">Characters</p>
            <div className="grid grid-cols-4 gap-3">
              {characters.map((char) => {
                const portraitUrl = portraits[char.id];
                return (
                  <motion.div
                    key={char.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center gap-1.5"
                  >
                    <div className="w-14 h-14 rounded-full overflow-hidden bg-surface-container border-2 border-tertiary/30">
                      {portraitUrl ? (
                        <img src={portraitUrl} alt={char.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg text-outline">
                          {char.name[0]}
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-on-surface-variant text-center leading-tight truncate w-full px-1">
                      {char.name}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Scene illustrations appearing */}
        {illustrations.length > 0 && (
          <div className="glass-panel rounded-xl p-6 border border-outline-variant/20 space-y-4">
            <p className="text-xs text-on-surface-variant uppercase tracking-[0.2em] font-headline font-bold">
              Scenes painted ({illustrations.length}/{episode.script?.scenes?.length ?? '?'})
            </p>
            <div className="grid grid-cols-4 gap-2">
              <AnimatePresence>
                {illustrations.map((ill) => (
                  <motion.div
                    key={ill.scene_number}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="aspect-video rounded-lg overflow-hidden bg-surface-container border border-outline-variant/10"
                  >
                    <img
                      src={ill.url}
                      alt={`Scene ${ill.scene_number}`}
                      className="w-full h-full object-cover"
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Cover art */}
        {episode.cover_art_url && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl overflow-hidden aspect-video shadow-2xl shadow-black/60 relative"
          >
            <img src={episode.cover_art_url} alt="Cover art" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-surface/60 to-transparent pointer-events-none" />
          </motion.div>
        )}

        {episode.status === 'error' && (
          <div className="text-center text-error text-sm">
            {episode.error_message ?? 'Generation failed. Please try again.'}
          </div>
        )}
      </div>
    </div>
  );
}
