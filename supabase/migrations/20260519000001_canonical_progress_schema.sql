-- Canonical cross-device progress schema.
-- Additive: existing tables (stats, laurels, daily, etc.) are not touched.
-- Web will dual-write during cutover and read-switch in a later migration.

-- 1. profiles ----------------------------------------------------------------
create table if not exists public.profiles_v2 (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  username     text,
  xp           integer not null default 0 check (xp >= 0),
  level        integer not null default 1 check (level >= 1),
  updated_at   timestamptz not null default now()
);

-- 2. hearts ------------------------------------------------------------------
create table if not exists public.hearts_v2 (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  count          smallint not null default 5 check (count between 0 and 5),
  last_regen_at  timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- 3. achievements ------------------------------------------------------------
-- pack_id is '' for global achievements; non-empty for per-pack laurels.
create table if not exists public.achievements_v2 (
  user_id     uuid not null references auth.users(id) on delete cascade,
  key         text not null,
  pack_id     text not null default '',
  earned_at   timestamptz not null default now(),
  score       smallint,
  primary key (user_id, key, pack_id)
);
create index if not exists achievements_v2_user_idx on public.achievements_v2(user_id);

-- 4. path_progress -----------------------------------------------------------
create table if not exists public.path_progress_v2 (
  user_id       uuid not null references auth.users(id) on delete cascade,
  pack_id       text not null,
  node_id       text not null,
  completed_at  timestamptz not null default now(),
  score         smallint,
  updated_at    timestamptz not null default now(),
  primary key (user_id, pack_id, node_id)
);
create index if not exists path_progress_v2_user_pack_idx on public.path_progress_v2(user_id, pack_id);

-- 5. mastery -----------------------------------------------------------------
create table if not exists public.mastery_v2 (
  user_id         uuid not null references auth.users(id) on delete cascade,
  pack_id         text not null,
  seen            integer not null default 0 check (seen >= 0),
  correct         integer not null default 0 check (correct >= 0),
  best_score      smallint not null default 0 check (best_score between 0 and 100),
  last_played_at  timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  primary key (user_id, pack_id)
);

-- 6. spaced_repetition ------------------------------------------------------
create table if not exists public.spaced_repetition_v2 (
  user_id       uuid not null references auth.users(id) on delete cascade,
  pack_id       text not null,
  item_id       text not null,
  difficulty    smallint not null default 3 check (difficulty between 1 and 5),
  next_due_at   timestamptz not null default now(),
  last_seen_at  timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  primary key (user_id, pack_id, item_id)
);
create index if not exists sr_v2_due_idx on public.spaced_repetition_v2(user_id, next_due_at);

-- 7. daily -------------------------------------------------------------------
create table if not exists public.daily_v2 (
  user_id      uuid not null references auth.users(id) on delete cascade,
  date         date not null,
  pack_id      text not null,
  progress     integer not null default 0 check (progress >= 0),
  claimed      boolean not null default false,
  claimed_at   timestamptz,
  updated_at   timestamptz not null default now(),
  primary key (user_id, date)
);

-- 8. cosmetics ---------------------------------------------------------------
create table if not exists public.cosmetics_v2 (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  unlocked     text[] not null default '{}',
  wearing      text,
  updated_at   timestamptz not null default now()
);

-- 9. active_session ----------------------------------------------------------
-- Single in-flight quiz pointer per user. NULL row means no active session.
create table if not exists public.active_session_v2 (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  pack_id         text not null,
  mode            text not null check (mode in ('quick','full','study')),
  question_index  integer not null default 0 check (question_index >= 0),
  answers         jsonb not null default '{}'::jsonb,
  path_node_id    text,
  started_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- 10. settings --------------------------------------------------------------
create table if not exists public.settings_v2 (
  user_id                  uuid primary key references auth.users(id) on delete cascade,
  haptics_enabled          boolean not null default true,
  daily_reminder_enabled   boolean not null default false,
  daily_reminder_hour      smallint not null default 19 check (daily_reminder_hour between 0 and 23),
  updated_at               timestamptz not null default now()
);

-- updated_at trigger -------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Attach the trigger to every table that has updated_at
do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'profiles_v2','hearts_v2','path_progress_v2','mastery_v2',
      'spaced_repetition_v2','daily_v2','cosmetics_v2',
      'active_session_v2','settings_v2'
    ])
  loop
    execute format(
      'drop trigger if exists touch_%I on public.%I;
       create trigger touch_%I before update on public.%I
         for each row execute function public.touch_updated_at();',
      t, t, t, t
    );
  end loop;
end $$;
