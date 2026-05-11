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
          '<span class="mobile-menu-emoji">📰</span>News &amp; tips' +
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
  });
})();
