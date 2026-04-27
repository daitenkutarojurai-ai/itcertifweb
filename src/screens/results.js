/**
 * screens/results.js — Score, achievements, confetti, XP summary
 */

import { playComplete } from '../engine/sounds.js';
import { getCurrentLevel, getNextLevel, getLevelProgress } from '../engine/gamification.js';

const CIRCUMFERENCE = 2 * Math.PI * 52;
const LETTERS = ['A', 'B', 'C', 'D'];

export function render(container, navigate, params) {
  const { pack, results, mode, originalQuestions, newAchievements = [], goalJustCompleted = false } = params;

  // Diagnostic mode gets the "plan-not-score" results screen instead of the gamified one.
  if (mode === 'diagnostic') {
    renderDiagnostic(container, navigate, params);
    return;
  }

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

// ─── Diagnostic results: plan-not-score view ───────────────────────────────────

function renderDiagnostic(container, navigate, params) {
  const { pack, results, originalQuestions } = params;
  const pct = results.percentage;
  const readiness = pct >= 75 ? 'green' : pct >= 50 ? 'yellow' : 'red';
  const readinessLabel = readiness === 'green' ? 'Green · close to ready'
    : readiness === 'yellow' ? 'Yellow · build the foundation'
    : 'Red · start from the basics';

  // Per-tag accuracy. Use ALL tags on each question (not just primary), so a
  // question covering "iam" and "encryption" contributes to both buckets.
  const tagStats = computeTagStats(results.answers);
  const weakest  = tagStats.filter(t => t.total >= 1)
                           .sort((a, b) => a.pct - b.pct)
                           .slice(0, 3);
  const weakest1 = weakest[0];

  // Estimate weeks-to-ready based on percentage gap. Crude but useful: aim for
  // ~80% on a fresh quiz; assume +5 percentage points per study week (10h/wk).
  const gap = Math.max(0, 80 - pct);
  const weeks = Math.max(1, Math.round(gap / 5));

  const planTitle = readiness === 'green'
    ? `You're nearly there. ${weeks} week${weeks === 1 ? '' : 's'} of focused practice should close the gap.`
    : readiness === 'yellow'
    ? `Solid foundation, but uneven. ~${weeks} weeks at 30 min/day to hit exam-ready.`
    : `Start from the basics. ~${weeks}+ weeks before this cert is in reach — build core knowledge first.`;

  const planBody = weakest1
    ? `Your weakest area is <strong>${escapeTag(weakest1.tag)}</strong> (${weakest1.score}/${weakest1.total}). That's where the next 30 minutes should go.`
    : `Practice the full pack — your accuracy is even across topics, so volume is the lever.`;

  container.innerHTML = `
    <div class="screen results-screen">
      <div class="results-topbar">
        <button class="btn-icon" id="btn-home-top" aria-label="Home">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8l4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <div style="display:flex;flex-direction:column;align-items:center;flex:1">
          <span class="results-pack-label">${escapeTag(pack.name)}</span>
          <span class="quiz-mode-tag">🧪 Diagnostic · ${results.total} questions</span>
        </div>
        <div style="width:40px"></div>
      </div>

      <div class="diag-results">
        <div class="diag-results-header">
          <div class="diag-results-eyebrow">Your starting point</div>
          <h2 class="diag-results-headline">You scored <em>${pct}%</em> on a stratified sample.</h2>
          <span class="diag-readiness ${readiness}">${readinessLabel}</span>
        </div>

        <div class="diag-summary">
          <div class="diag-summary-cell"><strong>${results.score}/${results.total}</strong><span>Correct</span></div>
          <div class="diag-summary-cell"><strong>${tagStats.length}</strong><span>Domains tested</span></div>
          <div class="diag-summary-cell"><strong>~${weeks} wk</strong><span>To exam-ready</span></div>
        </div>

        ${tagStats.length > 0 ? `
        <div class="diag-tags-section">
          <div class="diag-tags-title">Per-domain breakdown</div>
          ${tagStats.map(t => {
            const cls = t.pct >= 75 ? 'strong' : t.pct >= 50 ? 'medium' : 'weak';
            return `
              <div class="diag-tag-row">
                <span class="diag-tag-name">${escapeTag(t.tag)}</span>
                <div class="diag-tag-bar"><div class="diag-tag-fill ${cls}" style="width:${t.pct}%"></div></div>
                <span class="diag-tag-pct">${t.score}/${t.total} · ${t.pct}%</span>
              </div>
            `;
          }).join('')}
        </div>` : ''}

        <div class="diag-plan">
          <div class="diag-plan-eyebrow">Recommended next step</div>
          <div class="diag-plan-title">${planTitle}</div>
          <div class="diag-plan-body">${planBody}</div>
          <button class="diag-plan-cta" id="btn-diag-practice">Practice ${escapeTag(pack.short || pack.name)} — 5 questions</button>
          <a class="diag-plan-secondary" id="btn-diag-home" href="#">Back to home</a>
        </div>
      </div>
    </div>
  `;

  container.querySelector('#btn-home-top').addEventListener('click', () => navigate('home'));
  container.querySelector('#btn-diag-home').addEventListener('click', e => {
    e.preventDefault();
    navigate('home');
  });
  container.querySelector('#btn-diag-practice').addEventListener('click', () => {
    navigate('quiz', { pack, questions: originalQuestions, mode: 'quick', count: 5 });
  });
}

/**
 * Compute per-tag accuracy across all answered questions.
 * A question is counted in every tag it carries (not just its primary tag).
 */
function computeTagStats(answers) {
  const buckets = new Map(); // tag -> { score, total }
  for (const a of answers) {
    const tags = a.question?.tags || [];
    for (const tag of tags) {
      if (!buckets.has(tag)) buckets.set(tag, { score: 0, total: 0 });
      const b = buckets.get(tag);
      b.total++;
      if (a.isCorrect) b.score++;
    }
  }
  const out = [];
  for (const [tag, { score, total }] of buckets) {
    out.push({ tag, score, total, pct: total > 0 ? Math.round((score / total) * 100) : 0 });
  }
  // Sort: weakest first so the eye lands on what needs work
  out.sort((a, b) => a.pct - b.pct);
  return out;
}

function escapeTag(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
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
