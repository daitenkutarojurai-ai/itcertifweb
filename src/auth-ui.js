/**
 * src/auth-ui.js — header chip + sign-in modal
 *
 * Self-injecting: finds .web-header on any page that loads cq-auth and
 * drops in a "Sign in" pill (signed out) or a "👤 name ▾" chip with
 * sign-out menu (signed in). Keeps every HTML file unchanged.
 *
 * The modal is appended to <body> on first invocation and reused.
 * Listens for window 'cq:auth-changed' to redraw the chip.
 */
(function () {
  if (window.__cqAuthUiInit) return;
  window.__cqAuthUiInit = true;

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  /* ───── Header chip ────────────────────────────────────────────────── */
  function ensureChip() {
    const header = document.querySelector('.web-header');
    if (!header) return null;
    let chip = document.getElementById('cq-auth-chip');
    if (chip) return chip;
    chip = document.createElement('button');
    chip.id = 'cq-auth-chip';
    chip.type = 'button';
    chip.className = 'cq-auth-chip';
    // Insert before any existing nav so it sits at the right edge — the
    // .web-header is flex; the badge sits last via order if needed.
    header.appendChild(chip);
    return chip;
  }

  function renderChip() {
    const chip = ensureChip();
    if (!chip) return;
    const user = window.cqAuth ? window.cqAuth.getUser() : null;
    if (user) {
      const name = displayNameFor(user);
      chip.classList.add('cq-auth-chip--in');
      chip.classList.remove('cq-auth-chip--out');
      chip.innerHTML =
        '<span class="cq-auth-chip-emoji" aria-hidden="true">👤</span>' +
        '<span class="cq-auth-chip-name">' + escHtml(name) + '</span>' +
        '<span class="cq-auth-chip-caret" aria-hidden="true">▾</span>';
      chip.setAttribute('aria-label', 'Signed in as ' + name + ' — open account menu');
    } else {
      chip.classList.add('cq-auth-chip--out');
      chip.classList.remove('cq-auth-chip--in');
      chip.innerHTML =
        '<span class="cq-auth-chip-emoji" aria-hidden="true">→</span>' +
        '<span class="cq-auth-chip-label">Sign in</span>';
      chip.setAttribute('aria-label', 'Sign in to save your progress');
    }
  }

  function displayNameFor(user) {
    const meta = user.user_metadata || {};
    if (meta.display_name) return meta.display_name;
    if (meta.name) return meta.name;
    if (user.email) return user.email.split('@')[0];
    return 'You';
  }

  function escHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  /* ───── Sign-in modal ──────────────────────────────────────────────── */
  function openSignInModal() {
    if (document.getElementById('cq-auth-modal')) return;
    const modal = document.createElement('div');
    modal.id = 'cq-auth-modal';
    modal.className = 'cq-auth-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'cq-auth-title');
    modal.innerHTML =
      '<div class="cq-auth-backdrop"></div>' +
      '<div class="cq-auth-panel">' +
        '<button type="button" class="cq-auth-close" aria-label="Close">✕</button>' +
        '<div class="cq-auth-eyebrow">Save your progress</div>' +
        '<h2 id="cq-auth-title">Sign in</h2>' +
        '<p class="cq-auth-sub">No password — we email you a magic link. Click it, you\'re in. Your stats, hats, and laurels follow you across devices.</p>' +
        '<form class="cq-auth-form" id="cq-auth-form" autocomplete="off">' +
          '<label class="cq-auth-label" for="cq-auth-email">Email</label>' +
          '<input class="cq-auth-input" id="cq-auth-email" name="email" type="email" required autocomplete="email" placeholder="you@example.com" />' +
          '<button type="submit" class="cta-primary cq-auth-submit">Send magic link →</button>' +
          '<div class="cq-auth-message" id="cq-auth-message" hidden></div>' +
        '</form>' +
        '<p class="cq-auth-footnote">By signing in you accept the <a href="/privacy-policy.html">privacy policy</a>. No marketing email.</p>' +
      '</div>';
    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add('cq-auth-modal--visible'));

    const close = () => {
      modal.classList.remove('cq-auth-modal--visible');
      setTimeout(() => modal.remove(), 200);
    };
    modal.querySelector('.cq-auth-close').addEventListener('click', close);
    modal.querySelector('.cq-auth-backdrop').addEventListener('click', close);
    window.addEventListener('cq:a11y-escape', close, { once: true });

    const form = modal.querySelector('#cq-auth-form');
    const submit = modal.querySelector('.cq-auth-submit');
    const msg = modal.querySelector('#cq-auth-message');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!window.cqAuth) {
        msg.hidden = false;
        msg.className = 'cq-auth-message cq-auth-message--err';
        msg.textContent = 'Auth module not loaded — refresh and try again.';
        return;
      }
      const email = form.email.value.trim();
      submit.disabled = true;
      submit.textContent = 'Sending…';
      msg.hidden = true;
      const res = await window.cqAuth.signInWithEmail(email);
      submit.disabled = false;
      submit.textContent = 'Send magic link →';
      msg.hidden = false;
      if (res.ok) {
        msg.className = 'cq-auth-message cq-auth-message--ok';
        msg.textContent = '✓ Check your inbox for the magic link. You can close this tab — clicking the link returns you to the site signed in.';
        form.email.value = '';
      } else {
        msg.className = 'cq-auth-message cq-auth-message--err';
        msg.textContent = res.error || 'Something went wrong. Try again in a moment.';
      }
    });

    // Focus the email field for keyboard users
    setTimeout(() => modal.querySelector('#cq-auth-email').focus(), 50);
  }

  /* ───── Signed-in menu (sign out) ──────────────────────────────────── */
  function openAccountMenu(anchor) {
    const existing = document.getElementById('cq-auth-menu');
    if (existing) { existing.remove(); return; } // toggle
    const user = window.cqAuth && window.cqAuth.getUser();
    if (!user) return;
    const r = anchor.getBoundingClientRect();
    const menu = document.createElement('div');
    menu.id = 'cq-auth-menu';
    menu.className = 'cq-auth-menu';
    menu.setAttribute('role', 'menu');
    menu.style.top = (r.bottom + window.scrollY + 6) + 'px';
    menu.style.right = (window.innerWidth - r.right) + 'px';
    menu.innerHTML =
      '<div class="cq-auth-menu-email">' + escHtml(user.email || '') + '</div>' +
      '<a href="/profile.html" class="cq-auth-menu-item" role="menuitem">Profile</a>' +
      '<button type="button" class="cq-auth-menu-item cq-auth-menu-item--danger" role="menuitem" id="cq-auth-signout">Sign out</button>';
    document.body.appendChild(menu);
    const close = () => menu.remove();
    setTimeout(() => {
      document.addEventListener('click', function onDoc(e) {
        if (e.target.closest('#cq-auth-menu') || e.target.closest('#cq-auth-chip')) return;
        close();
        document.removeEventListener('click', onDoc);
      });
    }, 0);
    menu.querySelector('#cq-auth-signout').addEventListener('click', async () => {
      close();
      await window.cqAuth.signOut();
    });
  }

  /* ───── Wire it up ─────────────────────────────────────────────────── */
  ready(() => {
    renderChip();
    const chip = document.getElementById('cq-auth-chip');
    if (chip) {
      chip.addEventListener('click', () => {
        if (window.cqAuth && window.cqAuth.isSignedIn()) openAccountMenu(chip);
        else openSignInModal();
      });
    }
  });

  window.addEventListener('cq:auth-changed', (e) => {
    renderChip();
    // If a magic-link callback just landed, close any open modal
    if (e.detail && e.detail.session) {
      const m = document.getElementById('cq-auth-modal');
      if (m) m.remove();
    }
  });

  // Expose so other modules can open the modal (e.g., a future "Sign in to
  // save progress" CTA on the empty-state banner).
  window.cqAuthUi = {
    openSignIn: openSignInModal,
  };
})();
