/**
 * src/mascot-loader.js — tiny shim that defers the real mascot.js until
 * the user interacts with the page (scroll, pointer, or key) OR after
 * 8 seconds of idle. The mascot is friendly chrome, not critical UI, so
 * loading it up-front taxes every page load (including bounce traffic).
 *
 * The actual mascot logic lives in mascot.js — we just lazy-load that
 * script when there's a reason to believe the user is engaged.
 *
 * Idempotent.
 */
(function () {
  if (window.__cqMascotLoaderInit) return;
  window.__cqMascotLoaderInit = true;

  /* On train.html the squid is the per-question "Hint Buddy" (rendered by
     the quiz screen), so don't also load the floating tip-mascot there —
     one squid, one job. (Audit S8.) */
  try { if (/\/train\.html$/.test(location.pathname)) return; } catch (_) {}

  var SRC = '/src/mascot.js?v=127';
  var IDLE_TIMEOUT = 8000;
  var triggered = false;
  var idleTimer = null;

  function loadNow() {
    if (triggered) return;
    triggered = true;
    cleanup();
    var s = document.createElement('script');
    s.src = SRC;
    s.defer = true;
    document.head.appendChild(s);
  }

  function cleanup() {
    clearTimeout(idleTimer);
    window.removeEventListener('scroll', loadNow, true);
    window.removeEventListener('pointerdown', loadNow, true);
    window.removeEventListener('touchstart', loadNow, true);
    window.removeEventListener('keydown', loadNow, true);
  }

  /* Listen passively for the cheapest signals of engagement */
  window.addEventListener('scroll', loadNow, { passive: true, capture: true });
  window.addEventListener('pointerdown', loadNow, { passive: true, capture: true });
  window.addEventListener('touchstart', loadNow, { passive: true, capture: true });
  window.addEventListener('keydown', loadNow, { capture: true });

  /* Or just load after a short idle period — guarantees the mascot
     still appears for users who never interact (e.g., reading) */
  idleTimer = setTimeout(loadNow, IDLE_TIMEOUT);
})();
