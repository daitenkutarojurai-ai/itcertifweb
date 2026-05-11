/**
 * src/mascot.js — Phase 1: the main mascot (tips/encouragement)
 *
 * Floating character in the bottom-right corner. Rotates through short,
 * encouraging tips. Tap to advance to the next tip. Dismiss to hide for
 * 12 hours.
 *
 * Phase 2 (planned, see TODO.md) will add a separate player avatar that
 * evolves with practice metrics.
 *
 * Idempotent: safe to load twice.
 */
(function () {
  if (window.__cqMascotInit) return;
  window.__cqMascotInit = true;

  var DISMISS_KEY = 'cq-mascot-dismissed-at';
  var TIP_KEY = 'cq-mascot-tip-idx';
  var TWELVE_HOURS = 12 * 60 * 60 * 1000;

  var TIPS = [
    "Hey! 20 minutes a day beats 4 hours once a week. 💪",
    "Pro tip: do the Question of the Day first — quick warm-up.",
    "Stuck on a cert? Check the career roadmaps for context.",
    "Studying for AWS? Start with Cloud Practitioner — it's the foundation.",
    "Don't just read — quiz yourself. Recall beats re-reading.",
    "Practice with a 5-question quiz on lunch break. Easy win.",
    "Each cert opens doors. Pick one and commit for 30 days.",
    "Tap the search bar at the top to jump straight to your cert.",
    "Got a Pomodoro timer? 25 min focused study, then a quick walk.",
    "Failed a question? Read the explanation twice. It'll stick.",
    "Browse the news section for cheatsheets and war stories.",
    "Want the mobile app? Tap the menu → Get the app for offline mode."
  ];

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  function shouldShow() {
    try {
      var last = +(localStorage.getItem(DISMISS_KEY) || 0);
      return !last || (Date.now() - last) > TWELVE_HOURS;
    } catch (_) { return true; }
  }

  function getTipIdx() {
    try {
      var idx = +(localStorage.getItem(TIP_KEY) || 0);
      if (!isFinite(idx) || idx < 0) idx = 0;
      return idx % TIPS.length;
    } catch (_) { return 0; }
  }
  function bumpTipIdx() {
    var next = (getTipIdx() + 1) % TIPS.length;
    try { localStorage.setItem(TIP_KEY, String(next)); } catch (_) {}
    return next;
  }

  ready(function () {
    if (!shouldShow()) return;
    if (document.getElementById('cq-mascot')) return;

    var root = document.createElement('div');
    root.id = 'cq-mascot';
    root.className = 'cq-mascot';
    root.setAttribute('role', 'complementary');
    root.setAttribute('aria-label', 'Friendly tip from the CertQuests mascot');
    root.innerHTML =
      '<button type="button" class="cq-mascot-bubble" aria-live="polite">' +
        '<span class="cq-mascot-bubble-text">' + TIPS[getTipIdx()] + '</span>' +
        '<span class="cq-mascot-bubble-tail" aria-hidden="true"></span>' +
      '</button>' +
      '<button type="button" class="cq-mascot-char" aria-label="Next tip">' +
        '<span class="cq-mascot-emoji" aria-hidden="true">🦉</span>' +
        '<span class="cq-mascot-dot" aria-hidden="true"></span>' +
      '</button>' +
      '<button type="button" class="cq-mascot-close" aria-label="Hide tips for a while">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="6" y1="18" x2="18" y2="6"/></svg>' +
      '</button>';
    document.body.appendChild(root);

    var bubble = root.querySelector('.cq-mascot-bubble');
    var bubbleText = root.querySelector('.cq-mascot-bubble-text');
    var charBtn = root.querySelector('.cq-mascot-char');
    var closeBtn = root.querySelector('.cq-mascot-close');

    function nextTip() {
      var i = bumpTipIdx();
      bubbleText.textContent = TIPS[i];
      bubble.classList.remove('cq-mascot-bubble--pop');
      void bubble.offsetWidth; /* restart animation */
      bubble.classList.add('cq-mascot-bubble--pop');
      charBtn.classList.remove('cq-mascot-char--wave');
      void charBtn.offsetWidth;
      charBtn.classList.add('cq-mascot-char--wave');
    }
    function dismiss() {
      root.classList.add('cq-mascot--dismissing');
      try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch (_) {}
      setTimeout(function () { root.remove(); }, 250);
    }

    bubble.addEventListener('click', nextTip);
    charBtn.addEventListener('click', nextTip);
    closeBtn.addEventListener('click', dismiss);

    /* Slide in after a short delay so the page paints first */
    setTimeout(function () { root.classList.add('cq-mascot--visible'); }, 1400);

    /* Mini-wave every 18s if the user hasn't interacted */
    var idleWaveInterval = setInterval(function () {
      if (!document.body.contains(root)) { clearInterval(idleWaveInterval); return; }
      charBtn.classList.remove('cq-mascot-char--wave');
      void charBtn.offsetWidth;
      charBtn.classList.add('cq-mascot-char--wave');
    }, 18000);
  });
})();
