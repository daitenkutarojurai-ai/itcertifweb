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
  const fullCount   = Math.min(questions.length, pack.full_count || questions.length);

  const modal = document.createElement('div');
  modal.id    = 'mode-modal';
  modal.innerHTML = `
    <div class="modal-backdrop" id="modal-backdrop"></div>
    <div class="modal-sheet">
      <div class="modal-handle"></div>

      <div class="modal-header">
        <div class="modal-pack-name">${pack.fullName || pack.name}</div>
        <div class="modal-pack-sub">${pack.name}</div>
      </div>

      <div class="modal-body">

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

  const close = () => {
    const sheet = modal.querySelector('.modal-sheet');
    const backdrop = modal.querySelector('.modal-backdrop');
    sheet.classList.remove('visible');
    backdrop.classList.remove('visible');
    setTimeout(() => modal.remove(), 300);
  };

  modal.querySelector('#modal-backdrop').addEventListener('click', close);

  const startQuiz = (mode, count) => {
    if (mode !== 'study' && getHearts() <= 0) {
      showNoHeartsModal(modal, () => startQuiz(mode, count));
      return;
    }
    close();
    setTimeout(() => navigate('quiz', { pack, questions, mode, count }), 300);
  };

  modal.querySelector('#mode-quick').addEventListener('click', () => startQuiz('quick', QUICK_COUNT));
  modal.querySelector('#mode-full').addEventListener('click', () => startQuiz('full', fullCount));
  modal.querySelector('#mode-study').addEventListener('click', () => startQuiz('study', STUDY_COUNT));
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
