import React from 'react';
import { Sparkles, History, PlusCircle, Layers, Home, BarChart3 } from 'lucide-react';

export default function Navbar({
  onGoHome,
  onNewReview,
  onToggleHistory,
  onOpenModelStats,
  historyCount = 0,
  currentView,
  isComparing,
  onToggleCompare
}) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand & Tagline — Clickable Logo to return Home */}
        <div
          className="flex items-center gap-3 cursor-pointer select-none group"
          onClick={onGoHome}
          title="Return to Home / Landing screen"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20 border border-indigo-400/30 group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-zinc-100 font-sans group-hover:text-white transition-colors">
                ReviewMate
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold">
                CodeT5 DLNLP
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono hidden sm:block">AI-Powered Code Review Generator</p>
          </div>
        </div>

        {/* Center / Action buttons */}
        <div className="flex items-center gap-2.5">
          {/* Explicit Home Button when on Review Screen */}
          {currentView === 'review' && (
            <button
              onClick={onGoHome}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface hover:bg-surface-elevated text-zinc-300 hover:text-white border border-border hover:border-zinc-700 transition-all"
              title="Navigate back to Landing screen"
            >
              <Home className="w-3.5 h-3.5 text-zinc-400" />
              <span className="hidden sm:inline">Home</span>
            </button>
          )}

          {currentView === 'review' && (
            <>
              <button
                onClick={onToggleCompare}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                  isComparing 
                    ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/50 shadow-sm shadow-indigo-500/20' 
                    : 'bg-surface hover:bg-surface-elevated text-zinc-300 border-border hover:border-zinc-600'
                }`}
                title="Compare Fine-Tuned CodeT5 vs Baseline Zero-Shot"
              >
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>{isComparing ? 'Exit Comparison' : 'Model Ablation'}</span>
              </button>

              <button
                onClick={onNewReview}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface hover:bg-surface-elevated text-zinc-300 hover:text-white border border-border hover:border-zinc-700 transition-all"
                title="Start a new review"
              >
                <PlusCircle className="w-3.5 h-3.5 text-zinc-400" />
                <span className="hidden sm:inline">New Diff</span>
              </button>
            </>
          )}

          {/* History drawer trigger */}
          <button
            onClick={onToggleHistory}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface hover:bg-surface-elevated text-zinc-300 hover:text-white border border-border hover:border-zinc-700 transition-all relative"
            title="View Review History"
          >
            <History className="w-4 h-4 text-zinc-400" />
            <span className="hidden sm:inline">History</span>
            {historyCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-indigo-600 text-[10px] font-mono font-bold text-white leading-tight">
                {historyCount}
              </span>
            )}
          </button>

          {/* Model Stats / Serving badge (Clickable to view BLEU/ROUGE metrics) */}
          <button
            onClick={onOpenModelStats}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 hover:border-indigo-500/40 text-[11px] text-zinc-300 font-mono transition-all group"
            title="Click to view CodeT5 BLEU & ROUGE generation metrics"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="hidden sm:inline text-zinc-400 group-hover:text-zinc-200">CodeT5</span>
            <BarChart3 className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] text-indigo-400 font-semibold">Stats</span>
          </button>
        </div>

      </div>
    </header>
  );
}
