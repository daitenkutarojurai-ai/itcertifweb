-- Drop the legacy progress tables now that v2 is canonical.
-- This is destructive and irreversible without a pg_dump restore.
-- Per plan Task 40, run only after Task 8 (web stopped writing legacy)
-- has been live long enough that no recovery from legacy is needed.

drop table if exists public.stats         cascade;
drop table if exists public.laurels       cascade;
drop table if exists public.path_progress cascade;
drop table if exists public.cosmetics     cascade;
drop table if exists public.hearts        cascade;
drop table if exists public.daily         cascade;
-- public.profiles is NOT dropped — handle_new_user still uses it and
-- the leaderboard reads display_name from it.
