/**
 * screens/home.js — Brand-grouped certification list
 */

import { loadIndex, loadPack }      from '../engine/dataLoader.js';
import { isSoundEnabled, toggleSound } from '../engine/sounds.js';
import { getProgress, getStreak, hasQuizzedToday } from '../engine/progress.js';
import { showModePicker, navigate as appNavigate } from '../app.js';
import { isEnabled, requestPermission, scheduleNextReminder } from '../engine/notifications.js';
import { getDailyXP, getDailyGoal, getHearts, getMaxHearts, getMasteryPct, getNextHeartRegenMs } from '../engine/gamification.js';
import { submitNewsletter, isApiConfigured } from '../engine/emailReport.js';

export async function render(container, navigate) {
  container.innerHTML = `
    <div class="screen home-screen">
      <div class="loading-state"><div class="loader"></div></div>
    </div>`;

  const [index, progress] = await Promise.all([
    loadIndex(),
    Promise.resolve(getProgress()),
  ]);

  const streak = getStreak();
  container.innerHTML = buildHTML(index.brands || [], progress, streak);
  attachListeners(container, navigate, index.brands || []);
}

// ─── HTML ──────────────────────────────────────────────────────────────────────

function buildHTML(brands, progress, streak) {
  const totalPacks     = brands.reduce((acc, b) => acc + b.packs.length, 0);
  const availablePacks = brands.reduce((acc, b) => acc + b.packs.filter(p => p.available).length, 0);
  const dailyXP        = getDailyXP();
  const dailyGoal      = getDailyGoal();
  const dailyPct       = Math.min(100, Math.round((dailyXP / dailyGoal) * 100));
  const dailyDone      = dailyXP >= dailyGoal;
  const hearts         = getHearts();
  const maxH           = getMaxHearts();
  const regenMs        = getNextHeartRegenMs();
  const regenMin       = regenMs > 0 ? Math.ceil(regenMs / 60000) : 0;

  return `
    <div class="screen home-screen">

      <header class="home-header">
        <div class="app-logo">
          <img src="/src/assets/icons/logopouple.png" alt="CertQuests" class="logo-bolt">
          <span class="logo-text">CertQuests</span>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <!-- Hearts -->
          <div class="header-hearts" title="${hearts}/${maxH} hearts">
            ${Array.from({length: maxH}, (_,i) => `<span style="font-size:13px;opacity:${i < hearts ? 1 : 0.25}">❤️</span>`).join('')}
            ${hearts < maxH && regenMin > 0 ? `<span class="heart-regen-timer">${regenMin}m</span>` : ''}
          </div>
          ${streak > 0 ? `<div class="streak-badge">🔥 ${streak}</div>` : ''}
          <button class="btn-icon btn-sound" id="btn-sound" title="Toggle sound">
            <span id="sound-icon">${isSoundEnabled() ? '🔊' : '🔇'}</span>
          </button>
          <button class="btn-icon" id="btn-notif" title="Notifications"
            style="${isEnabled() ? 'color:var(--accent)' : ''}">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 1.5a4.5 4.5 0 0 0-4.5 4.5v2L2 10h12l-1.5-2v-2A4.5 4.5 0 0 0 8 1.5z"
                stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
              <path d="M6.5 12.5a1.5 1.5 0 0 0 3 0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
      </header>

      <!-- Daily Goal bar -->
      <div class="daily-goal-card ${dailyDone ? 'daily-done' : ''}">
        <div class="daily-goal-top">
          <span class="daily-goal-label">${dailyDone ? '🎯 Daily goal complete!' : '🎯 Daily goal'}</span>
          <span class="daily-goal-xp">${dailyXP} / ${dailyGoal} XP</span>
        </div>
        <div class="daily-track">
          <div class="daily-fill ${dailyDone ? 'daily-fill-done' : ''}" style="width:${dailyPct}%"></div>
        </div>
      </div>

      ${streak > 0 && !hasQuizzedToday() ? `
      <div class="streak-warning-card">
        <div class="streak-warning-icon">🔥</div>
        <div class="streak-warning-text">
          <div class="streak-warning-title">${streak}-day streak at risk!</div>
          <div class="streak-warning-sub">Complete a quiz today to keep it going</div>
        </div>
      </div>` : ''}

      <div class="home-hero">
        <h1 class="hero-title">Ready to<br><span class="hero-accent">certify?</span></h1>
        <p class="hero-subtitle">${availablePacks} of ${totalPacks} certifications available</p>
      </div>

      <div class="brands-list">
        ${brands.map(brand => buildBrandSection(brand, progress)).join('')}
      </div>

      ${buildNewsletterCardHTML()}

      ${!isEnabled() ? `
        <div class="notif-banner" id="notif-banner">
          <span>🔔 Enable daily reminders to stay on track</span>
          <button class="notif-banner-btn" id="btn-enable-notif">Enable</button>
          <button class="notif-banner-close" id="btn-close-notif">✕</button>
        </div>
      ` : ''}

    </div>
  `;
}

function buildBrandSection(brand, progress) {
  const available = brand.packs.filter(p => p.available).length;
  const brandColor = brand.color || brand.accent || '#3b82f6';

  return `
    <div class="brand-section" data-brand-id="${brand.id}">
      <button class="brand-header" data-brand-id="${brand.id}">
        <div class="brand-header-left">
          <div class="brand-dot" style="background:${brandColor}"></div>
          <span class="brand-name">${brand.name}</span>
          <span class="brand-count">${available}/${brand.packs.length}</span>
        </div>
        <svg class="brand-chevron" width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M4 5.5l3 3 3-3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>

      <div class="brand-packs" data-brand-id="${brand.id}">
        ${brand.packs.map(pack => buildPackCard(pack, progress[pack.id])).join('')}
      </div>
    </div>
  `;
}

function buildPackCard(pack, packProgress) {
  const bestScore  = packProgress?.bestScore ?? null;
  const attempts   = packProgress?.attempts  ?? 0;
  const mastery    = getMasteryPct(pack.id);

  const diffColors = { beginner: 'easy', intermediate: 'medium', advanced: 'hard' };
  const diffClass  = diffColors[pack.difficulty] || 'medium';

  return `
    <div class="pack-card ${pack.available ? 'available' : 'unavailable'}"
         data-pack-id="${pack.id}">
      <div class="accent-strip" style="background:${pack.accent}"></div>
      <div class="card-body">
        <div class="card-row">
          <div style="flex:1;min-width:0">
            <div class="card-name">${pack.name}</div>
            <div class="card-meta">
              <span class="badge badge-${diffClass}">${pack.difficulty}</span>
              ${pack.available
                ? `<span class="card-meta-item">📝 ${pack.question_count || '?'}q</span>`
                : `<span class="badge badge-soon">Coming soon</span>`}
              ${pack.est_hours ? `<span class="card-meta-item">⏱ ~${pack.est_hours}h</span>` : ''}
              ${attempts > 0 ? `<span class="card-meta-item best">🏆 ${bestScore}%</span>` : ''}
            </div>
          </div>
          ${pack.available
            ? `<button class="btn-start" data-pack-id="${pack.id}">Start →</button>`
            : ''}
        </div>
        ${mastery > 0 ? `
          <div class="mastery-row">
            <div class="pack-mastery-bar mastery-track" style="margin-top:8px;height:4px">
              <div class="pack-mastery-fill mastery-fill" style="width:${mastery}%"></div>
            </div>
            <span class="pack-mastery-pct mastery-label">${mastery}% mastered</span>
          </div>` : ''}
      </div>
    </div>
  `;
}

// ─── Newsletter card ───────────────────────────────────────────────────────────
// Suppressed once the user subscribes or dismisses, so it doesn't nag.
const NEWSLETTER_FLAG = 'itcertif_newsletterStatus'; // 'subscribed' | 'dismissed'

function getNewsletterStatus() {
  try { return localStorage.getItem(NEWSLETTER_FLAG); } catch { return null; }
}
function setNewsletterStatus(v) {
  try { localStorage.setItem(NEWSLETTER_FLAG, v); } catch {}
}

function buildNewsletterCardHTML() {
  if (!isApiConfigured()) return '';
  if (getNewsletterStatus()) return '';
  return `
    <div class="newsletter-card" id="newsletter-card">
      <button class="newsletter-close" id="newsletter-close" aria-label="Dismiss">✕</button>
      <div class="newsletter-icon">📨</div>
      <div class="newsletter-title">Free weekly cheatsheet</div>
      <div class="newsletter-sub">One short email a Sunday: a tricky exam question, a tip, and any new pack we ship that week. No spam.</div>
      <form class="newsletter-form" id="newsletter-form" novalidate>
        <input type="email" class="newsletter-input" id="newsletter-input"
          placeholder="you@example.com" autocomplete="email" required />
        <button type="submit" class="cta-primary newsletter-submit" id="newsletter-submit">Subscribe</button>
      </form>
      <div class="newsletter-status" id="newsletter-status" role="status" aria-live="polite"></div>
    </div>
  `;
}

function attachNewsletterCardListener(container) {
  const card = container.querySelector('#newsletter-card');
  if (!card) return;
  const form  = card.querySelector('#newsletter-form');
  const input = card.querySelector('#newsletter-input');
  const btn   = card.querySelector('#newsletter-submit');
  const status = card.querySelector('#newsletter-status');
  const closeBtn = card.querySelector('#newsletter-close');

  closeBtn.addEventListener('click', () => {
    setNewsletterStatus('dismissed');
    card.remove();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (btn.disabled) return;
    btn.disabled = true;
    const originalLabel = btn.textContent;
    btn.textContent = 'Subscribing…';
    status.textContent = '';
    status.className = 'newsletter-status';

    const result = await submitNewsletter(input.value);
    status.textContent = result.message;
    status.className = `newsletter-status ${result.ok ? 'ok' : 'err'}`;

    if (result.ok) {
      setNewsletterStatus('subscribed');
      input.disabled = true;
      btn.textContent = '✓ Subscribed';
    } else {
      btn.disabled = false;
      btn.textContent = originalLabel;
    }
  });
}

// ─── Event listeners ───────────────────────────────────────────────────────────

function attachListeners(container, navigate, brands) {
  const brandHeaders = container.querySelectorAll('.brand-header');
  const brandSections = container.querySelectorAll('.brand-section');

  // ─── Decide which brand to expand on arrival ─────────────────────────────
  // Priority: ?pack= → ?brand= → localStorage(last-opened) → none (all collapsed)
  const params       = new URLSearchParams(location.search);
  const packParam    = params.get('pack');
  const brandParam   = params.get('brand');
  const autostartVal = params.get('autostart');    // 'quick' | 'full' | 'study' | null
  const autostart    = !!autostartVal;
  const modeParam    = params.get('mode');         // direct-launch from cert-page picker — skips the train.html picker
  const qidsParam    = params.get('qids');         // path-node focused subset (comma-separated IDs)
  let targetBrandId = null;
  let targetPackId  = null;

  if (packParam) {
    const b = brands.find(br => br.packs.some(p => p.id === packParam));
    if (b) { targetBrandId = b.id; targetPackId = packParam; }
  }
  if (!targetBrandId && brandParam) {
    const b = brands.find(br => br.id === brandParam);
    if (b) targetBrandId = b.id;
  }

  // ─── Direct-launch from the certifications-page picker.
  // The cert page already showed the 4-mode picker; ?mode=<choice> tells us
  // to skip our own picker and launch the chosen mode immediately.
  if (modeParam && targetPackId) {
    const brand = brands.find(br => br.packs.some(p => p.id === targetPackId));
    const pack  = brand?.packs.find(p => p.id === targetPackId);
    if (pack?.available && ['quick','full','study','diagnostic'].includes(modeParam)) {
      try { history.replaceState(null, '', location.pathname); } catch {}
      setTimeout(() => autostartDirect(brand, pack, modeParam), 50);
    }
  } else if (autostart && targetPackId) {
    // Legacy autostart=1: open the picker so the user can choose.
    const brand = brands.find(br => br.packs.some(p => p.id === targetPackId));
    const pack  = brand?.packs.find(p => p.id === targetPackId);
    if (pack?.available) {
      try { history.replaceState(null, '', location.pathname); } catch {}
      if (qidsParam) {
        const ids = qidsParam.split(',').map(s => s.trim()).filter(Boolean);
        setTimeout(() => autostartFocused(brand, pack, ids, autostartVal || 'quick'), 50);
      } else {
        setTimeout(() => autostartPicker(brand, pack), 50);
      }
    }
  }
  if (!targetBrandId) {
    try {
      const saved = localStorage.getItem('itcertif_lastBrand');
      if (saved && brands.some(b => b.id === saved)) targetBrandId = saved;
    } catch { /* private mode / disabled storage */ }
  }

  if (targetBrandId) {
    const packsEl = container.querySelector(`.brand-packs[data-brand-id="${targetBrandId}"]`);
    const header  = container.querySelector(`.brand-header[data-brand-id="${targetBrandId}"]`);
    packsEl?.classList.add('expanded');
    header?.querySelector('.brand-chevron')?.classList.add('open');
  }

  // ─── Stagger-fade brand sections on first paint ──────────────────────────
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    brandSections.forEach((el, i) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(6px)';
      el.style.transition = 'opacity 0.28s ease, transform 0.28s cubic-bezier(0.22, 1, 0.36, 1)';
      setTimeout(() => {
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }, 40 + i * 24);
    });
  }

  // ─── If we arrived via ?pack=, scroll to it and flash the card ──────────
  if (targetPackId) {
    requestAnimationFrame(() => {
      const card = container.querySelector(`.pack-card[data-pack-id="${targetPackId}"]`);
      if (card) {
        setTimeout(() => {
          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
          card.classList.add('pack-card-flash');
          setTimeout(() => card.classList.remove('pack-card-flash'), 1400);
        }, 320); // let the stagger settle first
      }
    });
  }

  brandHeaders.forEach(header => {
    header.addEventListener('click', () => {
      const brandId   = header.dataset.brandId;
      const packsEl   = container.querySelector(`.brand-packs[data-brand-id="${brandId}"]`);
      const chevron   = header.querySelector('.brand-chevron');
      const isOpen    = packsEl.classList.contains('expanded');
      packsEl.classList.toggle('expanded', !isOpen);
      chevron?.classList.toggle('open', !isOpen);
      // Remember the last brand the user opened so they land on it next time.
      if (!isOpen) {
        try { localStorage.setItem('itcertif_lastBrand', brandId); } catch {}
      }
    });
  });

  // Start quiz buttons
  container.querySelectorAll('.btn-start').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      const packId = btn.dataset.packId;
      const brand  = brands.find(b => b.packs.some(p => p.id === packId));
      const pack   = brand?.packs.find(p => p.id === packId);
      if (!pack?.available) return;

      btn.textContent = '...';
      btn.disabled    = true;

      const data = await loadPack(pack.file);
      btn.textContent = 'Start →';
      btn.disabled    = false;

      if (!data?.questions?.length) {
        btn.textContent = 'Error ↺';
        return;
      }

      // Attach brand name so the mode-picker modal can show it as the header
      const packWithBrand = { ...pack, brandName: brand?.name || pack.name };
      showModePicker(packWithBrand, data.questions);
    });
  });

  // Notification banner
  container.querySelector('#btn-enable-notif')?.addEventListener('click', async () => {
    const granted = await requestPermission();
    if (granted) {
      scheduleNextReminder();
      container.querySelector('#notif-banner')?.remove();
    } else {
      alert('Notifications were denied. You can enable them in your browser/device settings.');
    }
  });

  container.querySelector('#btn-close-notif')?.addEventListener('click', () => {
    container.querySelector('#notif-banner')?.remove();
  });

  container.querySelector('#btn-notif')?.addEventListener('click', async () => {
    if (isEnabled()) {
      alert('Notifications are enabled ✅\nYou can disable them in your device settings.');
    } else {
      const granted = await requestPermission();
      if (granted) scheduleNextReminder();
    }
  });

  attachNewsletterCardListener(container);

  // Sound toggle
  container.querySelector('#btn-sound')?.addEventListener('click', () => {
    const on = toggleSound();
    const icon = container.querySelector('#sound-icon');
    if (icon) icon.textContent = on ? '🔊' : '🔇';
  });
}

// ─── Autostart helper ────────────────────────────────────────────────────────
// Loads the pack referenced by `?pack=<id>&autostart=...` and opens the mode
// picker (Quick / Full / Study). The user still chooses the mode — we skip
// only the "scroll to pack and click Start" step on the home screen.
async function autostartPicker(brand, pack) {
  const data = await loadPack(pack.file);
  if (!data?.questions?.length) return;
  showModePicker({ ...pack, brandName: brand.name }, data.questions);
}

// ─── Direct-launch helper ────────────────────────────────────────────────────
// Cert pages open their own 4-mode picker; `?mode=<choice>` routes us here so
// we don't open a second picker. Loads the pack JSON, applies mode-specific
// question counts (and stratified sampling for diagnostic), and navigates to
// the quiz screen directly.
function showLoadingOverlay(label) {
  if (document.getElementById('cq-loading-overlay')) return;
  const el = document.createElement('div');
  el.id = 'cq-loading-overlay';
  el.innerHTML = `<div class="cq-loading-card"><div class="cq-loading-spinner"></div><div class="cq-loading-label">${label}</div></div>`;
  document.body.appendChild(el);
}
function hideLoadingOverlay() {
  document.getElementById('cq-loading-overlay')?.remove();
}
async function autostartDirect(brand, pack, mode) {
  const modeLabel = mode === 'diagnostic' ? 'Preparing your diagnostic…'
    : mode === 'full' ? 'Loading exam…'
    : mode === 'study' ? 'Loading study mode…'
    : 'Loading quiz…';
  showLoadingOverlay(modeLabel);
  const data = await loadPack(pack.file);
  const questions = data?.questions || [];
  if (!questions.length) {
    hideLoadingOverlay();
    return;
  }

  const QUICK_COUNT = 5;
  const STUDY_COUNT = 10;
  const DIAG_COUNT  = 10;
  const packWithBrand = { ...pack, brandName: brand.name };

  if (mode === 'diagnostic') {
    const sample = stratifiedSample(questions, DIAG_COUNT);
    if (!sample.length) { hideLoadingOverlay(); return; }
    hideLoadingOverlay();
    appNavigate('quiz', { pack: packWithBrand, questions: sample, mode: 'diagnostic', count: sample.length });
    return;
  }
  hideLoadingOverlay();
  if (mode === 'study') {
    appNavigate('quiz', { pack: packWithBrand, questions, mode: 'study', count: STUDY_COUNT });
    return;
  }
  if (mode === 'full') {
    const fullCount = Math.min(questions.length, pack.full_count || questions.length);
    appNavigate('quiz', { pack: packWithBrand, questions, mode: 'full', count: fullCount });
    return;
  }
  // default: quick
  appNavigate('quiz', { pack: packWithBrand, questions, mode: 'quick', count: QUICK_COUNT });
}

// Stratified sample copied locally so we don't have to export from app.js;
// keeps the dependency direction one-way (screens → app, not the reverse).
// Mirrors the implementation in src/app.js — keep in sync.
function isValidQuestion(q) {
  if (!q.options || q.options.length !== 4) return false;
  if (Array.isArray(q.correct)) {
    return q.correct.length >= 1 &&
           q.correct.every(i => Number.isInteger(i) && i >= 0 && i < 4);
  }
  return Number.isInteger(q.correct) && q.correct >= 0 && q.correct < 4;
}
function stratifiedSample(questions, count) {
  const valid = questions.filter(isValidQuestion);
  if (valid.length <= count) return shuffle(valid.slice());
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
  let madeProgress = true;
  while (result.length < count && madeProgress) {
    madeProgress = false;
    for (const key of keys) {
      if (result.length >= count) break;
      const pick = buckets.get(key).shift();
      if (pick) { result.push(pick); used.add(pick.id); madeProgress = true; }
    }
  }
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

// ─── Path-node focused quiz ──────────────────────────────────────────────────
// When path.js launches a node it sends ?qids=<csv>. Skip the mode picker and
// launch a quiz containing only those questions, preserving the order encoded
// in the URL so the sub-boss / quiz node behaves deterministically.
async function autostartFocused(brand, pack, qids, mode) {
  const data = await loadPack(pack.file);
  if (!data?.questions?.length) return;
  const byId = new Map(data.questions.map(q => [String(q.id), q]));
  const focused = qids.map(id => byId.get(String(id))).filter(Boolean);
  if (!focused.length) {
    // Fallback: if the path-node IDs no longer match the pack (regenerated
    // bank, renamed IDs), drop to the picker instead of starting a 0-Q quiz.
    showModePicker({ ...pack, brandName: brand.name }, data.questions);
    return;
  }
  appNavigate('quiz', {
    pack:      { ...pack, brandName: brand.name },
    questions: focused,
    mode:      mode === 'full' ? 'full' : 'quick',
    count:     focused.length,
  });
}
