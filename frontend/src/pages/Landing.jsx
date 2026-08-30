import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Sparkles, 
  GitPullRequest, 
  FileCode, 
  Layers, 
  ArrowRight, 
  Zap, 
  Bug, 
  CheckCircle, 
  AlertCircle,
  Clock,
  Terminal
} from 'lucide-react';
import { CLIENT_SAMPLE_DIFFS } from '../lib/sampleData';

export default function Landing({
  onGenerateReview,
  isLoading,
  error,
  sampleDiffs = CLIENT_SAMPLE_DIFFS
}) {
  const [inputMode, setInputMode] = useState('diff'); // 'diff' | 'github_pr'
  const [diffText, setDiffText] = useState('');
  const [githubPrUrl, setGithubPrUrl] = useState('');
  const [enableCompare, setEnableCompare] = useState(false);
  const [selectedSampleId, setSelectedSampleId] = useState(null);

  // Count lines in diffText
  const diffLines = diffText ? diffText.trim().split('\n').length : 0;
  const isDiffTooLarge = diffLines > 500;

  const handleSelectSample = (sample) => {
    setInputMode('diff');
    setDiffText(sample.diff_text);
    setSelectedSampleId(sample.id);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputMode === 'diff' && !diffText.trim()) return;
    if (inputMode === 'github_pr' && !githubPrUrl.trim()) return;

    onGenerateReview({
      diffText: inputMode === 'diff' ? diffText : null,
      githubPrUrl: inputMode === 'github_pr' ? githubPrUrl : null,
      enableCompare
    });
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-10">
      
      {/* Hero Header */}
      <div className="max-w-3xl text-center mb-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-mono mb-4"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>DLNLP Mini-Project • Fine-Tuned CodeT5 Serving</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white font-sans"
        >
          Get Instant, Human-Style <br />
          <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-cyan-300 bg-clip-text text-transparent">
            Code Review Comments
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-3 text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed"
        >
          Trained on real GitHub pull request reviews. Paste a unified diff or public GitHub PR to generate line-anchored, categorized, and severity-scored feedback.
        </motion.p>
      </div>

      {/* Main Input Form Container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="w-full max-w-3xl rounded-2xl bg-surface border border-border shadow-2xl p-6 relative overflow-hidden"
      >
        {/* Shimmer accent line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-60" />

        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Input Mode Selector: Paste Diff vs GitHub PR */}
          <div className="flex items-center justify-between border-b border-border/80 pb-3">
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-900 border border-zinc-800">
              <button
                type="button"
                onClick={() => setInputMode('diff')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  inputMode === 'diff'
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Unified Diff</span>
              </button>

              <button
                type="button"
                onClick={() => setInputMode('github_pr')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  inputMode === 'github_pr'
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <GitPullRequest className="w-3.5 h-3.5" />
                <span>GitHub PR URL</span>
              </button>
            </div>

            {/* Model Comparison Checkbox */}
            <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-400 hover:text-zinc-200 select-none">
              <input
                type="checkbox"
                checked={enableCompare}
                onChange={(e) => setEnableCompare(e.target.checked)}
                className="rounded border-zinc-700 bg-zinc-900 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>Model Ablation Mode</span>
              </span>
            </label>
          </div>

          {/* Diff Input View */}
          {inputMode === 'diff' ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
                <span>Paste your git diff snippet:</span>
                <span className={`${isDiffTooLarge ? 'text-rose-400 font-bold' : 'text-zinc-500'}`}>
                  {diffLines} / 500 lines {isDiffTooLarge && '(Diff too large!)'}
                </span>
              </div>

              <div className="relative">
                <textarea
                  rows={9}
                  value={diffText}
                  onChange={(e) => {
                    setDiffText(e.target.value);
                    setSelectedSampleId(null);
                  }}
                  placeholder={`diff --git a/services/auth.js b/services/auth.js\n--- a/services/auth.js\n+++ b/services/auth.js\n@@ -10,4 +10,6 @@\n-  const valid = checkToken(token);\n+  const query = "SELECT * FROM users WHERE token = '" + token + "'";\n+  db.execute(query);`}
                  className={`w-full rounded-xl bg-[#0C0C0E] border px-4 py-3 font-mono text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 leading-relaxed transition-all ${
                    isDiffTooLarge
                      ? 'border-rose-500 focus:ring-rose-500'
                      : 'border-border focus:border-indigo-500 focus:ring-indigo-500/20'
                  }`}
                  required={inputMode === 'diff'}
                />
              </div>
            </div>
          ) : (
            /* GitHub PR URL Input View */
            <div className="space-y-2">
              <label className="block text-xs font-medium text-zinc-300">
                Public GitHub Pull Request URL:
              </label>
              <div className="relative">
                <input
                  type="url"
                  value={githubPrUrl}
                  onChange={(e) => setGithubPrUrl(e.target.value)}
                  placeholder="https://github.com/facebook/react/pull/28000"
                  className="w-full rounded-xl bg-[#0C0C0E] border border-border px-4 py-3 font-mono text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                  required={inputMode === 'github_pr'}
                />
              </div>
              <p className="text-[11px] text-zinc-500 font-mono">
                * Note: Only public repositories are supported. No authentication required.
              </p>
            </div>
          )}

          {/* Sample Diffs Picker */}
          <div className="pt-2">
            <div className="flex items-center gap-1 text-xs text-zinc-400 mb-2 font-mono">
              <Terminal className="w-3.5 h-3.5 text-indigo-400" />
              <span>Or click a pre-built sample diff to test immediately:</span>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {sampleDiffs.map((sample) => {
                const isSelected = selectedSampleId === sample.id;
                return (
                  <button
                    key={sample.id}
                    type="button"
                    onClick={() => handleSelectSample(sample)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 border ${
                      isSelected
                        ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500 shadow-sm shadow-indigo-500/30 font-semibold'
                        : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border-zinc-800'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                    <span>{sample.title}</span>
                    <span className="text-[10px] text-zinc-500">({sample.language})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl bg-rose-950/40 border border-rose-800/60 p-3.5 flex items-start gap-2.5 text-rose-300 text-xs"
            >
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block mb-0.5">Error Generating Review</span>
                <span className="text-rose-400/90">{error}</span>
              </div>
            </motion.div>
          )}

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading || (inputMode === 'diff' && isDiffTooLarge)}
              className={`w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-medium text-sm text-white transition-all shadow-lg ${
                isLoading || (inputMode === 'diff' && isDiffTooLarge)
                  ? 'bg-indigo-600/50 cursor-not-allowed opacity-70'
                  : 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 shadow-indigo-500/25 hover:shadow-indigo-500/40 active:scale-[0.99]'
              }`}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  <span>Serving CodeT5 Inference...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Code Review</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

        </form>
      </motion.div>

      {/* Feature Pillars Footer */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl w-full mt-8 text-xs text-zinc-400 font-mono">
        <div className="flex items-center gap-2 p-3 rounded-xl bg-surface/50 border border-border/60">
          <Bug className="w-4 h-4 text-rose-400 shrink-0" />
          <span>Rule-based Categorization & Severity Badging</span>
        </div>
        <div className="flex items-center gap-2 p-3 rounded-xl bg-surface/50 border border-border/60">
          <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>Fine-Tuned CodeT5 Deep Sequence-to-Sequence</span>
        </div>
        <div className="flex items-center gap-2 p-3 rounded-xl bg-surface/50 border border-border/60">
          <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>Zero-Auth Local Session History Persistence</span>
        </div>
      </div>

    </div>
  );
}
