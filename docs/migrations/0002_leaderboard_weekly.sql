-- Phase 6.7-R2 — Weekly leaderboard + rank RPC (UX-12)
--
-- Apply via Supabase Studio SQL editor or `supabase db push`.
-- IDEMPOTENT: safe to re-run; uses `OR REPLACE`.
-- PREREQUISITE: 0001_leaderboards.sql must be applied first.
--
-- WHAT THIS DOES
--   1. Creates `public.leaderboard_weekly` — same projection as
--      leaderboard_all_time but filtered to users whose stats were
--      updated since the most recent Monday UTC (weekly reset).
--   2. Creates `public.get_my_leaderboard_rank()` RPC — SECURITY
--      DEFINER, reads auth.uid() internally, returns the calling
--      user's all-time rank and weekly rank without exposing other
--      users' user_ids. Returns {opted_in: false} for guests.
--
-- ROLLBACK
--   DROP VIEW IF EXISTS public.leaderboard_weekly;
--   DROP FUNCTION IF EXISTS public.get_my_leaderboard_rank();

-- 1. Weekly view ---------------------------------------------------------
CREATE OR REPLACE VIEW public.leaderboard_weekly AS
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
  AND s.updated_at >= date_trunc('week', now())  -- resets each Monday 00:00 UTC
ORDER BY xp DESC NULLS LAST, s.updated_at DESC
LIMIT 100;

GRANT SELECT ON public.leaderboard_weekly TO anon, authenticated;

-- 2. Rank RPC ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_leaderboard_rank()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id       uuid    := auth.uid();
  v_opted_in      boolean;
  v_xp            int;
  v_rank_all_time int;
  v_rank_weekly   int;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('opted_in', false);
  END IF;

  SELECT p.leaderboard_opt_in,
         COALESCE((s.payload->>'xp')::int, 0)
    INTO v_opted_in, v_xp
    FROM public.profiles p
    LEFT JOIN public.stats s ON s.user_id = p.user_id
   WHERE p.user_id = v_user_id;

  IF NOT COALESCE(v_opted_in, false) THEN
    RETURN jsonb_build_object('opted_in', false);
  END IF;

  -- All-time rank = 1 + count of opted-in users with strictly more XP
  SELECT 1 + COUNT(*)::int INTO v_rank_all_time
    FROM public.profiles p2
    JOIN public.stats     s2 ON s2.user_id = p2.user_id
   WHERE p2.leaderboard_opt_in = TRUE
     AND COALESCE((s2.payload->>'xp')::int, 0) > v_xp;

  -- Weekly rank = 1 + opted-in users active this week with more XP
  SELECT 1 + COUNT(*)::int INTO v_rank_weekly
    FROM public.profiles p2
    JOIN public.stats     s2 ON s2.user_id = p2.user_id
   WHERE p2.leaderboard_opt_in = TRUE
     AND s2.updated_at >= date_trunc('week', now())
     AND COALESCE((s2.payload->>'xp')::int, 0) > v_xp;

  RETURN jsonb_build_object(
    'opted_in',      true,
    'rank_all_time', v_rank_all_time,
    'rank_weekly',   v_rank_weekly
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_leaderboard_rank() TO authenticated;

-- 3. Verification (run manually after applying) --------------------------
-- SELECT * FROM public.leaderboard_weekly LIMIT 5;
-- SELECT public.get_my_leaderboard_rank();  -- (when signed in)
