-- 0006_guilds.sql — applied 2026-06-01 (project zhxnteqtiyqnyidfkivj)
--
-- Phase 7.3 — Guilds v1. ADDITIVE: two new tables + read/write RPCs. No
-- existing table or RPC changed → non-breaking for the native app. One guild
-- per user (guild_members PK = user_id). Guild XP = sum of members'
-- user_profile.xp (the shared cross-platform XP). Reads are public; ALL writes
-- go through SECURITY DEFINER RPCs that check auth.uid() (no write RLS policies,
-- so direct table writes are denied).

create table if not exists public.guilds (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  tag text not null,
  description text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.guilds enable row level security;
drop policy if exists guilds_select_all on public.guilds;
create policy guilds_select_all on public.guilds for select using (true);

create table if not exists public.guild_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  guild_id uuid not null references public.guilds(id) on delete cascade,
  role text not null default 'member',
  joined_at timestamptz not null default now()
);
alter table public.guild_members enable row level security;
drop policy if exists guild_members_select_all on public.guild_members;
create policy guild_members_select_all on public.guild_members for select using (true);
create index if not exists guild_members_guild_idx on public.guild_members(guild_id);

create or replace function public.create_guild(p_name text, p_tag text)
returns text language plpgsql security definer set search_path to 'public' as $$
declare
  v_uid uuid := auth.uid();
  v_name text := btrim(coalesce(p_name, ''));
  v_tag text := upper(btrim(coalesce(p_tag, '')));
  v_base text; v_slug text; v_n int := 0; v_id uuid;
begin
  if v_uid is null then raise exception 'auth required'; end if;
  if char_length(v_name) < 3 or char_length(v_name) > 30 then raise exception 'name must be 3-30 characters'; end if;
  if v_tag !~ '^[A-Z0-9]{2,5}$' then raise exception 'tag must be 2-5 letters or digits'; end if;
  if exists (select 1 from guild_members where user_id = v_uid) then raise exception 'you are already in a guild'; end if;
  v_base := btrim(regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g'), '-');
  if v_base = '' then v_base := 'guild'; end if;
  v_slug := v_base;
  while exists (select 1 from guilds where slug = v_slug) loop
    v_n := v_n + 1; v_slug := v_base || '-' || v_n;
    if v_n > 99 then raise exception 'could not generate a unique slug'; end if;
  end loop;
  insert into guilds(slug, name, tag, created_by) values (v_slug, v_name, v_tag, v_uid) returning id into v_id;
  insert into guild_members(user_id, guild_id, role) values (v_uid, v_id, 'owner');
  return v_slug;
end; $$;
grant execute on function public.create_guild(text, text) to authenticated;

create or replace function public.join_guild(p_slug text)
returns text language plpgsql security definer set search_path to 'public' as $$
declare v_uid uuid := auth.uid(); v_id uuid;
begin
  if v_uid is null then raise exception 'auth required'; end if;
  if exists (select 1 from guild_members where user_id = v_uid) then raise exception 'you are already in a guild'; end if;
  select id into v_id from guilds where slug = lower(btrim(coalesce(p_slug, '')));
  if v_id is null then raise exception 'guild not found'; end if;
  insert into guild_members(user_id, guild_id, role) values (v_uid, v_id, 'member');
  return p_slug;
end; $$;
grant execute on function public.join_guild(text) to authenticated;

create or replace function public.leave_guild()
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  delete from guild_members where user_id = auth.uid();
end; $$;
grant execute on function public.leave_guild() to authenticated;

create or replace function public.get_guild_leaderboard(limit_n integer default 50)
returns table(slug text, name text, tag text, member_count bigint, total_xp bigint)
language sql security definer set search_path to 'public' as $$
  select g.slug, g.name, g.tag, count(m.user_id) as member_count, coalesce(sum(up.xp), 0) as total_xp
  from guilds g
  left join guild_members m on m.guild_id = g.id
  left join user_profile up on up.user_id = m.user_id
  group by g.id
  order by total_xp desc, member_count desc, g.created_at asc
  limit greatest(1, least(coalesce(limit_n, 50), 200));
$$;
grant execute on function public.get_guild_leaderboard(integer) to anon, authenticated;

create or replace function public.get_my_guild()
returns table(slug text, name text, tag text, role text, member_count bigint, total_xp bigint, rank bigint)
language sql security definer set search_path to 'public' as $$
  with mine as (select guild_id, role from guild_members where user_id = auth.uid()),
  agg as (
    select g.id, g.slug, g.name, g.tag,
      count(m.user_id) as member_count, coalesce(sum(up.xp), 0) as total_xp
    from guilds g
    left join guild_members m on m.guild_id = g.id
    left join user_profile up on up.user_id = m.user_id
    group by g.id
  ),
  ranked as (select *, rank() over (order by total_xp desc) as rnk from agg)
  select r.slug, r.name, r.tag, mine.role, r.member_count, r.total_xp, r.rnk
  from ranked r join mine on mine.guild_id = r.id;
$$;
grant execute on function public.get_my_guild() to authenticated;

create or replace function public.get_guild(p_slug text)
returns table(
  slug text, name text, tag text, description text,
  member_count bigint, total_xp bigint,
  member_name text, member_xp integer, member_level integer, member_role text
)
language sql security definer set search_path to 'public' as $$
  with g as (select * from guilds where slug = lower(btrim(coalesce(p_slug, '')))),
  totals as (
    select coalesce(count(m.user_id), 0) as member_count, coalesce(sum(up.xp), 0) as total_xp
    from g left join guild_members m on m.guild_id = g.id
    left join user_profile up on up.user_id = m.user_id
  )
  select g.slug, g.name, g.tag, g.description, t.member_count, t.total_xp,
    coalesce(nullif(trim(p.display_name), ''), nullif(trim(p.username), ''), 'Member') as member_name,
    coalesce(up.xp, 0) as member_xp, coalesce(up.level, 1) as member_level, m.role as member_role
  from g cross join totals t
  left join guild_members m on m.guild_id = g.id
  left join profiles p on p.user_id = m.user_id
  left join user_profile up on up.user_id = m.user_id
  order by coalesce(up.xp, 0) desc;
$$;
grant execute on function public.get_guild(text) to anon, authenticated;
