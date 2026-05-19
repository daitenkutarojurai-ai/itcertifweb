-- get_leaderboard: top-N opted-in users by lifetime XP.
-- SECURITY DEFINER so it can read user_profile + profiles rows without
-- being limited by per-user RLS. Only returns display_name + xp; the
-- caller's own row is flagged via is_me for highlighting.
create or replace function public.get_leaderboard(limit_n int default 50)
returns table(user_id uuid, display_name text, xp int, is_me boolean)
language sql
security definer
set search_path = public
as $$
  select
    p.user_id,
    coalesce(nullif(trim(p.display_name), ''), nullif(trim(p.username), ''), 'Anonymous') as display_name,
    up.xp,
    (p.user_id = auth.uid()) as is_me
  from public.profiles p
  join public.user_profile up on up.user_id = p.user_id
  where p.leaderboard_opt_in = true
  order by up.xp desc, p.user_id
  limit greatest(1, least(coalesce(limit_n, 50), 200));
$$;

revoke all on function public.get_leaderboard(int) from public;
grant execute on function public.get_leaderboard(int) to authenticated;
