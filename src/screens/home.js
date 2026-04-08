/**
 * screens/home.js — Brand-grouped certification list
 */

import { loadIndex, loadPack }      from '../engine/dataLoader.js';
import { isSoundEnabled, toggleSound } from '../engine/sounds.js';
import { getProgress, getStreak, hasQuizzedToday } from '../engine/progress.js';
import { showModePicker }            from '../app.js';
import { isEnabled, requestPermission, scheduleNextReminder } from '../engine/notifications.js';
import { getDailyXP, getDailyGoal, getHearts, getMaxHearts, getMasteryPct, getNextHeartRegenMs } from '../engine/gamification.js';

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
          <div class="logo-bolt">⚡</div>
          <span class="logo-text">CertQuest</span>
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

// ─── Event listeners ───────────────────────────────────────────────────────────

function attachListeners(container, navigate, brands) {
  // Brand collapse toggle — expand first brand by default
  const brandHeaders = container.querySelectorAll('.brand-header');
  const allPacks     = container.querySelectorAll('.brand-packs');

  // Start all collapsed except first available brand
  allPacks.forEach((el, i) => {
    if (i === 0) el.classList.add('expanded');
    else el.classList.remove('expanded');
  });
  if (brandHeaders[0]) brandHeaders[0].querySelector('.brand-chevron')?.classList.add('open');

  brandHeaders.forEach(header => {
    header.addEventListener('click', () => {
      const brandId   = header.dataset.brandId;
      const packsEl   = container.querySelector(`.brand-packs[data-brand-id="${brandId}"]`);
      const chevron   = header.querySelector('.brand-chevron');
      const isOpen    = packsEl.classList.contains('expanded');
      packsEl.classList.toggle('expanded', !isOpen);
      chevron?.classList.toggle('open', !isOpen);
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

      const data = await import('../engine/dataLoader.js').then(m => m.loadPack(pack.file));
      btn.textContent = 'Start →';
      btn.disabled    = false;

      if (!data?.questions?.length) {
        btn.textContent = 'Error ↺';
        return;
      }

      showModePicker(pack, data.questions);
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

  // Sound toggle
  container.querySelector('#btn-sound')?.addEventListener('click', () => {
    const on = toggleSound();
    const icon = container.querySelector('#sound-icon');
    if (icon) icon.textContent = on ? '🔊' : '🔇';
  });
}
