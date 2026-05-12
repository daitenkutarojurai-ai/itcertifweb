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

  /**
   * Each tip has: text (advice), cta (button label), href (where it goes).
   * Tapping the squid cycles tips; tapping the bubble follows the link.
   */
  var TIPS = [
    { text: "20 minutes a day beats 4 hours once a week. 💪",
      cta: "Start a learning path →", href: "/path.html" },
    { text: "Studying AWS? Start with Cloud Practitioner — it's the foundation.",
      cta: "Browse AWS exams →", href: "/certifications/aws.html" },
    { text: "Stuck on which cert to pick? Career roadmaps map it out.",
      cta: "Browse careers →", href: "/careers/" },
    { text: "Pro tip: do the Question of the Day first — quick warm-up.",
      cta: "Try today's question →", href: "/" },
    { text: "Want Azure instead? AZ-900 is a friendly first step.",
      cta: "Browse Azure exams →", href: "/certifications/microsoft.html" },
    { text: "Network engineer track? Network+ → CCNA is the road.",
      cta: "Browse Cisco exams →", href: "/certifications/cisco.html" },
    { text: "Cybersecurity is hot. Security+ is the door-opener.",
      cta: "Browse CompTIA exams →", href: "/certifications/comptia.html" },
    { text: "Recall beats re-reading. Quiz yourself — that's why we're here.",
      cta: "Open the full cert list →", href: "/train.html" },
    { text: "Latest cheatsheets, war stories, and study tips drop weekly.",
      cta: "Browse news & tips →", href: "/news/" },
    { text: "DevOps/Kubernetes route? CKA + Terraform is gold.",
      cta: "Browse Linux & DevOps →", href: "/certifications/linux-devops.html" },
    { text: "Want offline practice? The app saves your progress.",
      cta: "Get the app →", href: "https://play.google.com/store/apps/details?id=com.certquest.app" },
    { text: "Free hands-on courses by track — start small, ramp up.",
      cta: "Browse free courses →", href: "/courses/" }
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
    var initial = TIPS[getTipIdx()];
    root.innerHTML =
      '<a href="' + initial.href + '" class="cq-mascot-bubble" aria-live="polite" aria-hidden="true">' +
        '<span class="cq-mascot-bubble-text"></span>' +
        '<span class="cq-mascot-bubble-cta"></span>' +
        '<span class="cq-mascot-bubble-tail" aria-hidden="true"></span>' +
      '</a>' +
      '<button type="button" class="cq-mascot-char" aria-label="Tip from CertQuests">' +
        '<span class="cq-mascot-emoji" aria-hidden="true">' +
          '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
            '<defs>' +
              '<radialGradient id="cqSquidBody" cx="50%" cy="38%" r="64%">' +
                '<stop offset="0%" stop-color="#bfdbfe"/>' +
                '<stop offset="55%" stop-color="#60a5fa"/>' +
                '<stop offset="100%" stop-color="#2563eb"/>' +
              '</radialGradient>' +
              '<linearGradient id="cqSquidTent" x1="0" y1="0" x2="0" y2="1">' +
                '<stop offset="0%" stop-color="#60a5fa"/>' +
                '<stop offset="100%" stop-color="#1d4ed8"/>' +
              '</linearGradient>' +
            '</defs>' +
            /* Tentacles drawn first so the body overlaps cleanly */
            '<g fill="url(#cqSquidTent)">' +
              '<path d="M14 38 Q9 50 14 60 Q18 52 20 46 Z"/>' +
              '<path d="M22 41 Q19 54 22 62 Q26 55 28 48 Z"/>' +
              '<path d="M30 42 Q29 56 31 62 Q33 56 33 48 Z"/>' +
              '<path d="M42 41 Q45 54 42 62 Q38 55 36 48 Z"/>' +
              '<path d="M50 38 Q55 50 50 60 Q46 52 44 46 Z"/>' +
            '</g>' +
            /* Top fins */
            '<ellipse cx="20" cy="11" rx="4" ry="6" fill="url(#cqSquidBody)" opacity="0.85"/>' +
            '<ellipse cx="44" cy="11" rx="4" ry="6" fill="url(#cqSquidBody)" opacity="0.85"/>' +
            /* Body / mantle */
            '<path d="M32 4 C16 4 12 18 12 30 C12 42 18 46 32 46 C46 46 52 42 52 30 C52 18 48 4 32 4 Z" fill="url(#cqSquidBody)"/>' +
            /* Eyes */
            '<circle cx="25" cy="26" r="5" fill="#fff"/>' +
            '<circle cx="39" cy="26" r="5" fill="#fff"/>' +
            '<circle cx="26" cy="27" r="2.4" fill="#0a0f1d"/>' +
            '<circle cx="40" cy="27" r="2.4" fill="#0a0f1d"/>' +
            '<circle cx="27.3" cy="25.5" r="0.9" fill="#fff"/>' +
            '<circle cx="41.3" cy="25.5" r="0.9" fill="#fff"/>' +
            /* Smile */
            '<path d="M28 35 Q32 38 36 35" stroke="#0a0f1d" stroke-width="1.4" stroke-linecap="round" fill="none"/>' +
            /* Cheek blush */
            '<ellipse cx="20" cy="33" rx="2.6" ry="1.6" fill="#fca5a5" opacity="0.55"/>' +
            '<ellipse cx="44" cy="33" rx="2.6" ry="1.6" fill="#fca5a5" opacity="0.55"/>' +
          '</svg>' +
        '</span>' +
      '</button>';
    document.body.appendChild(root);

    var bubble = root.querySelector('.cq-mascot-bubble');
    var bubbleText = root.querySelector('.cq-mascot-bubble-text');
    var bubbleCta = root.querySelector('.cq-mascot-bubble-cta');
    var charBtn = root.querySelector('.cq-mascot-char');
    var bubbleOpen = false;
    var bubbleHideTimeout = null;

    function applyTip(tip) {
      bubbleText.textContent = tip.text;
      bubbleCta.textContent = tip.cta;
      bubble.setAttribute('href', tip.href);
      /* External links open in a new tab */
      if (/^https?:\/\//.test(tip.href) && tip.href.indexOf(location.host) === -1) {
        bubble.setAttribute('target', '_blank');
        bubble.setAttribute('rel', 'noopener');
      } else {
        bubble.removeAttribute('target');
        bubble.removeAttribute('rel');
      }
    }
    applyTip(initial);

    function showBubble() {
      bubbleOpen = true;
      bubble.classList.add('cq-mascot-bubble--visible');
      bubble.setAttribute('aria-hidden', 'false');
      clearTimeout(bubbleHideTimeout);
      bubbleHideTimeout = setTimeout(hideBubble, 7000);
    }
    function hideBubble() {
      bubbleOpen = false;
      bubble.classList.remove('cq-mascot-bubble--visible');
      bubble.setAttribute('aria-hidden', 'true');
      clearTimeout(bubbleHideTimeout);
    }
    function nextTip() {
      var i = bumpTipIdx();
      applyTip(TIPS[i]);
      bubble.classList.remove('cq-mascot-bubble--pop');
      void bubble.offsetWidth;
      bubble.classList.add('cq-mascot-bubble--pop');
    }

    /* Tap the squid: open bubble (or cycle to next tip if already open) */
    charBtn.addEventListener('click', function () {
      if (!bubbleOpen) {
        showBubble();
        charBtn.classList.remove('cq-mascot-char--wave');
        void charBtn.offsetWidth;
        charBtn.classList.add('cq-mascot-char--wave');
      } else {
        nextTip();
        clearTimeout(bubbleHideTimeout);
        bubbleHideTimeout = setTimeout(hideBubble, 7000);
      }
    });
    /* Tap the bubble = navigate (default anchor behavior). No JS handler. */
    /* Outside-tap dismisses */
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
