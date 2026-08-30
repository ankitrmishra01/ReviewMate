import React, { useMemo, useEffect, useRef } from 'react';
import { FileCode, Plus, Minus, ArrowRight, CornerDownRight, MessageSquare } from 'lucide-react';

/**
 * Robust diff parser that structures unified diff text into files, hunks, and lines
 */
function parseRawDiffToStructure(rawDiff) {
  if (!rawDiff) return [];

  const lines = rawDiff.split('\n');
  const files = [];
  let currentFile = null;
  let currentHunk = null;
  let oldLineCounter = 1;
  let newLineCounter = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // File header detection
    if (line.startsWith('diff --git') || line.startsWith('--- ') || line.startsWith('+++ ')) {
      let fileName = 'modified_code';
      if (line.startsWith('+++ ') && !line.startsWith('+++ /dev/null')) {
        fileName = line.slice(4).trim().replace(/^b\//, '');
      } else if (line.startsWith('diff --git')) {
        const parts = line.split(' ');
        if (parts.length >= 4 && parts[3].startsWith('b/')) {
          fileName = parts[3].slice(2);
        }
      }

      if (!currentFile || (currentFile.fileName !== fileName && fileName !== 'modified_code')) {
        if (currentHunk && currentFile) {
          currentFile.hunks.push(currentHunk);
          currentHunk = null;
        }
        currentFile = {
          fileName: fileName || (currentFile ? currentFile.fileName : 'source_file'),
          hunks: []
        };
        files.push(currentFile);
      } else if (currentFile && fileName !== 'modified_code') {
        currentFile.fileName = fileName;
      }
      continue;
    }

    // Hunk header detection @@ -1,5 +1,6 @@
    if (line.startsWith('@@')) {
      if (currentHunk && currentFile) {
        currentFile.hunks.push(currentHunk);
      }
      if (!currentFile) {
        currentFile = { fileName: 'changes', hunks: [] };
        files.push(currentFile);
      }

      const match = line.match(/@@\s*-(\d+)(?:,\d+)?\s*\+(\d+)(?:,\d+)?\s*@@/);
      if (match) {
        oldLineCounter = parseInt(match[1], 10);
        newLineCounter = parseInt(match[2], 10);
      } else {
        oldLineCounter = 1;
        newLineCounter = 1;
      }

      currentHunk = {
        header: line,
        lines: []
      };
      continue;
    }

    if (!currentFile) {
      currentFile = { fileName: 'changes', hunks: [] };
      files.push(currentFile);
    }
    if (!currentHunk) {
      currentHunk = { header: '@@ -1,1 +1,1 @@', lines: [] };
    }

    // Line items
    if (line.startsWith('+')) {
      currentHunk.lines.push({
        type: 'addition',
        oldLineNumber: null,
        newLineNumber: newLineCounter++,
        content: line.slice(1),
        raw: line
      });
    } else if (line.startsWith('-')) {
      currentHunk.lines.push({
        type: 'deletion',
        oldLineNumber: oldLineCounter++,
        newLineNumber: null,
        content: line.slice(1),
        raw: line
      });
    } else {
      const content = line.startsWith(' ') ? line.slice(1) : line;
      currentHunk.lines.push({
        type: 'context',
        oldLineNumber: oldLineCounter++,
        newLineNumber: newLineCounter++,
        content: content,
        raw: line
      });
    }
  }

  if (currentHunk && currentFile) {
    currentFile.hunks.push(currentHunk);
  }

  return files.length > 0 ? files : [{
    fileName: 'diff_snippet',
    hunks: [{
      header: '@@ Snippet @@',
      lines: lines.map((l, idx) => ({
        type: l.startsWith('+') ? 'addition' : (l.startsWith('-') ? 'deletion' : 'context'),
        oldLineNumber: idx + 1,
        newLineNumber: idx + 1,
        content: l.replace(/^[+-]/, ''),
        raw: l
      }))
    }]
  }];
}

export default function DiffViewer({
  diffText,
  viewMode = 'unified',
  highlightedLine = null,
  activeJumpLine = null,
  comments = []
}) {
  const containerRef = useRef(null);

  const structuredFiles = useMemo(() => {
    return parseRawDiffToStructure(diffText);
  }, [diffText]);

  // Map comments by line number for comment indicators
  const commentsByLine = useMemo(() => {
    const map = new Map();
    comments.forEach(c => {
      const key = `${c.file_path}:${c.line_number}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(c);
    });
    return map;
  }, [comments]);

  // Handle jump to line scrolling & pulsing animation
  useEffect(() => {
    if (!activeJumpLine || !activeJumpLine.lineNumber) return;

    // Try finding exact element
    const selector = `[data-line-key="${activeJumpLine.filePath}:${activeJumpLine.lineNumber}"]`;
    const targetElement = document.querySelector(selector) || document.querySelector(`[data-new-line="${activeJumpLine.lineNumber}"]`);

    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      targetElement.classList.remove('line-highlight-pulse');
      void targetElement.offsetWidth; // Trigger reflow for restart
      targetElement.classList.add('line-highlight-pulse');
    }
  }, [activeJumpLine]);

  return (
    <div ref={containerRef} className="h-full overflow-y-auto font-mono text-xs select-text bg-[#0A0A0B]">
      {structuredFiles.map((file, fileIdx) => (
        <div key={fileIdx} className="border-b border-border/80 last:border-b-0">
          
          {/* File Header */}
          <div className="sticky top-0 z-20 flex items-center justify-between px-4 py-2 bg-[#121215] border-b border-border/70 text-zinc-300 font-sans text-xs">
            <div className="flex items-center gap-2 font-mono text-[13px] font-semibold text-zinc-200 truncate">
              <FileCode className="w-4 h-4 text-indigo-400 shrink-0" />
              <span className="truncate">{file.fileName}</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-mono">
              <span className="text-emerald-400">
                +{file.hunks.reduce((acc, h) => acc + h.lines.filter(l => l.type === 'addition').length, 0)}
              </span>
              <span className="text-rose-400">
                -{file.hunks.reduce((acc, h) => acc + h.lines.filter(l => l.type === 'deletion').length, 0)}
              </span>
            </div>
          </div>

          {/* Hunks */}
          {file.hunks.map((hunk, hunkIdx) => (
            <div key={hunkIdx}>
              {/* Hunk Header */}
              <div className="px-4 py-1 bg-zinc-900/60 text-zinc-400 font-mono text-[11px] border-b border-border/40 select-none">
                {hunk.header}
              </div>

              {/* Hunk Lines */}
              {viewMode === 'unified' ? (
                /* Unified View */
                <div className="divide-y divide-border/20">
                  {hunk.lines.map((line, lineIdx) => {
                    const lineKey = `${file.fileName}:${line.newLineNumber || line.oldLineNumber}`;
                    const lineComments = commentsByLine.get(lineKey) || (line.newLineNumber ? commentsByLine.get(`${file.fileName}:${line.newLineNumber}`) : null);
                    
                    const isHovered = highlightedLine && 
                      (highlightedLine.lineNumber === line.newLineNumber || highlightedLine.lineNumber === line.oldLineNumber) &&
                      (!highlightedLine.filePath || highlightedLine.filePath === file.fileName || file.fileName.includes(highlightedLine.filePath));

                    const lineBg = line.type === 'addition'
                      ? 'bg-emerald-950/25 hover:bg-emerald-950/40 text-emerald-300'
                      : line.type === 'deletion'
                      ? 'bg-rose-950/25 hover:bg-rose-950/40 text-rose-300'
                      : 'hover:bg-zinc-900/50 text-zinc-300';

                    const gutterMarker = line.type === 'addition' ? '+' : (line.type === 'deletion' ? '-' : ' ');

                    return (
                      <div
                        key={lineIdx}
                        data-line-key={lineKey}
                        data-new-line={line.newLineNumber}
                        data-old-line={line.oldLineNumber}
                        className={`flex items-stretch transition-colors group ${lineBg} ${isHovered ? 'line-hover-active' : ''}`}
                      >
                        {/* Old line number */}
                        <span className="w-12 py-1 pr-2 text-right text-[11px] text-zinc-400 select-none bg-zinc-950/40 border-r border-border/40 shrink-0 font-mono">
                          {line.oldLineNumber || ''}
                        </span>

                        {/* New line number */}
                        <span className="w-12 py-1 pr-2 text-right text-[11px] text-zinc-400 select-none bg-zinc-950/40 border-r border-border/40 shrink-0 font-mono">
                          {line.newLineNumber || ''}
                        </span>

                        {/* Marker + / - */}
                        <span className={`w-6 py-1 text-center select-none shrink-0 font-bold ${
                          line.type === 'addition' ? 'text-emerald-400' : (line.type === 'deletion' ? 'text-rose-400' : 'text-zinc-700')
                        }`}>
                          {gutterMarker}
                        </span>

                        {/* Line Code Content */}
                        <div className="flex-1 py-1 px-2 whitespace-pre overflow-x-auto font-mono text-[12px] leading-5">
                          {line.content || ' '}
                        </div>

                        {/* Comment indicator badge on line if comment attached */}
                        {lineComments && lineComments.length > 0 && (
                          <div className="pr-3 flex items-center shrink-0" title={`${lineComments.length} review comment(s) on this line`}>
                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[10px] font-sans font-medium">
                              <MessageSquare className="w-3 h-3 text-indigo-400" />
                              <span>{lineComments.length}</span>
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Split Side-by-Side View */
                <div className="divide-y divide-border/20">
                  {hunk.lines.map((line, lineIdx) => {
                    const lineKey = `${file.fileName}:${line.newLineNumber || line.oldLineNumber}`;
                    const isHovered = highlightedLine && 
                      (highlightedLine.lineNumber === line.newLineNumber || highlightedLine.lineNumber === line.oldLineNumber);

                    return (
                      <div
                        key={lineIdx}
                        data-line-key={lineKey}
                        data-new-line={line.newLineNumber}
                        className={`grid grid-cols-2 divide-x divide-border/40 ${isHovered ? 'line-hover-active' : ''}`}
                      >
                        {/* Left column: Old / Removed */}
                        <div className={`flex items-stretch ${
                          line.type === 'deletion' ? 'bg-rose-950/30 text-rose-300' : 'text-zinc-400'
                        }`}>
                          <span className="w-10 py-1 pr-2 text-right text-[11px] text-zinc-400 select-none bg-zinc-950/40 border-r border-border/30 shrink-0">
                            {line.oldLineNumber || ''}
                          </span>
                          <div className="flex-1 py-1 px-2 whitespace-pre overflow-x-auto text-[12px] leading-5">
                            {line.type !== 'addition' ? line.content : ''}
                          </div>
                        </div>

                        {/* Right column: New / Added */}
                        <div className={`flex items-stretch ${
                          line.type === 'addition' ? 'bg-emerald-950/30 text-emerald-300' : 'text-zinc-300'
                        }`}>
                          <span className="w-10 py-1 pr-2 text-right text-[11px] text-zinc-400 select-none bg-zinc-950/40 border-r border-border/30 shrink-0">
                            {line.newLineNumber || ''}
                          </span>
                          <div className="flex-1 py-1 px-2 whitespace-pre overflow-x-auto text-[12px] leading-5">
                            {line.type !== 'deletion' ? line.content : ''}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          ))}

        </div>
      ))}
    </div>
  );
}
