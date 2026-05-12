/**
 * src/auth.js — Phase 3D ticket 1: sign-in scaffold
 *
 * Loads the Supabase JS client from a pinned esm.sh URL, exposes a tiny
 * window.cqAuth API the rest of the codebase calls, and listens for
 * sign-in / sign-out events.
 *
 * V1 scope (this commit):
 *   - Magic-link email sign-in
 *   - Session detection on load
 *   - Auto-create local profile row on first sign-in
 *   - Sign-out
 * V2+ (future):
 *   - Google + GitHub OAuth (uncomment placeholders below + enable in Supabase)
 *   - Push localStorage state to Supabase on sign-in (anonymous → account claim)
 *   - Pull Supabase state on load (multi-device hydration)
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

  /* ───── Public API ─────────────────────────────────────────────────── */

  /**
   * Send a magic-link email. The user clicks it, returns to the site, and
   * supabase-js handles the callback via detectSessionInUrl above.
   *
   * @param {string} email
   * @returns {Promise<{ok:boolean,error?:string}>}
   */
  async function signInWithEmail(email) {
    if (!email || !email.includes('@')) {
      return { ok: false, error: 'Enter a valid email.' };
    }
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // After clicking the link, land back on whatever page they signed
        // in from — preserves UX continuity (path map, profile, etc.).
        emailRedirectTo: window.location.origin + window.location.pathname,
      },
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  /* OAuth — Google / GitHub. Wire up when those providers are enabled in
     the Supabase dashboard. The redirect lands back on the current page;
     supabase-js extracts the code from the URL and finalizes the session. */
  async function signInWithProvider(provider /* 'google' | 'github' */) {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin + window.location.pathname,
      },
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
    signInWithEmail,
    signInWithProvider,
    signOut,
    getSession,
    getUser,
    isSignedIn,
    // Escape hatch for advanced callers (e.g., stats sync in future round)
    _client: supabase,
  };

  if (window.cqDbg) window.cqDbg('[cq-auth] initialized');
}
