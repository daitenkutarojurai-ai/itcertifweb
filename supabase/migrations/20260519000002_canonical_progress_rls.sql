-- Row-Level Security for the canonical schema.
-- Owner-only: every row is keyed by user_id = auth.uid().

do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'profiles_v2','hearts_v2','achievements_v2','path_progress_v2',
      'mastery_v2','spaced_repetition_v2','daily_v2','cosmetics_v2',
      'active_session_v2','settings_v2'
    ])
  loop
    execute format('alter table public.%I enable row level security;', t);

    execute format(
      'drop policy if exists %I_select_own on public.%I;
       create policy %I_select_own on public.%I
         for select using (auth.uid() = user_id);',
      t, t, t, t
    );

    execute format(
      'drop policy if exists %I_insert_own on public.%I;
       create policy %I_insert_own on public.%I
         for insert with check (auth.uid() = user_id);',
      t, t, t, t
    );

    execute format(
      'drop policy if exists %I_update_own on public.%I;
       create policy %I_update_own on public.%I
         for update using (auth.uid() = user_id) with check (auth.uid() = user_id);',
      t, t, t, t
    );

    execute format(
      'drop policy if exists %I_delete_own on public.%I;
       create policy %I_delete_own on public.%I
         for delete using (auth.uid() = user_id);',
      t, t, t, t
    );
  end loop;
end $$;
