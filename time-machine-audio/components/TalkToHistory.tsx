'use client';

import { useConversation } from '@elevenlabs/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { usePlayerStore } from '@/lib/store';
import type { Character, SceneIllustration } from '@/lib/types';

interface TalkToHistoryProps {
  episodeId: string;
  characters: Character[];
  agentIds: Record<string, string>;
  portraits: Record<string, string>;
  sceneIllustrations: SceneIllustration[];
}

export function TalkToHistory({
  episodeId,
  characters,
  agentIds,
  portraits,
  sceneIllustrations,
}: TalkToHistoryProps) {
  const [agentMessage, setAgentMessage] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const { activeCharacterId, setActiveCharacterId, setCurrentSceneIndex, setCurrentTime } = usePlayerStore();

  const talkableChars = characters.filter((c) => c.role !== 'narrator' && agentIds[c.id]);

  const clientTools = {
    navigate_timeline: (params: { timestamp_seconds: number }) => {
      setCurrentTime(params.timestamp_seconds);
      return `Navigated to ${params.timestamp_seconds}s`;
    },
    show_illustration: (params: { scene_number: number }) => {
      const idx = sceneIllustrations.findIndex((s) => s.scene_number === params.scene_number);
      if (idx !== -1) setCurrentSceneIndex(idx);
      return `Showing scene ${params.scene_number}`;
    },
    show_source: (params: { source_url?: string; source_title: string }) => {
      return `Showing source: ${params.source_title}`;
    },
    play_sound_effect: (params: { effect_name: string }) => {
      return `Playing: ${params.effect_name}`;
    },
    transfer_to_concierge: () => {
      handleEndConversation();
      return 'Transferring back to Concierge';
    },
  };

  const conversation = useConversation({
    onMessage: ({ message, source }) => {
      if (source === 'ai') setAgentMessage(message);
    },
    clientTools,
  });

  const { status, isSpeaking } = conversation;
  const isConnected = status === 'connected';

  const handleStartConversation = async (characterId: string) => {
    if (isStarting) return;
    const agentId = agentIds[characterId];
    if (!agentId) return;
    setIsStarting(true);
    try {
      const res = await fetch(
        `/api/agent-token?episodeId=${episodeId}&type=character&characterId=${characterId}`
      );
      const { signedUrl } = await res.json();
      setActiveCharacterId(characterId);
      setAgentMessage('');
      await conversation.startSession({ signedUrl });
    } catch (err) {
      console.error('Failed to start agent conversation:', err);
    } finally {
      setIsStarting(false);
    }
  };

  const handleEndConversation = async () => {
    await conversation.endSession();
    setActiveCharacterId(null);
    setAgentMessage('');
  };

  const activeChar = characters.find((c) => c.id === activeCharacterId);

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h2 className="font-headline text-lg font-bold text-on-surface">Talk to History</h2>
        <p className="text-sm text-on-surface-variant">
          {isConnected ? `Speaking with ${activeChar?.name}` : 'Choose a historical figure to interview'}
        </p>
      </div>

      {/* Character grid */}
      <div className="grid grid-cols-3 gap-4">
        {talkableChars.map((char) => {
          const isActive = activeCharacterId === char.id;
          const portraitUrl = portraits[char.id];
          return (
            <button
              key={char.id}
              onClick={() =>
                isActive && isConnected ? handleEndConversation() : handleStartConversation(char.id)
              }
              disabled={isStarting || (isConnected && !isActive)}
              className={`group flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-200 disabled:opacity-40 ${
                isActive && isConnected
                  ? 'border-tertiary bg-tertiary/10'
                  : 'border-outline-variant/20 hover:border-outline-variant bg-surface-container/50'
              }`}
            >
              <div className="relative w-16 h-16 rounded-full overflow-hidden bg-surface-container">
                {portraitUrl ? (
                  <img src={portraitUrl} alt={char.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl text-outline">
                    {char.name[0]}
                  </div>
                )}
                {isActive && isConnected && (
                  <div className="absolute inset-0 flex items-center justify-center bg-surface/40">
                    <motion.div
                      animate={isSpeaking ? { scale: [1, 1.2, 1] } : {}}
                      transition={{ duration: 0.8, repeat: Infinity }}
                      className="w-4 h-4 bg-tertiary rounded-full"
                    />
                  </div>
                )}
              </div>
              <div className="text-center">
                <p className="text-xs font-medium text-on-surface leading-tight">{char.name}</p>
                <p className="text-xs text-on-surface-variant capitalize">{char.role}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Conversation display */}
      <AnimatePresence>
        {isConnected && activeChar && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-panel border border-outline-variant/20 rounded-xl p-4 space-y-3"
          >
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${isSpeaking ? 'bg-tertiary animate-pulse' : 'bg-outline'}`}
              />
              <span className="text-xs text-on-surface-variant">
                {isSpeaking ? `${activeChar.name} is speaking...` : 'Listening to you...'}
              </span>
              <button
                onClick={handleEndConversation}
                className="ml-auto text-xs text-on-surface-variant hover:text-error transition-colors"
              >
                End conversation
              </button>
            </div>
            {agentMessage && (
              <AnimatePresence mode="wait">
                <motion.p
                  key={agentMessage}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm text-on-surface/80 italic leading-relaxed"
                >
                  &ldquo;{agentMessage}&rdquo;
                </motion.p>
              </AnimatePresence>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
