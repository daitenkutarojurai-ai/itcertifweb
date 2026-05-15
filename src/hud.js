/**
 * src/hud.js — Phase 5.7: Chess-Kombat-style session HUD.
 *
 * Persistent corner panel rendered only during an active session
 * (quiz on /train.html OR an open quiz/sub-boss/final-boss/mini-game
 * node sheet on /path.html). Hidden on landing + content pages.
 *
 * Surfaces:
 *   • Health bar (5 segments — reuses cq-hearts-v1 state from
 *     window.cqHearts and the .cq-health-* CSS from Phase 5.6).
 *   • Player emoji + level badge (window.cqStats).
 *   • XP-to-next-level mini-bar.
 *   • Combo streak (correct-in-a-row this session).
 *
 * Auto-detect via MutationObserver — no path.js / quiz.js coupling.
 */
(function () {
  if (window.__cqHudInit) return;
  window.__cqHudInit = true;

  var MAX_HEARTS = 5;
  var combo = 0;
  var bestCombo = 0;

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  function buildHud() {
    var hud = document.createElement('div');
    hud.id = 'cq-hud';
    hud.className = 'cq-hud';
    hud.setAttribute('aria-hidden', 'true');
    hud.hidden = true;
    hud.innerHTML =
      '<div class="cq-hud-row cq-hud-row--top">' +
        '<div class="cq-hud-avatar" id="cq-hud-avatar" aria-hidden="true">' +
          '<span class="cq-hud-avatar-emoji">🥚</span>' +
          '<span class="cq-hud-level-badge">1</span>' +
        '</div>' +
        '<div class="cq-hud-bars">' +
          '<div class="cq-hud-bar-row">' +
            '<span class="cq-hud-bar-label">HP</span>' +
            '<span class="cq-health-bar" id="cq-hud-health">' +
              Array(MAX_HEARTS).fill('<span class="cq-health-seg is-filled"></span>').join('') +
            '</span>' +
          '</div>' +
          '<div class="cq-hud-bar-row">' +
            '<span class="cq-hud-bar-label">XP</span>' +
            '<span class="cq-hud-xp-bar"><span class="cq-hud-xp-fill" style="width:0%"></span></span>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="cq-hud-row cq-hud-row--combo" id="cq-hud-combo" hidden>' +
        '<span class="cq-hud-combo-x">×</span>' +
        '<span class="cq-hud-combo-n">0</span>' +
        '<span class="cq-hud-combo-label">combo</span>' +
      '</div>';
    document.body.appendChild(hud);
    return hud;
  }

  /* ──────────────────────── Render ──────────────────────── */
  function renderAll() {
    var hud = document.getElementById('cq-hud');
    if (!hud) return;
    renderAvatar(hud);
    renderHealth(hud);
    renderXp(hud);
    renderCombo(hud);
  }

  function renderAvatar(hud) {
    var stats = window.cqStats && window.cqStats.get && window.cqStats.get();
    if (!stats) return;
    hud.querySelector('.cq-hud-avatar-emoji').textContent =
      (window.cqStats.stageEmojiForLevel && window.cqStats.stageEmojiForLevel(stats.level)) || '🥚';
    hud.querySelector('.cq-hud-level-badge').textContent = stats.level;
  }

  function renderHealth(hud) {
    var hearts = window.cqHearts && window.cqHearts.get && window.cqHearts.get();
    if (!hearts) return;
    var count = hearts.hearts;
    var bar = hud.querySelector('#cq-hud-health');
    bar.dataset.count = count;
    var segs = '';
    for (var i = 0; i < MAX_HEARTS; i++) {
      segs += '<span class="cq-health-seg' + (i < count ? ' is-filled' : '') + '"></span>';
    }
    bar.innerHTML = segs;
    var pct = (count / MAX_HEARTS) * 100;
    bar.classList.remove('cq-health--ok', 'cq-health--warn', 'cq-health--low');
    bar.classList.add(pct >= 60 ? 'cq-health--ok' : pct >= 30 ? 'cq-health--warn' : 'cq-health--low');
  }

  function renderXp(hud) {
    var api = window.cqStats;
    if (!api || !api.get) return;
    var s = api.get();
    var p = api.xpProgressForLevel ? api.xpProgressForLevel(s.level, s.xp) : 0;
    /* p may be 0-1 or 0-100 depending on impl — normalise to 0-100 */
    var pct = p > 1 ? p : p * 100;
    pct = Math.max(0, Math.min(100, pct));
    hud.querySelector('.cq-hud-xp-fill').style.width = pct + '%';
  }

  function renderCombo(hud) {
    var row = hud.querySelector('#cq-hud-combo');
    if (combo >= 2) {
      row.hidden = false;
      row.querySelector('.cq-hud-combo-n').textContent = combo;
      row.classList.toggle('is-hot', combo >= 4);
    } else {
      row.hidden = true;
    }
  }

  function flashDamage(hud) {
    hud.classList.add('cq-hud--damage');
    setTimeout(function () { hud.classList.remove('cq-hud--damage'); }, 360);
  }

  /* ──────────────────────── Visibility logic ──────────────────────── */
  function isPathPage() {
    try { return /^\/path(\.html|\/)/.test(location.pathname); }
    catch (_) { return false; }
  }
  function isPathPackPage() {
    /* /path.html?pack=… (a specific path open) — not the picker. */
    if (!isPathPage()) return false;
    try { return /[?&]pack=/.test(location.search || ''); }
    catch (_) { return false; }
  }
  /* Phase 5.7 update — HUD is the always-on map companion on /path.html
     once a pack is loaded (avatar + health visible whether or not a node
     sheet is open). On /train.html it stays session-only. Hidden on all
     content pages. */
  function shouldShow() {
    if (isPathPackPage()) return true;
    if (document.querySelector('.quiz-screen')) return true;
    return false;
  }

  function syncVisibility() {
    var hud = document.getElementById('cq-hud') || buildHud();
    var open = shouldShow();
    if (open && hud.hidden) {
      hud.hidden = false;
      hud.setAttribute('aria-hidden', 'false');
      combo = 0;
      renderAll();
    } else if (!open && !hud.hidden) {
      hud.hidden = true;
      hud.setAttribute('aria-hidden', 'true');
      combo = 0;
      bestCombo = 0;
    }
  }

  /* ──────────────────────── Event wiring ──────────────────────── */
  ready(function () {
    buildHud();

    /* Re-render on backend changes */
    window.addEventListener('cq:stats-changed',  function () { renderAll(); });
    window.addEventListener('cq:level-up',       function () { renderAll(); });
    window.addEventListener('cq:heart-lost',     function () {
      var hud = document.getElementById('cq-hud');
      if (hud && !hud.hidden) flashDamage(hud);
      combo = 0;
      renderAll();
    });

    /* Combo signal — path.js + quiz.js can dispatch a CustomEvent
       cq:combo-tick with { correct: bool } as the user answers. If
       neither does (yet), HUD still renders without combo, gracefully. */
    window.addEventListener('cq:combo-tick', function (e) {
      var ok = e && e.detail && e.detail.correct;
      if (ok) {
        combo += 1;
        if (combo > bestCombo) bestCombo = combo;
      } else {
        combo = 0;
      }
      renderAll();
    });
    window.addEventListener('cq:session-complete', function () { combo = 0; bestCombo = 0; renderAll(); });

    /* MutationObserver auto-detects entry/exit of .quiz-screen and
       node-sheet visibility changes — zero coupling to path.js / quiz.js. */
    var obs = new MutationObserver(syncVisibility);
    obs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'class'] });
    syncVisibility();
  });

  window.cqHud = {
    show: function () { syncVisibility(); },
    flash: function () { var h = document.getElementById('cq-hud'); if (h) flashDamage(h); }
  };
})();
