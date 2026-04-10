/**
 * screens/quiz.js — Duolingo-style quiz with feedback panel, segmented progress
 */

import {
  createQuiz, answerQuestion, timeoutQuestion,
  nextQuestion, isComplete, getResults,
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

let quiz          = null;
let timerInterval = null;
let timeLeft      = 30;
let navigateFn    = null;
let packInfo      = null;
let quizMode      = 'full';
let originalQs    = [];
let answered      = false;
let maxCombo      = 0;
let sessionHearts = 5;
const TIMER_MAX   = 30;
const isStudyMode = () => quizMode === 'study';
const LETTERS     = ['A', 'B', 'C', 'D'];

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

/** Clean up any running timer — call when leaving quiz screen */
export function cleanup() {
  clearInterval(timerInterval);
  timerInterval = null;
}

export function render(container, navigate, params) {
  cleanup(); // ensure no leftover timer from previous quiz
  navigateFn = navigate;
  packInfo   = params.pack;
  quizMode   = params.mode || 'full';
  originalQs = params.questions;
  maxCombo   = 0;
  sessionHearts = getHearts();
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

  const q     = quiz.questions[quiz.current];
  const total = quiz.questions.length;
  const idx   = quiz.current;
  const modeLabel = quizMode === 'quick' ? '⚡ Quick' : quizMode === 'study' ? '📖 Study' : '📋 Exam';

  // Milestone check — 33% and 66% of questions answered
  const pct = idx / total;
  if (pct >= 0.33 && !MILESTONES_SHOWN.has('33') && idx > 0) {
    MILESTONES_SHOWN.add('33');
    setTimeout(() => showMilestone('⚡', 'One third done!', 'Keep the momentum going!'), 100);
  }
  if (pct >= 0.66 && !MILESTONES_SHOWN.has('66')) {
    MILESTONES_SHOWN.add('66');
    setTimeout(() => showMilestone('🔥', 'Final stretch!', "You're almost done — push through!"), 100);
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
          ${q.tags?.length ? `<span class="badge badge-tag">${q.tags[0]}</span>` : ''}
        </div>
        <div class="question-text">${q.question}</div>
      </div>

      <div class="options-area" id="options-area">
        ${q.options.map((opt, i) => `
          <div class="answer-option" data-index="${i}" role="button" tabindex="0">
            <span class="option-letter">${LETTERS[i]}</span>
            <span class="option-text">${opt}</span>
            <span class="option-check" id="check-${i}" style="display:none"></span>
          </div>
        `).join('')}
      </div>

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
          ${idx + 1 === total ? (quizMode === 'quick' ? 'See Score' : quizMode === 'study' ? 'Done' : 'See Results') : 'Continue'} →
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

function handleAnswer(container, selectedIndex) {
  if (answered) return;
  clearInterval(timerInterval);
  answered = true;

  const q         = quiz.questions[quiz.current];
  const isCorrect = selectedIndex === q.correct;
  answerQuestion(quiz, selectedIndex);

  if (isCorrect) {
    const { xpEarned, combo, multiplier, levelUp, newLevel } = onCorrectAnswer(q.difficulty);
    if (combo > maxCombo) maxCombo = combo;
    playCorrect();
    if (combo >= 2) setTimeout(() => playCombo(combo), 200);
    if (levelUp)    setTimeout(() => { playLevelUp(); showLevelUpOverlay(container, newLevel); }, 500);
    spawnXpFloat(container, xpEarned, multiplier);
    spawnParticles(container, selectedIndex);
    updateComboBadge(container, combo);
    revealAnswers(container, selectedIndex, 'correct', combo);
  } else {
    onWrongAnswer();
    playWrong();
    updateComboBadge(container, 0);
    if (!isStudyMode()) animateLoseHeart(container);
    revealAnswers(container, selectedIndex, 'wrong');
  }
}

function revealAnswers(container, selectedIndex, type, combo = 0) {
  const q = quiz.questions[quiz.current];

  container.querySelectorAll('.answer-option').forEach((opt, i) => {
    opt.classList.add('disabled');
    const check = opt.querySelector(`#check-${i}`);
    if (i === q.correct) {
      opt.classList.add(type === 'correct' && selectedIndex === i ? 'correct' : 'reveal-correct');
      if (check) { check.textContent = '✓'; check.style.display = ''; }
    } else if (i === selectedIndex) {
      opt.classList.add('wrong');
      if (check) { check.textContent = '✗'; check.style.display = ''; }
    }
  });

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
    expBox.querySelector('#btn-unlock')?.addEventListener('click', () => alert('Premium coming soon! 🎯'));
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

function spawnParticles(container, optionIndex) {
  const opt = container.querySelectorAll('.answer-option')[optionIndex];
  if (!opt) return;
  const colors = ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#fff'];
  const rect   = opt.getBoundingClientRect();
  for (let i = 0; i < 12; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.cssText = `left:${rect.left + rect.width/2}px;top:${rect.top + rect.height/2}px;background:${colors[Math.floor(Math.random()*colors.length)]};--dx:${(Math.random()-.5)*140}px;--dy:${(Math.random()-.8)*120}px;`;
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 700);
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
  if (shouldShowAd())    console.log('[Ads] Would show interstitial');
  if (shouldShowPopup()) console.log('[Premium] Would show popup');

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
    if (opt && !opt.classList.contains('disabled'))
      handleAnswer(container, parseInt(opt.dataset.index));
  });
  // Keyboard support: Enter / Space to submit, arrow keys to navigate options
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
      handleAnswer(container, parseInt(focused.dataset.index));
    } else if (['1','2','3','4'].includes(e.key)) {
      const idx = parseInt(e.key) - 1;
      if (opts[idx]) handleAnswer(container, parseInt(opts[idx].dataset.index));
    }
  });
  container.querySelector('#btn-next')?.addEventListener('click', () => goNext(container));
}
