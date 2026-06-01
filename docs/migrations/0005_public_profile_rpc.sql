-- 0005_public_profile_rpc.sql — applied 2026-06-01 (project zhxnteqtiyqnyidfkivj)
--
-- Phase 7.8 — public shareable skills profile. Read-only, anon-executable
-- lookup by username, gated on the SAME profiles.leaderboard_opt_in toggle the
-- leaderboard uses. Returns only non-PII public fields (no email, no user_id,
-- no auth data). Additive and non-breaking for the native app (new function;
-- no existing table or RPC changed). Powers /u/?u=<username>.

create or replace function public.get_public_profile(handle text)
returns table(
  display_name text,
  level integer,
  xp integer,
  laurel_packs text[],
  nodes_completed integer,
  member_since timestamptz
)
language sql
security definer
set search_path to 'public'
as $function$
  select
    coalesce(nullif(trim(p.display_name), ''), nullif(trim(p.username), ''), 'Anonymous') as display_name,
    coalesce(up.level, 1) as level,
    coalesce(up.xp, 0) as xp,
    coalesce(
      (select array_agg(distinct a.pack_id order by a.pack_id)
       from public.user_achievements a
       where a.user_id = p.user_id and a.key = 'laurel' and a.pack_id is not null),
      '{}'::text[]
    ) as laurel_packs,
    coalesce(
      (select count(*)::int from public.user_path_progress pp where pp.user_id = p.user_id),
      0
    ) as nodes_completed,
    p.created_at as member_since
  from public.profiles p
  left join public.user_profile up on up.user_id = p.user_id
  where lower(p.username) = lower(handle) and p.leaderboard_opt_in = true
  limit 1;
$function$;

grant execute on function public.get_public_profile(text) to anon, authenticated;
