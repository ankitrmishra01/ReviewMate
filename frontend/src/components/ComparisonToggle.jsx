import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Bot, Layers, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import CommentCard from './CommentCard';

export default function ComparisonToggle({
  baselineComments = [],
  finetunedComments = [],
  onJumpToLine,
  onMouseEnter,
  onMouseLeave
}) {
  const [activeTab, setActiveTab] = useState('both'); // 'both' | 'finetuned' | 'baseline'

  return (
    <div className="flex flex-col h-full bg-surface/50 border-l border-border/80">
      
      {/* Header with Ablation Explanation */}
      <div className="p-4 border-b border-border/80 bg-surface/90">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <h3 className="font-semibold text-sm text-zinc-100">Model Ablation Analysis</h3>
          </div>

          {/* View selector pills */}
          <div className="flex items-center rounded-lg bg-zinc-900 border border-zinc-800 p-0.5 text-xs font-medium">
            <button
              onClick={() => setActiveTab('both')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                activeTab === 'both' ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Side-by-Side
            </button>
            <button
              onClick={() => setActiveTab('finetuned')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                activeTab === 'finetuned' ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Fine-Tuned ({finetunedComments.length})
            </button>
            <button
              onClick={() => setActiveTab('baseline')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                activeTab === 'baseline' ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Baseline ({baselineComments.length})
            </button>
          </div>
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed">
          Comparing the specialized <strong className="text-indigo-300">Fine-Tuned CodeT5</strong> checkpoint (contextual bug risk, memory leak & boundary heuristics) against a standard <strong className="text-zinc-300">Baseline Zero-Shot Prompt</strong>.
        </p>
      </div>

      {/* Columns / Tabs */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'both' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            {/* Fine-Tuned Column */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-indigo-500/30">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-300">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span>Fine-Tuned CodeT5</span>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                  {finetunedComments.length} Deep Comments
                </span>
              </div>

              <div className="space-y-3">
                {finetunedComments.map((comment, index) => (
                  <CommentCard
                    key={comment.id || index}
                    comment={comment}
                    index={index}
                    onJumpToLine={onJumpToLine}
                    onMouseEnter={onMouseEnter}
                    onMouseLeave={onMouseLeave}
                  />
                ))}
              </div>
            </div>

            {/* Baseline Zero-Shot Column */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-700/60">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400">
                  <Bot className="w-4 h-4 text-zinc-400" />
                  <span>Baseline Zero-Shot</span>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                  {baselineComments.length} Generic Comments
                </span>
              </div>

              <div className="space-y-3">
                {baselineComments.map((comment, index) => (
                  <CommentCard
                    key={comment.id || index}
                    comment={comment}
                    index={index}
                    onJumpToLine={onJumpToLine}
                    onMouseEnter={onMouseEnter}
                    onMouseLeave={onMouseLeave}
                  />
                ))}
              </div>
            </div>

          </div>
        ) : activeTab === 'finetuned' ? (
          <div className="space-y-3 max-w-2xl mx-auto">
            <div className="flex items-center gap-2 pb-2 border-b border-indigo-500/30 text-indigo-300 text-xs font-semibold">
              <Sparkles className="w-4 h-4" />
              <span>Fine-Tuned CodeT5 Generated Comments</span>
            </div>
            {finetunedComments.map((comment, index) => (
              <CommentCard
                key={comment.id || index}
                comment={comment}
                index={index}
                onJumpToLine={onJumpToLine}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3 max-w-2xl mx-auto">
            <div className="flex items-center gap-2 pb-2 border-b border-zinc-700 text-zinc-400 text-xs font-semibold">
              <Bot className="w-4 h-4" />
              <span>Baseline Zero-Shot Generated Comments</span>
            </div>
            {baselineComments.map((comment, index) => (
              <CommentCard
                key={comment.id || index}
                comment={comment}
                index={index}
                onJumpToLine={onJumpToLine}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
              />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
