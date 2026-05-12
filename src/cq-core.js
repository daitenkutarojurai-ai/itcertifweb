/* CertQuests core bundle — generated 2026-05-12T12:42:27.846Z
 *
 * This file is concatenated by scripts/build-core.js. Do not edit by hand;
 * edit the source modules in src/*.js and re-run `npm run build-core`.
 *
 * Modules (in load order):
  *   - a11y.js
 *   - stats.js
 *   - avatar.js
 *   - hearts.js
 *   - cosmetics.js
 *   - daily.js
 *   - menu.js
 */

/* ════════ a11y.js ════════ */
/**
 * src/a11y.js — accessibility helpers
 *
 * Single source of truth for the focus-trap + restore-focus pattern used
 * by every modal/dialog on the site. Plain IIFE; exposes window.cqA11y.
 *
 *   const trap = cqA11y.trapFocus(modalEl, { initialFocus: '.cta-primary' });
 *   // …user closes modal…
 *   trap.release(); // restores focus to the element that opened the modal
 *
 * Tab cycles within the modal; Shift+Tab cycles backwards; Escape is
 * dispatched as a 'cq:a11y-escape' event so the modal owner can handle
 * close — keeps focus-trap policy independent of close-policy.
 */
(function () {
  if (window.__cqA11yInit) return;
  window.__cqA11yInit = true;

  var FOCUSABLE =
    'a[href]:not([disabled]):not([aria-hidden="true"]), ' +
    'button:not([disabled]):not([aria-hidden="true"]), ' +
    'input:not([disabled]):not([type="hidden"]), ' +
    'select:not([disabled]), textarea:not([disabled]), ' +
    '[tabindex]:not([tabindex="-1"]):not([disabled])';

  function getFocusable(root) {
    if (!root) return [];
    return Array.prototype.slice
      .call(root.querySelectorAll(FOCUSABLE))
      .filter(function (el) {
        /* Skip elements inside `hidden` ancestors or with visibility:hidden */
        return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
      });
  }

  function trapFocus(root, opts) {
    if (!root) return { release: function () {} };
    opts = opts || {};
    var restoreTo = document.activeElement;

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        root.dispatchEvent(new CustomEvent('cq:a11y-escape', { bubbles: true }));
        return;
      }
      if (e.key !== 'Tab') return;
      var els = getFocusable(root);
      if (!els.length) { e.preventDefault(); return; }
      var first = els[0], last = els[els.length - 1];
      var active = document.activeElement;
      if (e.shiftKey && (active === first || !root.contains(active))) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault(); first.focus();
      }
    }

    root.addEventListener('keydown', onKeyDown);

    /* Move focus inside the modal */
    setTimeout(function () {
      var target;
      if (opts.initialFocus) target = root.querySelector(opts.initialFocus);
      if (!target) target = getFocusable(root)[0];
      if (target) target.focus();
    }, 30);

    return {
      release: function () {
        root.removeEventListener('keydown', onKeyDown);
        if (restoreTo && typeof restoreTo.focus === 'function') {
          try { restoreTo.focus(); } catch (_) {}
        }
      }
    };
  }

  /* Auto-attach: watch the DOM for `[role="dialog"][aria-modal="true"]`
     becoming visible (not hidden, display !== none). Each visible dialog
     gets a focus-trap; when it returns to hidden/removed, the trap
     releases and focus restores to the prior element.

     This means most modules don't need any explicit a11y wiring. */
  var attached = new WeakMap();

  function isVisibleDialog(el) {
    if (!el || el.hasAttribute('hidden')) return false;
    var cs = window.getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    return el.getAttribute('aria-modal') === 'true';
  }

  function scan() {
    var dialogs = document.querySelectorAll('[role="dialog"]');
    Array.prototype.forEach.call(dialogs, function (el) {
      var visible = isVisibleDialog(el);
      var existing = attached.get(el);
      if (visible && !existing) {
        var trap = trapFocus(el);
        attached.set(el, trap);
      } else if (!visible && existing) {
        existing.release();
        attached.delete(el);
      }
    });
  }

  function bootObserver() {
    /* Scan once on load, then watch for attribute and child changes */
    scan();
    if (typeof MutationObserver === 'undefined') return;
    var mo = new MutationObserver(function () {
      /* Debounce: scan in next animation frame */
      window.requestAnimationFrame(scan);
    });
    mo.observe(document.body, {
      attributes: true,
      attributeFilter: ['hidden', 'style', 'class', 'aria-modal'],
      childList: true,
      subtree: true
    });
  }

  if (document.readyState !== 'loading') bootObserver();
  else document.addEventListener('DOMContentLoaded', bootObserver);

  window.cqA11y = { trapFocus: trapFocus, getFocusable: getFocusable };
})();


/* ════════ stats.js ════════ */
/**
 * src/stats.js — Phase 2 ticket #1: practice-stats reducer
 *
 * Listens for `cq:session-complete` events fired by the quiz/results
 * screens, updates localStorage, computes XP + level, and emits
 * `cq:stats-changed` (always) + `cq:level-up` (when crossing a level).
 *
 * Public API on `window.cqStats`:
 *   - get()  → current stats object
 *   - reset() → wipe to defaults
 *   - stageEmojiForLevel(level) → emoji for level 1-30
 *   - xpProgressForLevel(xp, level) → 0..1 ratio inside current level band
 *   - thresholdForLevel(n) → absolute XP needed to reach level n
 *
 * Schema (cq-stats-v1):
 *   { totalSeconds, questionsAnswered, correctAnswered, sessionsCount,
 *     streakDays, lastSessionDate, perPack:{[id]:{seconds,qa,correct}},
 *     xp, level }
 *
 * Idempotent. Plain IIFE — no ES-module import needed.
 */
(function () {
  /* This file runs in two contexts:
       1) browser <script> — registers window.cqStats, listens for events
       2) Node tests — pure helpers reachable via module.exports
     The IIFE always evaluates; browser-only side effects are guarded. */
  var IS_BROWSER = typeof window !== 'undefined';
  if (IS_BROWSER) {
    if (window.__cqStatsInit) return;
    window.__cqStatsInit = true;
  }

  var STORE_KEY = 'cq-stats-v1';
  var MAX_LEVEL = 30;
  var LEVEL_BASE = 50;
  var LEVEL_RATIO = 1.18;
  var SCHEMA_VERSION = 1;   /* bump + add a case in migrate() when adding a field */

  /* Gate debug logging behind a flag so production phones aren't noisy.
     Enable with `localStorage.setItem('cq-debug', '1')` in DevTools. */
  function isDebug() {
    if (!IS_BROWSER) return false;
    try { return localStorage.getItem('cq-debug') === '1'; } catch (_) { return false; }
  }
  /* Shared debug emitter, exposed on window so other modules (path.js,
     profile.js, daily.js, mascot.js) can replace silent `catch (_) {}`
     with `catch (e) { window.cqDbg && window.cqDbg('[label]', e); }`
     for catches that could mask real data corruption. */
  function cqDbg() {
    if (!isDebug()) return;
    /* eslint-disable no-console */
    console.warn.apply(console, arguments);
    /* eslint-enable no-console */
  }
  if (IS_BROWSER) window.cqDbg = cqDbg;

  var DEFAULTS = {
    _v: SCHEMA_VERSION,
    totalSeconds: 0,
    questionsAnswered: 0,
    correctAnswered: 0,
    sessionsCount: 0,
    streakDays: 0,
    lastSessionDate: null,
    sessionDates: [],     /* last ~60 dates with at least one session (for heatmap) */
    perPack: {},
    bonusXp: 0,
    xp: 0,
    level: 1
  };

  /* Migrate older shapes forward. Always non-destructive: missing fields
     get DEFAULTS, present fields keep their value. Add a `case 1:` block
     and bump SCHEMA_VERSION whenever the on-disk shape changes. */
  function migrate(raw) {
    var v = (raw && typeof raw._v === 'number') ? raw._v : 0;
    if (v >= SCHEMA_VERSION) return raw;
    /* v0 → v1: original schema had no _v field. Nothing to rename — just
       stamp it so subsequent migrations have something to switch on. */
    raw._v = SCHEMA_VERSION;
    return raw;
  }

  /* Per-level emojis. Index = level - 1. */
  var STAGE_EMOJI = [
    /* 1-6 hatchling */     '🥚','🐣','🐤','🐥','📘','✏️',
    /* 7-12 apprentice */   '🐦','📒','🤓','🦜','🧣','🎓',
    /* 13-18 trainee */     '🦅','🎒','💻','☁️','🥉','🖥️',
    /* 19-24 adept */       '🦉','🧑‍🎓','📚','🏆','⚡','✨',
    /* 25-30 master */      '👑','🌟','🖋️','📖','🚩','🌌'
  ];

  /* Stage NAME for level-up messages */
  var STAGE_NAME = [
    'Untouched Egg','Cracked Egg','Newly Hatched','Standing Chick',
    'Chick Scholar','Chick with Pencil',
    'Fledgling','Note-taker','Bookworm','Plumed Apprentice',
    'Scarved Scholar','Diploma Chick',
    'Young Hawk','Field Hawk','Coder Hawk','Cloud Hawk',
    'Medalist Hawk','Server-rack Hawk',
    'Sage Owl','Scholar Owl','Library Owl','Trophy Owl',
    'Lightning Owl','Constellation Owl',
    'Crowned Phoenix','Star Phoenix','Quill Phoenix','Tome Phoenix',
    'Banner Phoenix','Aurora Phoenix'
  ];

  function dateKey(d) {
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }
  function todayKey() { return dateKey(new Date()); }
  function yesterdayKey() { return dateKey(new Date(Date.now() - 86400000)); }

  function load() {
    if (!IS_BROWSER) return Object.assign({}, DEFAULTS);
    try {
      var raw = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
      raw = migrate(raw);
      var s = Object.assign({}, DEFAULTS, raw);
      s.perPack = Object.assign({}, raw.perPack || {});
      return s;
    } catch (_) { return Object.assign({}, DEFAULTS); }
  }
  function save(s) {
    if (!IS_BROWSER) return;
    try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch (_) {}
  }

  /* XP = minutes × accuracy + streak·8 + sessions·2.
     Accuracy clamped [0.5, 1.2] so newcomers aren't punished and
     above-100% (impossible) is bounded. */
  function computeXp(s) {
    var minutes = s.totalSeconds / 60;
    var acc = s.questionsAnswered > 0 ? s.correctAnswered / s.questionsAnswered : 0.7;
    var accFactor = Math.max(0.5, Math.min(1.2, acc));
    return Math.round(minutes * accFactor + s.streakDays * 8 + s.sessionsCount * 2 + (s.bonusXp || 0));
  }

  /* XP threshold to *reach* level N. L1 starts at 0. */
  function thresholdForLevel(n) {
    if (n <= 1) return 0;
    if (n > MAX_LEVEL) n = MAX_LEVEL;
    return Math.round(LEVEL_BASE * Math.pow(LEVEL_RATIO, n - 2));
  }
  function levelForXp(xp) {
    for (var n = MAX_LEVEL; n >= 1; n--) {
      if (xp >= thresholdForLevel(n)) return n;
    }
    return 1;
  }
  /* 0..1 progress inside current level band */
  function xpProgressForLevel(xp, level) {
    if (level >= MAX_LEVEL) return 1;
    var cur = thresholdForLevel(level);
    var nxt = thresholdForLevel(level + 1);
    if (nxt <= cur) return 1;
    return Math.max(0, Math.min(1, (xp - cur) / (nxt - cur)));
  }

  function stageEmojiForLevel(level) {
    var i = Math.max(0, Math.min(STAGE_EMOJI.length - 1, level - 1));
    return STAGE_EMOJI[i];
  }
  function stageNameForLevel(level) {
    var i = Math.max(0, Math.min(STAGE_NAME.length - 1, level - 1));
    return STAGE_NAME[i];
  }

  function applySession(s, detail) {
    var today = todayKey();
    if (s.lastSessionDate === today) {
      /* Same day — streak unchanged */
    } else if (s.lastSessionDate === yesterdayKey()) {
      s.streakDays += 1;
    } else {
      s.streakDays = s.lastSessionDate ? 1 : 1;
    }
    s.lastSessionDate = today;
    s.sessionsCount += 1;
    s.totalSeconds += Math.max(0, +detail.secondsSpent || 0);
    s.questionsAnswered += Math.max(0, +detail.questionsAnswered || 0);
    s.correctAnswered += Math.max(0, +detail.correct || 0);
    if (detail.bonusXp) s.bonusXp = (s.bonusXp || 0) + Math.max(0, +detail.bonusXp);
    /* Push today's date into the rolling heatmap window */
    if (!s.sessionDates) s.sessionDates = [];
    if (s.sessionDates.indexOf(today) === -1) s.sessionDates.push(today);
    /* Keep only the last 60 unique dates */
    if (s.sessionDates.length > 60) s.sessionDates = s.sessionDates.slice(-60);
    if (detail.packId) {
      var p = s.perPack[detail.packId] || { seconds: 0, qa: 0, correct: 0 };
      p.seconds += +detail.secondsSpent || 0;
      p.qa += +detail.questionsAnswered || 0;
      p.correct += +detail.correct || 0;
      s.perPack[detail.packId] = p;
    }
    var prevLevel = s.level;
    s.xp = computeXp(s);
    s.level = levelForXp(s.xp);
    return { stats: s, leveledUp: s.level > prevLevel, prevLevel: prevLevel };
  }

  /* Browser-only: bind event listeners + expose to window */
  if (!IS_BROWSER) {
    /* Node test mode — export the pure helpers via CommonJS */
    if (typeof module !== 'undefined' && module.exports) {
      module.exports = {
        DEFAULTS: DEFAULTS,
        MAX_LEVEL: MAX_LEVEL,
        STAGE_EMOJI: STAGE_EMOJI,
        STAGE_NAME: STAGE_NAME,
        computeXp: computeXp,
        levelForXp: levelForXp,
        thresholdForLevel: thresholdForLevel,
        xpProgressForLevel: xpProgressForLevel,
        stageEmojiForLevel: stageEmojiForLevel,
        stageNameForLevel: stageNameForLevel,
        applySession: applySession,
        dateKey: dateKey,
        todayKey: todayKey,
        yesterdayKey: yesterdayKey
      };
    }
    return;
  }

  window.addEventListener('cq:session-complete', function (e) {
    var detail = (e && e.detail) || {};
    var s = load();
    var res = applySession(s, detail);
    save(res.stats);
    /* Set a global "last session at" timestamp so path.js can detect a
       completed quiz on its next page load (the path-node handshake from
       train.html → path.html). Must live in stats.js because train.html
       doesn't load path.js. */
    try { localStorage.setItem('cq-stats-v1-last-session-at', String(Date.now())); } catch (_) {}
    /* Also resolve any cq-path-pending right here if it matches the packId
       — this way the node marks complete the moment the quiz finishes,
       not just when the user returns to the path map. */
    try {
      var pending = JSON.parse(localStorage.getItem('cq-path-pending') || 'null');
      if (pending && pending.packId === detail.packId) {
        var prog = JSON.parse(localStorage.getItem('cq-path-progress-v1') || '{}');
        prog[pending.packId] = prog[pending.packId] || {};
        prog[pending.packId][pending.nodeId] = {
          completed: true,
          completedAt: Date.now(),
          score: detail.correct != null ? detail.correct : null
        };
        localStorage.setItem('cq-path-progress-v1', JSON.stringify(prog));
        /* If this was the final boss → award the laurel here too */
        if (pending.nodeId === 'final-boss') {
          var laurels = JSON.parse(localStorage.getItem('cq-laurels-v1') || '[]');
          if (!laurels.some(function (l) { return l.packId === pending.packId; })) {
            laurels.push({ packId: pending.packId, earnedAt: Date.now(), score: detail.correct || null });
            localStorage.setItem('cq-laurels-v1', JSON.stringify(laurels));
            /* Flag a freshly-earned laurel so path.html can fire the
               survivor ceremony when the user returns. The page that
               awards the laurel is train.html, but the ceremony lives
               in path.js — so we hand it off via this localStorage flag. */
            localStorage.setItem('cq-laurel-fresh-v1', JSON.stringify({
              packId: pending.packId, at: Date.now(), score: detail.correct || null
            }));
          }
        }
        localStorage.removeItem('cq-path-pending');
      }
    } catch (e) {
      /* The handshake is the bridge between train.html → path.html. If
         it ever silently fails the user's path node never marks complete
         on their next visit — visible regression that's hard to repro
         without a log. Surface in debug builds. */
      cqDbg('[stats] path-pending handshake failed', e);
    }
    if (isDebug()) {
      /* eslint-disable no-console */
      console.log('[cq-stats] session-complete →', {
        packId: detail.packId, secondsSpent: detail.secondsSpent,
        correct: detail.correct, questionsAnswered: detail.questionsAnswered,
        newLevel: res.stats.level, xp: res.stats.xp,
        streak: res.stats.streakDays, leveledUp: res.leveledUp
      });
      /* eslint-enable no-console */
    }
    window.dispatchEvent(new CustomEvent('cq:stats-changed', {
      detail: { stats: res.stats, leveledUp: res.leveledUp, prevLevel: res.prevLevel }
    }));
    if (res.leveledUp) {
      window.dispatchEvent(new CustomEvent('cq:level-up', {
        detail: {
          stats: res.stats, prevLevel: res.prevLevel,
          newLevel: res.stats.level,
          newStageName: stageNameForLevel(res.stats.level),
          newStageEmoji: stageEmojiForLevel(res.stats.level)
        }
      }));
    }
  });

  window.cqStats = {
    get: load,
    reset: function () { save(Object.assign({}, DEFAULTS)); window.dispatchEvent(new CustomEvent('cq:stats-changed', { detail: { stats: load(), leveledUp: false } })); },
    computeXp: computeXp,
    levelForXp: levelForXp,
    thresholdForLevel: thresholdForLevel,
    xpProgressForLevel: xpProgressForLevel,
    stageEmojiForLevel: stageEmojiForLevel,
    stageNameForLevel: stageNameForLevel,
    MAX_LEVEL: MAX_LEVEL
  };
})();


/* ════════ avatar.js ════════ */
/**
 * src/avatar.js — Phase 2 ticket #2: header avatar chip.
 *
 * Injects a 44px circular avatar chip on the LEFT of the header logo on
 * every page. Shows current stage emoji (level 1-30) with a conic-gradient
 * XP arc around the ring.
 *
 * Listens for `cq:stats-changed` to re-render in place.
 * Tap to (eventually) open a stats panel — TODO ticket #4. For now, taps
 * navigate to /stats.html so existing stats page is the fallback view.
 *
 * Idempotent. Plain IIFE.
 */
(function () {
  if (window.__cqAvatarInit) return;
  window.__cqAvatarInit = true;

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  function getApi() { return window.cqStats; }

  function render(chip, stats) {
    var api = getApi();
    if (!chip) return;
    /* Defensive: render a safe baseline if stats API isn't ready */
    if (!api || typeof api.xpProgressForLevel !== 'function') {
      chip.style.setProperty('--xp-deg', '0deg');
      var fallbackEmoji = chip.querySelector('.cq-avatar-emoji');
      var fallbackLvl = chip.querySelector('.cq-avatar-level');
      if (fallbackEmoji) fallbackEmoji.textContent = '🥚';
      if (fallbackLvl) fallbackLvl.textContent = '1';
      return;
    }
    var level = stats.level || 1;
    var progress = api.xpProgressForLevel(stats.xp || 0, level); /* 0..1 */
    var emoji = api.stageEmojiForLevel(level);
    chip.style.setProperty('--xp-deg', (progress * 360).toFixed(1) + 'deg');
    chip.dataset.level = String(level);
    var emojiSpan = chip.querySelector('.cq-avatar-emoji');
    var levelSpan = chip.querySelector('.cq-avatar-level');
    if (emojiSpan) emojiSpan.textContent = emoji;
    if (levelSpan) levelSpan.textContent = level;
    chip.setAttribute('aria-label',
      'Level ' + level + ' · ' + Math.round(progress * 100) + '% to next');
    chip.setAttribute('title',
      'Level ' + level + ' · XP ' + (stats.xp || 0) + ' · streak ' + (stats.streakDays || 0) + 'd');
    /* Worn hat overlay */
    var hat = window.cqCosmetics && window.cqCosmetics.currentHat && window.cqCosmetics.currentHat();
    var hatEl = chip.querySelector('.cq-avatar-hat');
    if (hat) {
      if (hatEl) hatEl.textContent = hat.emoji;
      else {
        var h = document.createElement('span');
        h.className = 'cq-avatar-hat';
        h.setAttribute('aria-hidden', 'true');
        h.textContent = hat.emoji;
        chip.appendChild(h);
      }
    } else if (hatEl) { hatEl.remove(); }
  }

  function levelUpAnimation(chip) {
    chip.classList.remove('cq-avatar-chip--levelup');
    void chip.offsetWidth;
    chip.classList.add('cq-avatar-chip--levelup');
    setTimeout(function () { chip.classList.remove('cq-avatar-chip--levelup'); }, 1400);
  }

  ready(function () {
    var header = document.querySelector('.web-header');
    if (!header || header.querySelector('.cq-avatar-chip')) return;

    var chip = document.createElement('a');
    chip.className = 'cq-avatar-chip';
    chip.href = '/profile.html';
    chip.setAttribute('aria-label', 'Your level');
    chip.innerHTML =
      '<span class="cq-avatar-ring" aria-hidden="true"></span>' +
      '<span class="cq-avatar-inner" aria-hidden="true">' +
        '<span class="cq-avatar-emoji">🥚</span>' +
      '</span>' +
      '<span class="cq-avatar-level" aria-hidden="true">1</span>';

    /* Insert as first child of header so it lands in grid-column 1 on mobile. */
    header.insertBefore(chip, header.firstChild);

    var api = getApi();
    if (api) render(chip, api.get());

    window.addEventListener('cq:stats-changed', function (e) {
      var stats = (e && e.detail && e.detail.stats) || (api && api.get());
      if (stats) render(chip, stats);
    });
    window.addEventListener('cq:level-up', function () {
      levelUpAnimation(chip);
    });
    window.addEventListener('cq:cosmetic-changed', function () {
      if (api) render(chip, api.get());
    });
  });
})();


/* ════════ hearts.js ════════ */
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

  function render() {
    var chip = document.getElementById('cq-hearts-chip');
    if (!chip) return;
    var s = get();
    chip.dataset.count = s.hearts;
    chip.querySelector('.cq-hearts-count').textContent = s.hearts;
    chip.classList.toggle('cq-hearts-chip--empty', s.hearts === 0);
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
        '<div class="cq-hearts-row" aria-hidden="true">' +
          Array(MAX).fill(0).map(function (_, i) {
            return '<span class="cq-heart' + (i < s.hearts ? ' cq-heart--full' : '') + '">♥</span>';
          }).join('') +
        '</div>' +
        '<h2>' + s.hearts + ' of ' + MAX + ' hearts</h2>' +
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


/* ════════ cosmetics.js ════════ */
/**
 * src/cosmetics.js — Phase 3B: avatar cosmetics
 *
 * Tracks the user's unlocked hat keys + the currently-worn one.
 * Hats unlock either by opening treasure chests (key matches the
 * chest's cosmeticKey) or by hitting a level milestone (level-5, 10…).
 *
 * Listens for `cq:cosmetic-unlock` events and `cq:level-up` to award
 * level-gated hats. Re-emits `cq:cosmetic-changed` so avatar.js and
 * path.js can refresh.
 *
 * Public API on window.cqCosmetics:
 *   - get()           → { unlocked: string[], wearing: string|null }
 *   - unlock(key)     → bool (true if newly unlocked)
 *   - wear(key)       → bool
 *   - currentHat()    → catalog entry of the worn hat, or null
 *   - catalog()       → array of all hats (with locked flag)
 *
 * Catalog is loaded lazily from /data/cosmetics.json.
 */
(function () {
  if (window.__cqCosmeticsInit) return;
  window.__cqCosmeticsInit = true;

  var KEY = 'cq-cosmetics-v1';
  var CATALOG_URL = '/data/cosmetics.json';
  var catalog = null;
  var catalogPromise = null;

  function load() {
    try {
      var raw = JSON.parse(localStorage.getItem(KEY) || '{}');
      return {
        unlocked: Array.isArray(raw.unlocked) ? raw.unlocked : [],
        wearing: raw.wearing || null
      };
    } catch (_) { return { unlocked: [], wearing: null }; }
  }
  function save(s) {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (_) {}
  }

  function ensureCatalog() {
    if (catalog) return Promise.resolve(catalog);
    if (catalogPromise) return catalogPromise;
    catalogPromise = fetch(CATALOG_URL, { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : { hats: [] }; })
      .then(function (json) { catalog = json; return catalog; })
      .catch(function () { catalog = { hats: [] }; return catalog; });
    return catalogPromise;
  }

  function get() { return load(); }
  function currentHat() {
    var s = load();
    if (!catalog || !s.wearing) return null;
    return (catalog.hats || []).find(function (h) { return h.key === s.wearing; }) || null;
  }
  function unlock(key) {
    var s = load();
    if (s.unlocked.indexOf(key) !== -1) return false;
    s.unlocked.push(key);
    /* Auto-wear the first hat ever unlocked so the user notices */
    if (!s.wearing) s.wearing = key;
    save(s);
    window.dispatchEvent(new CustomEvent('cq:cosmetic-changed', { detail: { unlocked: s.unlocked, wearing: s.wearing } }));
    return true;
  }
  function wear(key) {
    var s = load();
    if (key && s.unlocked.indexOf(key) === -1) return false;
    s.wearing = key || null;
    save(s);
    window.dispatchEvent(new CustomEvent('cq:cosmetic-changed', { detail: { unlocked: s.unlocked, wearing: s.wearing } }));
    return true;
  }
  function catalogList() {
    return ensureCatalog().then(function () {
      var s = load();
      return (catalog.hats || []).map(function (h) {
        return Object.assign({}, h, { locked: s.unlocked.indexOf(h.key) === -1, wearing: s.wearing === h.key });
      });
    });
  }

  /* External unlock event */
  window.addEventListener('cq:cosmetic-unlock', function (e) {
    var key = e && e.detail && e.detail.key;
    if (key) unlock(key);
  });

  /* Level-gated unlocks: trigger when crossing level boundaries */
  window.addEventListener('cq:level-up', function (e) {
    var level = (e && e.detail && e.detail.newLevel) || 0;
    ensureCatalog().then(function () {
      (catalog.hats || []).forEach(function (h) {
        if (h.byLevel && level >= h.unlockAt) unlock(h.key);
      });
    });
  });

  /* Backfill: on first load, ensure existing level cleared milestones
     unlock retroactively (in case user was already at level 5 before
     cosmetics shipped). */
  document.addEventListener('DOMContentLoaded', function () {
    var stats = window.cqStats;
    if (!stats) return;
    var level = stats.get().level || 1;
    ensureCatalog().then(function () {
      (catalog.hats || []).forEach(function (h) {
        if (h.byLevel && level >= h.unlockAt) unlock(h.key);
      });
    });
  });

  window.cqCosmetics = {
    get: get,
    unlock: unlock,
    wear: wear,
    currentHat: currentHat,
    catalog: catalogList,
    ensureCatalog: ensureCatalog
  };
})();


/* ════════ daily.js ════════ */
/**
 * src/daily.js — Phase 3B: daily-quest banner
 *
 * Persists a "today's quest" in localStorage. Default quest: clear 1
 * path node today → +20 XP. Resets at local midnight (we use the
 * date string YYYY-MM-DD as the key).
 *
 * Injects a small banner at the top of the homepage and /path.html
 * showing quest state + progress.
 *
 * Listens for `cq:session-complete` events with mode starting with
 * `path-` (path-concept, path-minigame, path-chest) — those count as
 * "node cleared". Quiz/sub-boss/final-boss nodes count too once their
 * deferred completion is wired by path.js (cq:session-complete on
 * return). For now we count any `cq:session-complete` event.
 *
 * On completion: awards bonus XP via the cq:session-complete bonusXp
 * field (so stats.js picks it up).
 */
(function () {
  if (window.__cqDailyInit) return;
  window.__cqDailyInit = true;

  var KEY = 'cq-daily-v1';
  var TARGET = 1;            /* clear 1 node */
  var REWARD_XP = 20;

  function dateKey() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }
  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}'); }
    catch (e) {
      if (window.cqDbg) window.cqDbg('[daily] load JSON.parse failed', e);
      return {};
    }
  }
  function save(s) {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (_) {}
  }
  function todayState() {
    var s = load();
    var k = dateKey();
    if (s.date !== k) {
      s = { date: k, progress: 0, claimed: false };
      save(s);
    }
    return s;
  }
  function bump() {
    var s = todayState();
    if (s.claimed) return s;
    s.progress = Math.min(TARGET, s.progress + 1);
    if (s.progress >= TARGET && !s.claimed) {
      s.claimed = true;
      /* Award bonus XP via a synthetic session-complete event */
      try {
        window.dispatchEvent(new CustomEvent('cq:session-complete', { detail: {
          packId: 'daily-quest', secondsSpent: 0, questionsAnswered: 0,
          correct: 0, mode: 'daily-quest-reward', bonusXp: REWARD_XP
        }}));
      } catch (_) {}
    }
    save(s);
    window.dispatchEvent(new CustomEvent('cq:daily-changed', { detail: s }));
    return s;
  }

  function render() {
    var banner = document.getElementById('cq-daily-banner');
    if (!banner) return;
    var s = todayState();
    var pctEl = banner.querySelector('.cq-daily-bar-fill');
    var labelEl = banner.querySelector('.cq-daily-label');
    var titleEl = banner.querySelector('.cq-daily-title');
    var pct = Math.round((s.progress / TARGET) * 100);
    if (pctEl) pctEl.style.width = pct + '%';
    if (labelEl) labelEl.textContent = s.claimed
      ? 'Done! +' + REWARD_XP + ' XP banked'
      : s.progress + ' / ' + TARGET + ' node';
    if (titleEl) titleEl.textContent = s.claimed
      ? '🎉 Daily quest complete'
      : '⚡ Daily quest';
    banner.classList.toggle('cq-daily-banner--done', !!s.claimed);
  }

  function inject(host) {
    if (!host || document.getElementById('cq-daily-banner')) return;
    var banner = document.createElement('div');
    banner.id = 'cq-daily-banner';
    banner.className = 'cq-daily-banner';
    banner.innerHTML =
      '<div class="cq-daily-icon" aria-hidden="true">⚡</div>' +
      '<div class="cq-daily-body">' +
        '<div class="cq-daily-row">' +
          '<span class="cq-daily-title">Daily quest</span>' +
          '<span class="cq-daily-label">0 / 1</span>' +
        '</div>' +
        '<div class="cq-daily-bar"><div class="cq-daily-bar-fill"></div></div>' +
        '<div class="cq-daily-sub">Clear 1 path node today → +' + REWARD_XP + ' XP</div>' +
      '</div>';
    host.insertBefore(banner, host.firstChild);
    render();
  }

  /* Bump on any path-node clear (we count any session-complete that's
     not the daily-quest-reward itself to avoid recursive bumping) */
  window.addEventListener('cq:session-complete', function (e) {
    var mode = (e && e.detail && e.detail.mode) || '';
    if (mode === 'daily-quest-reward') return;
    bump();
  });

  /* Auto-refresh on date change (page-open after midnight) */
  setInterval(function () {
    var s = load();
    if (s.date && s.date !== dateKey()) render();
  }, 60000);

  document.addEventListener('DOMContentLoaded', function () {
    /* Path INDEX page only: prepend to .path-page. Skip the banner on
       individual pack pages (/path.html?pack=…) — the banner there
       clutters the map and offers a destination the user is already on. */
    var pathHost = document.querySelector('.path-page');
    if (pathHost) {
      try {
        var pp = new URLSearchParams(location.search);
        if (pp.get('pack')) return;
      } catch (_) {}
      inject(pathHost); return;
    }
    /* Homepage: prepend after the onboarding-zone (or just inside main) */
    var ob = document.getElementById('onboarding-mount');
    if (ob && ob.parentNode) {
      var wrap = document.createElement('div');
      wrap.className = 'cq-daily-banner-host';
      wrap.style.maxWidth = '720px';
      wrap.style.margin = '0 auto';
      wrap.style.padding = '0 18px';
      ob.parentNode.insertBefore(wrap, ob);
      inject(wrap);
    }
  });

  window.addEventListener('cq:daily-changed', render);

  window.cqDaily = {
    state: todayState,
    bump: bump,
    reset: function () { save({}); render(); }
  };
})();


/* ════════ menu.js ════════ */
/**
 * src/menu.js — mobile hamburger menu, injected into every page.
 *
 * Why JS-injected: there are 70+ HTML files. Editing each one's header
 * markup is brittle. This script finds the existing `.web-header`, drops
 * in a hamburger button (visible only on phones via desktop.css), and
 * builds a slide-in drawer with site-wide navigation.
 *
 * Idempotent: safe to load twice.
 */
(function () {
  if (window.__cqMobileMenuInit) return;
  window.__cqMobileMenuInit = true;

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    var header = document.querySelector('.web-header');
    if (!header || document.getElementById('cq-mobile-menu-btn')) return;

    /* ── Hamburger button (placed inside header, top-right) ── */
    var btn = document.createElement('button');
    btn.id = 'cq-mobile-menu-btn';
    btn.className = 'mobile-menu-btn';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Open menu');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', 'cq-mobile-menu');
    btn.innerHTML =
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">' +
      '<line x1="3" y1="6" x2="21" y2="6"/>' +
      '<line x1="3" y1="12" x2="21" y2="12"/>' +
      '<line x1="3" y1="18" x2="21" y2="18"/>' +
      '</svg>';
    header.appendChild(btn);

    /* ── Drawer overlay ── */
    var menu = document.createElement('div');
    menu.id = 'cq-mobile-menu';
    menu.className = 'mobile-menu';
    menu.hidden = true;
    menu.setAttribute('role', 'dialog');
    menu.setAttribute('aria-modal', 'true');
    menu.setAttribute('aria-label', 'Site navigation');
    menu.innerHTML =
      '<nav class="mobile-menu-panel" aria-label="Mobile navigation">' +
        '<button type="button" class="mobile-menu-close" aria-label="Close menu">' +
          '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="6" y1="18" x2="18" y2="6"/></svg>' +
        '</button>' +
        '<div class="mobile-menu-eyebrow">Explore</div>' +
        '<a href="/path.html" class="mobile-menu-new">' +
          '<span class="mobile-menu-emoji">🗺️</span>Cert Quest' +
          '<span class="mobile-menu-pill">NEW</span>' +
        '</a>' +
        '<a href="/profile.html">' +
          '<span class="mobile-menu-emoji">🦑</span>Your profile' +
        '</a>' +
        '<a href="/train.html">' +
          '<span class="mobile-menu-emoji">🎯</span>Training' +
        '</a>' +
        '<a href="/certifications/">' +
          '<span class="mobile-menu-emoji">🏅</span>Certifications' +
        '</a>' +
        '<a href="/careers/">' +
          '<span class="mobile-menu-emoji">🚀</span>Careers' +
        '</a>' +
        '<a href="/courses/">' +
          '<span class="mobile-menu-emoji">📚</span>Free courses' +
        '</a>' +
        '<a href="/news/">' +
          '<span class="mobile-menu-emoji">💡</span>Pro tips' +
        '</a>' +
        '<a href="/stats.html">' +
          '<span class="mobile-menu-emoji">📊</span>Stats' +
        '</a>' +
        '<div class="mobile-menu-divider"></div>' +
        '<a href="/contact.html">' +
          '<span class="mobile-menu-emoji">✉️</span>Contact' +
        '</a>' +
        '<a class="mobile-menu-app" href="https://play.google.com/store/apps/details?id=com.certquest.app" target="_blank" rel="noopener">' +
          '<span class="mobile-menu-emoji">📱</span>Get the app' +
        '</a>' +
      '</nav>';
    document.body.appendChild(menu);

    var prevOverflow = '';
    function open() {
      menu.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
      prevOverflow = document.body.style.overflow || '';
      document.body.style.overflow = 'hidden';
    }
    function close() {
      menu.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = prevOverflow;
    }
    btn.addEventListener('click', open);
    menu.querySelector('.mobile-menu-close').addEventListener('click', close);
    menu.addEventListener('click', function (e) { if (e.target === menu) close(); });
    document.addEventListener('keydown', function (e) { if (!menu.hidden && e.key === 'Escape') close(); });

    /* ── Sticky header scrolled-state toggle ── */
    var scrollTicking = false;
    function syncScrolled() {
      var scrolled = (window.scrollY || window.pageYOffset || 0) > 8;
      header.classList.toggle('is-scrolled', scrolled);
      scrollTicking = false;
    }
    function onScroll() {
      if (!scrollTicking) {
        window.requestAnimationFrame(syncScrolled);
        scrollTicking = true;
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    syncScrolled();
  });
})();
