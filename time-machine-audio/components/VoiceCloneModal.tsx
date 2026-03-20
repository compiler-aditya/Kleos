'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '@/lib/store';

interface VoiceCloneModalProps {
  episodeId: string;
  era: string;
}

type ModalState = 'idle' | 'recording' | 'processing' | 'done' | 'error';

const MAX_SECONDS = 30;
const MIN_SECONDS = 5;

export function VoiceCloneModal({ episodeId, era }: VoiceCloneModalProps) {
  const { voiceCloneActive, setVoiceCloneActive } = usePlayerStore();

  const [modalState, setModalState] = useState<ModalState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [result, setResult] = useState<{ portraitUrl: string | null; audioUrl: string; statement: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopRecording = useCallback(() => {
    stopTimer();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, [stopTimer]);

  // Auto-stop at MAX_SECONDS
  useEffect(() => {
    if (modalState === 'recording' && elapsed >= MAX_SECONDS) {
      stopRecording();
    }
  }, [elapsed, modalState, stopRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimer();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [stopTimer]);

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = recorder;

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        setAudioChunks(chunks);
      };

      recorder.start(250);
      setElapsed(0);
      setModalState('recording');

      timerRef.current = setInterval(() => {
        setElapsed((s) => s + 1);
      }, 1000);
    } catch {
      setErrorMsg('Microphone access denied. Please allow mic access and try again.');
      setModalState('error');
    }
  };

  const handleSubmit = async () => {
    if (audioChunks.length === 0) return;
    setModalState('processing');

    try {
      const blob = new Blob(audioChunks, { type: 'audio/webm' });
      const formData = new FormData();
      formData.append('audio', blob, 'voice.webm');
      formData.append('episodeId', episodeId);

      const res = await fetch('/api/voice-clone', { method: 'POST', body: formData });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? 'Voice clone failed');
      }

      const data = await res.json();
      setResult(data);
      setModalState('done');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong');
      setModalState('error');
    }
  };

  const handleClose = () => {
    stopRecording();
    setModalState('idle');
    setElapsed(0);
    setAudioChunks([]);
    setResult(null);
    setErrorMsg('');
    setVoiceCloneActive(false);
  };

  if (!voiceCloneActive) return null;

  const progressPct = (elapsed / MAX_SECONDS) * 100;
  const canSubmit = elapsed >= MIN_SECONDS && audioChunks.length > 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
        onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
      >
        <motion.div
          initial={{ scale: 0.95, y: 16 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 16 }}
          className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-sm space-y-5"
        >
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-semibold text-zinc-100">Be Part of This Story</h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                {modalState === 'idle' && 'Record your voice — we\'ll put you in the documentary.'}
                {modalState === 'recording' && `Recording... ${elapsed}s / ${MAX_SECONDS}s`}
                {modalState === 'processing' && 'Cloning your voice and generating your moment...'}
                {modalState === 'done' && 'You\'re now part of history.'}
                {modalState === 'error' && 'Something went wrong.'}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-zinc-600 hover:text-zinc-300 transition-colors text-lg leading-none ml-4"
            >
              ✕
            </button>
          </div>

          {/* Recording ring */}
          {(modalState === 'idle' || modalState === 'recording') && (
            <div className="flex flex-col items-center gap-4 py-2">
              <div className="relative w-24 h-24">
                {/* Progress ring */}
                <svg className="w-full h-full -rotate-90" viewBox="0 0 96 96">
                  <circle cx="48" cy="48" r="42" fill="none" stroke="#27272a" strokeWidth="4" />
                  <circle
                    cx="48" cy="48" r="42" fill="none"
                    stroke="#d97706" strokeWidth="4"
                    strokeDasharray={`${2 * Math.PI * 42}`}
                    strokeDashoffset={`${2 * Math.PI * 42 * (1 - progressPct / 100)}`}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                </svg>
                {/* Mic button */}
                <button
                  onClick={modalState === 'idle' ? handleStartRecording : stopRecording}
                  className={`absolute inset-0 m-3 rounded-full flex items-center justify-center transition-colors ${
                    modalState === 'recording'
                      ? 'bg-red-700 hover:bg-red-600'
                      : 'bg-zinc-800 hover:bg-zinc-700'
                  }`}
                >
                  {modalState === 'recording' ? (
                    <motion.div
                      animate={{ scale: [1, 1.15, 1] }}
                      transition={{ duration: 0.8, repeat: Infinity }}
                      className="w-5 h-5 bg-red-400 rounded-sm"
                    />
                  ) : (
                    <svg className="w-7 h-7 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                    </svg>
                  )}
                </button>
              </div>

              <p className="text-xs text-zinc-500 text-center">
                {modalState === 'idle'
                  ? 'Tap the mic and speak for at least 5 seconds'
                  : elapsed < MIN_SECONDS
                  ? `Keep going... ${MIN_SECONDS - elapsed}s more`
                  : 'Tap again to stop, then submit'}
              </p>

              {modalState === 'recording' && canSubmit && (
                <button
                  onClick={() => { stopRecording(); }}
                  className="text-xs text-amber-400 hover:text-amber-300"
                >
                  Stop recording
                </button>
              )}
            </div>
          )}

          {/* Processing */}
          {modalState === 'processing' && (
            <div className="flex flex-col items-center gap-3 py-6">
              <motion.div
                className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
              <p className="text-xs text-zinc-400 text-center">
                Cloning voice · Writing your line · Generating portrait
              </p>
            </div>
          )}

          {/* Done */}
          {modalState === 'done' && result && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                {result.portraitUrl && (
                  <div className="w-16 h-20 rounded-lg overflow-hidden flex-shrink-0 border border-zinc-700">
                    <img src={result.portraitUrl} alt="Your historical portrait" className="w-full h-full object-cover" />
                  </div>
                )}
                <p className="text-sm text-zinc-300 italic leading-relaxed">
                  &ldquo;{result.statement}&rdquo;
                </p>
              </div>
              <audio
                src={result.audioUrl}
                controls
                autoPlay
                className="w-full h-8 accent-amber-500"
              />
              <p className="text-xs text-zinc-600 text-center">
                Your voice is now part of {era !== 'the historical period' ? era : 'history'}.
              </p>
            </div>
          )}

          {/* Error */}
          {modalState === 'error' && (
            <div className="text-center py-4 space-y-3">
              <p className="text-sm text-red-400">{errorMsg}</p>
              <button
                onClick={() => { setModalState('idle'); setElapsed(0); setAudioChunks([]); }}
                className="text-xs text-zinc-400 hover:text-zinc-200"
              >
                Try again
              </button>
            </div>
          )}

          {/* Submit button */}
          {modalState === 'recording' && canSubmit && audioChunks.length > 0 && (
            <button
              onClick={() => { stopRecording(); setTimeout(handleSubmit, 300); }}
              className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-black text-sm font-medium transition-colors"
            >
              Submit &amp; Clone My Voice
            </button>
          )}

          {audioChunks.length > 0 && modalState === 'idle' && (
            <button
              onClick={handleSubmit}
              className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-black text-sm font-medium transition-colors"
            >
              Submit &amp; Clone My Voice
            </button>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
