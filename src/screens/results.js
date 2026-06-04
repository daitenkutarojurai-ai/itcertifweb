/**
 * screens/results.js — Score, achievements, confetti, XP summary
 */

import { playComplete } from '../engine/sounds.js';
// Level/XP shown here comes from window.cqStats (canonical 30-level egg→phoenix
// system, set by cq-core.js + synced to Supabase) — not the SPA's local
// gamification store, which stays as ephemeral in-session combo/XP flair.
import { submitReport, submitNewsletter, isApiConfigured } from '../engine/emailReport.js';

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

  // Kick off the score / confetti / achievement animations on the next frame
  // so they ride the screen transition instead of starting after a 250ms
  // pause (which read as a "glitch" — static page then sudden movement).
  requestAnimationFrame(() => {
    animateScore(results.percentage);
    playComplete(results.percentage);
    if (results.percentage >= 80) spawnConfetti();
    if (newAchievements.length > 0) showAchievements(newAchievements);
    if (goalJustCompleted) showGoalCompleteToast();
  });

  // Cohort accuracy comparison — async, non-blocking (UX-13)
  loadResultCohortStat(pack.id, results.percentage);
}

// ─── Diagnostic results: plan-not-score view ───────────────────────────────────

function renderDiagnostic(container, navigate, params) {
  const { pack, results, originalQuestions } = params;
  const pct = results.percentage;

  // Per-tag accuracy. Use ALL tags on each question (not just primary), so a
  // question covering "iam" and "encryption" contributes to both buckets.
  const tagStats = computeTagStats(results.answers);
  const weakest  = tagStats.filter(t => t.total >= 1)
                           .sort((a, b) => a.pct - b.pct)
                           .slice(0, 3);
  const weakest1 = weakest[0];

  // Per-difficulty accuracy.
  const diffStats = computeDifficultyStats(results.answers);

  // Weighted readiness: hard questions count 3x, medium 2x, easy 1x. Gives a
  // sharper signal than a flat percentage. A user who aces easy/medium but
  // misses every hard one should *not* read as "75% ready" — they're at ~50%.
  const weighted = computeWeightedScore(diffStats);
  const readiness = weighted.pct >= 75 ? 'green' : weighted.pct >= 50 ? 'yellow' : 'red';
  const readinessLabel = readiness === 'green' ? 'Green · close to ready'
    : readiness === 'yellow' ? 'Yellow · build the foundation'
    : 'Red · start from the basics';

  // Weeks-to-ready uses the weighted gap, not flat percentage.
  // Aim for ~80 weighted; assume +5 weighted points per study week.
  const gap = Math.max(0, 80 - weighted.pct);
  const weeks = Math.max(1, Math.round(gap / 5));

  // Derive a smarter recommendation by looking at the difficulty *shape*.
  // Three useful patterns:
  //   - "easy-only" → user knows surface-level concepts, struggles with depth
  //   - "uneven by tag" → has knowledge gaps in specific domains
  //   - "even" → just needs more volume
  const easyPct = diffStats.easy.total > 0 ? diffStats.easy.pct : null;
  const hardPct = diffStats.hard.total > 0 ? diffStats.hard.pct : null;
  const easyOnly = easyPct != null && hardPct != null && easyPct >= 75 && hardPct <= 33;

  let planTitle, planBody;
  if (readiness === 'green') {
    planTitle = `You're nearly there. ${weeks} week${weeks === 1 ? '' : 's'} of focused practice should close the gap.`;
    planBody = weakest1
      ? `Last weak spot: <strong>${escapeTag(weakest1.tag)}</strong> (${weakest1.score}/${weakest1.total}). 30 minutes there closes most of the remaining gap.`
      : `Your accuracy is even across topics — keep practicing the full pack to lock it in.`;
  } else if (easyOnly) {
    planTitle = `Surface knowledge, thin depth. ~${weeks} weeks of harder questions to push you over the top.`;
    planBody = `You handled easy questions (${diffStats.easy.score}/${diffStats.easy.total}) but struggled with hard ones (${diffStats.hard.score}/${diffStats.hard.total}). The gap is depth, not breadth — focus on advanced practice, not more flashcards.`;
  } else if (readiness === 'yellow') {
    planTitle = `Solid foundation, but uneven. ~${weeks} weeks at 30 min/day to hit exam-ready.`;
    planBody = weakest1
      ? `Your weakest area is <strong>${escapeTag(weakest1.tag)}</strong> (${weakest1.score}/${weakest1.total}). That's where the next 30 minutes should go.`
      : `Practice the full pack — your accuracy is even across topics, so volume is the lever.`;
  } else {
    planTitle = `Start from the basics. ~${weeks}+ weeks before this cert is in reach — build core knowledge first.`;
    planBody = weakest1
      ? `Across the board you're below 50%, with <strong>${escapeTag(weakest1.tag)}</strong> the weakest. Work through the course modules before more practice — practice without foundation is memorization.`
      : `Across the board you're below 50%. Work through the course modules first — practice without foundation is memorization.`;
  }

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
          <h2 class="diag-results-headline">You scored <em>${pct}%</em>${weighted.pct !== pct ? ` · weighted <em>${weighted.pct}%</em>` : ''}.</h2>
          <span class="diag-readiness ${readiness}">${readinessLabel}</span>
        </div>

        <div class="diag-summary">
          <div class="diag-summary-cell"><strong>${results.score}/${results.total}</strong><span>Correct</span></div>
          <div class="diag-summary-cell"><strong>${tagStats.length}</strong><span>Domains tested</span></div>
          <div class="diag-summary-cell"><strong>~${weeks} wk</strong><span>To exam-ready</span></div>
        </div>

        ${(diffStats.easy.total + diffStats.medium.total + diffStats.hard.total) > 0 ? `
        <div class="diag-tags-section">
          <div class="diag-tags-title">By difficulty</div>
          ${['easy','medium','hard'].filter(d => diffStats[d].total > 0).map(d => {
            const s = diffStats[d];
            const cls = s.pct >= 75 ? 'strong' : s.pct >= 50 ? 'medium' : 'weak';
            return `
              <div class="diag-tag-row diag-diff-row">
                <span class="diag-tag-name diag-diff-name diag-diff-${d}">${d.charAt(0).toUpperCase() + d.slice(1)}</span>
                <div class="diag-tag-bar"><div class="diag-tag-fill ${cls}" style="width:${s.pct}%"></div></div>
                <span class="diag-tag-pct">${s.score}/${s.total} · ${s.pct}%</span>
              </div>
            `;
          }).join('')}
        </div>` : ''}

        ${tagStats.length > 0 ? `
        <div class="diag-tags-section">
          <div class="diag-tags-title">By topic</div>
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

        ${buildEmailCardHTML(results)}

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
  attachEmailCardListener(container, params);
}

/**
 * Compute per-difficulty accuracy. Returns { easy, medium, hard } each
 * carrying { score, total, pct }. Difficulty defaults to 'medium' if missing.
 */
function computeDifficultyStats(answers) {
  const out = {
    easy:   { score: 0, total: 0, pct: 0 },
    medium: { score: 0, total: 0, pct: 0 },
    hard:   { score: 0, total: 0, pct: 0 },
  };
  for (const a of answers) {
    const d = (a.question?.difficulty || 'medium').toLowerCase();
    const bucket = out[d] || out.medium;
    bucket.total++;
    if (a.isCorrect) bucket.score++;
  }
  for (const k of Object.keys(out)) {
    const b = out[k];
    b.pct = b.total > 0 ? Math.round((b.score / b.total) * 100) : 0;
  }
  return out;
}

/**
 * Difficulty-weighted readiness percentage. A correct hard answer counts 3x;
 * medium 2x; easy 1x. Aces-easy-misses-hard reads as a much weaker signal
 * than the flat percentage suggests.
 */
function computeWeightedScore(diffStats) {
  const w = { easy: 1, medium: 2, hard: 3 };
  let earned = 0, possible = 0;
  for (const k of ['easy', 'medium', 'hard']) {
    earned   += diffStats[k].score * w[k];
    possible += diffStats[k].total * w[k];
  }
  return {
    earned,
    possible,
    pct: possible > 0 ? Math.round((earned / possible) * 100) : 0,
  };
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

// ─── Coach debrief (Phase 7.5 v2) ──────────────────────────────────────────────
/**
 * The squid 🦑 surfaces its single top "next move" right after the session.
 * cqCoach reads fresh stats because cq:session-complete fired synchronously
 * before this screen rendered (see quiz.js finishQuiz). Persona-aware via
 * cqCoachPersona. No-op (empty string) if the coach bundle isn't loaded.
 */
function buildCoachDebriefHTML() {
  const coach = (typeof window !== 'undefined' && window.cqCoach) || null;
  if (!coach || typeof coach.getAdvice !== 'function') return '';
  let tip;
  try { tip = (coach.getAdvice(1) || [])[0]; } catch (_) { return ''; }
  if (!tip) return '';
  const persona = (window.cqCoachPersona && window.cqCoachPersona.current())
    || { emoji: '🦑', name: 'Coach', accent: '#34d399' };
  const href  = (tip.cta && tip.cta.href)  || '/profile.html';
  const label = (tip.cta && tip.cta.label) || 'Open coach';
  const icon  = tip.icon ? tip.icon + ' ' : '';
  return `
    <div class="results-coach-card" style="--coach-accent:${escapeTag(persona.accent || '#34d399')}">
      <div class="results-coach-head">
        <span class="results-coach-emoji" aria-hidden="true">${escapeTag(persona.emoji || '🦑')}</span>
        <span class="results-coach-eyebrow">${escapeTag(persona.name || 'Coach')} — your next move</span>
      </div>
      <div class="results-coach-title">${escapeTag(icon + tip.title)}</div>
      <div class="results-coach-text">${escapeTag(tip.text)}</div>
      <a class="cta-primary results-coach-cta" href="${escapeTag(href)}">${escapeTag(label)}</a>
    </div>`;
}

// ─── Email cheatsheet card (shared by standard + diagnostic flows) ─────────────

/**
 * Email card shown on every results screen. Adapts to the score:
 *   - ≥ 1 wrong  → primary CTA is a personalized cheatsheet of the misses,
 *                  newsletter is the smart upsell (pre-checked).
 *   - perfect     → no cheatsheet to send; primary CTA flips to newsletter
 *                  signup so we don't lose the high-intent moment.
 */
function buildEmailCardHTML(results) {
  const wrongCount = (results.answers || []).filter(a => !a.isCorrect).length;
  const hasWrong = wrongCount > 0;
  const apiReady = isApiConfigured();
  const disabled = apiReady ? '' : 'disabled';

  const title = hasWrong
    ? 'Email me my cheatsheet'
    : 'Get next-pack alerts by email';
  const sub = !apiReady
    ? 'Email reports are coming soon — the form is disabled for now.'
    : hasWrong
      ? `We'll email a personalized cheatsheet for the ${wrongCount} question${wrongCount === 1 ? '' : 's'} you missed, with the right answer and a short tip for each.`
      : 'You aced it 🎉 Want a heads-up when we ship a harder pack or a new cert? Drop your email — one short message a week, no spam.';

  const cta = hasWrong ? 'Send my cheatsheet' : 'Subscribe';
  // For perfect scores, the newsletter IS the action — pre-check & hide the
  // checkbox so submitting the form means "subscribe me". For mistakes, the
  // checkbox is the upsell (default checked, smart-nudge copy).
  const subscribePreChecked = ''; // GDPR: marketing opt-in must be unchecked by default
  const checkboxBlock = hasWrong ? `
        <label class="email-report-checkbox">
          <input type="checkbox" id="email-report-subscribe" ${subscribePreChecked} ${disabled} />
          <span><strong>Also send me the free weekly cheatsheet</strong> · 1 cert tip + 1 tricky question every Sunday. Unsubscribe in one click.</span>
        </label>` : `
        <input type="hidden" id="email-report-subscribe-hidden" value="1" />`;

  const privacyLine = !apiReady
    ? 'We use your email only for this report. No spam — unsubscribe any time.'
    : hasWrong
      ? 'We use your email only for this report (and the newsletter, if you opt in). No spam — unsubscribe any time.'
      : 'No spam — one short email a week, unsubscribe any time.';

  return `
    <div class="email-report-card" id="email-report-card" data-mode="${hasWrong ? 'cheatsheet' : 'newsletter'}">
      <div class="email-report-header">
        <div class="email-report-icon">${hasWrong ? '📬' : '🎯'}</div>
        <div>
          <div class="email-report-title">${title}</div>
          <div class="email-report-sub">${sub}</div>
        </div>
      </div>
      <form class="email-report-form" id="email-report-form" novalidate>
        <input
          type="email"
          class="email-report-input"
          id="email-report-input"
          name="email"
          placeholder="you@example.com"
          autocomplete="email"
          required
          ${disabled}
        />
        ${checkboxBlock}
        <button type="submit" class="cta-primary email-report-submit" id="email-report-submit" ${disabled}>
          ${cta}
        </button>
        <div class="email-report-status" id="email-report-status" role="status" aria-live="polite"></div>
        <p class="email-report-privacy">${privacyLine}</p>
      </form>
    </div>
  `;
}

function attachEmailCardListener(container, params) {
  const card = container.querySelector('#email-report-card');
  const form = container.querySelector('#email-report-form');
  if (!form) return;
  const input = container.querySelector('#email-report-input');
  const sub   = container.querySelector('#email-report-subscribe');
  const btn   = container.querySelector('#email-report-submit');
  const status = container.querySelector('#email-report-status');
  const newsletterOnly = card?.dataset.mode === 'newsletter';

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (btn.disabled) return;
    btn.disabled = true;
    const originalLabel = btn.textContent;
    btn.textContent = newsletterOnly ? 'Subscribing…' : 'Sending…';
    status.textContent = '';
    status.className = 'email-report-status';

    const result = newsletterOnly
      ? await submitNewsletter(input.value)
      : await submitReport({
          email: input.value,
          subscribe: !!(sub && sub.checked),
          results: params.results,
          packId: params.pack?.id ?? '',
          packName: params.pack?.name ?? '',
          mode: params.mode ?? '',
        });

    status.textContent = result.message;
    status.className = `email-report-status ${result.ok ? 'ok' : 'err'}`;

    if (result.ok) {
      // Lock the form so the user can't double-send.
      input.disabled = true;
      if (sub) sub.disabled = true;
      btn.textContent = newsletterOnly ? '✓ Subscribed' : '✓ Sent';
    } else {
      btn.disabled = false;
      btn.textContent = originalLabel;
    }
  });
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

  const cs = (typeof window !== 'undefined' && window.cqStats) || null;
  const cqs = cs ? cs.get() : null;
  const lvl = cqs ? cqs.level : 1;
  const levelIcon = cs ? cs.stageEmojiForLevel(lvl) : '🌱';
  const levelTitle = (cs && cs.stageNameForLevel) ? cs.stageNameForLevel(lvl) : `Level ${lvl}`;
  const atMaxLevel = cs ? lvl >= cs.MAX_LEVEL : false;
  const nextTitle = (cs && cs.stageNameForLevel && !atMaxLevel) ? cs.stageNameForLevel(lvl + 1) : null;

  return `
    <div class="screen results-screen">

      <div class="results-topbar">
        <button class="btn-icon" id="btn-home-top">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8l4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <div style="display:flex;flex-direction:column;align-items:center;flex:1">
          <span class="results-pack-label">${escapeTag(pack.name)}</span>
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
          <!-- Cohort stat injected async by loadResultCohortStat (UX-13) -->
          <div class="result-stat-card" id="result-cohort-card" hidden>
            <span class="result-stat-val" id="result-cohort-val" style="font-size:1.1em">—</span>
            <span class="result-stat-lbl">Cohort avg</span>
          </div>
        </div>
      </div>

      <!-- XP / Level bar -->
      <div class="level-bar-section">
        <div class="level-bar-header">
          <span class="level-info">${levelIcon} Lv.${lvl} ${levelTitle}</span>
          ${nextTitle ? `<span class="level-next">Next: ${nextTitle}</span>` : '<span class="level-next">MAX LEVEL</span>'}
        </div>
        <div class="level-track">
          <div class="level-fill" id="level-fill" style="width:0%"></div>
        </div>
      </div>

      <!-- Achievements (populated by JS) -->
      <div id="achievements-container"></div>

      ${buildCoachDebriefHTML()}

      <div class="section-label">Answer Review</div>
      <div class="review-list">
        ${results.answers.map(a => buildReviewItem(a)).join('')}
      </div>

      ${buildEmailCardHTML(results)}

      <div class="results-actions">
        <button class="cta-secondary" id="btn-home-bottom">Home</button>
        ${isQuick
          ? `<button class="cta-primary" id="btn-replay">⚡ New 5 Questions</button>`
          : isStudy
          ? `<button class="cta-primary" id="btn-study-again">📖 Study More</button>`
          : `<button class="cta-primary" id="btn-retry">Retry →</button>`}
      </div>

    </div>
  `;
}

function buildReviewItem(answer) {
  const q = answer.question;
  const isMulti = Array.isArray(answer.correct);
  const correctIdxs  = isMulti ? answer.correct : [answer.correct];
  const selectedIdxs = isMulti
    ? (Array.isArray(answer.selected) ? answer.selected : [])
    : (typeof answer.selected === 'number' && answer.selected >= 0 ? [answer.selected] : []);

  const fmt = (idxs) => idxs.length
    ? idxs.map(i => `${LETTERS[i]}: ${escapeTag(q.options[i])}`).join(' · ')
    : '–';
  const correctText  = fmt(correctIdxs);
  const selectedText = fmt(selectedIdxs);
  const timedOut     = !isMulti && answer.selected === -1;

  return `
    <div class="review-item ${answer.isCorrect ? 'correct' : 'wrong'}">
      <div class="review-icon">${answer.isCorrect ? '✓' : '✗'}</div>
      <div class="review-content">
        <div class="review-question-text">${escapeTag(q.question)}${isMulti ? ' <span class="badge badge-multi">Multi</span>' : ''}</div>
        <div class="review-answer ${answer.isCorrect ? 'correct' : 'wrong'}">
          ${answer.isCorrect
            ? `Correct — ${correctText}`
            : timedOut
              ? `Time's up — Answer: ${correctText}`
              : `You: ${selectedText} · Correct: ${correctText}`}
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
  const _cs = (typeof window !== 'undefined' && window.cqStats) || null;
  const _st = _cs ? _cs.get() : null;
  const levelPct = (_cs && _st) ? Math.round(_cs.xpProgressForLevel(_st.xp, _st.level) * 100) : 0;
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

  attachEmailCardListener(container, params);
}

/* ── Cohort accuracy stat (UX-13) ────────────────────────────────────────────
   Fetches anonymous cohort accuracy for this pack via anon-accessible RPC.
   Reveals the 4th result-stat-card when data is available. */
function loadResultCohortStat(packId, userPct) {
  const url  = window.CQ_SUPABASE_URL  || '';
  const anon = window.CQ_SUPABASE_ANON || '';
  if (!url) return;

  fetch(url + '/rest/v1/rpc/get_pack_cohort_stats', {
    method: 'POST',
    headers: {
      'apikey': anon,
      'Authorization': 'Bearer ' + anon,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({ p_pack_id: packId })
  })
  .then(r => r.ok ? r.json() : null)
  .then(data => {
    if (!data || data.min_sample) return;
    const card = document.getElementById('result-cohort-card');
    const val  = document.getElementById('result-cohort-val');
    if (!card || !val) return;
    val.textContent = data.avg_accuracy + '%';
    card.removeAttribute('hidden');
  })
  .catch(() => {});
}
