/**
 * engine/premium.js
 * 
 * Single source of truth for all monetization logic.
 * All gates derive from quizCount + isPremium.
 * 
 * Thresholds (change these values to tune monetization aggressiveness):
 *   ADS_THRESHOLD    → quiz # at which ads start appearing
 *   POPUP_THRESHOLD  → quiz # at which "Go Unlimited" popup starts
 *   POPUP_FREQUENCY  → show popup every N quizzes after threshold
 */

const PREMIUM_KEY   = 'itcertif_premium';
const QUIZ_COUNT_KEY = 'itcertif_quizCount';

const ADS_THRESHOLD    = 10;
const POPUP_THRESHOLD  = 15;
const POPUP_FREQUENCY  = 5;

// ─── Read state ───────────────────────────────────────────────────────────────

export function isPremium() {
  return localStorage.getItem(PREMIUM_KEY) === 'true';
}

export function getQuizCount() {
  return parseInt(localStorage.getItem(QUIZ_COUNT_KEY) || '0', 10);
}

// ─── Write state ──────────────────────────────────────────────────────────────

/** Call this once at the end of every completed quiz session */
export function incrementQuizCount() {
  const current = getQuizCount();
  localStorage.setItem(QUIZ_COUNT_KEY, String(current + 1));
}

/** Stub: call this from IAP success callback when payment is confirmed */
export function activatePremium() {
  localStorage.setItem(PREMIUM_KEY, 'true');
  console.log('[Premium] Activated');
}

// ─── Gate checks ──────────────────────────────────────────────────────────────

/** Should an interstitial ad be shown after this quiz? */
export function shouldShowAd() {
  if (isPremium()) return false;
  return getQuizCount() >= ADS_THRESHOLD;
}

/** Should the "Go Unlimited" popup be shown after this quiz? */
export function shouldShowPopup() {
  if (isPremium()) return false;
  const count = getQuizCount();
  if (count < POPUP_THRESHOLD) return false;
  return (count - POPUP_THRESHOLD) % POPUP_FREQUENCY === 0;
}

/** Should explanations ("Why you got it wrong") be shown? */
export function canSeeExplanations() {
  // Always free until in-app purchases actually ship. A locked explanation with
  // no working purchase path is a dead end, not a paywall. Re-gate here when IAP
  // lands (e.g. `return isPremium() || getQuizCount() < ADS_THRESHOLD;`).
  return true;
}
