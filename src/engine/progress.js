/**
 * engine/progress.js
 * All user progress stored in localStorage.
 * Never throws — always returns safe defaults.
 */

const KEYS = {
  progress: 'itcertif_progress', // { [packId]: { attempts, bestScore, totalCorrect, totalQuestions } }
  history:  'itcertif_history',  // [{ packId, score, total, totalTime, date }]
  streak:   'itcertif_streak',
  streakDate: 'itcertif_streak_date',
};

// ─── Read ──────────────────────────────────────────────────────────────────────

export function getProgress() {
  try { return JSON.parse(localStorage.getItem(KEYS.progress) || '{}'); }
  catch { return {}; }
}

export function getHistory() {
  try { return JSON.parse(localStorage.getItem(KEYS.history) || '[]'); }
  catch { return []; }
}

export function getTotalQuizCount() {
  return getHistory().length;
}

export function getStreak() {
  // Auto-reset streak if last quiz was > 1 calendar day ago
  const lastDate = localStorage.getItem(KEYS.streakDate);
  const today    = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (lastDate && lastDate < yesterday) {
    // More than 1 day gap — streak broken
    localStorage.setItem(KEYS.streak, '0');
    localStorage.removeItem(KEYS.streakDate);
    return 0;
  }
  return parseInt(localStorage.getItem(KEYS.streak) || '0', 10);
}

export function getPackProgress(packId) {
  return getProgress()[packId] || null;
}

/** Returns true if the user has completed at least one quiz today */
export function hasQuizzedToday() {
  const today = new Date().toISOString().slice(0, 10);
  return localStorage.getItem(KEYS.streakDate) === today;
}

// ─── Write ─────────────────────────────────────────────────────────────────────

/**
 * Save result after a completed quiz.
 * @param {string} packId
 * @param {object} result - { score, total, totalTime }
 */
export function saveQuizResult(packId, result) {
  // Update aggregate progress
  const progress = getProgress();
  const p = progress[packId] || { attempts: 0, bestScore: 0, totalCorrect: 0, totalQuestions: 0 };

  p.attempts++;
  p.totalCorrect    += result.score;
  p.totalQuestions  += result.total;

  const pct = Math.round((result.score / result.total) * 100);
  if (pct > p.bestScore) p.bestScore = pct;

  progress[packId] = p;
  localStorage.setItem(KEYS.progress, JSON.stringify(progress));

  // Append to history (keep last 50) — field is totalTime for consistency with quizEngine
  const history = getHistory();
  history.unshift({ packId, ...result, date: Date.now() });
  if (history.length > 50) history.pop();
  localStorage.setItem(KEYS.history, JSON.stringify(history));

  // Update daily streak
  const today = new Date().toISOString().slice(0, 10);
  const lastDate = localStorage.getItem(KEYS.streakDate);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  if (lastDate === today) {
    // Already studied today — streak stays the same
  } else if (lastDate === yesterday) {
    // Studied yesterday and today — increment streak
    const current = parseInt(localStorage.getItem(KEYS.streak) || '0', 10);
    localStorage.setItem(KEYS.streak, String(current + 1));
    localStorage.setItem(KEYS.streakDate, today);
  } else {
    // First quiz ever, or streak broken — start fresh at 1
    localStorage.setItem(KEYS.streak, '1');
    localStorage.setItem(KEYS.streakDate, today);
  }
}
