/**
 * src/reset-password.js — page logic for /reset-password.html
 *
 * Lifecycle:
 *   1. User submits "forgot password" in the auth modal → email sent.
 *   2. User clicks the email link → lands here. The URL carries a
 *      recovery code (`?code=…`).
 *   3. supabase-js (loaded by /src/auth.js) auto-exchanges the code for
 *      a recovery-scope session via detectSessionInUrl, then emits a
 *      PASSWORD_RECOVERY event. cqAuth re-emits cq:auth-changed.
 *   4. We listen for either signal, reveal the new-password form.
 *   5. User picks a new password → updateUser → success → redirect home
 *      with a normal session.
 *
 * Edge cases:
 *   - User visits the page directly (no recovery): show the "invalid /
 *     expired" panel with a link home.
 *   - Token expired (1h default): supabase emits an error during code
 *     exchange; same invalid panel.
 */
(function () {
  if (window.__cqResetInit) return;
  window.__cqResetInit = true;

  function $(id) { return document.getElementById(id); }
  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  let recoveryActive = false;
  let resolved = false; // whether we've decided which panel to show

  function showForm() {
    resolved = true;
    $('reset-sub').textContent = 'Pick a new password — at least 8 characters. The link is valid for one use.';
    $('reset-form').hidden = false;
    $('reset-invalid').hidden = true;
    setTimeout(() => $('reset-password').focus(), 50);
  }
  function showInvalid(reason) {
    resolved = true;
    $('reset-title').textContent = 'Link invalid or expired';
    $('reset-sub').hidden = true;
    $('reset-form').hidden = true;
    const panel = $('reset-invalid');
    if (reason) {
      const p = document.createElement('p');
      p.style.color = '#7c90ae';
      p.style.fontFamily = 'JetBrains Mono, monospace';
      p.style.fontSize = '11px';
      p.style.marginTop = '-8px';
      p.textContent = reason;
      panel.insertBefore(p, panel.querySelector('.cta-primary'));
    }
    panel.hidden = false;
  }

  function showMsg(kind, text) {
    const el = $('reset-message');
    el.hidden = false;
    el.className = 'reset-message reset-message--' + (kind === 'ok' ? 'ok' : 'err');
    el.textContent = text;
  }

  ready(function () {
    // Listen for the password-recovery signal. cqAuth fires cq:auth-changed
    // every time auth state updates; the PASSWORD_RECOVERY event arrives
    // here as a session with type='recovery' in supabase-js — but the
    // user-facing flag we rely on is just "is there a session at all"
    // after the URL-code exchange completes.
    let timeoutId = setTimeout(function () {
      // If we still haven't been told the recovery is active after 4s,
      // assume the link was invalid or the code was already consumed.
      if (!resolved) showInvalid('Could not exchange the recovery code. Try resetting again from the sign-in modal.');
    }, 4000);

    window.addEventListener('cq:auth-changed', function (e) {
      const event = e && e.detail && e.detail.event;
      // Only reveal the password-reset form when Supabase explicitly fires
      // PASSWORD_RECOVERY. Falling back to "session exists" would let any
      // signed-in user change their password by simply visiting this URL.
      if (event === 'PASSWORD_RECOVERY' && !recoveryActive) {
        recoveryActive = true;
        clearTimeout(timeoutId);
        showForm();
      }
    });

    // Form submit
    $('reset-form').addEventListener('submit', async function (e) {
      e.preventDefault();
      const pw1 = $('reset-password').value;
      const pw2 = $('reset-confirm').value;
      if (pw1.length < 8) { showMsg('err', 'Password must be at least 8 characters.'); return; }
      if (pw1 !== pw2)    { showMsg('err', 'Passwords do not match.'); return; }
      if (!window.cqAuth || !window.cqAuth.updatePassword) {
        showMsg('err', 'Auth module not loaded — refresh the page.');
        return;
      }
      const submit = $('reset-form').querySelector('.reset-submit');
      submit.disabled = true;
      submit.textContent = 'Updating…';
      const res = await window.cqAuth.updatePassword(pw1);
      submit.disabled = false;
      submit.textContent = 'Update password →';
      if (res.ok) {
        showMsg('ok', '✓ Password updated. Redirecting…');
        setTimeout(function () { location.replace('/profile.html'); }, 800);
      } else {
        showMsg('err', res.error || 'Could not update password.');
      }
    });
  });
})();
