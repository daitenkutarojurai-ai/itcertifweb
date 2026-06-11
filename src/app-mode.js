/**
 * src/app-mode.js — runtime environment flag
 *
 * Sets <html class="is-app"> when the page is loaded inside the Capacitor
 * wrapper (Play Store / iOS shell), so CSS can hide chrome that doesn't
 * belong in-app: the "Get on Google Play" badge, the install prompt, any
 * future install CTAs marked with [data-hide-in-app].
 *
 * Detection — window.Capacitor is injected by the wrapper BEFORE any
 * page script runs, so this runs synchronously inside cq-core (which is
 * `defer` but still executes before DOMContentLoaded). We also expose
 * window.cqApp.isApp so other code paths can branch without re-detecting.
 *
 * Exposed:
 *   window.cqApp.isApp       boolean — true inside Capacitor
 *   window.cqApp.platform    'web' | 'ios' | 'android'
 *   window.cqApp.isStandalone boolean — true when launched as installed PWA
 */
(function () {
  if (typeof window === 'undefined') return;

  const cap = window.Capacitor;
  const isApp = !!(cap && typeof cap.getPlatform === 'function');
  let platform = 'web';
  if (isApp) {
    try { platform = cap.getPlatform() || 'web'; } catch (_) { platform = 'web'; }
  }

  // Standalone PWA — useful proxy for "feels like an app" even without Capacitor.
  let isStandalone = false;
  try {
    isStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
      || window.navigator.standalone === true;
  } catch (_) {}

  const root = document.documentElement;
  if (root) {
    if (isApp) root.classList.add('is-app');
    if (isStandalone) root.classList.add('is-standalone');
    if (platform && platform !== 'web') root.classList.add('is-' + platform);
  }

  window.cqApp = Object.freeze({ isApp, platform, isStandalone });

  // Register the service worker on EVERY page (cq-core loads sitewide), not
  // just the homepage — SEO deep-link visitors must get offline + SWR caching
  // too. Idempotent: the browser no-ops a repeat register for the same URL.
  if ('serviceWorker' in navigator && !window.__cqSwReg) {
    window.__cqSwReg = true;
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(function () {});
    });
  }
})();
