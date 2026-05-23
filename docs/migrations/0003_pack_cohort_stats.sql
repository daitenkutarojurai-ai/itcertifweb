-- Phase 7 prep / UX-13 — Per-pack cohort accuracy stats
--
-- Apply via Supabase Studio SQL editor or `supabase db push`.
-- IDEMPOTENT: safe to re-run.
-- PREREQUISITE: Supabase auth + public.stats table must exist.
--
-- WHAT THIS DOES
--   Creates get_pack_cohort_stats(p_pack_id text) — a SECURITY DEFINER
--   RPC accessible to the anon role (no sign-in required).
--   Returns anonymous aggregate accuracy for a given pack:
--     { user_count, avg_accuracy (0-100), min_sample: bool }
--   min_sample = true when fewer than 5 users have answered ≥5 questions
--   on this pack — in that case avg_accuracy is omitted (privacy floor).
--
-- ROLLBACK
--   DROP FUNCTION IF EXISTS public.get_pack_cohort_stats(text);

CREATE OR REPLACE FUNCTION public.get_pack_cohort_stats(p_pack_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count        int;
  v_avg_accuracy float;
  MIN_USERS      constant int := 5;
  MIN_QUESTIONS  constant int := 5;
BEGIN
  SELECT
    COUNT(*),
    AVG(
      CASE
        WHEN (payload->'perPack'->p_pack_id->>'questionsAnswered')::float >= MIN_QUESTIONS
        THEN (payload->'perPack'->p_pack_id->>'correctAnswered')::float /
             (payload->'perPack'->p_pack_id->>'questionsAnswered')::float
        ELSE NULL
      END
    )
  INTO v_count, v_avg_accuracy
  FROM public.stats
  WHERE payload->'perPack' ? p_pack_id
    AND (payload->'perPack'->p_pack_id->>'questionsAnswered')::float >= MIN_QUESTIONS;

  IF COALESCE(v_count, 0) < MIN_USERS THEN
    RETURN jsonb_build_object('user_count', COALESCE(v_count, 0), 'min_sample', true);
  END IF;

  RETURN jsonb_build_object(
    'user_count',    v_count,
    'avg_accuracy',  ROUND((v_avg_accuracy * 100)::numeric, 0)::int,
    'min_sample',    false
  );
END;
$$;

-- Accessible without a JWT so the cert/path pages can show cohort data
-- to anonymous visitors too.
GRANT EXECUTE ON FUNCTION public.get_pack_cohort_stats(text) TO anon, authenticated;

-- Verification (run manually after applying):
-- SELECT get_pack_cohort_stats('aws-saa-c03');
-- SELECT get_pack_cohort_stats('az-900');
