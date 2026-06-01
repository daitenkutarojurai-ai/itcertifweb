-- 0004_monotonic_xp.sql — applied 2026-06-01 (Supabase project zhxnteqtiyqnyidfkivj)
--
-- Cross-platform account unification. user_profile.xp (and user_weekly_xp.xp)
-- is the single source of truth shared by the web (src/sync.js) and the native
-- app (~/certquestapp, lib/sync/merge.ts — which already merges xp via
-- Math.max). This BEFORE UPDATE guard makes the cloud value a monotonic
-- high-water mark so neither platform's stale UPDATE can move XP backwards.
-- It codifies the app's existing max-merge semantics server-side and is
-- non-breaking for the app (its XP only ever grows).
--
-- IMPORTANT (cross-repo): `level` is intentionally NOT guarded. The web uses a
-- 30-stage level scale (src/stats.js) and the app a 10-tier scale
-- (lib/sync/merge.ts TIER_THRESHOLDS). Each platform derives its own level from
-- the shared xp; the stored level column is a per-platform cache and must not
-- be cross-adopted. Coordinated with certquestapp — see its CLAUDE.md.

create or replace function public.guard_monotonic_xp()
returns trigger language plpgsql as $$
begin
  if new.xp < old.xp then
    new.xp := old.xp;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_monotonic_xp on public.user_profile;
create trigger guard_monotonic_xp
  before update on public.user_profile
  for each row execute function public.guard_monotonic_xp();

drop trigger if exists guard_monotonic_weekly_xp on public.user_weekly_xp;
create trigger guard_monotonic_weekly_xp
  before update on public.user_weekly_xp
  for each row execute function public.guard_monotonic_xp();
