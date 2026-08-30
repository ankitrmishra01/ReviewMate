import axios from 'axios';
import { getOrCreateSessionId } from './session';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 35000,
});

/**
 * Submits unified diff or GitHub PR URL to generate CodeT5 review comments
 */
export async function generateCodeReview({ diffText, githubPrUrl }) {
  const sessionId = getOrCreateSessionId();
  const payload = {
    session_id: sessionId,
    ...(diffText ? { diff_text: diffText } : {}),
    ...(githubPrUrl ? { github_pr_url: githubPrUrl } : {}),
  };

  const response = await apiClient.post('/api/review', payload);
  return response.data;
}

/**
 * Fetches review history for current browser session
 */
export async function fetchReviewHistory() {
  const sessionId = getOrCreateSessionId();
  const response = await apiClient.get(`/api/history?session_id=${encodeURIComponent(sessionId)}`);
  return response.data;
}

/**
 * Fetches a single review by its UUID
 */
export async function fetchReviewById(reviewId) {
  const response = await apiClient.get(`/api/history/${encodeURIComponent(reviewId)}`);
  return response.data;
}

/**
 * Generates Baseline (Zero-Shot) vs Fine-Tuned CodeT5 comparison review
 */
export async function generateModelComparison({ diffText, githubPrUrl }) {
  const sessionId = getOrCreateSessionId();
  const payload = {
    session_id: sessionId,
    ...(diffText ? { diff_text: diffText } : {}),
    ...(githubPrUrl ? { github_pr_url: githubPrUrl } : {}),
  };

  const response = await apiClient.post('/api/compare', payload);
  return response.data;
}

/**
 * Fetches curated sample diffs
 */
export async function fetchSampleDiffs() {
  const response = await apiClient.get('/api/samples');
  return response.data;
}

/**
 * Fetches model training & generation quality metrics (BLEU, ROUGE)
 */
export async function fetchModelStats() {
  const response = await apiClient.get('/api/model-stats');
  return response.data;
}
