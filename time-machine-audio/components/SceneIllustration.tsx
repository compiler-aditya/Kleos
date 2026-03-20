'use client';

import { motion, AnimatePresence } from 'framer-motion';

type KenBurnsEffect = 'zoom-in' | 'pan-right' | 'zoom-out' | 'pan-left';

const EFFECTS: KenBurnsEffect[] = ['zoom-in', 'pan-right', 'zoom-out', 'pan-left'];

const variants: Record<KenBurnsEffect, { initial: object; animate: object }> = {
  'zoom-in': {
    initial: { scale: 1, x: 0, y: 0 },
    animate: { scale: 1.12, x: '-2%', y: '-2%' },
  },
  'zoom-out': {
    initial: { scale: 1.12, x: '-2%', y: '-2%' },
    animate: { scale: 1, x: 0, y: 0 },
  },
  'pan-right': {
    initial: { scale: 1.08, x: '-5%', y: 0 },
    animate: { scale: 1.08, x: '5%', y: 0 },
  },
  'pan-left': {
    initial: { scale: 1.08, x: '5%', y: 0 },
    animate: { scale: 1.08, x: '-5%', y: 0 },
  },
};

interface SceneIllustrationProps {
  url: string;
  sceneIndex: number;
  title?: string;
  mood?: string;
}

export function SceneIllustration({ url, sceneIndex, title, mood }: SceneIllustrationProps) {
  const effect = EFFECTS[sceneIndex % EFFECTS.length];

  return (
    <div className="ken-burns-container w-full h-full bg-surface-container">
      <AnimatePresence mode="wait">
        <motion.img
          key={url}
          src={url}
          alt={title ?? 'Scene illustration'}
          className="w-full h-full object-cover"
          initial={{ opacity: 0, ...variants[effect].initial }}
          animate={{ opacity: 1, ...variants[effect].animate }}
          exit={{ opacity: 0 }}
          transition={{
            opacity: { duration: 0.8 },
            scale: { duration: 35, ease: 'linear' },
            x: { duration: 35, ease: 'linear' },
            y: { duration: 35, ease: 'linear' },
          }}
        />
      </AnimatePresence>
      {mood && (
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-surface/80 to-transparent pointer-events-none" />
      )}
    </div>
  );
}
