/**
 * Helper to generate and maintain a persistent, privacy-preserving
 * session ID in localStorage for review history without requiring accounts.
 */
const SESSION_STORAGE_KEY = 'reviewmate_session_id';

export function getOrCreateSessionId() {
  let sessionId = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!sessionId) {
    sessionId = 'sess_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now().toString(36);
    localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  }
  return sessionId;
}

export function resetSessionId() {
  const newSessionId = 'sess_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now().toString(36);
  localStorage.setItem(SESSION_STORAGE_KEY, newSessionId);
  return newSessionId;
}
