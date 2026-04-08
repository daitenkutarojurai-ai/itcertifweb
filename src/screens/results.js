/**
 * screens/results.js — Score, achievements, confetti, XP summary
 */

import { playComplete } from '../engine/sounds.js';
import { getCurrentLevel, getNextLevel, getLevelProgress } from '../engine/gamification.js';

const CIRCUMFERENCE = 2 * Math.PI * 52;
const LETTERS = ['A', 'B', 'C', 'D'];

export function render(container, navigate, params) {
  const { pack, results, mode, originalQuestions, newAchievements = [], goalJustCompleted = false } = params;

  container.innerHTML = buildHTML(pack, results, mode, newAchievements);
  attachListeners(container, navigate, params);

  setTimeout(() => {
    animateScore(results.percentage);
    playComplete(results.percentage);
    if (results.percentage >= 80) spawnConfetti();
    if (newAchievements.length > 0) showAchievements(newAchievements);
    if (goalJustCompleted) showGoalCompleteToast();
  }, 250);
}

// ─── HTML ──────────────────────────────────────────────────────────────────────

function buildHTML(pack, results, mode, newAchievements) {
  const isQuick    = mode === 'quick';
  const isStudy    = mode === 'study';
  const pct = results.percentage;
  const gradeClass = pct >= 80 ? 'excellent' : pct >= 70 ? 'good' : pct >= 50 ? 'average' : 'poor';
  const gradeLabel = pct >= 80 ? 'Excellent 🎉' : pct >= 70 ? 'Pass ✓' : pct >= 50 ? 'Almost there' : 'Keep studying';

  // Stars (1-3 based on score)
  const stars = pct >= 80 ? 3 : pct >= 60 ? 2 : pct >= 40 ? 1 : 0;
  const starsHTML = `<div class="stars-row">${
    [1,2,3].map(i => `<span class="star-item" style="opacity:${i <= stars ? 1 : 0.2}">${i <= stars ? '⭐' : '☆'}</span>`).join('')
  }</div>`;

  const level    = getCurrentLevel();
  const nextLevel = getNextLevel();
  const levelPct = getLevelProgress();

  return `
    <div class="screen results-screen">

      <div class="results-topbar">
        <button class="btn-icon" id="btn-home-top">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8l4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <div style="display:flex;flex-direction:column;align-items:center;flex:1">
          <span class="results-pack-label">${pack.name}</span>
          <span class="quiz-mode-tag">${isQuick ? '⚡ Quick Quiz' : isStudy ? '📖 Study' : '📋 Full Exam'}</span>
        </div>
        <div style="width:40px"></div>
      </div>

      <!-- Score ring -->
      <div class="score-section">
        <div class="score-ring-wrap">
          <svg class="score-ring" viewBox="0 0 120 120">
            <circle class="ring-track" cx="60" cy="60" r="52"/>
            <circle class="ring-fill ${gradeClass}" id="ring-fill"
              cx="60" cy="60" r="52"
              stroke-dasharray="${CIRCUMFERENCE}"
              stroke-dashoffset="${CIRCUMFERENCE}"/>
          </svg>
          <div class="score-center">
            <div class="score-pct" id="score-pct">0%</div>
            <div class="score-grade">${gradeLabel}</div>
          </div>
        </div>
        ${starsHTML}
        <span class="grade-message ${gradeClass}">${
          pct >= 80 ? '🔥 Ready for the real exam!'
          : pct >= 70 ? '✅ Good job — review the mistakes'
          : pct >= 50 ? '📖 Study those topics more'
          : '💪 Keep going — you\'ll get there'
        }</span>

        <div class="result-stats">
          <div class="result-stat-card">
            <span class="result-stat-val v-correct">${results.score}</span>
            <span class="result-stat-lbl">Correct</span>
          </div>
          <div class="result-stat-card">
            <span class="result-stat-val v-wrong">${results.total - results.score}</span>
            <span class="result-stat-lbl">Wrong</span>
          </div>
          <div class="result-stat-card">
            <span class="result-stat-val">${formatTime(results.totalTime)}</span>
            <span class="result-stat-lbl">Time</span>
          </div>
        </div>
      </div>

      <!-- XP / Level bar -->
      <div class="level-bar-section">
        <div class="level-bar-header">
          <span class="level-info">${level.icon} Lv.${level.level} ${level.title}</span>
          ${nextLevel ? `<span class="level-next">Next: ${nextLevel.title}</span>` : '<span class="level-next">MAX LEVEL</span>'}
        </div>
        <div class="level-track">
          <div class="level-fill" id="level-fill" style="width:0%"></div>
        </div>
      </div>

      <!-- Achievements (populated by JS) -->
      <div id="achievements-container"></div>

      <div class="section-label">Answer Review</div>
      <div class="review-list">
        ${results.answers.map(a => buildReviewItem(a)).join('')}
      </div>

      <div class="results-actions">
        <button class="btn-secondary" id="btn-home-bottom">Home</button>
        ${isQuick
          ? `<button class="btn-primary" id="btn-replay">⚡ New 5 Questions</button>`
          : isStudy
          ? `<button class="btn-primary" id="btn-study-again">📖 Study More</button>`
          : `<button class="btn-primary" id="btn-retry">Retry →</button>`}
      </div>

    </div>
  `;
}

function buildReviewItem(answer) {
  const q = answer.question;
  const correctLabel  = LETTERS[answer.correct];
  const selectedLabel = answer.selected >= 0 ? LETTERS[answer.selected] : '–';

  return `
    <div class="review-item ${answer.isCorrect ? 'correct' : 'wrong'}">
      <div class="review-icon">${answer.isCorrect ? '✓' : '✗'}</div>
      <div class="review-content">
        <div class="review-question-text">${q.question}</div>
        <div class="review-answer ${answer.isCorrect ? 'correct' : 'wrong'}">
          ${answer.isCorrect
            ? `Correct — ${correctLabel}: ${q.options[answer.correct]}`
            : answer.selected < 0
              ? `Time's up — Answer: ${correctLabel}: ${q.options[answer.correct]}`
              : `You: ${selectedLabel} · Correct: ${correctLabel}: ${q.options[answer.correct]}`}
        </div>
      </div>
    </div>
  `;
}

// ─── Animations ────────────────────────────────────────────────────────────────

function animateScore(targetPct) {
  const ring  = document.getElementById('ring-fill');
  const pctEl = document.getElementById('score-pct');
  const lvlFill = document.getElementById('level-fill');
  const levelPct = getLevelProgress();
  if (!ring || !pctEl) return;

  const duration = 1200;
  const start    = Date.now();

  const tick = () => {
    const progress = Math.min((Date.now() - start) / duration, 1);
    const eased    = 1 - Math.pow(1 - progress, 3);
    const current  = Math.round(targetPct * eased);
    ring.style.strokeDashoffset = CIRCUMFERENCE * (1 - current / 100);
    pctEl.textContent = current + '%';
    if (lvlFill) lvlFill.style.width = `${levelPct * eased}%`;
    if (progress < 1) requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
}

function spawnConfetti() {
  const colors = ['#3b82f6','#10b981','#f59e0b','#f43f5e','#8b5cf6','#06b6d4','#fff'];
  for (let i = 0; i < 60; i++) {
    setTimeout(() => {
      const el = document.createElement('div');
      el.className = 'confetti-piece';
      el.style.cssText = `
        left: ${Math.random() * 100}vw;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        width: ${4 + Math.random() * 6}px;
        height: ${8 + Math.random() * 8}px;
        animation-duration: ${1.2 + Math.random() * 1.5}s;
        animation-delay: 0s;
        border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
      `;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 3000);
    }, i * 25);
  }
}

function showAchievements(achievements) {
  const container = document.getElementById('achievements-container');
  if (!container) return;

  const html = `
    <div class="achievements-banner">
      <div class="section-label" style="margin:0 0 10px">🏆 Unlocked</div>
      ${achievements.map(a => `
        <div class="achievement-item">
          <span class="achievement-icon">${a.icon}</span>
          <div class="achievement-info">
            <div class="achievement-title">${a.title}</div>
            <div class="achievement-desc">${a.desc}</div>
          </div>
        </div>
      `).join('')}
    </div>`;

  container.innerHTML = html;
  container.querySelectorAll('.achievement-item').forEach((el, i) => {
    el.style.animationDelay = `${i * 0.15}s`;
    el.classList.add('achievement-pop');
  });
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(ms) {
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

function showGoalCompleteToast() {
  const el = document.createElement('div');
  el.className = 'goal-toast';
  el.innerHTML = `<span>🎯 Daily goal complete!</span><span style="font-size:11px;opacity:0.8">Come back tomorrow 🔥</span>`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

function attachListeners(container, navigate, params) {
  const { pack, mode, originalQuestions } = params;
  const goHome = () => navigate('home');
  container.querySelector('#btn-home-top')?.addEventListener('click', goHome);
  container.querySelector('#btn-home-bottom')?.addEventListener('click', goHome);

  container.querySelector('#btn-replay')?.addEventListener('click', () => {
    navigate('quiz', { pack, questions: originalQuestions, mode: 'quick', count: 5 });
  });
  container.querySelector('#btn-retry')?.addEventListener('click', () => {
    navigate('quiz', {
      pack, questions: params.results.answers.map(a => a.question),
      mode: 'full', count: params.results.answers.length,
    });
  });

  container.querySelector('#btn-study-again')?.addEventListener('click', () => {
    navigate('quiz', { pack, questions: originalQuestions, mode: 'study', count: 10 });
  });
}
