'use client';

import { useConversation } from '@elevenlabs/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { usePlayerStore } from '@/lib/store';

interface VoiceLandingProps {
  conciergeAgentId?: string;
}

export function VoiceLanding({ conciergeAgentId }: VoiceLandingProps) {
  const router = useRouter();
  const [agentMessage, setAgentMessage] = useState('Where in history would you like to go?');
  const [isStarting, setIsStarting] = useState(false);
  const { setIsPlaying, setSourcePanelOpen, setVoiceCloneActive, setShareCardVisible } = usePlayerStore();

  const clientTools = useCallback(() => ({
    generate_documentary: async (params: { event: string; era?: string }) => {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventQuery: params.event, era: params.era }),
      });
      const { episodeId } = await res.json();
      router.push(`/episode/${episodeId}`);
      return `Documentary generation started. Episode ID: ${episodeId}`;
    },
    check_generation_progress: async (params: { episode_id: string }) => {
      const res = await fetch(`/api/episodes/${params.episode_id}`);
      const episode = await res.json();
      return JSON.stringify(episode.progress ?? { phase: episode.status });
    },
    start_playback: () => {
      setIsPlaying(true);
      return 'Playback started';
    },
    seek_to_scene: (params: { scene_name: string }) => {
      return `Seeking to: ${params.scene_name}`;
    },
    identify_speaker: () => 'Feature available during playback',
    show_sources: () => {
      setSourcePanelOpen(true);
      return 'Sources panel displayed';
    },
    start_voice_clone: () => {
      setVoiceCloneActive(true);
      return 'Voice recording activated. Please speak for 30 seconds.';
    },
    dub_to_language: (params: { language_code: string }) =>
      `Dubbing to ${params.language_code} initiated`,
    share_episode: () => {
      setShareCardVisible(true);
      return 'Share card displayed';
    },
    navigate_timeline: () => 'Navigate to episode page',
    show_illustration: () => 'Illustration available on episode page',
    show_source: () => 'Source available on episode page',
    play_sound_effect: () => 'Sound effect played',
  }), [router, setIsPlaying, setSourcePanelOpen, setVoiceCloneActive, setShareCardVisible]);

  const conversation = useConversation({
    onMessage: ({ message, source }) => {
      if (source === 'ai') setAgentMessage(message);
    },
    clientTools: clientTools(),
  });

  const { status, isSpeaking } = conversation;
  const isConnected = status === 'connected';
  const isConnecting = status === 'connecting';

  const handleStartConversation = async () => {
    if (!conciergeAgentId || isStarting) return;
    setIsStarting(true);
    try {
      const res = await fetch(`/api/agent-token?agentId=${conciergeAgentId}`);
      const { signedUrl } = await res.json();
      await conversation.startSession({ signedUrl });
    } catch (err) {
      console.error('Failed to start conversation:', err);
    } finally {
      setIsStarting(false);
    }
  };

  const handleStop = async () => {
    await conversation.endSession();
  };

  if (!conciergeAgentId) return null;

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Pulse ring + mic button */}
      <div className="relative flex items-center justify-center">
        {/* Outer pulse rings when connected + speaking */}
        {isConnected && isSpeaking && (
          <>
            <motion.div
              className="absolute rounded-full border border-tertiary/30"
              initial={{ width: 80, height: 80, opacity: 0.6 }}
              animate={{ width: 160, height: 160, opacity: 0 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
            />
            <motion.div
              className="absolute rounded-full border border-tertiary/20"
              initial={{ width: 80, height: 80, opacity: 0.4 }}
              animate={{ width: 200, height: 200, opacity: 0 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut', delay: 0.4 }}
            />
          </>
        )}
        {/* Idle pulse when connected but not speaking */}
        {isConnected && !isSpeaking && (
          <motion.div
            className="absolute w-20 h-20 rounded-full border border-outline/50"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        <button
          onClick={isConnected ? handleStop : handleStartConversation}
          disabled={isConnecting || isStarting}
          className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${
            isConnected
              ? 'bg-tertiary hover:bg-tertiary-dim shadow-lg shadow-tertiary/20'
              : 'bg-surface-container hover:bg-surface-container-high border border-outline-variant'
          } disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          {isConnecting || isStarting ? (
            <motion.div
              className="w-5 h-5 border-2 border-tertiary border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
            />
          ) : isConnected ? (
            <span className="text-surface text-2xl">&#9673;</span>
          ) : (
            <svg className="w-7 h-7 text-on-surface-variant" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            </svg>
          )}
        </button>
      </div>

      {/* Status label */}
      <p className="text-xs text-on-surface-variant tracking-wider uppercase">
        {isConnecting || isStarting
          ? 'Connecting...'
          : isConnected
          ? isSpeaking ? 'Speaking...' : 'Listening...'
          : 'Tap to speak with Concierge'}
      </p>

      {/* Agent message transcript */}
      <AnimatePresence mode="wait">
        {isConnected && (
          <motion.p
            key={agentMessage}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="text-center text-sm text-on-surface/80 max-w-sm leading-relaxed italic"
          >
            &ldquo;{agentMessage}&rdquo;
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
