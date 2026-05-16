/**
 * src/mascot-cheer.js — celebratory squid toast on quiz completion.
 *
 * Listens for `cq:session-complete` and shows a non-modal, auto-dismissing
 * speech-bubble toast in the bottom-right (where the mascot lives). Fades
 * after ~4s and is dismissable by tap. Skips path-mode events (those have
 * their own chest/laurel reward UI) and skips the synthetic daily-reward
 * event from src/daily.js (already handled by its own banner).
 *
 * Idempotent IIFE — included in cq-core.js after the menu module.
 */
(function () {
  if (window.__cqMascotCheerInit) return;
  window.__cqMascotCheerInit = true;

  var MESSAGES = [
    'Ink-credible work! 🦑',
    "Quiz complete! I'm tentac-ually impressed.",
    'You did it! Even my 8 arms are clapping 👏',
    'Deep-sea wisdom unlocked 🌊',
    'Sea-rious skills, that one 🌟',
    "Your synapses are firing — mine only have 8 to pick from!",
    'Nailed it! Time for some celebratory ink ✨',
    "That's some cephalo-pod-level focus. Keep going!"
  ];

  function pickMessage() {
    return MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
  }

  function show(text) {
    // Don't double-stack if a cheer is already on screen — replace it.
    var existing = document.getElementById('cq-cheer');
    if (existing) existing.remove();

    var el = document.createElement('div');
    el.id = 'cq-cheer';
    el.className = 'cq-cheer';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.innerHTML =
      '<span class="cq-cheer-emoji" aria-hidden="true">🦑</span>' +
      '<span class="cq-cheer-text"></span>' +
      '<button class="cq-cheer-close" type="button" aria-label="Dismiss">×</button>';
    el.querySelector('.cq-cheer-text').textContent = text;
    document.body.appendChild(el);

    requestAnimationFrame(function () { el.classList.add('cq-cheer--visible'); });

    var dismiss = function () {
      el.classList.remove('cq-cheer--visible');
      el.classList.add('cq-cheer--dismissing');
      setTimeout(function () { el.remove(); }, 280);
    };

    el.querySelector('.cq-cheer-close').addEventListener('click', dismiss);
    setTimeout(dismiss, 4200);
  }

  window.addEventListener('cq:session-complete', function (e) {
    var mode = (e && e.detail && e.detail.mode) || '';
    // Skip path nodes (their reward is the chest); skip the daily-reward
    // synthetic event; only celebrate real quiz / exam / study completions.
    if (mode === 'daily-quest-reward') return;
    if (mode.startsWith('path-')) return;
    // Tiny delay so the results-screen score animation gets a beat before
    // the toast lands — otherwise both move at once and read as noise.
    setTimeout(function () { show(pickMessage()); }, 650);
  });
})();
