/**
 * src/auth.js — Phase 3D auth module
 *
 * Loads the Supabase JS client from a pinned esm.sh URL, exposes a tiny
 * window.cqAuth API the rest of the codebase calls, and listens for
 * sign-in / sign-out events.
 *
 * Implemented:
 *   - Email + password sign-up (with username metadata)
 *   - Email + password sign-in
 *   - Email confirmation callback (via detectSessionInUrl)
 *   - Magic-link email sign-in (still supported, useful for reset flows)
 *   - Google OAuth (provider enabled in Supabase dashboard)
 *   - Session persistence + auto-refresh
 *   - Sign-out
 *   - Capacitor platform detection — uses native scheme redirect when
 *     running inside the mobile app shell, web origin otherwise
 *
 * Future rounds:
 *   - localStorage → Supabase sync on first sign-in (anonymous claim)
 *   - Supabase → localStorage hydration on load (multi-device)
 *   - Password reset email flow
 *
 * Security: only the publishable URL + anon JWT live here. RLS on every
 * table enforces per-user access. The service_role key NEVER appears in
 * any browser-shipped code.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const SUPABASE_URL = 'https://zhxnteqtiyqnyidfkivj.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpoeG50ZXF0aXlxbnlpZGZraXZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1ODM4MzgsImV4cCI6MjA5NDE1OTgzOH0.0cv1X3saQSdQFZe-JeNmE3etOeudZvKuHnBx6CkBQGo';

/* Idempotent across module reloads (hot navigation, SW updates). */
if (window.__cqAuthInit) {
  console.warn('[cq-auth] already initialized — skipping');
} else {
  window.__cqAuthInit = true;

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      // Use localStorage so the session survives a tab close. Supabase JS
      // handles silent token refresh on its own when this is enabled.
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true, // pick up the magic-link callback ?code= param
    },
  });

  let currentSession = null;

  /* ───── Platform detection ─────────────────────────────────────────── */
  // Capacitor injects window.Capacitor when the app is running inside the
  // native shell. Web build keeps the existing origin redirect. The native
  // redirect URL must be in Supabase's allowlist (capacitor://localhost is
  // already configured per the project brief).
  const isCapacitor = !!(window.Capacitor && typeof window.Capacitor.getPlatform === 'function');
  function redirectBase() {
    if (isCapacitor) return 'capacitor://localhost';
    return window.location.origin + window.location.pathname;
  }

  /* ───── Public API ─────────────────────────────────────────────────── */

  /**
   * Email + password sign-up. Sends a confirmation email; user lands back
   * on the current page signed in after clicking the link (via detectSessionInUrl).
   *
   * @param {string} email
   * @param {string} password — 8+ chars enforced by Supabase
   * @param {string} [username] — optional display name; falls back to email prefix
   */
  async function signUp(email, password, username) {
    if (!email || !email.includes('@')) return { ok: false, error: 'Enter a valid email.' };
    if (!password || password.length < 8) return { ok: false, error: 'Password must be at least 8 characters.' };
    const meta = {};
    if (username && username.trim()) meta.username = username.trim();
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: {
        data: meta,
        emailRedirectTo: redirectBase(),
      },
    });
    if (error) return { ok: false, error: error.message };
    // If email-confirmation is required (it is in this project), the user
    // is created but signed-out until they click the link. data.user exists,
    // data.session is null. Caller should show "check your inbox".
    return { ok: true, needsConfirmation: !data.session, user: data.user };
  }

  /**
   * Email + password sign-in. Returns session immediately on success.
   */
  async function signInWithPassword(email, password) {
    if (!email || !email.includes('@')) return { ok: false, error: 'Enter a valid email.' };
    if (!password) return { ok: false, error: 'Enter your password.' };
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      // Surface the common "email not confirmed" case specifically so the UI
      // can offer a "resend confirmation" affordance.
      const msg = error.message || '';
      if (/email not confirmed/i.test(msg) || /not confirmed/i.test(msg)) {
        return { ok: false, error: 'Email not confirmed yet — check your inbox for the confirmation link.', needsConfirmation: true };
      }
      return { ok: false, error: msg };
    }
    return { ok: true, session: data.session };
  }

  /**
   * Send a magic-link email (passwordless). Still exposed for users who
   * forgot their password or prefer not to remember one. Same callback
   * mechanism as email confirmation.
   */
  async function signInWithEmail(email) {
    if (!email || !email.includes('@')) return { ok: false, error: 'Enter a valid email.' };
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectBase() },
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  /**
   * Resend the confirmation email (e.g., user clicked sign-in but hadn't
   * confirmed yet). Supabase rate-limits this by default.
   */
  async function resendConfirmation(email) {
    if (!email || !email.includes('@')) return { ok: false, error: 'Enter a valid email.' };
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: redirectBase() },
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  /**
   * OAuth — Google (enabled in dashboard) or GitHub (enable to wire up).
   * Redirects the browser to the provider; supabase-js extracts the code
   * from the callback URL and finalizes the session via detectSessionInUrl.
   */
  async function signInWithProvider(provider /* 'google' | 'github' */) {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: redirectBase() },
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    return { ok: !error, error: error?.message };
  }

  function getSession() { return currentSession; }
  function getUser()    { return currentSession?.user || null; }
  function isSignedIn() { return !!currentSession; }

  /* ───── Session bootstrap ──────────────────────────────────────────── */

  // detectSessionInUrl handles the magic-link callback. We just read the
  // result here and emit a single 'cq:auth-changed' event for the UI to
  // react to (header chip swap, modal close, etc.).
  supabase.auth.getSession().then(({ data }) => {
    currentSession = data?.session || null;
    emit();
  });

  supabase.auth.onAuthStateChange((event, session) => {
    currentSession = session || null;
    emit({ event });
  });

  function emit(extra) {
    window.dispatchEvent(new CustomEvent('cq:auth-changed', {
      detail: { session: currentSession, ...(extra || {}) },
    }));
  }

  /* ───── Expose ─────────────────────────────────────────────────────── */
  window.cqAuth = {
    signUp,
    signInWithPassword,
    signInWithEmail,        // magic link — kept for the "forgot password" path
    signInWithProvider,
    resendConfirmation,
    signOut,
    getSession,
    getUser,
    isSignedIn,
    isCapacitor,
    // Escape hatch for advanced callers (e.g., stats sync in future round)
    _client: supabase,
  };

  if (window.cqDbg) window.cqDbg('[cq-auth] initialized');
}
