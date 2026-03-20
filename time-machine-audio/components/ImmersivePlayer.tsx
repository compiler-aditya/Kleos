'use client';

import { useEffect, useRef, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { usePlayerStore } from '@/lib/store';
import { SceneIllustration } from './SceneIllustration';
import { WordHighlight } from './WordHighlight';
import { TalkToHistory } from './TalkToHistory';
import { VoiceCloneModal } from './VoiceCloneModal';
import { SourcePanel } from './SourcePanel';
import { ShareCard } from './ShareCard';
import type { Episode } from '@/lib/types';

interface ImmersivePlayerProps {
  episode: Episode;
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function ImmersivePlayer({ episode }: ImmersivePlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const {
    isPlaying, setIsPlaying,
    currentTime, setCurrentTime,
    duration, setDuration,
    currentSceneIndex, setCurrentSceneIndex,
    currentWordIndex, setCurrentWordIndex,
    currentSpeakerId, setCurrentSpeakerId,
    setVoiceCloneActive,
    setShareCardVisible,
    setSourcePanelOpen,
  } = usePlayerStore();

  const script = episode.script!;
  const alignment = episode.alignment_data;
  const illustrations = useMemo(() => episode.scene_illustrations ?? [], [episode.scene_illustrations]);
  const portraits = useMemo(() => episode.character_portraits ?? {}, [episode.character_portraits]);

  // Sync play/pause with store
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) audio.play().catch(() => setIsPlaying(false));
    else audio.pause();
  }, [isPlaying, setIsPlaying]);

  // Sync audio events → store
  const handleTimeUpdate = useCallback(() => {
    const t = audioRef.current?.currentTime ?? 0;
    setCurrentTime(t);

    if (alignment) {
      // Update current scene
      const sceneData = alignment.scenes;
      let newSceneIdx = currentSceneIndex;
      for (let i = 0; i < sceneData.length; i++) {
        if (t >= sceneData[i].start && t <= sceneData[i].end) {
          const illustIdx = illustrations.findIndex(
            (il) => il.scene_number === sceneData[i].scene_number
          );
          newSceneIdx = illustIdx !== -1 ? illustIdx : i;
          break;
        }
      }
      if (newSceneIdx !== currentSceneIndex) setCurrentSceneIndex(newSceneIdx);

      // Update current word
      const words = alignment.words;
      let lo = 0, hi = words.length - 1, foundIdx = -1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (words[mid].end < t) lo = mid + 1;
        else if (words[mid].start > t) hi = mid - 1;
        else { foundIdx = mid; break; }
      }
      if (foundIdx !== currentWordIndex) {
        setCurrentWordIndex(foundIdx);
        if (foundIdx !== -1 && words[foundIdx].character_id) {
          setCurrentSpeakerId(words[foundIdx].character_id ?? null);
        }
      }
    }
  }, [alignment, illustrations, currentSceneIndex, currentWordIndex, setCurrentTime, setCurrentSceneIndex, setCurrentWordIndex, setCurrentSpeakerId]);

  const currentIllustration = illustrations[currentSceneIndex];
  const currentScene = script.scenes[currentSceneIndex];
  const speakerChar = episode.characters?.find((c) => c.id === currentSpeakerId);
  const speakerPortrait = speakerChar ? portraits[speakerChar.id] : undefined;

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const t = ratio * duration;
    if (audioRef.current) audioRef.current.currentTime = t;
    setCurrentTime(t);
  };

  const skip = (delta: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, Math.min(duration, currentTime + delta));
    }
  };

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col">
      <audio
        ref={audioRef}
        src={episode.audio_url!}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
        onEnded={() => setIsPlaying(false)}
        preload="metadata"
      />

      {/* Scene illustration (full width, tall) */}
      <div className="relative w-full" style={{ height: '56vw', maxHeight: '65vh', minHeight: 300 }}>
        {currentIllustration ? (
          <SceneIllustration
            url={currentIllustration.url}
            sceneIndex={currentSceneIndex}
            title={currentScene?.title}
            mood={currentScene?.illustration_mood}
          />
        ) : episode.cover_art_url ? (
          <div className="ken-burns-container w-full h-full">
            <motion.img
              src={episode.cover_art_url}
              alt="Cover"
              className="w-full h-full object-cover"
              initial={{ scale: 1 }}
              animate={{ scale: 1.06 }}
              transition={{ duration: 40, ease: 'linear' }}
            />
          </div>
        ) : (
          <div className="w-full h-full bg-surface-container flex items-center justify-center text-outline text-4xl">
            &#9673;
          </div>
        )}

        {/* Bottom gradient + speaker overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-surface to-transparent pointer-events-none" />

        {/* Speaker portrait + name */}
        {speakerChar && isPlaying && (
          <motion.div
            key={speakerChar.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-12 left-4 flex items-center gap-3"
          >
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-tertiary shadow-lg">
              {speakerPortrait ? (
                <img src={speakerPortrait} alt={speakerChar.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-surface-container flex items-center justify-center text-on-surface-variant text-lg">
                  {speakerChar.name[0]}
                </div>
              )}
            </div>
            <p className="text-sm font-medium text-on-surface drop-shadow-sm">{speakerChar.name}</p>
          </motion.div>
        )}
      </div>

      {/* Episode title + word highlight */}
      <div className="px-4 pt-4 pb-2">
        <h1 className="font-headline text-xl font-bold text-on-surface leading-tight">{script.title}</h1>
        <p className="text-xs text-on-surface-variant tracking-wider uppercase mt-0.5">{script.subtitle}</p>
      </div>

      {alignment && (
        <WordHighlight alignmentData={alignment} currentWordIndex={currentWordIndex} />
      )}

      {/* Playback controls */}
      <div className="px-4 py-4 space-y-3">
        {/* Progress bar */}
        <div
          className="relative h-1 bg-surface-container-highest rounded-full cursor-pointer group"
          onClick={handleSeek}
        >
          <div
            className="h-full bg-tertiary rounded-full transition-none"
            style={{ width: `${progressPct}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-tertiary rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `${progressPct}%`, transform: 'translate(-50%, -50%)' }}
          />
        </div>

        <div className="flex items-center justify-between text-xs text-on-surface-variant">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-center gap-6">
          <button onClick={() => skip(-15)} className="text-on-surface-variant hover:text-on-surface transition-colors text-xs">
            &#8634; 15
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-14 h-14 rounded-full bg-tertiary hover:bg-tertiary-dim text-surface flex items-center justify-center shadow-lg shadow-tertiary/20 transition-colors"
          >
            {isPlaying ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
          <button onClick={() => skip(15)} className="text-on-surface-variant hover:text-on-surface transition-colors text-xs">
            15 &#8635;
          </button>
        </div>
      </div>

      {/* Scene timeline */}
      {illustrations.length > 0 && (
        <div className="px-4 pb-4">
          <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
            {illustrations.map((ill, i) => (
              <button
                key={ill.scene_number}
                onClick={() => {
                  if (alignment) {
                    const sd = alignment.scenes.find((s) => s.scene_number === ill.scene_number);
                    if (sd && audioRef.current) audioRef.current.currentTime = sd.start;
                  }
                  setCurrentSceneIndex(i);
                }}
                className={`flex-shrink-0 flex flex-col gap-1 rounded-lg overflow-hidden border transition-all ${
                  i === currentSceneIndex ? 'border-tertiary opacity-100' : 'border-outline-variant/20 opacity-60 hover:opacity-80'
                }`}
              >
                <div className="w-20 h-12 overflow-hidden">
                  <img src={ill.url} alt={`Scene ${ill.scene_number}`} className="w-full h-full object-cover" />
                </div>
                <p className="text-xs text-on-surface-variant px-1 pb-1 truncate max-w-[80px]">
                  {script.scenes[i]?.title ?? `Scene ${ill.scene_number}`}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons row */}
      <div className="px-4 pb-4 flex gap-3">
        {/* You Were There */}
        {!episode.user_voice_id && (
          <button
            onClick={() => setVoiceCloneActive(true)}
            className="flex-1 py-3 rounded-xl border border-outline-variant hover:border-tertiary text-on-surface-variant hover:text-tertiary text-sm transition-all duration-200 flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            </svg>
            Be part of this story
          </button>
        )}

        {/* Share */}
        <button
          onClick={() => setShareCardVisible(true)}
          className="py-3 px-5 rounded-xl border border-outline-variant hover:border-tertiary text-on-surface-variant hover:text-tertiary text-sm transition-all duration-200 flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
          </svg>
          Share
        </button>

        {/* Sources */}
        <button
          onClick={() => setSourcePanelOpen(true)}
          className="py-3 px-5 rounded-xl border border-outline-variant hover:border-tertiary text-on-surface-variant hover:text-tertiary text-sm transition-all duration-200 flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
          </svg>
          Sources
        </button>
      </div>

      {/* Talk to History */}
      {episode.agent_ids && episode.characters && Object.keys(episode.agent_ids).length > 0 && (
        <div className="border-t border-outline-variant/20 px-4 py-8">
          <TalkToHistory
            episodeId={episode.id}
            characters={episode.characters}
            agentIds={episode.agent_ids}
            portraits={portraits}
            sceneIllustrations={illustrations}
          />
        </div>
      )}

      {/* Voice Clone Modal */}
      <VoiceCloneModal episodeId={episode.id} era={episode.era ?? ''} />

      {/* Source Panel */}
      <SourcePanel sourceUrls={episode.source_urls ?? []} />

      {/* Share Card */}
      <ShareCard episode={episode} />
    </div>
  );
}
