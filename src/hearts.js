/**
 * src/hearts.js — Phase 3A: hearts/lives system
 *
 * 5 hearts max. Lose 1 on a wrong answer in path nodes (or via cqHearts.lose()).
 * Regenerate 1 heart every 30 minutes of real time.
 * When at 0, gates new quiz attempts (renderer can check cqHearts.canPlay()).
 *
 * UI: small hearts row in the header (top-left next to the avatar).
 * Tap → modal with current heart count + next-regen ETA + "free heart"
 *       link to a free concept-card node (placeholder for now: links to /news).
 */
(function () {
  if (window.__cqHeartsInit) return;
  window.__cqHeartsInit = true;

  var KEY = 'cq-hearts-v1';
  var MAX = 5;
  var REGEN_MS = 30 * 60 * 1000; /* 30 min per heart */

  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY) || '{}');
      return { hearts: typeof s.hearts === 'number' ? s.hearts : MAX, lastLostAt: s.lastLostAt || 0 };
    } catch (_) { return { hearts: MAX, lastLostAt: 0 }; }
  }
  function save(s) {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (_) {}
  }

  /* Regenerate any hearts that were lost > REGEN_MS ago */
  function regen(s) {
    if (s.hearts >= MAX) return s;
    var now = Date.now();
    var elapsed = now - (s.lastLostAt || now);
    var regained = Math.floor(elapsed / REGEN_MS);
    if (regained <= 0) return s;
    s.hearts = Math.min(MAX, s.hearts + regained);
    /* keep lastLostAt rolling forward so next regen lines up */
    s.lastLostAt = s.hearts >= MAX ? 0 : s.lastLostAt + regained * REGEN_MS;
    return s;
  }

  function get() { return regen(load()); }
  function set(s) { save(s); render(); }

  function lose() {
    var s = get();
    if (s.hearts <= 0) return false;
    s.hearts -= 1;
    s.lastLostAt = Date.now();
    set(s);
    window.dispatchEvent(new CustomEvent('cq:heart-lost', { detail: { hearts: s.hearts } }));
    return true;
  }
  function gain(n) {
    var s = get();
    s.hearts = Math.min(MAX, s.hearts + (n || 1));
    if (s.hearts >= MAX) s.lastLostAt = 0;
    set(s);
  }
  function reset() { save({ hearts: MAX, lastLostAt: 0 }); render(); }
  function canPlay() { return get().hearts > 0; }
  function nextRegenMs() {
    var s = get();
    if (s.hearts >= MAX) return 0;
    var elapsed = Date.now() - (s.lastLostAt || Date.now());
    return Math.max(0, REGEN_MS - (elapsed % REGEN_MS));
  }

  /* ──────────────────────── UI ──────────────────────── */
  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  /* Phase 5.6 — Hearts render as a 5-segment health bar (chess-kombat
     style). Data model unchanged (cq-hearts-v1, MAX=5). Visual: bar
     with one filled segment per heart; color band shifts from green
     (>60 %) → amber (30-60 %) → red (<30 %). */
  function healthBarHtml(count) {
    var segs = '';
    for (var i = 0; i < MAX; i++) {
      segs += '<span class="cq-health-seg' + (i < count ? ' is-filled' : '') + '"></span>';
    }
    return '<span class="cq-health-bar" data-count="' + count + '">' + segs + '</span>';
  }
  function healthBandClass(count) {
    var pct = (count / MAX) * 100;
    if (pct >= 60) return 'cq-health--ok';
    if (pct >= 30) return 'cq-health--warn';
    return 'cq-health--low';
  }
  function render() {
    var chip = document.getElementById('cq-hearts-chip');
    if (!chip) return;
    var s = get();
    chip.dataset.count = s.hearts;
    /* Re-paint the bar each time so segments + band update together */
    chip.innerHTML =
      '<span class="cq-hearts-icon" aria-hidden="true">♥</span>' +
      healthBarHtml(s.hearts) +
      '<span class="cq-hearts-count">' + s.hearts + '/' + MAX + '</span>';
    chip.classList.toggle('cq-hearts-chip--empty', s.hearts === 0);
    chip.classList.remove('cq-health--ok', 'cq-health--warn', 'cq-health--low');
    chip.classList.add(healthBandClass(s.hearts));
    chip.setAttribute('aria-label',
      'Health: ' + s.hearts + ' of ' + MAX +
      (s.hearts < MAX ? ' — next regen in ' + fmtMs(nextRegenMs()) : ''));
  }

  function fmtMs(ms) {
    var m = Math.ceil(ms / 60000);
    if (m < 60) return m + 'm';
    var h = Math.floor(m / 60);
    return h + 'h ' + (m % 60) + 'm';
  }

  function openModal() {
    var s = get();
    var existing = document.getElementById('cq-hearts-modal');
    if (existing) existing.remove();
    var modal = document.createElement('div');
    modal.id = 'cq-hearts-modal';
    modal.className = 'cq-hearts-modal';
    modal.setAttribute('role', 'dialog');
    modal.innerHTML =
      '<div class="cq-hearts-backdrop"></div>' +
      '<div class="cq-hearts-panel">' +
        '<button type="button" class="cq-hearts-close" aria-label="Close">✕</button>' +
        '<div class="cq-hearts-row ' + healthBandClass(s.hearts) + '" aria-hidden="true">' +
          healthBarHtml(s.hearts) +
        '</div>' +
        '<h2>' + s.hearts + ' / ' + MAX + ' health</h2>' +
        '<p class="cq-hearts-msg">' + (s.hearts === 0
          ? "You're out of hearts. Next regenerates in <strong>" + fmtMs(nextRegenMs()) + "</strong>."
          : s.hearts < MAX
            ? "Next heart in <strong>" + fmtMs(nextRegenMs()) + "</strong>."
            : "You're at full health. Go practice!") + '</p>' +
        '<a href="/news/" class="cq-hearts-cta">Read a tip while you wait →</a>' +
      '</div>';
    document.body.appendChild(modal);
    setTimeout(function () { modal.classList.add('is-open'); }, 10);
    modal.querySelector('.cq-hearts-close').addEventListener('click', close);
    modal.querySelector('.cq-hearts-backdrop').addEventListener('click', close);
    function close() {
      modal.classList.remove('is-open');
      setTimeout(function () { modal.remove(); }, 200);
    }
  }

  ready(function () {
    var header = document.querySelector('.web-header');
    if (!header || document.getElementById('cq-hearts-chip')) return;
    var chip = document.createElement('button');
    chip.id = 'cq-hearts-chip';
    chip.type = 'button';
    chip.className = 'cq-hearts-chip';
    chip.setAttribute('aria-label', 'Your hearts');
    chip.innerHTML =
      '<span class="cq-hearts-icon" aria-hidden="true">♥</span>' +
      '<span class="cq-hearts-count">5</span>';
    /* Insert AFTER the avatar chip so it sits next to it */
    var avatar = header.querySelector('.cq-avatar-chip');
    if (avatar && avatar.nextSibling) header.insertBefore(chip, avatar.nextSibling);
    else header.insertBefore(chip, header.firstChild);
    chip.addEventListener('click', openModal);
    render();

    /* Refresh display every minute for regen ticking. If the chip
       is ever removed from the DOM (e.g., a tab teardown or future
       SPA route swap), clear the interval to avoid wasted wake-ups. */
    var tick = setInterval(function () {
      if (!document.getElementById('cq-hearts-chip')) {
        clearInterval(tick);
        return;
      }
      render();
    }, 60000);
  });

  window.cqHearts = {
    get: get,
    lose: lose,
    gain: gain,
    reset: reset,
    canPlay: canPlay,
    nextRegenMs: nextRegenMs,
    MAX: MAX
  };
})();
