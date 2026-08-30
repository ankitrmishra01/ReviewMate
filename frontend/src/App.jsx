import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import ReviewScreen from './pages/ReviewScreen';
import HistorySidebar from './components/HistorySidebar';
import ModelStatsModal from './components/ModelStatsModal';
import { 
  generateCodeReview, 
  generateModelComparison, 
  fetchReviewHistory, 
  fetchReviewById, 
  fetchSampleDiffs,
  fetchModelStats
} from './lib/api';
import { CLIENT_SAMPLE_DIFFS } from './lib/sampleData';

export default function App() {
  const [currentView, setCurrentView] = useState('landing'); // 'landing' | 'review'
  const [reviewData, setReviewData] = useState(null);
  const [comparisonData, setComparisonData] = useState(null);
  const [isComparing, setIsComparing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // History Drawer state
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  const [sampleDiffs, setSampleDiffs] = useState(CLIENT_SAMPLE_DIFFS);

  // Model Stats Modal state
  const [isModelStatsOpen, setIsModelStatsOpen] = useState(false);
  const [modelStats, setModelStats] = useState(null);

  // Load history, sample diffs & model stats on initial mount
  useEffect(() => {
    loadHistory();
    loadSamples();
    loadModelStats();
  }, []);

  const loadHistory = async () => {
    try {
      const history = await fetchReviewHistory();
      setHistoryList(history || []);
    } catch (err) {
      console.warn("Could not load review history from backend:", err.message);
    }
  };

  const loadSamples = async () => {
    try {
      const samples = await fetchSampleDiffs();
      if (samples && samples.length > 0) {
        setSampleDiffs(samples);
      }
    } catch (err) {
      setSampleDiffs(CLIENT_SAMPLE_DIFFS);
    }
  };

  const loadModelStats = async () => {
    try {
      const stats = await fetchModelStats();
      if (stats) setModelStats(stats);
    } catch (err) {
      console.warn("Could not load model stats:", err.message);
    }
  };

  const handleGenerateReview = async ({ diffText, githubPrUrl, enableCompare }) => {
    setIsLoading(true);
    setError(null);

    // Explicitly reset previous review/comparison state to prevent stale data leaking
    setReviewData(null);
    setComparisonData(null);

    try {
      if (enableCompare) {
        // Run fresh comparison mode
        const compareResult = await generateModelComparison({ diffText, githubPrUrl });
        setComparisonData(compareResult);
        // Keep reviewData in exact sync with current diff
        setReviewData({
          id: compareResult.id,
          session_id: compareResult.session_id,
          created_at: new Date().toISOString(),
          diff_text: compareResult.diff_text,
          diff_summary: compareResult.diff_summary,
          comments: compareResult.finetuned_comments
        });
        setIsComparing(true);
        setCurrentView('review');
      } else {
        // Run standard review
        const result = await generateCodeReview({ diffText, githubPrUrl });
        setReviewData(result);
        setComparisonData(null);
        setIsComparing(false);
        setCurrentView('review');
      }
      // Refresh history list
      loadHistory();
    } catch (err) {
      console.error("Failed to generate review:", err);
      const msg = err.response?.data?.detail || err.message || "Failed to generate code review. Please check your diff.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectHistoryReview = async (reviewId) => {
    setIsLoading(true);
    setError(null);
    try {
      const fullReview = await fetchReviewById(reviewId);
      setReviewData(fullReview);
      setComparisonData(null); // Clear comparison data so it regenerates fresh if toggled
      setIsComparing(false);
      setCurrentView('review');
    } catch (err) {
      console.error("Failed to fetch historical review:", err);
      setError("Could not load selected review from history.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleCompare = async () => {
    if (isComparing) {
      setIsComparing(false);
    } else {
      // Check if comparisonData already matches the active diff
      const currentDiffText = reviewData?.diff_text;
      if (comparisonData && comparisonData.diff_text === currentDiffText) {
        setIsComparing(true);
      } else if (currentDiffText) {
        // Fetch fresh comparison specifically for the current diff
        setIsLoading(true);
        try {
          const comp = await generateModelComparison({ diffText: currentDiffText });
          setComparisonData(comp);
          setIsComparing(true);
        } catch (err) {
          console.error("Failed to generate comparison for active diff:", err);
        } finally {
          setIsLoading(false);
        }
      }
    }
  };

  const handleGoHome = () => {
    setCurrentView('landing');
    setError(null);
  };

  const handleNewReview = () => {
    setCurrentView('landing');
    setReviewData(null);
    setComparisonData(null);
    setIsComparing(false);
    setError(null);
  };

  const handleClearHistory = () => {
    setHistoryList([]);
  };

  return (
    <div className="min-h-screen bg-background text-zinc-100 flex flex-col font-sans">
      {/* Top Navigation */}
      <Navbar
        onGoHome={handleGoHome}
        onNewReview={handleNewReview}
        onToggleHistory={() => setIsHistoryOpen(true)}
        onOpenModelStats={() => setIsModelStatsOpen(true)}
        historyCount={historyList.length}
        currentView={currentView}
        isComparing={isComparing}
        onToggleCompare={handleToggleCompare}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {currentView === 'landing' ? (
          <Landing
            onGenerateReview={handleGenerateReview}
            isLoading={isLoading}
            error={error}
            sampleDiffs={sampleDiffs}
          />
        ) : (
          <ReviewScreen
            reviewData={reviewData}
            comparisonData={comparisonData}
            isComparing={isComparing}
            isLoading={isLoading}
            onToggleCompare={handleToggleCompare}
            onNewReview={handleNewReview}
          />
        )}
      </main>

      {/* Slide-over History Drawer */}
      <HistorySidebar
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={historyList}
        onSelectReview={handleSelectHistoryReview}
        activeReviewId={reviewData?.id}
        onClearHistory={handleClearHistory}
      />

      {/* Model Quality & Training Stats Modal */}
      <ModelStatsModal
        isOpen={isModelStatsOpen}
        onClose={() => setIsModelStatsOpen(false)}
        modelStats={modelStats}
      />
    </div>
  );
}
