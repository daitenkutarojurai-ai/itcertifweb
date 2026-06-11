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

  const wrongCount = (input.results?.answers || []).filter(a => !a.isCorrect).length;
  const cheatsheetSent = wrongCount > 0;

  try {
    const res = await fetch(REPORT_API_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(buildPayload(input)),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      return {
        ok: false,
        message: (body && body.message) || 'Could not send the report. Please try again later.',
      };
    }
    let okMsg;
    if (cheatsheetSent && input.subscribe) okMsg = 'Cheatsheet sent — and you\'re on the newsletter. Check your inbox!';
    else if (cheatsheetSent)               okMsg = 'Cheatsheet sent — check your inbox!';
    else if (input.subscribe)              okMsg = 'You\'re on the newsletter — welcome aboard!';
    else                                   okMsg = 'Done — check your inbox!';
    return { ok: true, message: okMsg };
  } catch (_err) {
    return { ok: false, message: 'Network error. Please try again.' };
  }
}

/**
 * Newsletter-only signup. Posts the same /quiz-report endpoint with no
 * cheatsheet payload (worker reads `wrong:[]` → skip cheatsheet email,
 * `subscribe:true` → add to Brevo list).
 *
 * Used outside the quiz results screen (home, marketing pages) where there
 * is no cheatsheet to send — just a list signup.
 */
export async function submitNewsletter(email) {
  if (!isApiConfigured()) {
    return { ok: false, message: 'Newsletter signup not configured yet.' };
  }
  if (!isValidEmail(email)) {
    return { ok: false, message: 'Please enter a valid email address.' };
  }
  try {
    const res = await fetch(REPORT_API_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        subscribe: true,
        packId: '', packName: '', mode: '',
        score: 0, total: 0, percentage: 0,
        wrong: [],
        _hp: '',
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      return {
        ok: false,
        message: (body && body.message) || 'Could not subscribe. Please try again later.',
      };
    }
    return { ok: true, message: 'You\'re subscribed — welcome!' };
  } catch (_err) {
    return { ok: false, message: 'Network error. Please try again.' };
  }
}
