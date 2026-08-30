import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Sparkles, 
  MessageSquare, 
  FileCode, 
  Layers, 
  Filter, 
  CheckCircle2, 
  Info,
  CornerDownRight
} from 'lucide-react';
import DiffViewer from '../components/DiffViewer';
import CommentCard from '../components/CommentCard';
import SkeletonCards from '../components/SkeletonCards';
import DiffStatsBar from '../components/DiffStatsBar';
import ComparisonToggle from '../components/ComparisonToggle';

export default function ReviewScreen({
  reviewData,
  comparisonData,
  isComparing = false,
  isLoading = false,
  onToggleCompare,
  onNewReview
}) {
  const [viewMode, setViewMode] = useState('unified'); // 'unified' | 'split'
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [highlightedLine, setHighlightedLine] = useState(null);
  const [activeJumpLine, setActiveJumpLine] = useState(null);

  const diffText = reviewData?.diff_text || comparisonData?.diff_text || '';
  const diffSummary = reviewData?.diff_summary || comparisonData?.diff_summary || {};
  const allComments = reviewData?.comments || comparisonData?.finetuned_comments || [];

  // Filter comments
  const filteredComments = allComments.filter((c) => {
    const matchCat = selectedCategory === 'all' || c.category === selectedCategory;
    const matchSev = selectedSeverity === 'all' || c.severity === selectedSeverity;
    return matchCat && matchSev;
  });

  const handleJumpToLine = (filePath, lineNumber) => {
    setActiveJumpLine({ filePath, lineNumber, timestamp: Date.now() });
    setHighlightedLine({ filePath, lineNumber });
  };

  const handleMouseEnterCard = (filePath, lineNumber) => {
    setHighlightedLine({ filePath, lineNumber });
  };

  const handleMouseLeaveCard = () => {
    setHighlightedLine(null);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-background">
      
      {/* Top Stats & Filter Bar */}
      <DiffStatsBar
        summary={diffSummary}
        comments={allComments}
        viewMode={viewMode}
        onToggleViewMode={setViewMode}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        selectedSeverity={selectedSeverity}
        onSelectSeverity={setSelectedSeverity}
        diffText={diffText}
      />

      {/* Main Split Layout: Left Diff Viewer / Right Comments & Ablation */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* Left Panel: Diff Viewer (60% standard, 45% when comparing) */}
        <div className={`h-full overflow-hidden flex flex-col border-r border-border/80 transition-all duration-300 ${
          isComparing ? 'md:w-[45%]' : 'md:w-[60%]'
        }`}>
          <DiffViewer
            diffText={diffText}
            viewMode={viewMode}
            highlightedLine={highlightedLine}
            activeJumpLine={activeJumpLine}
            comments={allComments}
          />
        </div>

        {/* Right Panel: Comments List or Model Comparison (40% standard, 55% when comparing) */}
        <div className={`h-full overflow-hidden flex flex-col bg-surface/40 transition-all duration-300 ${
          isComparing ? 'md:w-[55%]' : 'md:w-[40%]'
        }`}>
          {isComparing ? (
            /* Model Comparison / Ablation View */
            <ComparisonToggle
              baselineComments={comparisonData?.baseline_comments || []}
              finetunedComments={comparisonData?.finetuned_comments || allComments}
              onJumpToLine={handleJumpToLine}
              onMouseEnter={handleMouseEnterCard}
              onMouseLeave={handleMouseLeaveCard}
            />
          ) : (
            /* Standard Review Comments List View */
            <div className="flex flex-col h-full">
              
              {/* Comments Panel Header */}
              <div className="p-4 border-b border-border/80 bg-surface/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-indigo-400" />
                  <h3 className="font-semibold text-sm text-zinc-100 font-sans">
                    Review Comments
                  </h3>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                    {filteredComments.length}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-mono">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                  <span>CodeT5 Line-Anchored</span>
                </div>
              </div>

              {/* Scrollable Comments List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                {isLoading ? (
                  <SkeletonCards count={3} />
                ) : filteredComments.length === 0 ? (
                  <div className="text-center py-16 px-4">
                    <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-3">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                    </div>
                    <h4 className="text-sm font-medium text-zinc-200 mb-1">No comments match filter</h4>
                    <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                      Try selecting "All Categories" to view all generated review items.
                    </p>
                  </div>
                ) : (
                  filteredComments.map((comment, index) => {
                    const isCardHovered = highlightedLine &&
                      highlightedLine.lineNumber === comment.line_number &&
                      (!highlightedLine.filePath || highlightedLine.filePath === comment.file_path);

                    return (
                      <CommentCard
                        key={comment.id || index}
                        comment={comment}
                        index={index}
                        onJumpToLine={handleJumpToLine}
                        onMouseEnter={handleMouseEnterCard}
                        onMouseLeave={handleMouseLeaveCard}
                        isHighlighted={isCardHovered}
                      />
                    );
                  })
                )}
              </div>

            </div>
          )}
        </div>

      </div>

    </div>
  );
}
