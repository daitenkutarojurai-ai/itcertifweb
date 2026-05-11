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
      '<button type="button" class="cq-mascot-bubble" aria-live="polite" aria-hidden="true">' +
        '<span class="cq-mascot-bubble-text">' + TIPS[getTipIdx()] + '</span>' +
        '<span class="cq-mascot-bubble-tail" aria-hidden="true"></span>' +
      '</button>' +
      '<button type="button" class="cq-mascot-char" aria-label="Tip from CertQuests">' +
        '<span class="cq-mascot-emoji" aria-hidden="true">🦑</span>' +
        '<span class="cq-mascot-dot" aria-hidden="true"></span>' +
      '</button>';
    document.body.appendChild(root);

    var bubble = root.querySelector('.cq-mascot-bubble');
    var bubbleText = root.querySelector('.cq-mascot-bubble-text');
    var charBtn = root.querySelector('.cq-mascot-char');
    var bubbleOpen = false;
    var bubbleHideTimeout = null;

    function showBubble() {
      bubbleOpen = true;
      bubble.classList.add('cq-mascot-bubble--visible');
      bubble.setAttribute('aria-hidden', 'false');
      /* Auto-hide bubble after 6s of inactivity */
      clearTimeout(bubbleHideTimeout);
      bubbleHideTimeout = setTimeout(hideBubble, 6000);
    }
    function hideBubble() {
      bubbleOpen = false;
      bubble.classList.remove('cq-mascot-bubble--visible');
      bubble.setAttribute('aria-hidden', 'true');
      clearTimeout(bubbleHideTimeout);
    }
    function nextTip() {
      var i = bumpTipIdx();
      bubbleText.textContent = TIPS[i];
      bubble.classList.remove('cq-mascot-bubble--pop');
      void bubble.offsetWidth;
      bubble.classList.add('cq-mascot-bubble--pop');
    }

    /* Tap the squid: open bubble if closed; advance to next tip if already open */
    charBtn.addEventListener('click', function () {
      if (!bubbleOpen) {
        showBubble();
        charBtn.classList.remove('cq-mascot-char--wave');
        void charBtn.offsetWidth;
        charBtn.classList.add('cq-mascot-char--wave');
      } else {
        nextTip();
        clearTimeout(bubbleHideTimeout);
        bubbleHideTimeout = setTimeout(hideBubble, 6000);
      }
    });
    /* Tap the bubble: dismiss it (less invasive) */
    bubble.addEventListener('click', hideBubble);
    /* Outside-tap also dismisses */
    document.addEventListener('click', function (e) {
      if (bubbleOpen && !root.contains(e.target)) hideBubble();
    });

    /* Slide in after a longer delay so it doesn't intrude on first paint */
    setTimeout(function () { root.classList.add('cq-mascot--visible'); }, 2200);

    /* No automatic bubble-show; the user opens by tapping.
       Very occasional idle micro-wave so the squid still feels alive. */
    var idleWaveInterval = setInterval(function () {
      if (!document.body.contains(root)) { clearInterval(idleWaveInterval); return; }
      if (bubbleOpen) return; /* don't wave while reading */
      charBtn.classList.remove('cq-mascot-char--wave');
      void charBtn.offsetWidth;
      charBtn.classList.add('cq-mascot-char--wave');
    }, 45000);
  });
})();
