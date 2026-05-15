-- Phase 6.7 — Leaderboards (opt-in, all-time XP)
--
-- Apply via Supabase Studio SQL editor or `supabase db push`.
-- IDEMPOTENT: safe to re-run; uses `IF NOT EXISTS` / `OR REPLACE`.
--
-- WHAT THIS DOES
--   1. Adds `leaderboard_opt_in` boolean column to public.profiles
--      (defaults to false — RGPD-friendly explicit opt-in).
--   2. Adds `display_name` column to public.profiles (optional, falls
--      back to username if NULL — lets users pick a leaderboard name
--      distinct from their auth username).
--   3. Creates a public view `public.leaderboard_all_time` that joins
--      profiles + stats and returns a public-safe projection for
--      opted-in users only: { display_name, xp, level, streak_days,
--      laurels_count, updated_at }. No email, no user_id.
--   4. Grants SELECT on the view to the `anon` role so the unsigned
--      /leaderboard/ page can render without forcing sign-in.
--
-- ROLLBACK
--   DROP VIEW IF EXISTS public.leaderboard_all_time;
--   ALTER TABLE public.profiles DROP COLUMN IF EXISTS leaderboard_opt_in;
--   ALTER TABLE public.profiles DROP COLUMN IF EXISTS display_name;
--
-- NOTES ON SECURITY
--   - Opt-in is per-user, stored on profiles (already RLS-gated by uid).
--   - The view bypasses RLS via the standard view-owner pattern, but it
--     intentionally projects only public-safe columns and filters to
--     leaderboard_opt_in = true. Verify by inspecting the view's columns.
--   - Streak values are client-trusted today. Phase 6.7-R2 will add
--     server-side enforcement via an RPC + last-session timestamp check.

-- 1. Columns -------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS leaderboard_opt_in BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS display_name TEXT;

-- 2. View ----------------------------------------------------------------
CREATE OR REPLACE VIEW public.leaderboard_all_time AS
SELECT
  COALESCE(NULLIF(p.display_name, ''), p.username, 'Anonymous')   AS display_name,
  COALESCE((s.payload->>'xp')::int, 0)                            AS xp,
  COALESCE((s.payload->>'level')::int, 1)                         AS level,
  COALESCE((s.payload->>'streakDays')::int, 0)                    AS streak_days,
  COALESCE((s.payload->>'sessionsCount')::int, 0)                 AS sessions_count,
  COALESCE((s.payload->>'questionsAnswered')::int, 0)             AS questions_answered,
  s.updated_at                                                    AS updated_at
FROM public.profiles p
JOIN public.stats     s ON s.user_id = p.user_id
WHERE p.leaderboard_opt_in = TRUE
ORDER BY xp DESC NULLS LAST, updated_at DESC
LIMIT 100;

-- 3. Grants --------------------------------------------------------------
GRANT SELECT ON public.leaderboard_all_time TO anon, authenticated;

-- 4. Verification (run manually after applying) --------------------------
-- SELECT COUNT(*) FROM public.profiles WHERE leaderboard_opt_in = TRUE;
-- SELECT * FROM public.leaderboard_all_time LIMIT 5;
