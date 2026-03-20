'use client';

import { useEffect, useRef, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { usePlayerStore } from '@/lib/store';
import { SceneIllustration } from './SceneIllustration';
import { WordHighlight } from './WordHighlight';
import { TalkToHistory } from './TalkToHistory';
import { VoiceCloneModal } from './VoiceCloneModal';
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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
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
          <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-zinc-700 text-4xl">
            ◉
          </div>
        )}

        {/* Bottom gradient + speaker overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-zinc-950 to-transparent pointer-events-none" />

        {/* Speaker portrait + name */}
        {speakerChar && isPlaying && (
          <motion.div
            key={speakerChar.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-12 left-4 flex items-center gap-3"
          >
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-amber-500 shadow-lg">
              {speakerPortrait ? (
                <img src={speakerPortrait} alt={speakerChar.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-zinc-400 text-lg">
                  {speakerChar.name[0]}
                </div>
              )}
            </div>
            <p className="text-sm font-medium text-zinc-100 drop-shadow-sm">{speakerChar.name}</p>
          </motion.div>
        )}
      </div>

      {/* Episode title + word highlight */}
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-lg font-semibold text-zinc-100 leading-tight">{script.title}</h1>
        <p className="text-xs text-zinc-500 mt-0.5">{script.subtitle}</p>
      </div>

      {alignment && (
        <WordHighlight alignmentData={alignment} currentWordIndex={currentWordIndex} />
      )}

      {/* Playback controls */}
      <div className="px-4 py-4 space-y-3">
        {/* Progress bar */}
        <div
          className="relative h-1 bg-zinc-800 rounded-full cursor-pointer group"
          onClick={handleSeek}
        >
          <div
            className="h-full bg-amber-500 rounded-full transition-none"
            style={{ width: `${progressPct}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-amber-400 rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `${progressPct}%`, transform: 'translate(-50%, -50%)' }}
          />
        </div>

        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-center gap-6">
          <button onClick={() => skip(-15)} className="text-zinc-400 hover:text-zinc-100 transition-colors text-xs">
            ↺ 15
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-14 h-14 rounded-full bg-amber-600 hover:bg-amber-500 text-black flex items-center justify-center shadow-lg shadow-amber-900/30 transition-colors"
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
          <button onClick={() => skip(15)} className="text-zinc-400 hover:text-zinc-100 transition-colors text-xs">
            15 ↻
          </button>
        </div>
      </div>

      {/* Scene timeline */}
      {illustrations.length > 0 && (
        <div className="px-4 pb-4">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
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
                className={`flex-shrink-0 flex flex-col gap-1 rounded overflow-hidden border transition-all ${
                  i === currentSceneIndex ? 'border-amber-500 opacity-100' : 'border-zinc-800 opacity-60 hover:opacity-80'
                }`}
              >
                <div className="w-20 h-12 overflow-hidden">
                  <img src={ill.url} alt={`Scene ${ill.scene_number}`} className="w-full h-full object-cover" />
                </div>
                <p className="text-xs text-zinc-500 px-1 pb-1 truncate max-w-[80px]">
                  {script.scenes[i]?.title ?? `Scene ${ill.scene_number}`}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* You Were There */}
      {!episode.user_voice_id && (
        <div className="px-4 pb-4">
          <button
            onClick={() => setVoiceCloneActive(true)}
            className="w-full py-3 rounded-xl border border-zinc-700 hover:border-amber-600 text-zinc-400 hover:text-amber-400 text-sm transition-all duration-200 flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            </svg>
            Be part of this story
          </button>
        </div>
      )}

      {/* Talk to History */}
      {episode.agent_ids && episode.characters && Object.keys(episode.agent_ids).length > 0 && (
        <div className="border-t border-zinc-800 px-4 py-8">
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
    </div>
  );
}
