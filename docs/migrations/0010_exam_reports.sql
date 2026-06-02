-- 0010_exam_reports.sql — applied 2026-06-02 (project zhxnteqtiyqnyidfkivj)
--
-- Phase 6.13 — Exam Radar v1: community-sourced "which topics were heavily
-- tested" reports. ADDITIVE: one table + three RPCs. No existing table/RPC
-- changed → non-breaking for the native app. The topic taxonomy is NOT stored
-- here — it's derived client-side from each pack's question tags (top ~10 by
-- frequency); this table only stores per-(user, pack, topic) votes so they can
-- be aggregated. Reads are public (aggregate only); writes go through a
-- SECURITY DEFINER RPC that checks auth.uid(). The page gates the radar behind
-- a minimum-reporters threshold so a near-empty dataset is never shown as fact.

create table if not exists public.exam_reports (
  user_id    uuid not null references auth.users(id) on delete cascade,
  pack_id    text not null,
  topic      text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, pack_id, topic)
);
alter table public.exam_reports enable row level security;
drop policy if exists exam_reports_select_all on public.exam_reports;
-- Aggregate is public; individual rows expose only (pack, topic) — no PII.
create policy exam_reports_select_all on public.exam_reports for select using (true);
create index if not exists exam_reports_pack_idx on public.exam_reports(pack_id);

-- Replace the caller's report for a pack with the given topics (max 5). Topics
-- are validated against a slug shape; unknown/garbage is dropped silently.
create or replace function public.set_exam_report(p_pack_id text, p_topics text[])
returns integer language plpgsql security definer set search_path to 'public' as $$
declare
  v_uid uuid := auth.uid();
  v_pack text := lower(btrim(coalesce(p_pack_id, '')));
  v_topic text;
  v_n int := 0;
begin
  if v_uid is null then raise exception 'auth required'; end if;
  if v_pack !~ '^[a-z0-9][a-z0-9-]{0,40}$' then raise exception 'invalid pack'; end if;
  delete from exam_reports where user_id = v_uid and pack_id = v_pack;
  if p_topics is not null then
    foreach v_topic in array p_topics loop
      v_topic := lower(btrim(v_topic));
      if v_topic ~ '^[a-z0-9][a-z0-9 +/._-]{0,48}$' and v_n < 5 then
        insert into exam_reports(user_id, pack_id, topic) values (v_uid, v_pack, v_topic)
          on conflict do nothing;
        v_n := v_n + 1;
      end if;
    end loop;
  end if;
  return v_n;
end; $$;
grant execute on function public.set_exam_report(text, text[]) to authenticated;

-- Aggregate radar for a pack: per-topic vote counts + the total distinct
-- reporters (repeated on each row so the client reads it once).
create or replace function public.get_exam_radar(p_pack_id text)
returns table(topic text, reports bigint, reporters bigint)
language sql security definer set search_path to 'public' as $$
  select er.topic, count(*) as reports,
    (select count(distinct user_id) from exam_reports where pack_id = lower(btrim(p_pack_id))) as reporters
  from exam_reports er
  where er.pack_id = lower(btrim(p_pack_id))
  group by er.topic
  order by reports desc, er.topic;
$$;
grant execute on function public.get_exam_radar(text) to anon, authenticated;

-- The caller's own reported topics for a pack (to pre-check the form).
create or replace function public.get_my_exam_report(p_pack_id text)
returns table(topic text)
language sql security definer set search_path to 'public' as $$
  select topic from exam_reports
  where user_id = auth.uid() and pack_id = lower(btrim(p_pack_id));
$$;
grant execute on function public.get_my_exam_report(text) to authenticated;
