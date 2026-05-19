-- Backfill v2 tables from legacy tables.
-- Idempotent: ON CONFLICT DO NOTHING. Safe to re-run before cutover.
-- ACTUAL LEGACY SCHEMA (verified via list_tables on 2026-05-19):
--   profiles(user_id uuid PK, username text, display_name text, created_at, updated_at, leaderboard_opt_in bool)
--   stats(user_id uuid PK, payload jsonb, updated_at)            -- xp/level live inside payload
--   path_progress(user_id, pack_id, node_id, completed_at, score)
--   laurels(user_id, pack_id, earned_at, score)                  -- PK (user_id, pack_id); one laurel per pack
--   cosmetics(user_id PK, unlocked text[], wearing, updated_at)
--   hearts(user_id PK, hearts smallint, last_lost_at, updated_at)
--   daily(user_id, day, progress, claimed, updated_at)           -- column is `day` not `date`; no pack_id

-- profiles_v2: read username from profiles, xp/level from stats.payload jsonb -----
-- 1) seed from stats rows (the ones that have xp/level)
insert into public.profiles_v2 (user_id, username, xp, level, updated_at)
select s.user_id,
       p.username,
       coalesce((s.payload->>'xp')::int, 0),
       coalesce((s.payload->>'level')::int, 1),
       coalesce(s.updated_at, now())
from public.stats s
left join public.profiles p on p.user_id = s.user_id
on conflict (user_id) do nothing;

-- 2) include profile rows that don't have a stats entry yet
insert into public.profiles_v2 (user_id, username, xp, level, updated_at)
select p.user_id, p.username, 0, 1, coalesce(p.updated_at, now())
from public.profiles p
on conflict (user_id) do nothing;

-- hearts_v2: legacy uses `hearts` (count) + `last_lost_at` -----------------
insert into public.hearts_v2 (user_id, count, last_regen_at, updated_at)
select user_id,
       coalesce(hearts, 5),
       coalesce(last_lost_at, now()),
       coalesce(updated_at, now())
from public.hearts
on conflict (user_id) do nothing;

-- achievements_v2: legacy laurels are per-pack ----------------------------
-- Legacy PK is (user_id, pack_id); v2 PK is (user_id, key, pack_id). Encode every
-- laurel as key='laurel'.
insert into public.achievements_v2 (user_id, key, pack_id, earned_at, score)
select user_id,
       'laurel'::text as key,
       pack_id,
       coalesce(earned_at, now()),
       score
from public.laurels
on conflict (user_id, key, pack_id) do nothing;

-- path_progress_v2: legacy has no updated_at; mirror completed_at ----------
insert into public.path_progress_v2 (user_id, pack_id, node_id, completed_at, score, updated_at)
select user_id,
       pack_id,
       node_id,
       coalesce(completed_at, now()),
       score,
       coalesce(completed_at, now())
from public.path_progress
on conflict (user_id, pack_id, node_id) do nothing;

-- cosmetics_v2 ------------------------------------------------------------
insert into public.cosmetics_v2 (user_id, unlocked, wearing, updated_at)
select user_id,
       coalesce(unlocked, '{}'::text[]),
       wearing,
       coalesce(updated_at, now())
from public.cosmetics
on conflict (user_id) do nothing;

-- daily_v2: legacy column is `day` not `date`; no pack_id -----------------
insert into public.daily_v2 (user_id, date, pack_id, progress, claimed, claimed_at, updated_at)
select user_id,
       day as date,
       '' as pack_id,
       coalesce(progress, 0),
       coalesce(claimed, false),
       case when claimed then coalesce(updated_at, now()) else null end,
       coalesce(updated_at, now())
from public.daily
on conflict (user_id, date) do nothing;
