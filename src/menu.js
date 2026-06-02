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
        '<button type="button" class="mobile-menu-auth" id="cq-mobile-auth" hidden>' +
          '<span class="mobile-menu-emoji" aria-hidden="true">👤</span>' +
          '<span class="mobile-menu-auth-label">Sign in</span>' +
        '</button>' +
        '<div class="mobile-menu-eyebrow">Explore</div>' +
        '<a href="/">' +
          '<span class="mobile-menu-emoji">🏠</span>Home' +
        '</a>' +
        '<a href="/path.html" class="mobile-menu-new">' +
          '<span class="mobile-menu-emoji">🗺️</span>Cert Quest' +
          '<span class="mobile-menu-pill">NEW</span>' +
        '</a>' +
        '<a href="/certifications/">' +
          '<span class="mobile-menu-emoji">🏅</span>Certifications' +
        '</a>' +
        '<a href="/careers/">' +
          '<span class="mobile-menu-emoji">🚀</span>Careers' +
        '</a>' +
        '<a href="/interview/">' +
          '<span class="mobile-menu-emoji">🎤</span>Interview prep' +
        '</a>' +
        '<a href="/jobs/">' +
          '<span class="mobile-menu-emoji">🎯</span>Job Match' +
        '</a>' +
        '<a href="/labs/">' +
          '<span class="mobile-menu-emoji">🧪</span>Hands-on Labs' +
        '</a>' +
        '<a href="/courses/">' +
          '<span class="mobile-menu-emoji">📚</span>Free courses' +
        '</a>' +
        '<a href="/cheatsheets/">' +
          '<span class="mobile-menu-emoji">📋</span>Cheatsheets' +
        '</a>' +
        '<a href="/exam-radar/">' +
          '<span class="mobile-menu-emoji">📡</span>Exam Radar' +
        '</a>' +
        '<a href="/leaderboard/">' +
          '<span class="mobile-menu-emoji">🏆</span>Leaderboard' +
        '</a>' +
        '<a href="/guilds/">' +
          '<span class="mobile-menu-emoji">🛡️</span>Guilds' +
        '</a>' +
        '<a href="/challenges/">' +
          '<span class="mobile-menu-emoji">⚡</span>Challenges' +
        '</a>' +
        '<a href="/community/">' +
          '<span class="mobile-menu-emoji">👥</span>Community' +
        '</a>' +
        '<a href="/study-groups/">' +
          '<span class="mobile-menu-emoji">📓</span>Study groups' +
        '</a>' +
        '<a href="/news/">' +
          '<span class="mobile-menu-emoji">💡</span>Pro tips' +
        '</a>' +
        '<a href="/profile.html">' +
          '<span class="mobile-menu-emoji">👤</span>Profile' +
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

    /* Active-page highlight — mark the drawer link matching the current path. */
    (function () {
      var here = location.pathname.replace(/index\.html$/, '').replace(/\/$/, '') || '/';
      menu.querySelectorAll('.mobile-menu-panel a[href^="/"]').forEach(function (a) {
        var path = (a.getAttribute('href') || '').split(/[?#]/)[0].replace(/index\.html$/, '').replace(/\/$/, '') || '/';
        if (path === here) { a.classList.add('is-active'); a.setAttribute('aria-current', 'page'); }
      });
    })();

    var prevOverflow = '';
    var backId = null;
    function open() {
      menu.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
      prevOverflow = document.body.style.overflow || '';
      document.body.style.overflow = 'hidden';
      if (window.cqBack && backId == null) {
        backId = window.cqBack.push(function (fromBack) { close(fromBack); });
      }
    }
    function close(fromBack) {
      if (menu.hidden) return;
      menu.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = prevOverflow;
      if (!fromBack && backId != null && window.cqBack) {
        window.cqBack.dismiss(backId);
      }
      backId = null;
    }
    btn.addEventListener('click', open);
    menu.querySelector('.mobile-menu-close').addEventListener('click', function () { close(); });
    menu.addEventListener('click', function (e) { if (e.target === menu) close(); });
    /* Close on nav-link tap (S7) — matters for a link to the current page. */
    menu.querySelector('.mobile-menu-panel').addEventListener('click', function (e) {
      var link = e.target.closest('a[href]');
      if (link && !link.classList.contains('mobile-menu-auth')) close();
    });
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

    /* ── Mobile auth row — mirrors the .cq-auth-chip surface which is
          hidden on phones. Tapping triggers the existing auth modal /
          account menu defined in src/auth-ui.js by re-dispatching a
          click onto the (now display:none) chip. The chip is still
          in the DOM, just hidden — its handler still works. */
    var authBtn = menu.querySelector('#cq-mobile-auth');
    function syncMobileAuth() {
      if (!authBtn) return;
      authBtn.hidden = false;
      var label = authBtn.querySelector('.mobile-menu-auth-label');
      var user = window.cqAuth && window.cqAuth.getUser && window.cqAuth.getUser();
      if (user) {
        var name = (user.user_metadata && (user.user_metadata.username || user.user_metadata.name))
          || (user.email && user.email.split('@')[0]) || 'You';
        authBtn.classList.add('is-signed-in');
        if (label) label.textContent = name + ' · account';
      } else {
        authBtn.classList.remove('is-signed-in');
        if (label) label.textContent = 'Sign in';
      }
    }
    authBtn && authBtn.addEventListener('click', function () {
      close();
      var chip = document.getElementById('cq-auth-chip');
      if (chip) chip.click();
    });
    syncMobileAuth();
    window.addEventListener('cq:auth-changed', syncMobileAuth);
  });
})();
