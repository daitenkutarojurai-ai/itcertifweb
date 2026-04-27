/**
 * engine/emailReport.js — POST quiz results to the report API.
 *
 * The API is a small Cloudflare Worker that:
 *   1. Sends a personalized cheatsheet email (wrong questions + tips)
 *   2. Optionally subscribes the user to the Brevo newsletter list.
 *
 * Configure `REPORT_API_URL` once after deploying the worker. While unset
 * (empty string), the UI shows the form but submission is disabled with a
 * "feature unavailable" message — no silent failures.
 *
 * See docs/EMAIL_SETUP.md for the click-by-click setup.
 */

// Set to '' to disable the email card (worker offline / maintenance).
// Worker source: github.com/daitenkutarojurai-ai/IT-certif (worker/src/index.js).
export const REPORT_API_URL = 'https://itcertifweb.daitenkutarojurai.workers.dev/quiz-report';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isApiConfigured() {
  return typeof REPORT_API_URL === 'string' && REPORT_API_URL.startsWith('http');
}

export function isValidEmail(email) {
  return typeof email === 'string' && EMAIL_RE.test(email.trim());
}

/**
 * Build the minimum payload needed by the worker. We strip large fields the
 * worker doesn't need (full option arrays for correct answers, etc.) to keep
 * the request small — the worker re-renders the cheatsheet from this.
 */
function buildPayload({ email, subscribe, results, packId, packName, mode }) {
  const wrong = (results.answers || [])
    .filter(a => !a.isCorrect)
    .map(a => ({
      question: a.question?.question ?? '',
      options: a.question?.options ?? [],
      correct: a.correct,
      selected: a.selected,
      explanation: a.question?.explanation ?? '',
      tags: a.question?.tags ?? [],
      difficulty: a.question?.difficulty ?? 'medium',
    }));

  return {
    email: email.trim().toLowerCase(),
    subscribe: !!subscribe,
    packId: packId ?? '',
    packName: packName ?? '',
    mode: mode ?? '',
    score: results.score ?? 0,
    total: results.total ?? 0,
    percentage: results.percentage ?? 0,
    wrong,
    // honeypot — must remain empty
    _hp: '',
  };
}

/**
 * Submit a quiz report. Returns { ok: boolean, message: string }.
 * Never throws — UI relies on the structured return value.
 */
export async function submitReport(input) {
  if (!isApiConfigured()) {
    return { ok: false, message: 'Email feature not configured yet.' };
  }
  if (!isValidEmail(input.email)) {
    return { ok: false, message: 'Please enter a valid email address.' };
  }

  try {
    const res = await fetch(REPORT_API_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(buildPayload(input)),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return {
        ok: false,
        message: text && text.length < 200 ? text : 'Could not send the report. Please try again later.',
      };
    }
    return { ok: true, message: input.subscribe
      ? 'Cheatsheet sent — and you\'re on the newsletter. Check your inbox!'
      : 'Cheatsheet sent — check your inbox!' };
  } catch (_err) {
    return { ok: false, message: 'Network error. Please try again.' };
  }
}
