-- 0008_social.sql — applied 2026-06-02 (project zhxnteqtiyqnyidfkivj)
--
-- Phase 7.10 — Social layer v1: follow graph + friends leaderboard + a
-- derived activity feed. ADDITIVE: one new table (follows) + five RPCs. No
-- existing table or RPC changed → non-breaking for the native app.
--
-- Privacy model: you can only follow PUBLIC (leaderboard_opt_in = true)
-- users, so everything surfaced about a followee is already opt-in public.
-- If a followee later opts out, they silently drop from your leaderboard +
-- feed (every read RPC re-checks opt_in). No PII (email / user_id) leaves
-- the RPCs. Writes go only through SECURITY DEFINER social_follow (checks
-- auth.uid()); the follows table has NO write RLS policy, so direct writes
-- are denied. The activity feed is DERIVED from existing timestamped data
-- (user_achievements.earned_at, user_path_progress boss-node completed_at)
-- — no new events table to keep in sync.

create table if not exists public.follows (
  follower_id  uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint follows_no_self check (follower_id <> following_id)
);
alter table public.follows enable row level security;
drop policy if exists follows_select_mine on public.follows;
-- I can read rows where I'm either side (who I follow / who follows me).
create policy follows_select_mine on public.follows
  for select using (auth.uid() = follower_id or auth.uid() = following_id);
create index if not exists follows_following_idx on public.follows(following_id);

-- Follow / unfollow by username. p_follow=true follows, false unfollows.
-- Returns true on success. Only PUBLIC, non-self targets can be followed.
create or replace function public.social_follow(p_username text, p_follow boolean)
returns boolean
language plpgsql security definer set search_path to 'public' as $$
declare
  v_uid uuid := auth.uid();
  v_target uuid;
begin
  if v_uid is null then return false; end if;
  select p.user_id into v_target
  from public.profiles p
  where lower(p.username) = lower(btrim(coalesce(p_username, '')))
    and p.leaderboard_opt_in = true
  limit 1;
  if v_target is null or v_target = v_uid then return false; end if;
  if coalesce(p_follow, true) then
    insert into public.follows(follower_id, following_id)
    values (v_uid, v_target) on conflict do nothing;
  else
    delete from public.follows where follower_id = v_uid and following_id = v_target;
  end if;
  return true;
end; $$;
grant execute on function public.social_follow(text, boolean) to authenticated;

-- Find public users to follow (excludes self), best XP first. `following`
-- flags whether the caller already follows each result.
create or replace function public.social_search_users(p_q text, limit_n integer default 12)
returns table(username text, display_name text, level integer, xp integer, following boolean)
language sql security definer set search_path to 'public' as $$
  select
    p.username,
    coalesce(nullif(trim(p.display_name), ''), p.username) as display_name,
    coalesce(up.level, 1) as level,
    coalesce(up.xp, 0) as xp,
    exists(select 1 from public.follows f where f.follower_id = auth.uid() and f.following_id = p.user_id) as following
  from public.profiles p
  left join public.user_profile up on up.user_id = p.user_id
  where p.leaderboard_opt_in = true
    and p.username is not null
    and p.user_id <> auth.uid()
    and (
      btrim(coalesce(p_q, '')) = ''
      or p.username ilike '%' || btrim(p_q) || '%'
      or p.display_name ilike '%' || btrim(p_q) || '%'
    )
  order by up.xp desc nulls last
  limit greatest(1, least(coalesce(limit_n, 12), 30));
$$;
grant execute on function public.social_search_users(text, integer) to authenticated;

-- Friends leaderboard: the caller + everyone they follow (public only),
-- ranked by the unified cross-platform XP. The caller always appears.
create or replace function public.social_graph(limit_n integer default 50)
returns table(username text, display_name text, level integer, xp integer, rank bigint, is_me boolean)
language sql security definer set search_path to 'public' as $$
  with circle as (
    select auth.uid() as uid
    union
    select f.following_id from public.follows f where f.follower_id = auth.uid()
  )
  select
    p.username,
    coalesce(nullif(trim(p.display_name), ''), p.username) as display_name,
    coalesce(up.level, 1) as level,
    coalesce(up.xp, 0) as xp,
    rank() over (order by coalesce(up.xp, 0) desc) as rank,
    (p.user_id = auth.uid()) as is_me
  from circle c
  join public.profiles p on p.user_id = c.uid
  left join public.user_profile up on up.user_id = c.uid
  where p.user_id = auth.uid() or p.leaderboard_opt_in = true
  order by coalesce(up.xp, 0) desc
  limit greatest(1, least(coalesce(limit_n, 50), 100));
$$;
grant execute on function public.social_graph(integer) to authenticated;

-- Activity feed derived from followees' (public only) timestamped events:
-- achievements unlocked + boss nodes cleared, newest first.
create or replace function public.social_feed(limit_n integer default 30)
returns table(actor text, kind text, detail text, at timestamptz)
language sql security definer set search_path to 'public' as $$
  with followee as (
    select p.user_id, coalesce(nullif(trim(p.display_name), ''), p.username) as name
    from public.follows f
    join public.profiles p on p.user_id = f.following_id
    where f.follower_id = auth.uid() and p.leaderboard_opt_in = true
  )
  select fe.name, 'achievement'::text, a.key, a.earned_at
  from public.user_achievements a
  join followee fe on fe.user_id = a.user_id
  where a.earned_at is not null
  union all
  select fe.name, 'boss'::text, pp.pack_id, pp.completed_at
  from public.user_path_progress pp
  join followee fe on fe.user_id = pp.user_id
  where pp.node_id ilike '%boss%' and pp.completed_at is not null
  order by 4 desc nulls last
  limit greatest(1, least(coalesce(limit_n, 30), 60));
$$;
grant execute on function public.social_feed(integer) to authenticated;

-- Caller's own follower / following counts.
create or replace function public.social_counts()
returns table(following integer, followers integer)
language sql security definer set search_path to 'public' as $$
  select
    (select count(*)::int from public.follows where follower_id = auth.uid()),
    (select count(*)::int from public.follows where following_id = auth.uid());
$$;
grant execute on function public.social_counts() to authenticated;

-- These are authed-only (not public boards), so revoke the default PUBLIC
-- execute grant — only `authenticated` should reach them. (Applied as
-- migration 0008_social_tighten_grants.)
revoke execute on function public.social_follow(text, boolean) from public, anon;
revoke execute on function public.social_search_users(text, integer) from public, anon;
revoke execute on function public.social_graph(integer) from public, anon;
revoke execute on function public.social_feed(integer) from public, anon;
revoke execute on function public.social_counts() from public, anon;
