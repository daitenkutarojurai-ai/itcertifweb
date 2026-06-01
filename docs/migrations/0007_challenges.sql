-- 0007_challenges.sql — applied 2026-06-01 (project zhxnteqtiyqnyidfkivj)
--
-- Phase 7.4 — Challenges v1. Additive: per-user weekly challenge progress +
-- a ranked, opt-in-gated leaderboard RPC. Challenge DEFINITIONS are static
-- client templates (src/challenges.js); the cloud stores only per-(user,
-- challenge, week) progress so it can be ranked. Non-breaking for the app.
--
-- Reads: get_challenge_leaderboard (anon-exec, SECURITY DEFINER, gated on
-- profiles.leaderboard_opt_in). Writes: client upserts its own rows (own-row
-- RLS); a BEFORE UPDATE guard keeps progress monotonic within a week.

create table if not exists public.challenge_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  challenge_id text not null,
  iso_week text not null,
  progress integer not null default 0,
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, challenge_id, iso_week)
);
alter table public.challenge_progress enable row level security;
drop policy if exists challenge_progress_select_own on public.challenge_progress;
drop policy if exists challenge_progress_insert_own on public.challenge_progress;
drop policy if exists challenge_progress_update_own on public.challenge_progress;
create policy challenge_progress_select_own on public.challenge_progress for select using (auth.uid() = user_id);
create policy challenge_progress_insert_own on public.challenge_progress for insert with check (auth.uid() = user_id);
create policy challenge_progress_update_own on public.challenge_progress for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists challenge_progress_board_idx on public.challenge_progress(challenge_id, iso_week, progress desc);

create or replace function public.guard_monotonic_progress()
returns trigger language plpgsql as $$
begin
  if new.progress < old.progress then new.progress := old.progress; end if;
  if old.completed then new.completed := true; end if;
  return new;
end; $$;
drop trigger if exists guard_monotonic_progress on public.challenge_progress;
create trigger guard_monotonic_progress before update on public.challenge_progress
  for each row execute function public.guard_monotonic_progress();

create or replace function public.get_challenge_leaderboard(p_challenge_id text, p_week text, limit_n integer default 20)
returns table(display_name text, progress integer, completed boolean, is_me boolean)
language sql security definer set search_path to 'public' as $$
  select
    coalesce(nullif(trim(p.display_name), ''), nullif(trim(p.username), ''), 'Anonymous') as display_name,
    cp.progress, cp.completed, (cp.user_id = auth.uid()) as is_me
  from public.challenge_progress cp
  join public.profiles p on p.user_id = cp.user_id
  where cp.challenge_id = p_challenge_id and cp.iso_week = p_week and p.leaderboard_opt_in = true
  order by cp.progress desc, cp.updated_at asc
  limit greatest(1, least(coalesce(limit_n, 20), 100));
$$;
grant execute on function public.get_challenge_leaderboard(text, text, integer) to anon, authenticated;
