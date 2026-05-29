/**
 * app.js — SPA router + mode picker modal
 */

import { render as renderHome }    from './screens/home.js';
import { render as renderQuiz, cleanup as cleanupQuiz } from './screens/quiz.js';
import { render as renderResults } from './screens/results.js';
import { initNotifications }       from './engine/notifications.js';
import { getHearts, refillHearts } from './engine/gamification.js';

const renderers = {
  home:    renderHome,
  quiz:    renderQuiz,
  results: renderResults,
};

const container = document.getElementById('screen-container');

/** Navigate to a screen with slide transition */
export function navigate(screen, params = {}) {
  if (!renderers[screen]) {
    console.error(`[Router] Unknown screen: "${screen}". Valid: ${Object.keys(renderers).join(', ')}`);
    return;
  }
  // Always clean up quiz timers when leaving any screen
  cleanupQuiz();
  container.classList.add('exiting');
  setTimeout(() => {
    container.classList.remove('exiting');
    container.innerHTML = '';
    renderers[screen](container, navigate, params);
    container.classList.add('entering');
    setTimeout(() => container.classList.remove('entering'), 400);
  }, 200);
}

/**
 * Show the mode picker modal before starting a quiz.
 * @param {object} pack      - pack metadata
 * @param {Array}  questions - loaded questions array
 */
export function showModePicker(pack, questions) {
  // Remove existing modal if any
  document.getElementById('mode-modal')?.remove();

  const QUICK_COUNT = 5;
  const STUDY_COUNT = 10;
  const DIAG_COUNT  = 10;
  const fullCount   = Math.min(questions.length, pack.full_count || questions.length);

  const modal = document.createElement('div');
  modal.id    = 'mode-modal';
  modal.innerHTML = `
    <div class="modal-backdrop" id="modal-backdrop"></div>
    <div class="modal-sheet">
      <div class="modal-handle"></div>

      <div class="modal-header">
        <div class="modal-pack-name">${pack.brandName || pack.name}</div>
        <div class="modal-pack-sub">${pack.name}</div>
      </div>

      <div class="modal-body">

        <button class="mode-card mode-card-diag" id="mode-diag">
          <div class="mode-icon">🧪</div>
          <div class="mode-info">
            <div class="mode-title">Diagnostic <span class="mode-badge-new">New · for first-timers</span></div>
            <div class="mode-desc">${DIAG_COUNT} questions across all topics · Get a personalized study plan</div>
          </div>
          <div class="mode-chevron">→</div>
        </button>

        <button class="mode-card" id="mode-quick">
          <div class="mode-icon">⚡</div>
          <div class="mode-info">
            <div class="mode-title">Quick Quiz</div>
            <div class="mode-desc">${QUICK_COUNT} random questions · ~2 min</div>
          </div>
          <div class="mode-chevron">→</div>
        </button>

        <button class="mode-card" id="mode-full">
          <div class="mode-icon">📋</div>
          <div class="mode-info">
            <div class="mode-title">Full Exam</div>
            <div class="mode-desc">${fullCount} questions · Exam simulation</div>
          </div>
          <div class="mode-chevron">→</div>
        </button>

        <button class="mode-card mode-card-study" id="mode-study">
          <div class="mode-icon">📖</div>
          <div class="mode-info">
            <div class="mode-title">Study Mode</div>
            <div class="mode-desc">${STUDY_COUNT} questions · No timer · Learn at your pace</div>
          </div>
          <div class="mode-chevron">→</div>
        </button>

      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Animate in
  requestAnimationFrame(() => {
    modal.querySelector('.modal-sheet').classList.add('visible');
    modal.querySelector('.modal-backdrop').classList.add('visible');
  });

  let backId = null;
  let closed = false;
  const close = (fromBack) => {
    if (closed) return;
    closed = true;
    const sheet = modal.querySelector('.modal-sheet');
    const backdrop = modal.querySelector('.modal-backdrop');
    sheet.classList.remove('visible');
    backdrop.classList.remove('visible');
    setTimeout(() => modal.remove(), 300);
    if (!fromBack && backId != null && window.cqBack) {
      window.cqBack.dismiss(backId);
    }
    backId = null;
  };
  if (window.cqBack) {
    backId = window.cqBack.push((fromBack) => close(fromBack));
  }

  modal.querySelector('#modal-backdrop').addEventListener('click', () => close());

  const startQuiz = (mode, count, customQuestions) => {
    // Diagnostic and study modes don't consume hearts (study currently doesn't either).
    const heartFreeMode = mode === 'study' || mode === 'diagnostic';
    if (!heartFreeMode && getHearts() <= 0) {
      showNoHeartsModal(modal, () => startQuiz(mode, count, customQuestions));
      return;
    }
    close();
    const qs = customQuestions || questions;
    setTimeout(() => navigate('quiz', { pack, questions: qs, mode, count }), 300);
  };

  modal.querySelector('#mode-quick').addEventListener('click', () => startQuiz('quick', QUICK_COUNT));
  modal.querySelector('#mode-full').addEventListener('click', () => startQuiz('full', fullCount));
  modal.querySelector('#mode-study').addEventListener('click', () => startQuiz('study', STUDY_COUNT));
  modal.querySelector('#mode-diag').addEventListener('click', () => {
    showDiagnosticIntro(modal, pack, () => {
      const sample = stratifiedSample(questions, DIAG_COUNT);
      startQuiz('diagnostic', sample.length, sample);
    });
  });
}

/**
 * Replace the mode-picker body with a diagnostic-intro framing screen.
 * Confirms the user actually wants the assessment experience (not just
 * a longer quiz) before sampling questions. Click "Start" → onConfirm().
 */
function showDiagnosticIntro(modal, pack, onConfirm) {
  const body = modal.querySelector('.modal-body');
  const header = modal.querySelector('.modal-header');
  if (!body || !header) { onConfirm(); return; }

  // Swap modal content; keep close-on-backdrop wiring intact.
  header.innerHTML = `
    <div class="modal-pack-name">🧪 Diagnostic test</div>
    <div class="modal-pack-sub">${pack.name}</div>
  `;
  body.innerHTML = `
    <div class="diag-intro">
      <p class="diag-intro-lede">This isn't a quiz — it's a placement test. We'll use your answers to build a personalized study plan.</p>
      <ul class="diag-intro-list">
        <li><strong>10 questions</strong> stratified across topics and difficulty</li>
        <li><strong>No time pressure</strong> — answer at your own pace</li>
        <li><strong>No hearts lost</strong> — wrong answers cost nothing</li>
        <li><strong>Be honest</strong> — guessing inflates the readiness signal</li>
      </ul>
      <p class="diag-intro-outro">Takes about 5–8 minutes. You'll get a per-topic breakdown, a readiness flag, and a recommended next step.</p>
      <div class="diag-intro-actions">
        <button class="diag-intro-back" type="button" id="diag-intro-back">← Pick another mode</button>
        <button class="diag-intro-start" type="button" id="diag-intro-start">Start diagnostic →</button>
      </div>
    </div>
  `;
  body.querySelector('#diag-intro-start').addEventListener('click', onConfirm);
  body.querySelector('#diag-intro-back').addEventListener('click', () => {
    // Re-rendering the picker would be heavy; the cheap fix is to close the
    // modal and let the user re-click their pack. Keeps app.js simple.
    modal.querySelector('#modal-backdrop')?.click();
  });
}

/**
 * Stratified sample for the diagnostic — balanced by both primary tag AND
 * difficulty (easy/medium/hard). Ensures the 10-question slice surfaces a
 * sharper readiness signal than a random or tag-only sample.
 *
 * Algorithm:
 *  1. Pass A: pick one (tag, difficulty) cell per pass; cycle until full.
 *     This gives broad coverage when a pack has many tags/difficulties.
 *  2. Pass B: backfill any remaining slots from leftovers.
 */
function isValidQuestion(q) {
  if (!q.options || q.options.length !== 4) return false;
  if (Array.isArray(q.correct)) {
    return q.correct.length >= 1 &&
           q.correct.every(i => Number.isInteger(i) && i >= 0 && i < 4);
  }
  return Number.isInteger(q.correct) && q.correct >= 0 && q.correct < 4;
}

function stratifiedSample(questions, count) {
  // Use the shared validity check so multi-select questions (correct is an
  // array) are no longer silently excluded from the diagnostic sample.
  const valid = questions.filter(isValidQuestion);
  if (valid.length <= count) return shuffle(valid);

  // Bucket by composite key "<primaryTag>::<difficulty>"
  const buckets = new Map();
  for (const q of valid) {
    const tag  = (q.tags && q.tags[0]) || '_untagged';
    const diff = q.difficulty || 'medium';
    const key  = `${tag}::${diff}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(q);
  }
  for (const arr of buckets.values()) shuffle(arr);

  const result = [];
  const used = new Set();
  const keys = shuffle([...buckets.keys()]);

  // Pass A: round-robin across (tag, difficulty) buckets until we have `count`.
  // Each pass takes at most one question per bucket — keeps tags and
  // difficulties spread out instead of clustered.
  let madeProgress = true;
  while (result.length < count && madeProgress) {
    madeProgress = false;
    for (const key of keys) {
      if (result.length >= count) break;
      const bucket = buckets.get(key);
      const pick = bucket.shift();
      if (pick) {
        result.push(pick);
        used.add(pick.id);
        madeProgress = true;
      }
    }
  }

  // Pass B: backfill (only triggers if total valid < count, but kept for safety)
  if (result.length < count) {
    const leftovers = valid.filter(q => !used.has(q.id));
    shuffle(leftovers);
    for (const q of leftovers) {
      if (result.length >= count) break;
      result.push(q);
    }
  }

  return result;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Show a blocking "out of hearts" modal inside the mode picker.
 * @param {HTMLElement} parentModal - the mode picker modal element
 * @param {Function} onRefill - callback to retry after refill
 */
function showNoHeartsModal(parentModal, onRefill) {
  // Remove existing if any
  parentModal.querySelector('.no-hearts-sheet')?.remove();

  const sheet = document.createElement('div');
  sheet.className = 'no-hearts-sheet';
  sheet.innerHTML = `
    <div style="text-align:center;padding:24px 20px">
      <div style="font-size:40px;margin-bottom:8px">💔</div>
      <div style="font-size:16px;font-weight:700;color:var(--text);margin-bottom:4px">Out of Hearts</div>
      <div style="font-size:13px;color:var(--text-secondary);margin-bottom:20px">
        Refill your hearts to start a quiz, or try Study Mode (no hearts needed).
      </div>
      <button class="btn-refill-hearts" id="btn-modal-refill">❤️ Refill Hearts</button>
    </div>
  `;
  parentModal.querySelector('.modal-sheet').appendChild(sheet);

  sheet.querySelector('#btn-modal-refill').addEventListener('click', () => {
    refillHearts();
    sheet.remove();
    onRefill();
  });
}

// ─── Boot ──────────────────────────────────────────────────────────────────────
initNotifications();
navigate('home');
