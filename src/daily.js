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
    /* Certification brand pages: inject above the pack grid so users see
       today's quest before scanning the exam list. The brand-section is
       the second <section> on every certifications/<brand>.html page. */
    var brandSection = document.querySelector('section.brand-section');
    if (brandSection) {
      var wrap = document.createElement('div');
      wrap.className = 'cq-daily-banner-host';
      wrap.style.maxWidth = '960px';
      wrap.style.margin = '0 auto 18px';
      wrap.style.padding = '0 24px';
      brandSection.parentNode.insertBefore(wrap, brandSection);
      inject(wrap);
      return;
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
