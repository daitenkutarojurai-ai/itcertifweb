-- 0009_study_groups.sql — applied 2026-06-02 (project zhxnteqtiyqnyidfkivj)
--
-- Phase 7.9 — Study groups + accountability v1. ADDITIVE: two tables +
-- six RPCs. No existing table/RPC changed → non-breaking for the native
-- app. Unlike guilds (one per user), study groups are MANY-to-many: a
-- learner joins several cert-focused cohorts, each with an optional shared
-- deadline. Accountability = a once-per-day check-in (last_checkin date +
-- checkin_count). Reads are public (group discovery + roster); ALL writes
-- go through SECURITY DEFINER RPCs that check auth.uid() (no write RLS
-- policies → direct table writes denied). Dates use the server's
-- current_date (UTC); a small tz skew is acceptable for a social check-in.

create table if not exists public.study_groups (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name        text not null,
  pack_id     text not null,
  target_date date,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);
alter table public.study_groups enable row level security;
drop policy if exists study_groups_select_all on public.study_groups;
create policy study_groups_select_all on public.study_groups for select using (true);
create index if not exists study_groups_pack_idx on public.study_groups(pack_id);

create table if not exists public.study_group_members (
  group_id      uuid not null references public.study_groups(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  joined_at     timestamptz not null default now(),
  last_checkin  date,
  checkin_count integer not null default 0,
  primary key (group_id, user_id)
);
alter table public.study_group_members enable row level security;
drop policy if exists study_group_members_select_all on public.study_group_members;
create policy study_group_members_select_all on public.study_group_members for select using (true);
create index if not exists study_group_members_user_idx on public.study_group_members(user_id);

-- Create a group (creator auto-joins). Caps a user at 12 memberships.
create or replace function public.create_study_group(p_name text, p_pack_id text, p_target_date date default null)
returns text language plpgsql security definer set search_path to 'public' as $$
declare
  v_uid uuid := auth.uid();
  v_name text := btrim(coalesce(p_name, ''));
  v_pack text := lower(btrim(coalesce(p_pack_id, '')));
  v_base text; v_slug text; v_n int := 0; v_id uuid;
begin
  if v_uid is null then raise exception 'auth required'; end if;
  if char_length(v_name) < 3 or char_length(v_name) > 40 then raise exception 'name must be 3-40 characters'; end if;
  if v_pack !~ '^[a-z0-9][a-z0-9-]{0,39}$' then raise exception 'invalid certification'; end if;
  if p_target_date is not null and (p_target_date < current_date or p_target_date > current_date + 365) then
    raise exception 'deadline must be within the next year';
  end if;
  if (select count(*) from study_group_members where user_id = v_uid) >= 12 then
    raise exception 'you are in too many study groups (max 12)';
  end if;
  v_base := btrim(regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g'), '-');
  if v_base = '' then v_base := 'group'; end if;
  v_slug := v_base;
  while exists (select 1 from study_groups where slug = v_slug) loop
    v_n := v_n + 1; v_slug := v_base || '-' || v_n;
    if v_n > 99 then raise exception 'could not generate a unique slug'; end if;
  end loop;
  insert into study_groups(slug, name, pack_id, target_date, created_by)
  values (v_slug, v_name, v_pack, p_target_date, v_uid) returning id into v_id;
  insert into study_group_members(group_id, user_id) values (v_id, v_uid);
  return v_slug;
end; $$;
grant execute on function public.create_study_group(text, text, date) to authenticated;

create or replace function public.join_study_group(p_slug text)
returns text language plpgsql security definer set search_path to 'public' as $$
declare v_uid uuid := auth.uid(); v_id uuid;
begin
  if v_uid is null then raise exception 'auth required'; end if;
  select id into v_id from study_groups where slug = lower(btrim(coalesce(p_slug, '')));
  if v_id is null then raise exception 'study group not found'; end if;
  if (select count(*) from study_group_members where user_id = v_uid) >= 12 then
    raise exception 'you are in too many study groups (max 12)';
  end if;
  insert into study_group_members(group_id, user_id) values (v_id, v_uid) on conflict do nothing;
  return p_slug;
end; $$;
grant execute on function public.join_study_group(text) to authenticated;

create or replace function public.leave_study_group(p_slug text)
returns void language plpgsql security definer set search_path to 'public' as $$
declare v_id uuid;
begin
  select id into v_id from study_groups where slug = lower(btrim(coalesce(p_slug, '')));
  if v_id is not null then delete from study_group_members where group_id = v_id and user_id = auth.uid(); end if;
end; $$;
grant execute on function public.leave_study_group(text) to authenticated;

-- Once-per-day accountability check-in. Returns the caller's new streak
-- count (unchanged if already checked in today). Members only.
create or replace function public.study_group_checkin(p_slug text)
returns integer language plpgsql security definer set search_path to 'public' as $$
declare v_uid uuid := auth.uid(); v_id uuid; v_count int;
begin
  if v_uid is null then raise exception 'auth required'; end if;
  select id into v_id from study_groups where slug = lower(btrim(coalesce(p_slug, '')));
  if v_id is null then raise exception 'study group not found'; end if;
  update study_group_members
    set last_checkin = current_date,
        checkin_count = checkin_count + 1
  where group_id = v_id and user_id = v_uid
    and (last_checkin is null or last_checkin < current_date)
  returning checkin_count into v_count;
  if v_count is null then
    select checkin_count into v_count from study_group_members where group_id = v_id and user_id = v_uid;
    if v_count is null then raise exception 'join the group first'; end if;
  end if;
  return v_count;
end; $$;
grant execute on function public.study_group_checkin(text) to authenticated;

-- Public discovery: groups (optionally filtered to one cert), with member
-- count + how many checked in today.
create or replace function public.get_study_groups(p_pack_id text default null, limit_n integer default 60)
returns table(slug text, name text, pack_id text, target_date date, member_count bigint, checked_in_today bigint, days_left integer)
language sql security definer set search_path to 'public' as $$
  select g.slug, g.name, g.pack_id, g.target_date,
    count(m.user_id) as member_count,
    count(m.user_id) filter (where m.last_checkin = current_date) as checked_in_today,
    case when g.target_date is null then null else (g.target_date - current_date) end as days_left
  from study_groups g
  left join study_group_members m on m.group_id = g.id
  where p_pack_id is null or g.pack_id = lower(btrim(p_pack_id))
  group by g.id
  order by member_count desc, g.created_at desc
  limit greatest(1, least(coalesce(limit_n, 60), 200));
$$;
grant execute on function public.get_study_groups(text, integer) to anon, authenticated;

-- The caller's own groups with their check-in state.
create or replace function public.get_my_study_groups()
returns table(slug text, name text, pack_id text, target_date date, member_count bigint, my_checkins integer, checked_in_today boolean, days_left integer)
language sql security definer set search_path to 'public' as $$
  select g.slug, g.name, g.pack_id, g.target_date,
    (select count(*) from study_group_members mm where mm.group_id = g.id) as member_count,
    me.checkin_count as my_checkins,
    (me.last_checkin = current_date) as checked_in_today,
    case when g.target_date is null then null else (g.target_date - current_date) end as days_left
  from study_group_members me
  join study_groups g on g.id = me.group_id
  where me.user_id = auth.uid()
  order by g.target_date asc nulls last, g.created_at desc;
$$;
grant execute on function public.get_my_study_groups() to authenticated;

-- Group header + roster (sorted by check-ins). member_is_me lets the page
-- highlight the caller; anon callers just get false.
create or replace function public.get_study_group(p_slug text)
returns table(
  slug text, name text, pack_id text, target_date date, days_left integer, member_count bigint,
  member_name text, member_checkins integer, member_checked_today boolean, member_is_me boolean
)
language sql security definer set search_path to 'public' as $$
  with g as (select * from study_groups where slug = lower(btrim(coalesce(p_slug, '')))),
  totals as (select coalesce(count(*), 0) as member_count from g left join study_group_members m on m.group_id = g.id)
  select g.slug, g.name, g.pack_id, g.target_date,
    case when g.target_date is null then null else (g.target_date - current_date) end as days_left,
    t.member_count,
    coalesce(nullif(trim(p.display_name), ''), nullif(trim(p.username), ''), 'Member') as member_name,
    coalesce(m.checkin_count, 0) as member_checkins,
    (m.last_checkin = current_date) as member_checked_today,
    (m.user_id = auth.uid()) as member_is_me
  from g cross join totals t
  left join study_group_members m on m.group_id = g.id
  left join profiles p on p.user_id = m.user_id
  order by coalesce(m.checkin_count, 0) desc, m.joined_at asc;
$$;
grant execute on function public.get_study_group(text) to anon, authenticated;
