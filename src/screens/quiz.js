/**
 * screens/quiz.js — Duolingo-style quiz with feedback panel, segmented progress
 */

import {
  createQuiz, answerQuestion, timeoutQuestion,
  nextQuestion, isComplete, getResults,
  isMultiSelect, isAnswerCorrect,
} from '../engine/quizEngine.js';
import { canSeeExplanations, incrementQuizCount, shouldShowAd, shouldShowPopup } from '../engine/premium.js';
import { saveQuizResult, getTotalQuizCount } from '../engine/progress.js';
import { schedulePostQuizReminder } from '../engine/notifications.js';
import { playCorrect, playWrong, playTick, playTimeout, playCombo, playLevelUp, isSoundEnabled, toggleSound } from '../engine/sounds.js';
import {
  onCorrectAnswer, onWrongAnswer, resetSessionCombo, checkAchievements,
  getHearts, loseHeart, getMaxHearts, refillHearts, addDailyXP, updatePackMastery,
  getSessionXP,
} from '../engine/gamification.js';

let quiz               = null;
let timerInterval      = null;
let timeLeft           = 30;
let navigateFn         = null;
let packInfo           = null;
let quizMode           = 'full';
let originalQs         = [];
let answered           = false;
let maxCombo           = 0;
let sessionHearts      = 5;
let keydownController  = null;   // AbortController for keydown listener — prevents accumulation
let milestoneTimeouts  = [];     // Track milestone setTimeout ids so we can cancel them
let multiSelected      = new Set(); // Indices currently checked on a multi-select question
const TIMER_MAX        = 30;
// True for any "no-pressure" mode — hides timer, skips heart loss, lets the user see explanations.
const isStudyMode = () => quizMode === 'study' || quizMode === 'diagnostic';
const LETTERS     = ['A', 'B', 'C', 'D'];

// Pack JSON is trusted today, but the same template will ship user-contributed
// packs once Supabase auth lands. Escape every interpolation that lands in
// innerHTML so a stray "<img onerror=…>" in a question never executes.
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

// Non-modal toast — replaces blocking alert() so a tap doesn't freeze the
// main thread on mobile while the user waits for the OS dialog.
function showToast(text, ms = 2200) {
  const prev = document.getElementById('cq-quiz-toast');
  if (prev) prev.remove();
  const el = document.createElement('div');
  el.id = 'cq-quiz-toast';
  el.className = 'cq-quiz-toast';
  el.textContent = text;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('cq-quiz-toast--visible'));
  setTimeout(() => {
    el.classList.remove('cq-quiz-toast--visible');
    setTimeout(() => el.remove(), 300);
  }, ms);
}

const CORRECT_MSG = [
  { title: 'Correct! 🎯',        sub: 'Great job!' },
  { title: 'Excellent! ⚡',       sub: 'Keep it up!' },
  { title: 'You nailed it! 🔥',  sub: 'Impressive!' },
  { title: 'Perfect! ✨',        sub: 'Outstanding!' },
  { title: 'Spot on! 💡',        sub: 'Sharp thinking!' },
  { title: 'Brilliant! 🧠',      sub: 'You\'re mastering this!' },
];
const COMBO_MSG = [
  { title: 'On fire! 🔥🔥',      sub: 'You\'re on a streak!' },
  { title: 'Unstoppable! 🚀',    sub: 'Nothing can stop you!' },
  { title: 'Legendary! 🌟',      sub: 'Absolutely crushing it!' },
];
const WRONG_MSG = [
  { title: 'Almost! 💪',          sub: 'Check the explanation below.' },
  { title: 'Not quite! 📖',       sub: 'Learning is a process!' },
  { title: 'Keep going! 🧠',      sub: 'Mistakes help you learn!' },
  { title: 'Oops! 😅',            sub: 'You\'ll get the next one!' },
];
const TIMEOUT_MSG = [
  { title: 'Time\'s up! ⏱',      sub: 'Review the correct answer.' },
  { title: 'Too slow! ⏰',        sub: 'Try to answer faster next time.' },
];

/** Clean up all quiz state — call when leaving quiz screen */
export function cleanup() {
  clearInterval(timerInterval);
  timerInterval = null;

  // Abort the keydown listener to prevent stale handlers on re-entry
  if (keydownController) { keydownController.abort(); keydownController = null; }

  // Cancel any pending milestone popups that might fire on the next screen
  milestoneTimeouts.forEach(id => clearTimeout(id));
  milestoneTimeouts = [];

  // Remove any overlays that were appended directly to body
  document.querySelectorAll(
    '.milestone-overlay, .lesson-complete-overlay, .levelup-overlay'
  ).forEach(el => el.remove());
}

export function render(container, navigate, params) {
  cleanup(); // ensure no leftover timer, listeners, and overlays from previous quiz
  navigateFn      = navigate;
  packInfo        = params.pack;
  quizMode        = params.mode || 'full';
  originalQs      = params.questions;
  maxCombo        = 0;
  milestoneTimeouts = [];
  sessionHearts   = getHearts();
  resetSessionCombo();
  MILESTONES_SHOWN.clear(); // reset milestone tracker for every new quiz

  quiz = createQuiz(params.questions, { count: params.count || params.questions.length });
  renderQuestion(container);
}

const MILESTONES_SHOWN = new Set();

function renderQuestion(container) {
  clearInterval(timerInterval);
  answered = false;
  timeLeft  = TIMER_MAX;
  multiSelected = new Set();

  const q     = quiz.questions[quiz.current];
  const total = quiz.questions.length;
  const idx   = quiz.current;
  const modeLabel = quizMode === 'quick' ? '⚡ Quick' : quizMode === 'study' ? '📖 Study' : quizMode === 'diagnostic' ? '🧪 Diagnostic' : '📋 Exam';

  // Milestone check — 33% and 66% of questions answered
  const pct = idx / total;
  if (pct >= 0.33 && !MILESTONES_SHOWN.has('33') && idx > 0) {
    MILESTONES_SHOWN.add('33');
    milestoneTimeouts.push(setTimeout(() => showMilestone('⚡', 'One third done!', 'Keep the momentum going!'), 100));
  }
  if (pct >= 0.66 && !MILESTONES_SHOWN.has('66')) {
    MILESTONES_SHOWN.add('66');
    milestoneTimeouts.push(setTimeout(() => showMilestone('🔥', 'Final stretch!', "You're almost done — push through!"), 100));
  }

  container.innerHTML = `
    <div class="screen quiz-screen" id="quiz-screen-root">

      <div class="quiz-topbar">
        <button class="btn-icon" id="btn-quit" title="Quit">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8l4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <div class="seg-progress-wrap">
          <div class="seg-progress-track">
            <div class="seg-progress-fill" id="seg-fill" style="width:${(idx / total) * 100}%"></div>
          </div>
          <span class="seg-counter">${idx + 1}/${total}</span>
        </div>
        <button class="btn-icon" id="btn-sound-quiz" title="Toggle sound" style="font-size:15px;opacity:0.8">
          ${isSoundEnabled() ? '🔊' : '🔇'}
        </button>
      </div>

      <div class="quiz-meta-row">
        <div class="hearts-row" id="hearts-row">${renderHearts(sessionHearts)}</div>
        <span class="quiz-mode-tag">${modeLabel}</span>
        <div class="combo-badge hidden" id="combo-badge">🔥 <span id="combo-num">0</span>x</div>
      </div>

      <div class="timer-track" ${isStudyMode() ? 'style="display:none"' : ''}>
        <div class="timer-fill" id="timer-fill"></div>
      </div>

      <div class="question-area">
        <div class="question-meta-row">
          <span class="question-num-label">Q${idx + 1}</span>
          <span class="badge badge-${q.difficulty}">${q.difficulty}</span>
          ${q.tags?.length ? `<span class="badge badge-tag">${esc(q.tags[0])}</span>` : ''}
          ${isMultiSelect(q) ? `<span class="badge badge-multi">Pick ${q.correct.length}</span>` : ''}
        </div>
        <div class="question-text">${esc(q.question)}</div>
        ${isMultiSelect(q) ? `<div class="multi-hint">Select <b>${q.correct.length}</b> answers, then submit.</div>` : ''}
      </div>

      <div class="options-area ${isMultiSelect(q) ? 'multi-select' : ''}" id="options-area">
        ${q.options.map((opt, i) => `
          <div class="answer-option" data-index="${i}" role="${isMultiSelect(q) ? 'checkbox' : 'button'}" aria-checked="false" tabindex="0">
            <span class="option-letter">${isMultiSelect(q) ? '☐' : LETTERS[i]}</span>
            <span class="option-text">${esc(opt)}</span>
            <span class="option-check" id="check-${i}" style="display:none"></span>
          </div>
        `).join('')}
      </div>

      ${isMultiSelect(q) ? `
        <button class="btn-submit-multi" id="btn-submit-multi" disabled>
          Submit (<span id="multi-count">0</span>/${q.correct.length})
        </button>
      ` : ''}

      <div id="xp-anchor" style="position:relative;height:0;overflow:visible"></div>

      <div class="feedback-panel" id="feedback-panel" style="display:none">
        <div class="feedback-header">
          <span class="feedback-icon" id="feedback-icon"></span>
          <div class="feedback-text">
            <div class="feedback-title" id="feedback-title"></div>
            <div class="feedback-sub" id="feedback-sub"></div>
          </div>
        </div>
        <div class="feedback-explanation" id="feedback-explanation" style="display:none"></div>
        <button class="btn-feedback-next" id="btn-next">
          ${idx + 1 === total ? (quizMode === 'quick' ? 'See Score' : quizMode === 'study' ? 'Done' : quizMode === 'diagnostic' ? 'See your plan' : 'See Results') : 'Continue'} →
        </button>
      </div>

    </div>
  `;

  attachQuizListeners(container);
  if (!isStudyMode()) startTimer(container);

  // Entrance animations
  const qa = container.querySelector('.question-area');
  if (qa) qa.classList.add('question-enter');

  // Stagger options
  container.querySelectorAll('.answer-option').forEach((opt, i) => {
    opt.classList.add('option-enter');
    opt.style.animationDelay = `${i * 55 + 80}ms`;
  });
}

function startTimer(container) {
  updateTimerUI(container);
  timerInterval = setInterval(() => {
    timeLeft--;
    updateTimerUI(container);
    if (timeLeft <= 5 && timeLeft > 0) playTick();
    if (timeLeft <= 0) { clearInterval(timerInterval); handleTimeout(container); }
  }, 1000);
}

function updateTimerUI(container) {
  const fill = container.querySelector('#timer-fill');
  if (!fill) return;
  fill.style.width = `${(timeLeft / TIMER_MAX) * 100}%`;
  fill.classList.toggle('warning', timeLeft <= 10 && timeLeft > 5);
  fill.classList.toggle('danger',  timeLeft <= 5);
}

function handleTimeout(container) {
  if (answered) return;
  playTimeout();
  timeoutQuestion(quiz);
  answered = true;
  onWrongAnswer();
  if (!isStudyMode()) animateLoseHeart(container);

  const root = container.querySelector('#quiz-screen-root');
  const flash = document.createElement('div');
  flash.className = 'timeout-flash';
  root.appendChild(flash);
  setTimeout(() => flash.remove(), 600);

  revealAnswers(container, -1, 'timeout');
}

function handleAnswer(container, selected) {
  if (answered) return;
  clearInterval(timerInterval);
  answered = true;

  const q         = quiz.questions[quiz.current];
  const isCorrect = isAnswerCorrect(q.correct, selected);
  answerQuestion(quiz, selected);

  // For particle spawn / single-pick reveal we still need a representative index
  const repIndex = Array.isArray(selected) ? (selected[0] ?? -1) : selected;

  if (isCorrect) {
    const { xpEarned, combo, multiplier, levelUp, newLevel } = onCorrectAnswer(q.difficulty);
    if (combo > maxCombo) maxCombo = combo;
    playCorrect();
    if (combo >= 2) setTimeout(() => playCombo(combo), 200);
    if (levelUp)    setTimeout(() => { playLevelUp(); showLevelUpOverlay(container, newLevel); }, 500);
    spawnXpFloat(container, xpEarned, multiplier);
    if (repIndex >= 0) spawnParticles(container, repIndex);
    updateComboBadge(container, combo);
    revealAnswers(container, selected, 'correct', combo);
  } else {
    onWrongAnswer();
    playWrong();
    updateComboBadge(container, 0);
    if (!isStudyMode()) animateLoseHeart(container);
    revealAnswers(container, selected, 'wrong');
  }
}

function toggleMultiOption(container, idx) {
  if (answered) return;
  const q = quiz.questions[quiz.current];
  if (!isMultiSelect(q)) return;
  const opt = container.querySelector(`.answer-option[data-index="${idx}"]`);
  if (!opt || opt.classList.contains('disabled')) return;

  if (multiSelected.has(idx)) {
    multiSelected.delete(idx);
    opt.classList.remove('multi-checked');
    opt.setAttribute('aria-checked', 'false');
    const letter = opt.querySelector('.option-letter');
    if (letter) letter.textContent = '☐';
  } else {
    if (multiSelected.size >= q.correct.length) return; // cap at expected count
    multiSelected.add(idx);
    opt.classList.add('multi-checked');
    opt.setAttribute('aria-checked', 'true');
    const letter = opt.querySelector('.option-letter');
    if (letter) letter.textContent = '☑';
  }
  const countEl = container.querySelector('#multi-count');
  const submit  = container.querySelector('#btn-submit-multi');
  if (countEl) countEl.textContent = multiSelected.size;
  if (submit)  submit.disabled = multiSelected.size !== q.correct.length;
}

function revealAnswers(container, selected, type, combo = 0) {
  const q = quiz.questions[quiz.current];
  const correctSet  = new Set(Array.isArray(q.correct) ? q.correct : [q.correct]);
  const selectedSet = new Set(
    Array.isArray(selected) ? selected
    : (typeof selected === 'number' && selected >= 0 ? [selected] : [])
  );

  container.querySelectorAll('.answer-option').forEach((opt, i) => {
    opt.classList.add('disabled');
    opt.classList.remove('multi-checked');
    const check = opt.querySelector(`#check-${i}`);
    const isCorrectOpt = correctSet.has(i);
    const wasPicked    = selectedSet.has(i);
    if (isCorrectOpt) {
      opt.classList.add(wasPicked ? 'correct' : 'reveal-correct');
      if (check) { check.textContent = '✓'; check.style.display = ''; }
    } else if (wasPicked) {
      opt.classList.add('wrong');
      if (check) { check.textContent = '✗'; check.style.display = ''; }
    }
  });

  // Hide the multi-select submit button now that the answer is locked
  const submit = container.querySelector('#btn-submit-multi');
  if (submit) submit.style.display = 'none';

  showFeedbackPanel(container, q, type, combo);
  animateProgressBar(container);
}

function showFeedbackPanel(container, q, type, combo) {
  const panel  = container.querySelector('#feedback-panel');
  const icon   = container.querySelector('#feedback-icon');
  const title  = container.querySelector('#feedback-title');
  const sub    = container.querySelector('#feedback-sub');
  const expBox = container.querySelector('#feedback-explanation');
  if (!panel) return;

  let msg;
  if (type === 'timeout') {
    msg = TIMEOUT_MSG[Math.floor(Math.random() * TIMEOUT_MSG.length)];
    panel.className = 'feedback-panel wrong-panel';
  } else if (type === 'correct') {
    msg = combo >= 3
      ? COMBO_MSG[Math.min(combo - 3, COMBO_MSG.length - 1)]
      : CORRECT_MSG[Math.floor(Math.random() * CORRECT_MSG.length)];
    panel.className = 'feedback-panel correct-panel';
  } else {
    msg = WRONG_MSG[Math.floor(Math.random() * WRONG_MSG.length)];
    panel.className = 'feedback-panel wrong-panel';
  }

  icon.textContent  = type === 'correct' ? '✓' : type === 'timeout' ? '⏱' : '✗';
  title.textContent = msg.title;
  sub.textContent   = msg.sub;

  // XP breakdown for correct answers
  if (type === 'correct') {
    const base = { easy: 8, medium: 12, hard: 18 }[q.difficulty] || 12;
    const mult = combo >= 5 ? 3 : combo >= 3 ? 2 : combo >= 2 ? 1.5 : 1;
    const xp   = Math.round(base * mult);
    const xpLine = document.createElement('div');
    xpLine.className = 'feedback-xp-line';
    xpLine.innerHTML = `<span class="feedback-xp-val">+${xp} XP</span>${mult > 1 ? `<span class="feedback-xp-mult">×${mult} combo</span>` : ''}`;
    sub.after(xpLine);
  }

  if (isStudyMode() || canSeeExplanations()) {
    expBox.textContent = q.explanation;
    expBox.style.display = '';
  } else {
    expBox.innerHTML = `<span class="lock-inline">🔒 <span class="unlock-link" id="btn-unlock">Unlock explanations with Premium</span></span>`;
    expBox.style.display = '';
    expBox.querySelector('#btn-unlock')?.addEventListener('click', () => showToast('Premium coming soon! 🎯'));
  }

  panel.style.display = '';
  requestAnimationFrame(() => panel.classList.add('panel-visible'));
}

function animateProgressBar(container) {
  const fill  = container.querySelector('#seg-fill');
  const total = quiz.questions.length;
  const done  = quiz.current + 1;
  if (!fill) return;
  fill.style.width = `${(done / total) * 100}%`;
}

function spawnXpFloat(container, xp, multiplier) {
  const anchor = container.querySelector('#xp-anchor');
  if (!anchor) return;
  const el = document.createElement('div');
  el.className = 'xp-float';
  el.textContent = multiplier > 1 ? `+${xp} XP ×${multiplier}` : `+${xp} XP`;
  el.style.cssText = `position:absolute;left:${30 + Math.random() * 40}%;top:-40px`;
  anchor.appendChild(el);
  setTimeout(() => el.remove(), 1100);
}

// Bounded set so a flurry of correct answers (combo run) can't pile up
// orphan particle nodes if the user navigates away mid-animation. Each
// particle is tracked; when the cap is hit, the oldest is evicted and
// its remove timer is cleared so it doesn't double-remove.
const PARTICLE_CAP = 36;
const activeParticles = [];
function spawnParticles(container, optionIndex) {
  const opt = container.querySelectorAll('.answer-option')[optionIndex];
  if (!opt) return;
  const colors = ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#fff'];
  const rect   = opt.getBoundingClientRect();
  for (let i = 0; i < 12; i++) {
    while (activeParticles.length >= PARTICLE_CAP) {
      const oldest = activeParticles.shift();
      if (oldest) { clearTimeout(oldest.tid); oldest.el.remove(); }
    }
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.cssText = `left:${rect.left + rect.width/2}px;top:${rect.top + rect.height/2}px;background:${colors[Math.floor(Math.random()*colors.length)]};--dx:${(Math.random()-.5)*140}px;--dy:${(Math.random()-.8)*120}px;`;
    document.body.appendChild(p);
    const entry = { el: p, tid: 0 };
    entry.tid = setTimeout(() => {
      p.remove();
      const idx = activeParticles.indexOf(entry);
      if (idx >= 0) activeParticles.splice(idx, 1);
    }, 700);
    activeParticles.push(entry);
  }
}

function updateComboBadge(container, combo) {
  const badge = container.querySelector('#combo-badge');
  const numEl = container.querySelector('#combo-num');
  if (!badge || !numEl) return;
  if (combo >= 2) {
    numEl.textContent = combo;
    badge.classList.remove('hidden');
    badge.classList.add('pop');
    setTimeout(() => badge.classList.remove('pop'), 400);
  } else {
    badge.classList.add('hidden');
  }
}

function showLevelUpOverlay(container, level) {
  const el = document.createElement('div');
  el.className = 'levelup-overlay levelup-transient';
  el.innerHTML = `<div class="levelup-card"><div class="levelup-icon">${level.icon}</div><div class="levelup-label">LEVEL UP!</div><div class="levelup-title">${level.title}</div></div>`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2200);
}

function renderHearts(count) {
  const max = getMaxHearts();
  return Array.from({ length: max }, (_, i) =>
    `<span class="heart ${i < count ? 'heart-full' : 'heart-empty'}">${i < count ? '❤️' : '🖤'}</span>`
  ).join('');
}

function animateLoseHeart(container) {
  sessionHearts = loseHeart();
  const row = container.querySelector('#hearts-row');
  if (row) {
    row.innerHTML = renderHearts(sessionHearts);
    row.querySelectorAll('.heart-full').forEach(h => h.classList.add('heart-shake'));
  }
  if (sessionHearts === 0) setTimeout(() => showNoHeartsOverlay(), 800);
}

function showNoHeartsOverlay() {
  const el = document.createElement('div');
  el.className = 'levelup-overlay no-hearts-overlay';
  el.innerHTML = `
    <div class="levelup-card" style="border-color:var(--wrong)">
      <div class="levelup-icon">💔</div>
      <div class="levelup-label" style="color:var(--wrong)">Out of Hearts</div>
      <div class="levelup-title" style="font-size:15px;font-weight:500;color:var(--text-secondary);margin-bottom:20px">
        You've run out of hearts!<br>Refill to keep going or come back later.
      </div>
      <div style="display:flex;flex-direction:column;gap:10px;width:100%">
        <button class="btn-refill-hearts" id="btn-refill">
          ❤️ Refill Hearts
        </button>
        <button class="btn-quit-hearts" id="btn-quit-hearts">
          Quit to Home
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(el);

  el.querySelector('#btn-refill').addEventListener('click', () => {
    refillHearts();
    sessionHearts = getMaxHearts();
    const row = document.querySelector('#hearts-row');
    if (row) row.innerHTML = renderHearts(sessionHearts);
    el.remove();
  });

  el.querySelector('#btn-quit-hearts').addEventListener('click', () => {
    el.remove();
    clearInterval(timerInterval);
    MILESTONES_SHOWN.clear();
    navigateFn('home');
  });
}

function showMilestone(emoji, title, sub) {
  const el = document.createElement('div');
  el.className = 'milestone-overlay';
  el.innerHTML = `<div class="milestone-card">
    <div class="milestone-emoji">${emoji}</div>
    <div class="milestone-title">${title}</div>
    <div class="milestone-sub">${sub}</div>
  </div>`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2000);
}

function showLessonComplete(xpEarned, onDone) {
  const msgs = [
    { emoji: '🏆', title: 'Lesson Complete!', sub: 'Outstanding work!' },
    { emoji: '🎉', title: 'Nailed It!', sub: 'Your knowledge is growing fast.' },
    { emoji: '🚀', title: 'Exam Done!', sub: 'You crushed this session.' },
  ];
  const m = msgs[Math.floor(Math.random() * msgs.length)];
  const el = document.createElement('div');
  el.className = 'lesson-complete-overlay';
  el.innerHTML = `
    <div class="lesson-complete-emoji">${m.emoji}</div>
    <div class="lesson-complete-title">${m.title}</div>
    <div class="lesson-complete-sub">${m.sub}</div>
    <div class="lesson-complete-xp">
      <div class="lesson-complete-xp-num">+${xpEarned} XP</div>
      <div class="lesson-complete-xp-label">earned this session</div>
    </div>
  `;
  document.body.appendChild(el);
  setTimeout(() => { el.remove(); onDone(); }, 1800);
}

function goNext(container) {
  nextQuestion(quiz);
  if (isComplete(quiz)) finishQuiz();
  else renderQuestion(container);
}

function finishQuiz() {
  clearInterval(timerInterval);
  MILESTONES_SHOWN.clear();
  incrementQuizCount();
  const results = getResults(quiz);
  saveQuizResult(packInfo.id, { score: results.score, total: results.total, totalTime: results.totalTime });
  updatePackMastery(packInfo.id, results.score, results.total);
  const { justCompleted: goalJustCompleted } = addDailyXP(getSessionXP());
  const totalSessionXP = getSessionXP();
  const quizCount = getTotalQuizCount();
  const newAchievements = checkAchievements({
    score: results.score, total: results.total,
    timeMs: results.totalTime, quizCount, maxCombo, mode: quizMode,
  });
  schedulePostQuizReminder(packInfo.name, results.score, results.total);
  // Stub gates — logging removed; wire to real ads/popup when implemented
  shouldShowAd();
  shouldShowPopup();

  // ─── Phase 2 player avatar: fire cq:session-complete ───
  // src/stats.js listens and updates XP + level. Failure-safe: stats.js may
  // not be loaded (e.g. embedded contexts), so we just dispatch — the DOM
  // event has no harmful side-effect if nothing listens.
  try {
    window.dispatchEvent(new CustomEvent('cq:session-complete', {
      detail: {
        packId: packInfo.id,
        secondsSpent: Math.round((results.totalTime || 0) / 1000),
        questionsAnswered: results.total,
        correct: results.score,
        mode: quizMode
      }
    }));
  } catch (_) { /* CustomEvent not supported in very old browsers — ignore */ }

  const doNavigate = () => navigateFn('results', {
    pack: packInfo, results, mode: quizMode,
    originalQuestions: originalQs, newAchievements, goalJustCompleted,
  });

  // Lesson complete screen for full exam only
  if (quizMode === 'full') {
    showLessonComplete(totalSessionXP, doNavigate);
  } else {
    doNavigate();
  }
}

function attachQuizListeners(container) {
  // Abort any previous keydown listener before attaching a new one
  if (keydownController) keydownController.abort();
  keydownController = new AbortController();
  const { signal } = keydownController;

  container.querySelector('#btn-quit')?.addEventListener('click', () => {
    const answeredCount = quiz?.answers?.length ?? 0;
    if (answeredCount > 0) {
      // Simple native confirm — non-blocking on mobile
      if (!window.confirm('Quit this quiz? Your progress will be lost.')) return;
    }
    clearInterval(timerInterval);
    MILESTONES_SHOWN.clear();
    navigateFn('home');
  });
  container.querySelector('#btn-sound-quiz')?.addEventListener('click', (e) => {
    const on = toggleSound();
    e.currentTarget.textContent = on ? '🔊' : '🔇';
  });
  container.querySelector('#options-area')?.addEventListener('click', e => {
    const opt = e.target.closest('.answer-option');
    if (!opt || opt.classList.contains('disabled')) return;
    const q = quiz.questions[quiz.current];
    const idx = parseInt(opt.dataset.index);
    if (isMultiSelect(q)) {
      toggleMultiOption(container, idx);
    } else {
      handleAnswer(container, idx);
    }
  });
  container.querySelector('#btn-submit-multi')?.addEventListener('click', () => {
    const q = quiz.questions[quiz.current];
    if (!isMultiSelect(q) || answered) return;
    if (multiSelected.size !== q.correct.length) return;
    handleAnswer(container, [...multiSelected]);
  });
  // Keyboard support: Enter / Space to submit, arrow keys to navigate options
  // Uses AbortController signal so this listener is removed before the next question renders
  container.addEventListener('keydown', e => {
    if (answered) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        container.querySelector('#btn-next')?.click();
      }
      return;
    }
    const opts = [...container.querySelectorAll('.answer-option:not(.disabled)')];
    if (!opts.length) return;
    const focused = document.activeElement?.closest('.answer-option');
    const currentIdx = opts.indexOf(focused);

    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      const next = opts[(currentIdx + 1) % opts.length];
      next?.focus();
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const prev = opts[(currentIdx - 1 + opts.length) % opts.length];
      prev?.focus();
    } else if ((e.key === 'Enter' || e.key === ' ') && focused) {
      e.preventDefault();
      const q = quiz.questions[quiz.current];
      const idx = parseInt(focused.dataset.index);
      if (isMultiSelect(q)) toggleMultiOption(container, idx);
      else handleAnswer(container, idx);
    } else if (['1','2','3','4'].includes(e.key)) {
      const idx = parseInt(e.key) - 1;
      const q = quiz.questions[quiz.current];
      if (opts[idx]) {
        const optIdx = parseInt(opts[idx].dataset.index);
        if (isMultiSelect(q)) toggleMultiOption(container, optIdx);
        else handleAnswer(container, optIdx);
      }
    }
  }, { signal });
  container.querySelector('#btn-next')?.addEventListener('click', () => goNext(container));
}
