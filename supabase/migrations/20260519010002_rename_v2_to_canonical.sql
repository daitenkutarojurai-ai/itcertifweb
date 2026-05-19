-- Rename _v2 tables to their final canonical names.
-- Run AFTER 20260519010001_drop_legacy_progress.sql so name collisions
-- (path_progress, cosmetics, hearts, daily) cannot occur.
-- Clients (webitcertif/src/sync.js, certquestapp/lib/sync/supabaseRepo.ts)
-- must be redeployed with the canonical names atomically with this rename.

alter table public.profiles_v2          rename to user_profile;
alter table public.hearts_v2            rename to user_hearts;
alter table public.achievements_v2      rename to user_achievements;
alter table public.path_progress_v2     rename to user_path_progress;
alter table public.mastery_v2           rename to user_mastery;
alter table public.spaced_repetition_v2 rename to user_spaced_repetition;
alter table public.daily_v2             rename to user_daily;
alter table public.cosmetics_v2         rename to user_cosmetics;
alter table public.active_session_v2    rename to user_active_session;
alter table public.settings_v2          rename to user_settings;
