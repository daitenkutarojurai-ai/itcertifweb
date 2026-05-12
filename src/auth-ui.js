/**
 * src/auth-ui.js — header chip + sign-in/up modal
 *
 * Self-injecting: finds .web-header on any page that loads cq-auth and
 * drops in a "Sign in" pill (signed out) or a "👤 username ▾" chip with
 * sign-out menu (signed in). Keeps every HTML file unchanged.
 *
 * The modal has two tabs (Sign in / Sign up), email+password forms, and
 * a Google OAuth button. Magic-link is reachable as a "forgot password"
 * affordance on the Sign-in tab.
 */
(function () {
  if (window.__cqAuthUiInit) return;
  window.__cqAuthUiInit = true;

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }
  function escHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
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
    header.appendChild(chip);
    return chip;
  }
  function displayNameFor(user) {
    const meta = user.user_metadata || {};
    if (meta.username) return meta.username;
    if (meta.name) return meta.name;
    if (user.email) return user.email.split('@')[0];
    return 'You';
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

  /* ───── Auth modal — Sign in / Sign up tabs ────────────────────────── */
  function openAuthModal(initialTab) {
    if (document.getElementById('cq-auth-modal')) return;
    initialTab = initialTab === 'signup' ? 'signup' : 'signin';

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
        '<h2 id="cq-auth-title">Welcome back</h2>' +

        // Tabs
        '<div class="cq-auth-tabs" role="tablist">' +
          '<button type="button" class="cq-auth-tab" role="tab" data-tab="signin" id="cq-tab-signin">Sign in</button>' +
          '<button type="button" class="cq-auth-tab" role="tab" data-tab="signup" id="cq-tab-signup">Create account</button>' +
        '</div>' +

        // Google button (shared across both tabs)
        '<button type="button" class="cq-auth-google" id="cq-auth-google">' +
          '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">' +
            '<path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.79 2.72v2.26h2.9c1.7-1.56 2.69-3.86 2.69-6.62z"/>' +
            '<path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.83.86-3.06.86-2.35 0-4.33-1.58-5.04-3.71H.96v2.33A9 9 0 0 0 9 18z"/>' +
            '<path fill="#FBBC05" d="M3.96 10.71A5.41 5.41 0 0 1 3.66 9c0-.59.1-1.17.3-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.04l3-2.33z"/>' +
            '<path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 9 0 9 9 0 0 0 .96 4.96l3 2.33C4.67 5.16 6.65 3.58 9 3.58z"/>' +
          '</svg>' +
          '<span>Continue with Google</span>' +
        '</button>' +

        '<div class="cq-auth-divider"><span>or</span></div>' +

        // Sign-in panel
        '<form class="cq-auth-form cq-auth-form--signin" id="cq-form-signin" autocomplete="on" hidden>' +
          '<label class="cq-auth-label" for="cq-signin-email">Email</label>' +
          '<input class="cq-auth-input" id="cq-signin-email" name="email" type="email" required autocomplete="email" placeholder="you@example.com" />' +
          '<label class="cq-auth-label cq-auth-label--with-link" for="cq-signin-password">' +
            '<span>Password</span>' +
            '<button type="button" class="cq-auth-forgot" id="cq-forgot-trigger">Forgot password?</button>' +
          '</label>' +
          '<input class="cq-auth-input" id="cq-signin-password" name="password" type="password" required autocomplete="current-password" placeholder="••••••••" />' +
          '<button type="submit" class="cta-primary cq-auth-submit">Sign in →</button>' +
          '<div class="cq-auth-message" id="cq-signin-msg" hidden></div>' +
        '</form>' +

        // Sign-up panel
        '<form class="cq-auth-form cq-auth-form--signup" id="cq-form-signup" autocomplete="on" hidden>' +
          '<label class="cq-auth-label" for="cq-signup-username">Username <span class="cq-auth-optional">(optional)</span></label>' +
          '<input class="cq-auth-input" id="cq-signup-username" name="username" type="text" autocomplete="username" placeholder="your-handle" maxlength="40" />' +
          '<label class="cq-auth-label" for="cq-signup-email">Email</label>' +
          '<input class="cq-auth-input" id="cq-signup-email" name="email" type="email" required autocomplete="email" placeholder="you@example.com" />' +
          '<label class="cq-auth-label" for="cq-signup-password">Password <span class="cq-auth-optional">(8+ characters)</span></label>' +
          '<input class="cq-auth-input" id="cq-signup-password" name="password" type="password" required minlength="8" autocomplete="new-password" placeholder="••••••••" />' +
          '<button type="submit" class="cta-primary cq-auth-submit">Create account →</button>' +
          '<div class="cq-auth-message" id="cq-signup-msg" hidden></div>' +
        '</form>' +

        '<p class="cq-auth-footnote">By continuing you accept the <a href="/privacy-policy.html">privacy policy</a>. No marketing email.</p>' +
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

    /* ── Tabs ───────────────────────────────────────────────────────── */
    const tabSignin = modal.querySelector('#cq-tab-signin');
    const tabSignup = modal.querySelector('#cq-tab-signup');
    const formSignin = modal.querySelector('#cq-form-signin');
    const formSignup = modal.querySelector('#cq-form-signup');
    const title = modal.querySelector('#cq-auth-title');

    function switchTab(name) {
      const isSignin = name === 'signin';
      tabSignin.classList.toggle('cq-auth-tab--active', isSignin);
      tabSignup.classList.toggle('cq-auth-tab--active', !isSignin);
      formSignin.hidden = !isSignin;
      formSignup.hidden = isSignin;
      title.textContent = isSignin ? 'Welcome back' : 'Create your account';
      // Focus the first input on the visible form
      setTimeout(() => {
        (isSignin ? formSignin : formSignup).querySelector('input').focus();
      }, 30);
    }
    tabSignin.addEventListener('click', () => switchTab('signin'));
    tabSignup.addEventListener('click', () => switchTab('signup'));
    switchTab(initialTab);

    /* ── Google OAuth ───────────────────────────────────────────────── */
    modal.querySelector('#cq-auth-google').addEventListener('click', async () => {
      if (!window.cqAuth) return;
      const btn = modal.querySelector('#cq-auth-google');
      btn.disabled = true;
      btn.querySelector('span').textContent = 'Redirecting…';
      const res = await window.cqAuth.signInWithProvider('google');
      if (!res.ok) {
        btn.disabled = false;
        btn.querySelector('span').textContent = 'Continue with Google';
        showMsg(formSignin.hidden ? formSignup : formSignin, 'err', res.error || 'Google sign-in failed.');
      }
      // On success, the browser redirects away; nothing else to do here.
    });

    /* ── Sign-in form ───────────────────────────────────────────────── */
    formSignin.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!window.cqAuth) return;
      const email = formSignin.email.value.trim();
      const password = formSignin.password.value;
      const submit = formSignin.querySelector('.cq-auth-submit');
      submit.disabled = true;
      submit.textContent = 'Signing in…';
      const res = await window.cqAuth.signInWithPassword(email, password);
      submit.disabled = false;
      submit.textContent = 'Sign in →';
      if (res.ok) {
        showMsg(formSignin, 'ok', '✓ Signed in. Redirecting…');
        // The cq:auth-changed handler at the bottom of this file will close
        // the modal as soon as supabase-js emits the SIGNED_IN event.
      } else if (res.needsConfirmation) {
        showMsg(formSignin, 'err',
          res.error + ' ',
          { label: 'Resend confirmation →', action: async () => {
            const r = await window.cqAuth.resendConfirmation(email);
            showMsg(formSignin, r.ok ? 'ok' : 'err', r.ok ? '✓ Confirmation email re-sent.' : (r.error || 'Could not resend.'));
          }});
      } else {
        showMsg(formSignin, 'err', res.error || 'Sign-in failed.');
      }
    });

    /* ── Forgot password ───────────────────────────────────────────── */
    modal.querySelector('#cq-forgot-trigger').addEventListener('click', async () => {
      const email = formSignin.email.value.trim();
      if (!email) {
        showMsg(formSignin, 'err', 'Enter your email above first, then tap "Forgot password?" again.');
        return;
      }
      if (!window.cqAuth) return;
      const res = await window.cqAuth.requestPasswordReset(email);
      showMsg(formSignin, res.ok ? 'ok' : 'err',
        res.ok
          ? '✓ Reset link sent to ' + email + '. Check your inbox — the link opens a "set new password" page.'
          : (res.error || 'Could not send reset link.'));
    });

    /* ── Sign-up form ───────────────────────────────────────────────── */
    formSignup.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!window.cqAuth) return;
      const username = formSignup.username.value.trim();
      const email = formSignup.email.value.trim();
      const password = formSignup.password.value;
      const submit = formSignup.querySelector('.cq-auth-submit');
      submit.disabled = true;
      submit.textContent = 'Creating…';
      const res = await window.cqAuth.signUp(email, password, username);
      submit.disabled = false;
      submit.textContent = 'Create account →';
      if (res.ok) {
        if (res.needsConfirmation) {
          showMsg(formSignup, 'ok',
            '✓ Account created! Check ' + email + ' for a confirmation link — click it and you\'re in. You can close this tab.');
        } else {
          showMsg(formSignup, 'ok', '✓ Account created — you\'re signed in.');
        }
      } else {
        showMsg(formSignup, 'err', res.error || 'Sign-up failed.');
      }
    });

    function showMsg(form, kind /* 'ok' | 'err' */, text, action) {
      const id = form.id === 'cq-form-signin' ? 'cq-signin-msg' : 'cq-signup-msg';
      const el = modal.querySelector('#' + id);
      el.hidden = false;
      el.className = 'cq-auth-message cq-auth-message--' + (kind === 'ok' ? 'ok' : 'err');
      el.textContent = text;
      if (action && action.label) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'cq-auth-message-action';
        btn.textContent = action.label;
        btn.addEventListener('click', action.action);
        el.appendChild(btn);
      }
    }
  }

  /* ───── Signed-in menu ─────────────────────────────────────────────── */
  function openAccountMenu(anchor) {
    const existing = document.getElementById('cq-auth-menu');
    if (existing) { existing.remove(); return; }
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
    setTimeout(() => {
      document.addEventListener('click', function onDoc(e) {
        if (e.target.closest('#cq-auth-menu') || e.target.closest('#cq-auth-chip')) return;
        menu.remove();
        document.removeEventListener('click', onDoc);
      });
    }, 0);
    menu.querySelector('#cq-auth-signout').addEventListener('click', async () => {
      menu.remove();
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
        else openAuthModal('signin');
      });
    }
  });

  window.addEventListener('cq:auth-changed', (e) => {
    renderChip();
    // If a sign-in (password, magic-link callback, or OAuth callback) just
    // landed and a modal is open, close it.
    if (e.detail && e.detail.session) {
      const m = document.getElementById('cq-auth-modal');
      if (m) {
        m.classList.remove('cq-auth-modal--visible');
        setTimeout(() => m.remove(), 200);
      }
    }
  });

  window.cqAuthUi = {
    openSignIn: () => openAuthModal('signin'),
    openSignUp: () => openAuthModal('signup'),
  };
})();
