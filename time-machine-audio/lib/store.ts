'use client';

import { create } from 'zustand';

interface PlayerStore {
  // Playback
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  // Scene/transcript sync
  currentSceneIndex: number;
  currentWordIndex: number;
  currentSpeakerId: string | null;
  // UI overlays
  sourcePanelOpen: boolean;
  voiceCloneActive: boolean;
  shareCardVisible: boolean;
  // Talk to History
  activeCharacterId: string | null;
  // Setters
  setIsPlaying: (v: boolean) => void;
  setCurrentTime: (t: number) => void;
  setDuration: (d: number) => void;
  setVolume: (v: number) => void;
  setCurrentSceneIndex: (i: number) => void;
  setCurrentWordIndex: (i: number) => void;
  setCurrentSpeakerId: (id: string | null) => void;
  setSourcePanelOpen: (v: boolean) => void;
  setVoiceCloneActive: (v: boolean) => void;
  setShareCardVisible: (v: boolean) => void;
  setActiveCharacterId: (id: string | null) => void;
}

export const usePlayerStore = create<PlayerStore>((set) => ({
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 1,
  currentSceneIndex: 0,
  currentWordIndex: -1,
  currentSpeakerId: null,
  sourcePanelOpen: false,
  voiceCloneActive: false,
  shareCardVisible: false,
  activeCharacterId: null,
  setIsPlaying: (v) => set({ isPlaying: v }),
  setCurrentTime: (t) => set({ currentTime: t }),
  setDuration: (d) => set({ duration: d }),
  setVolume: (v) => set({ volume: v }),
  setCurrentSceneIndex: (i) => set({ currentSceneIndex: i }),
  setCurrentWordIndex: (i) => set({ currentWordIndex: i }),
  setCurrentSpeakerId: (id) => set({ currentSpeakerId: id }),
  setSourcePanelOpen: (v) => set({ sourcePanelOpen: v }),
  setVoiceCloneActive: (v) => set({ voiceCloneActive: v }),
  setShareCardVisible: (v) => set({ shareCardVisible: v }),
  setActiveCharacterId: (id) => set({ activeCharacterId: id }),
}));
