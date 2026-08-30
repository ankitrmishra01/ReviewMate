import React from 'react';
import { motion } from 'framer-motion';

export default function SkeletonCards({ count = 3 }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
          className="rounded-xl border border-border/80 bg-surface/70 p-5 space-y-3 relative overflow-hidden"
        >
          {/* Shimmer sweep effect */}
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-5 w-20 rounded bg-zinc-800 animate-pulse" />
              <div className="h-5 w-16 rounded bg-zinc-800/60 animate-pulse" />
            </div>
            <div className="h-4 w-24 rounded bg-zinc-800/40 animate-pulse" />
          </div>

          <div className="space-y-2 pt-1">
            <div className="h-4 w-full rounded bg-zinc-800/80 animate-pulse" />
            <div className="h-4 w-4/5 rounded bg-zinc-800/60 animate-pulse" />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <div className="h-3 w-32 rounded bg-zinc-800/40 animate-pulse" />
            <div className="h-6 w-16 rounded bg-zinc-800 animate-pulse" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}
