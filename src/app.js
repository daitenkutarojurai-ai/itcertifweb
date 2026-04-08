/**
 * app.js — SPA router + mode picker modal
 */

import { render as renderHome }    from './screens/home.js';
import { render as renderQuiz, cleanup as cleanupQuiz } from './screens/quiz.js';
import { render as renderResults } from './screens/results.js';
import { initNotifications }       from './engine/notifications.js';

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

  modal.querySelector('#mode-quick').addEventListener('click', () => {
    close();
    setTimeout(() => navigate('quiz', { pack, questions, mode: 'quick', count: QUICK_COUNT }), 300);
  });

  modal.querySelector('#mode-full').addEventListener('click', () => {
    close();
    setTimeout(() => navigate('quiz', { pack, questions, mode: 'full', count: fullCount }), 300);
  });

  modal.querySelector('#mode-study').addEventListener('click', () => {
    close();
    setTimeout(() => navigate('quiz', { pack, questions, mode: 'study', count: STUDY_COUNT }), 300);
  });
}

// ─── Boot ──────────────────────────────────────────────────────────────────────
initNotifications();
navigate('home');
