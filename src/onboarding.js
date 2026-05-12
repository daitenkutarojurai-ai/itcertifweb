/**
 * onboarding.js — homepage entry-point experience.
 *
 *  - Goal picker (3 buttons + cert search) for first-time visitors.
 *  - Resume banner for returning visitors (one-click continue).
 *  - Streak pill (auto-injected into header on any page that includes this script).
 *  - Question of the Day (rotates daily, deterministic).
 *
 * No backend. All state in localStorage; reads from /data/index.json + /data/free/*.json.
 */

const KEYS = {
  history:    'itcertif_history',
  streak:     'itcertif_streak',
  streakDate: 'itcertif_streak_date',
  qotdSeen:   'cq_qotd_seen',
};

const POPULAR_PACKS_FOR_QOTD = [
  'aws-saa-c03', 'comptia-security-plus', 'ccna', 'az-104',
  'cka', 'aws-clf-c02', 'comptia-network-plus', 'terraform-003',
];

const POPULAR_PACK_FOR_EXPLORE = 'comptia-security-plus'; // for "just exploring" CTA

// ─── localStorage helpers ──────────────────────────────────────────────────────

function getHistory() {
  try { return JSON.parse(localStorage.getItem(KEYS.history) || '[]'); }
  catch { return []; }
}

function getStreak() {
  // Mirror progress.js logic — auto-reset if last quiz was > 1 day ago.
  const lastDate = localStorage.getItem(KEYS.streakDate);
  const today    = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (lastDate && lastDate < yesterday) return 0;
  return parseInt(localStorage.getItem(KEYS.streak) || '0', 10);
}

// ─── Streak pill (injected into web-header on every page) ──────────────────────

function injectStreakPill() {
  const streak = getStreak();
  if (streak <= 0) return;
  const logo = document.querySelector('.web-header-logo');
  if (!logo) return;
  if (logo.querySelector('.cq-streak-pill')) return; // already injected
  const pill = document.createElement('span');
  pill.className = 'cq-streak-pill';
  pill.title = `${streak}-day streak — practice today to keep it`;
  pill.innerHTML = `<span class="cq-streak-flame">🔥</span><span>${streak}</span>`;
  logo.appendChild(pill);
}

// ─── Mount point detection ────────────────────────────────────────────────────

function getMount() {
  return document.getElementById('onboarding-mount');
}

// ─── Index loader (cert catalog, cached in sessionStorage) ────────────────────

let indexPromise = null;
function loadIndex() {
  if (indexPromise) return indexPromise;
  // sessionStorage cache to avoid re-fetching across SPA-style navigation
  try {
    const cached = sessionStorage.getItem('cq_index');
    if (cached) {
      indexPromise = Promise.resolve(JSON.parse(cached));
      return indexPromise;
    }
  } catch { /* ignore */ }
  indexPromise = fetch('/data/index.json')
    .then(r => r.json())
    .then(idx => {
      try { sessionStorage.setItem('cq_index', JSON.stringify(idx)); } catch { /* ignore */ }
      return idx;
    })
    .catch(() => ({ brands: [] }));
  return indexPromise;
}

function flatPacks(index) {
  const out = [];
  for (const brand of (index.brands || [])) {
    for (const pack of (brand.packs || [])) {
      if (!pack.available) continue;
      out.push({
        id: pack.id,
        name: pack.name,
        short: pack.short || pack.id,
        brandName: brand.name,
        brandColor: brand.color || pack.accent || '#60a5fa',
        file: pack.file,
        questionCount: pack.question_count,
      });
    }
  }
  return out;
}

function findPackById(packs, id) {
  return packs.find(p => p.id === id) || null;
}

// ─── Resume banner (returning visitors) ───────────────────────────────────────

function renderResumeBanner(packs) {
  const history = getHistory();
  if (!history.length) return null;
  const lastPackId = history[0].packId;
  const pack = findPackById(packs, lastPackId);
  if (!pack) return null;

  // Pull aggregate progress for that pack (best effort)
  let bestScore = null;
  let attempts = 0;
  try {
    const progress = JSON.parse(localStorage.getItem('itcertif_progress') || '{}');
    if (progress[lastPackId]) {
      bestScore = progress[lastPackId].bestScore;
      attempts = progress[lastPackId].attempts || 0;
    }
  } catch { /* ignore */ }

  const banner = document.createElement('div');
  banner.className = 'resume-banner';
  banner.innerHTML = `
    <div class="resume-banner-icon">↩</div>
    <div class="resume-banner-text">
      <div class="resume-banner-eyebrow">Welcome back</div>
      <div class="resume-banner-title">Continue ${escapeHTML(pack.short)} practice</div>
      <div class="resume-banner-meta">
        ${attempts} session${attempts === 1 ? '' : 's'}${bestScore != null ? ` · best ${bestScore}%` : ''} · ${escapeHTML(pack.brandName)}
      </div>
    </div>
    <a class="resume-banner-cta" href="/train.html?pack=${encodeURIComponent(pack.id)}&autostart=quick">5-Q quiz</a>
    <a class="resume-banner-secondary" href="/train.html?pack=${encodeURIComponent(pack.id)}">all modes</a>
  `;
  return banner;
}

// ─── Goal picker (first-timers) ───────────────────────────────────────────────

function renderGoalPicker(packs) {
  const wrap = document.createElement('div');
  wrap.className = 'goal-picker';
  wrap.innerHTML = `
    <div class="goal-picker-header">
      <span class="goal-picker-eyebrow">Start here · 30 seconds to your first question</span>
      <h2>What brings you here today?</h2>
      <p class="goal-picker-sub">Pick a goal, get a personalized starting point. No signup, no tracking — your progress stays in your browser.</p>
    </div>

    <!-- Always-visible cert search — fast path for users who know what they want -->
    <div class="cert-search-wrap open" id="cert-search-wrap">
      <div class="cert-search-input-wrap">
        <span class="cert-search-icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </span>
        <input
          class="cert-search-input"
          id="cert-search-input"
          type="search"
          placeholder="Search certifications…"
          autocomplete="off"
          spellcheck="false"
          aria-label="Search for a certification"
        />
        <button class="cert-search-clear" id="cert-search-clear" type="button" aria-label="Clear search" hidden>✕</button>
      </div>
      <div class="cert-search-results" id="cert-search-results" role="listbox"></div>
    </div>

    <div class="goal-picker-grid">
      <a class="goal-button goal-button--featured" data-goal="path" href="/path.html">
        <span class="goal-pill">NEW</span>
        <span class="goal-icon">🗺️</span>
        <strong>Learning path</strong>
        <span class="goal-desc">Gamified · earn XP, level up, beat bosses</span>
        <span class="goal-arrow" aria-hidden="true">→</span>
      </a>
      <a class="goal-button" data-goal="exam" href="/train.html">
        <span class="goal-icon">🎯</span>
        <strong>Find a cert</strong>
        <span class="goal-desc">Browse the full exam list</span>
        <span class="goal-arrow" aria-hidden="true">→</span>
      </a>
      <a class="goal-button" data-goal="career" href="/careers/">
        <span class="goal-icon">🚀</span>
        <strong>Change careers</strong>
        <span class="goal-desc">See the career roadmaps</span>
        <span class="goal-arrow" aria-hidden="true">→</span>
      </a>
      <a class="goal-button" data-goal="news" href="/news/">
        <span class="goal-icon">📰</span>
        <strong>Latest tips</strong>
        <span class="goal-desc">News, cheat sheets, war stories</span>
        <span class="goal-arrow" aria-hidden="true">→</span>
      </a>
    </div>
  `;

  const searchWrap = wrap.querySelector('#cert-search-wrap');
  const searchInput = wrap.querySelector('#cert-search-input');
  const searchResults = wrap.querySelector('#cert-search-results');
  const clearBtn = wrap.querySelector('#cert-search-clear');

  function showResults() { searchWrap.classList.add('active'); }
  function hideResults() { searchWrap.classList.remove('active'); }

  searchInput.addEventListener('focus', () => {
    renderResults(searchInput.value, packs, searchResults);
    showResults();
  });
  searchInput.addEventListener('input', () => {
    renderResults(searchInput.value, packs, searchResults);
    clearBtn.hidden = searchInput.value.length === 0;
    showResults();
  });
  /* Delay blur-hide so a click on a result link can fire first */
  searchInput.addEventListener('blur', () => {
    setTimeout(() => {
      if (searchInput.value.trim() === '' && document.activeElement !== searchInput) hideResults();
    }, 180);
  });
  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearBtn.hidden = true;
    renderResults('', packs, searchResults);
    searchInput.focus();
  });

  /* Pre-render popular suggestions so they appear instantly on focus */
  renderResults('', packs, searchResults);

  return wrap;
}

function renderResults(query, packs, container) {
  const q = (query || '').trim().toLowerCase();
  let matches = packs;
  if (q) {
    matches = packs.filter(p => {
      return p.id.toLowerCase().includes(q)
          || p.name.toLowerCase().includes(q)
          || p.short.toLowerCase().includes(q)
          || p.brandName.toLowerCase().includes(q);
    });
  } else {
    // No query — show curated popular set first
    const order = ['aws-saa-c03', 'comptia-security-plus', 'ccna', 'az-104', 'cka', 'aws-clf-c02', 'comptia-network-plus', 'terraform-003'];
    matches = order.map(id => packs.find(p => p.id === id)).filter(Boolean);
  }
  matches = matches.slice(0, 8);

  if (matches.length === 0) {
    container.innerHTML = `<div class="cert-search-empty">No certs match "${escapeHTML(q)}". Try CCNA, AWS, Azure, or Security+.</div>`;
    return;
  }

  container.innerHTML = matches.map(p => `
    <a class="cert-search-result" href="/train.html?pack=${encodeURIComponent(p.id)}&autostart=quick" style="--brand-color:${p.brandColor}">
      <span class="cert-search-result-dot"></span>
      <span class="cert-search-result-name">${escapeHTML(p.name)}</span>
      <span class="cert-search-result-code">${escapeHTML(p.short)}</span>
      <span class="cert-search-result-arrow">→</span>
    </a>
  `).join('');
}

// ─── Question of the Day ──────────────────────────────────────────────────────

// Monotonic local-day index. Every local-time midnight bumps the seed by
// exactly 1 — no year reset, no DST cliff, no double-rotate when crossing
// timezones. Same input → same output for a single calendar day.
function localDayId(d = new Date()) {
  const local = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.floor(local.getTime() / 86400000);
}

function formatTodayLabel(d = new Date()) {
  // e.g. "Mon, Apr 27"
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

async function renderQotd(packs, mount, section) {
  // Pick today's pack deterministically from the popular set
  const day = localDayId();
  const todayLabel = formatTodayLabel();
  const candidates = POPULAR_PACKS_FOR_QOTD.filter(id => packs.some(p => p.id === id));
  if (candidates.length === 0) return;
  // Two coprime offsets so pack and question both rotate independently —
  // avoids the case where a small `candidates.length` makes the same pack
  // line up with the same question slot every period.
  const packId = candidates[day % candidates.length];
  const pack = findPackById(packs, packId);
  if (!pack) return;

  let questions = [];
  try {
    // pack.file is relative to /data/ (e.g. "free/aws-saa-c03.json")
    const res = await fetch('/data/' + pack.file);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    questions = data.questions || [];
  } catch { return; }
  if (!questions.length) return;

  // Filter to well-formed multiple-choice questions
  questions = questions.filter(q => q.options?.length === 4 && q.correct >= 0 && q.correct < 4);
  if (!questions.length) return;

  // Use day*7+3 (coprime to common pack sizes) so pack + question don't
  // re-pair on a short cycle.
  const q = questions[(day * 7 + 3) % questions.length];
  const today = new Date().toISOString().slice(0, 10);
  const seenKey = `${KEYS.qotdSeen}_${today}`;
  let alreadyAnswered = false;
  try { alreadyAnswered = !!localStorage.getItem(seenKey); } catch { /* ignore */ }

  const card = document.createElement('div');
  card.className = 'qotd-card';
  card.innerHTML = `
    <div class="qotd-eyebrow">
      <span>🌟 Question of the day · <span class="qotd-date">${escapeHTML(todayLabel)}</span></span>
      <span class="qotd-pack">${escapeHTML(pack.brandName)} · ${escapeHTML(pack.short)}</span>
    </div>
    <div class="qotd-question">${escapeHTML(q.question)}</div>
    <div class="qotd-options" role="group" aria-label="Answer options">
      ${q.options.map((opt, i) => `
        <button class="qotd-option" data-idx="${i}" type="button">
          <span class="qotd-option-letter">${String.fromCharCode(65 + i)}</span>
          <span>${escapeHTML(opt)}</span>
        </button>
      `).join('')}
    </div>
    <div class="qotd-explanation" hidden>
      <strong>Why</strong>
      ${escapeHTML(q.explanation || 'No explanation available.')}
    </div>
    <a class="qotd-cta" href="/train.html?pack=${encodeURIComponent(pack.id)}&autostart=quick">
      Practice ${escapeHTML(pack.short)} (5 questions)
    </a>
  `;
  mount.appendChild(card);
  if (section) section.hidden = false;

  const buttons = card.querySelectorAll('.qotd-option');
  const explanation = card.querySelector('.qotd-explanation');

  const reveal = (selectedIdx) => {
    buttons.forEach(btn => {
      btn.disabled = true;
      const idx = parseInt(btn.dataset.idx, 10);
      if (idx === q.correct) btn.classList.add('is-correct');
      else if (idx === selectedIdx) btn.classList.add('is-wrong');
    });
    explanation.hidden = false;
    try { localStorage.setItem(seenKey, String(selectedIdx)); } catch { /* ignore */ }
  };

  if (alreadyAnswered) {
    let prev = -1;
    try { prev = parseInt(localStorage.getItem(seenKey) || '-1', 10); } catch { /* ignore */ }
    reveal(prev);
  } else {
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx, 10);
        reveal(idx);
      });
    });
  }
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function escapeHTML(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// ─── Boot ─────────────────────────────────────────────────────────────────────

async function boot() {
  // Streak pill goes on every page that includes this script
  injectStreakPill();

  const mount = getMount();
  if (!mount) return; // page doesn't have an onboarding zone

  const index = await loadIndex();
  const packs = flatPacks(index);
  if (!packs.length) {
    mount.hidden = true;
    return;
  }

  // Choose: resume banner for returning visitors, goal picker for first-timers.
  const resume = renderResumeBanner(packs);
  if (resume) {
    mount.appendChild(resume);
  } else {
    mount.appendChild(renderGoalPicker(packs));
  }

  // Question of the Day always appears (unless on a tiny page).
  // Prefer the dedicated post-hero slot (#qotd-mount, hidden by default) so a
  // real question replaces the old static "Live preview" mockup. Falls back to
  // the onboarding zone if the page predates that slot.
  const qotdSection = document.getElementById('qotd-section');
  const qotdMount   = document.getElementById('qotd-mount') || mount;
  renderQotd(packs, qotdMount, qotdSection).catch(() => { /* ignore QotD failures */ });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
