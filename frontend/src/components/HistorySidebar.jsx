import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, History, FileCode, Clock, ArrowRight, Trash2, MessageSquare } from 'lucide-react';
import { resetSessionId } from '../lib/session';

export default function HistorySidebar({
  isOpen,
  onClose,
  history = [],
  onSelectReview,
  activeReviewId,
  onClearHistory
}) {
  const handleResetSession = () => {
    if (window.confirm("Start a brand new session? Previous session history will be cleared from this view.")) {
      resetSessionId();
      if (onClearHistory) onClearHistory();
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            className="fixed top-0 right-0 z-50 h-full w-full max-w-md bg-surface border-l border-border shadow-2xl flex flex-col"
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-surface-elevated">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-400" />
                <h2 className="font-semibold text-base text-zinc-100">Review History</h2>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                  {history.length}
                </span>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List of Reviews */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {history.length === 0 ? (
                <div className="text-center py-16 px-4">
                  <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-3">
                    <Clock className="w-6 h-6 text-zinc-600" />
                  </div>
                  <h4 className="text-sm font-medium text-zinc-300 mb-1">No reviews yet</h4>
                  <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                    Generate your first code review by pasting a unified diff or GitHub PR URL.
                  </p>
                </div>
              ) : (
                history.map((item) => {
                  const isActive = activeReviewId === item.id;
                  const dateStr = item.created_at
                    ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })
                    : 'Just now';

                  return (
                    <motion.div
                      key={item.id}
                      onClick={() => {
                        onSelectReview(item.id);
                        onClose();
                      }}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className={`cursor-pointer rounded-xl border p-4 transition-all ${
                        isActive
                          ? 'border-indigo-500 bg-indigo-950/20 shadow-md shadow-indigo-950/40'
                          : 'border-border bg-surface-card hover:border-zinc-700 hover:bg-surface-elevated'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 truncate">
                          <FileCode className="w-4 h-4 text-indigo-400 shrink-0" />
                          <span className="font-mono text-xs font-semibold text-zinc-200 truncate" title={item.primary_file}>
                            {item.primary_file || (item.diff_summary?.files?.[0] || 'code_diff')}
                          </span>
                        </div>
                        <span className="text-[11px] text-zinc-400 font-mono shrink-0">
                          {dateStr}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-zinc-400 font-mono pt-1">
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-400">+{item.diff_summary?.additions || 0}</span>
                          <span className="text-rose-400">-{item.diff_summary?.deletions || 0}</span>
                          <span className="text-zinc-600">|</span>
                          <span className="flex items-center gap-1 text-indigo-300">
                            <MessageSquare className="w-3 h-3" />
                            {item.comment_count} comments
                          </span>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Footer Actions */}
            {history.length > 0 && (
              <div className="p-4 border-t border-border bg-surface-elevated flex items-center justify-between">
                <button
                  onClick={handleResetSession}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 border border-rose-900/40 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Reset Session</span>
                </button>

                <span className="text-[11px] text-zinc-400 font-mono">
                  Stored in local session
                </span>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
