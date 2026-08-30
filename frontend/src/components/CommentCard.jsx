import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  AlertTriangle, 
  Bug, 
  Zap, 
  FileText, 
  Sparkles, 
  Check, 
  Copy, 
  ExternalLink, 
  CornerDownRight, 
  AlertCircle,
  HelpCircle,
  Hash
} from 'lucide-react';

const CATEGORY_CONFIG = {
  bug_risk: {
    label: 'Bug Risk',
    color: 'bg-rose-500/15 text-rose-300 border-rose-600/40',
    icon: Bug
  },
  performance: {
    label: 'Performance',
    color: 'bg-purple-500/15 text-purple-300 border-purple-600/40',
    icon: Zap
  },
  edge_case: {
    label: 'Edge Case',
    color: 'bg-pink-500/15 text-pink-300 border-pink-600/40',
    icon: AlertCircle
  },
  naming: {
    label: 'Naming',
    color: 'bg-amber-500/15 text-amber-300 border-amber-600/40',
    icon: FileText
  },
  style: {
    label: 'Style',
    color: 'bg-slate-500/15 text-slate-300 border-slate-600/40',
    icon: Sparkles
  },
  nit: {
    label: 'Nit',
    color: 'bg-zinc-500/15 text-zinc-400 border-zinc-700/50',
    icon: HelpCircle
  },
};

const SEVERITY_CONFIG = {
  important: {
    label: 'Important',
    badge: 'bg-rose-950/80 text-rose-300 border-rose-500/60 shadow-sm shadow-rose-500/20',
    dot: 'bg-rose-500',
    cardBorder: 'border-rose-500/30 hover:border-rose-500/60 hover:shadow-rose-900/20'
  },
  suggestion: {
    label: 'Suggestion',
    badge: 'bg-amber-950/60 text-amber-300 border-amber-500/40',
    dot: 'bg-amber-400',
    cardBorder: 'border-amber-500/20 hover:border-amber-500/50'
  },
  minor: {
    label: 'Minor',
    badge: 'bg-zinc-900 text-zinc-400 border-zinc-700/50',
    dot: 'bg-zinc-400',
    cardBorder: 'border-border hover:border-zinc-700'
  },
};

export default function CommentCard({
  comment,
  index = 0,
  onJumpToLine,
  onMouseEnter,
  onMouseLeave,
  isHighlighted = false
}) {
  const [copied, setCopied] = useState(false);

  const catConfig = CATEGORY_CONFIG[comment.category] || CATEGORY_CONFIG.style;
  const sevConfig = SEVERITY_CONFIG[comment.severity] || SEVERITY_CONFIG.suggestion;
  const CatIcon = catConfig.icon;

  const handleCopy = (e) => {
    e.stopPropagation();
    const text = `**[${catConfig.label}]** ${comment.comment_text} (Line ${comment.line_number})`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJump = () => {
    if (onJumpToLine) {
      onJumpToLine(comment.file_path, comment.line_number);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.08, ease: 'easeOut' }}
      onMouseEnter={() => onMouseEnter && onMouseEnter(comment.file_path, comment.line_number)}
      onMouseLeave={() => onMouseLeave && onMouseLeave()}
      className={`group relative rounded-xl bg-surface/90 border p-4 transition-all duration-200 ${
        isHighlighted 
          ? 'border-indigo-500 ring-1 ring-indigo-500/30 bg-surface-highlight shadow-lg shadow-indigo-950/30' 
          : sevConfig.cardBorder
      }`}
    >
      {/* Top row: Category & Severity + Copy button */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          
          {/* Category Badge */}
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${catConfig.color}`}>
            <CatIcon className="w-3 h-3" />
            <span>{catConfig.label}</span>
          </span>

          {/* Severity Indicator */}
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono border ${sevConfig.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${sevConfig.dot} ${comment.severity === 'important' ? 'animate-ping' : ''}`} />
            <span className="capitalize">{sevConfig.label}</span>
          </span>

        </div>

        {/* Copy single comment button */}
        <button
          onClick={handleCopy}
          className="opacity-60 group-hover:opacity-100 p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-all text-xs flex items-center gap-1"
          title="Copy comment to clipboard"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Comment Body */}
      <div className="text-sm text-zinc-200 leading-relaxed font-sans mb-3">
        {comment.comment_text}
      </div>

      {/* Code snippet reference if available */}
      {comment.code_snippet && (
        <div className="mb-3 rounded-md bg-zinc-950/80 border border-zinc-800/80 px-3 py-1.5 font-mono text-xs text-zinc-300 overflow-x-auto">
          <span className="text-zinc-500 mr-2 select-none">$</span>
          <code>{comment.code_snippet}</code>
        </div>
      )}

      {/* Bottom row: File path, line anchor & Jump link */}
      <div className="flex items-center justify-between text-xs pt-2.5 border-t border-border/50 text-zinc-400 font-mono">
        <div className="flex items-center gap-1 truncate max-w-[70%]" title={comment.file_path}>
          <span className="truncate text-zinc-300">{comment.file_path}</span>
          <span className="text-indigo-400 font-semibold">:L{comment.line_number}</span>
        </div>

        <button
          onClick={handleJump}
          className="flex items-center gap-1 px-2 py-1 rounded bg-indigo-600/10 hover:bg-indigo-600/25 text-indigo-300 hover:text-indigo-200 border border-indigo-500/20 hover:border-indigo-500/40 text-[11px] transition-all font-sans font-medium"
        >
          <span>Jump to line</span>
          <CornerDownRight className="w-3 h-3" />
        </button>
      </div>

    </motion.div>
  );
}
