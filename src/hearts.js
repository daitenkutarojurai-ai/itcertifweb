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
  /* Dual-context: browser-side renderer + Node-test target for the pure
     state math. Side effects (window listeners, DOM, localStorage) are
     guarded; the math (normalize/regenSync/applyLossSync/nextRegenMsFor)
     is pure and exported via CJS at the foot of the file. */
  var IS_BROWSER = typeof window !== 'undefined';
  if (IS_BROWSER) {
    if (window.__cqHeartsInit) return;
    window.__cqHeartsInit = true;
  }

  var KEY = 'cq-hearts-v1';
  var MAX = 5;
  var REGEN_MS = 30 * 60 * 1000; /* 30 min per heart */

  /* Audit S6 — hearts removed from the certification/quiz flow ON THE WEB.
     When disabled: no header chip, lives never decrement, no out-of-lives
     game-over gate, canPlay() always true. The state machine + Supabase
     user_hearts sync stay intact (kept full) so the cross-repo schema and
     cosmetics are untouched. Kept ON inside the live Capacitor app (which
     wraps this bundle and relies on hearts as its lives economy) — gated on
     window.Capacitor, injected before any page script runs. */
  var HEARTS_ENABLED = IS_BROWSER && !!(window.Capacitor && typeof window.Capacitor.getPlatform === 'function');

  /* ──────────────── Pure state helpers (testable, no I/O) ──────────────── */

  /* Coerce arbitrary parsed JSON into a valid {hearts, lastLostAt} shape. */
  function normalize(raw) {
    if (!raw || typeof raw !== 'object') return { hearts: MAX, lastLostAt: 0 };
    var h = typeof raw.hearts === 'number' ? raw.hearts : MAX;
    if (h < 0) h = 0;
    if (h > MAX) h = MAX;
    var t = typeof raw.lastLostAt === 'number' && raw.lastLostAt > 0 ? raw.lastLostAt : 0;
    return { hearts: h, lastLostAt: t };
  }

  /* Apply passive regen as of `now`. Pure. */
  function regenSync(state, now) {
    var s = normalize(state);
    if (s.hearts >= MAX) return s;
    if (!s.lastLostAt) return s;
    var elapsed = now - s.lastLostAt;
    var regained = Math.floor(elapsed / REGEN_MS);
    if (regained <= 0) return s;
    var hearts = Math.min(MAX, s.hearts + regained);
    var lastLostAt = hearts >= MAX ? 0 : s.lastLostAt + regained * REGEN_MS;
    return { hearts: hearts, lastLostAt: lastLostAt };
  }

  /* Decrement one heart (no-op if already 0). Pure. */
  function applyLossSync(state, now) {
    var s = regenSync(state, now);
    if (s.hearts <= 0) return s;
    return { hearts: s.hearts - 1, lastLostAt: now };
  }

  /* ms until the next regen tick from `now`. 0 if at full health. Pure. */
  function nextRegenMsFor(state, now) {
    var s = regenSync(state, now);
    if (s.hearts >= MAX) return 0;
    var since = now - (s.lastLostAt || now);
    return Math.max(0, REGEN_MS - (since % REGEN_MS));
  }

  /* ─────────────────── Browser I/O wrappers (side effects) ─────────────── */
  function load() {
    if (!IS_BROWSER) return { hearts: MAX, lastLostAt: 0 };
    try { return normalize(JSON.parse(localStorage.getItem(KEY) || '{}')); }
    catch (_) { return { hearts: MAX, lastLostAt: 0 }; }
  }
  function save(s) {
    if (!IS_BROWSER) return;
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (_) {}
  }
  function get() { return regenSync(load(), Date.now()); }
  function set(s) { save(s); render(); }

  /* Phase 5.6 — `lose()` is path-mode authoritative. Training quizzes
     never call this (the bar is read-only on /train.html). When hearts
     drop to 0 from a path-mode wrong answer, also surface the full-
     screen cooldown gate so the player understands why play is blocked.
     Visual feedback: flag the chip for a damage flash via class, CSS
     drives the shake + red flare. */
  function lose() {
    if (!HEARTS_ENABLED) return false; /* S6: wrong answers cost nothing, no game-over */
    var s = get();
    if (s.hearts <= 0) return false;
    s.hearts -= 1;
    s.lastLostAt = Date.now();
    set(s);
    flashDamage();
    window.dispatchEvent(new CustomEvent('cq:heart-lost', { detail: { hearts: s.hearts } }));
    if (s.hearts === 0 && isPathPage()) showCooldownGate();
    return true;
  }
  function flashDamage() {
    var chip = document.getElementById('cq-hearts-chip');
    if (!chip) return;
    chip.classList.remove('is-damaging');
    /* re-trigger the animation on every lose */
    void chip.offsetWidth;
    chip.classList.add('is-damaging');
    setTimeout(function () { chip.classList.remove('is-damaging'); }, 650);
  }
  function isPathPage() {
    try { return /^\/path(\.html|\/)/.test(location.pathname); }
    catch (_) { return false; }
  }
  function gain(n) {
    var s = get();
    s.hearts = Math.min(MAX, s.hearts + (n || 1));
    if (s.hearts >= MAX) s.lastLostAt = 0;
    set(s);
  }
  function reset() { save({ hearts: MAX, lastLostAt: 0 }); render(); }
  function canPlay() { return !HEARTS_ENABLED || get().hearts > 0; }
  function nextRegenMs() { return nextRegenMsFor(load(), Date.now()); }

  /* ──────────────────────── UI ──────────────────────── */
  function ready(fn) {
    if (!IS_BROWSER) return;
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
        '<a href="/news/" class="cq-hearts-cta">Read the news while you wait →</a>' +
      '</div>';
    document.body.appendChild(modal);
    setTimeout(function () { modal.classList.add('is-open'); }, 10);
    modal.querySelector('.cq-hearts-close').addEventListener('click', close);
    modal.querySelector('.cq-hearts-backdrop').addEventListener('click', close);
    modal.addEventListener('cq:a11y-escape', close);
    function close() {
      modal.classList.remove('is-open');
      setTimeout(function () { modal.remove(); }, 200);
    }
  }

  ready(function () {
    if (!HEARTS_ENABLED) return; /* S6: no hearts chip in the header */
    var header = document.querySelector('.web-header');
    // train.html runs the SPA's own (itcertif_hearts) hearts system, which is the
    // authoritative quiz-gating counter there. Suppress this decorative cq-hearts
    // chip on that page so the user never sees two contradictory heart counts.
    var onTrain = /\/train\.html$/.test(location.pathname);
    if (!header || onTrain || document.getElementById('cq-hearts-chip')) return;
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

  /* ─────────────── Phase 5.6 — full-screen cooldown gate ───────────────
     When health hits 0 on /path.html, we lock new node attempts until the
     next regen tick. The overlay shows a live countdown; when the timer
     elapses (≥1 heart regenerated), it auto-dismisses. Re-entering a node
     while empty re-opens it. Idempotent: only one overlay in the DOM. */
  function showCooldownGate() {
    if (!HEARTS_ENABLED) return; /* S6: no out-of-lives game-over gate */
    if (document.getElementById('cq-out-of-life')) return;
    var msLeft = nextRegenMs();
    var overlay = document.createElement('div');
    overlay.id = 'cq-out-of-life';
    overlay.className = 'cq-out-of-life';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', "You're out of lives — cooldown");
    overlay.innerHTML =
      '<div class="cq-out-of-life-backdrop"></div>' +
      '<div class="cq-out-of-life-card">' +
        '<div class="cq-out-of-life-icon" aria-hidden="true">💔</div>' +
        "<h2>You're out of lives</h2>" +
        '<p class="cq-out-of-life-sub">Next heart in</p>' +
        '<div class="cq-out-of-life-timer" aria-live="polite">--:--</div>' +
        '<div class="cq-out-of-life-bar"><div class="cq-out-of-life-bar-fill"></div></div>' +
        '<a href="/news/" class="cq-out-of-life-link">Read the news while you wait →</a>' +
        '<button type="button" class="cq-out-of-life-close" aria-label="Close">Hide</button>' +
      '</div>';
    document.body.appendChild(overlay);
    setTimeout(function () { overlay.classList.add('is-open'); }, 10);

    var timerEl = overlay.querySelector('.cq-out-of-life-timer');
    var fillEl = overlay.querySelector('.cq-out-of-life-bar-fill');
    var startedAtMs = REGEN_MS - msLeft; /* progress at open */
    var tick = setInterval(function () {
      var s = get();
      if (s.hearts > 0) {
        clearInterval(tick);
        dismiss();
        return;
      }
      var left = nextRegenMs();
      timerEl.textContent = mmss(left);
      var frac = (REGEN_MS - left) / REGEN_MS;
      fillEl.style.transform = 'scaleX(' + frac.toFixed(4) + ')';
    }, 1000);
    /* paint immediately */
    timerEl.textContent = mmss(msLeft);
    fillEl.style.transform = 'scaleX(' + ((REGEN_MS - msLeft) / REGEN_MS).toFixed(4) + ')';

    overlay.querySelector('.cq-out-of-life-close').addEventListener('click', dismiss);
    overlay.addEventListener('cq:a11y-escape', dismiss);
    function dismiss() {
      clearInterval(tick);
      overlay.classList.remove('is-open');
      setTimeout(function () { overlay.remove(); }, 220);
    }
  }
  function mmss(ms) {
    var s = Math.max(0, Math.ceil(ms / 1000));
    var m = Math.floor(s / 60);
    var r = s % 60;
    return (m < 10 ? '0' : '') + m + ':' + (r < 10 ? '0' : '') + r;
  }

  if (!IS_BROWSER) {
    /* Node test mode: export the pure helpers via CommonJS */
    if (typeof module !== 'undefined' && module.exports) {
      module.exports = {
        MAX: MAX,
        REGEN_MS: REGEN_MS,
        normalize: normalize,
        regenSync: regenSync,
        applyLossSync: applyLossSync,
        nextRegenMsFor: nextRegenMsFor
      };
    }
    return;
  }

  window.cqHearts = {
    enabled: HEARTS_ENABLED,
    get: get,
    lose: lose,
    gain: gain,
    reset: reset,
    canPlay: canPlay,
    nextRegenMs: nextRegenMs,
    showCooldownGate: showCooldownGate,
    MAX: MAX,
    REGEN_MS: REGEN_MS
  };
})();
