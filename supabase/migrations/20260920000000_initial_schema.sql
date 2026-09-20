-- Woodshed initial schema (SPEC.md section 8)
--
-- Two layers, per SPEC.md section 2:
--   - Catalog tables (programs, exercises, drills): identical for everyone,
--     read-only to authenticated users, written only by migrations/seeds.
--   - User data tables: every row is owned by exactly one user, every
--     policy scopes to auth.uid(), RLS is enabled without exception.
--
-- Deviation from the literal section 8 listing: session_items gets a
-- user_id column even though section 8's schema line for it doesn't show
-- one. Section 2 says every user-data table "carries a user_id" for
-- defence-in-depth filtering, which only works if the column exists
-- directly instead of requiring a join through sessions on every query.
-- Flagged for Robin -- see the Phase 1 chat message.

create extension if not exists pgcrypto;

-- ============================================================
-- Catalog tables
-- ============================================================

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  subtitle text,
  description text,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs (id) on delete cascade,
  slug text not null,
  position int not null default 0,
  title text not null,
  description text,
  uses_metronome boolean not null default true,
  mode text not null check (mode in ('single', 'pair', 'sequence')),
  available_pools text[] not null,
  default_pool text not null default 'naturals',
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (program_id, slug)
);

create table public.drills (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  bpm int,
  pool text not null check (pool in ('naturals', 'accidentals', 'chromatic', 'complete')),
  unique (exercise_id, bpm, pool)
);

create index drills_exercise_id_idx on public.drills (exercise_id);

-- ============================================================
-- User data tables
-- ============================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text,
  last_name text,
  avatar_url text,
  notation text not null default 'en',
  theme text not null default 'dark',
  validation_mode text not null default 'manual',
  metronome_sound text not null default 'click',
  timezone text,
  created_at timestamptz not null default now()
);

create table public.drill_stats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  drill_id uuid not null references public.drills (id) on delete cascade,
  first_practiced_on date,
  last_practiced_on date,
  session_count int not null default 0,
  total_reps int not null default 0,
  last_confidence text,
  consecutive_solid int not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, drill_id)
);

create index drill_stats_user_id_idx on public.drill_stats (user_id);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  drill_id uuid not null references public.drills (id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  time_signature text,
  actual_bpm int,
  notes_done int not null default 0,
  reps_done int not null default 0,
  confidence text
);

create index sessions_user_id_idx on public.sessions (user_id);

create table public.session_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid not null references public.sessions (id) on delete cascade,
  note text not null,
  position int not null,
  reps_done int not null default 0
);

create index session_items_user_id_idx on public.session_items (user_id);
create index session_items_session_id_idx on public.session_items (session_id);

create table public.daily_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  program_id uuid not null references public.programs (id) on delete cascade,
  xp_awarded int not null default 0,
  is_rest_day boolean not null default false,
  unique (user_id, day, program_id)
);

create index daily_activity_user_id_idx on public.daily_activity (user_id);

create table public.xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  amount int not null,
  reason text not null,
  day date not null,
  created_at timestamptz not null default now()
);

create index xp_events_user_id_idx on public.xp_events (user_id);

create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  code text not null check (
    code in ('streak_7', 'streak_30', 'streak_100', 'streak_365', 'complete_80_solid')
  ),
  achieved_on date not null,
  unique (user_id, code)
);

create index milestones_user_id_idx on public.milestones (user_id);

create table public.user_stats (
  user_id uuid primary key references auth.users (id) on delete cascade,
  total_xp int not null default 0,
  level int not null default 1,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  last_practiced_day date
);

-- ============================================================
-- New-user trigger (SPEC.md section 7 and section 8)
-- ============================================================

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Row level security
-- ============================================================

alter table public.programs enable row level security;
alter table public.exercises enable row level security;
alter table public.drills enable row level security;
alter table public.profiles enable row level security;
alter table public.drill_stats enable row level security;
alter table public.sessions enable row level security;
alter table public.session_items enable row level security;
alter table public.daily_activity enable row level security;
alter table public.xp_events enable row level security;
alter table public.milestones enable row level security;
alter table public.user_stats enable row level security;

-- Catalog: select-only for authenticated users. No insert/update/delete
-- policy exists on these tables at all, so those operations are always
-- rejected once RLS is enabled -- writes happen only via migrations/seeds,
-- which run as the table owner and bypass RLS.
create policy "Authenticated users can read programs"
  on public.programs for select to authenticated using (true);

create policy "Authenticated users can read exercises"
  on public.exercises for select to authenticated using (true);

create policy "Authenticated users can read drills"
  on public.drills for select to authenticated using (true);

-- profiles: scoped to auth.uid() = id, per SPEC.md section 8.
create policy "Users can view own profile"
  on public.profiles for select to authenticated using (auth.uid() = id);
create policy "Users can insert own profile"
  on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "Users can update own profile"
  on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "Users can delete own profile"
  on public.profiles for delete to authenticated using (auth.uid() = id);

-- Remaining user tables: scoped to auth.uid() = user_id.
create policy "Users can view own drill_stats"
  on public.drill_stats for select to authenticated using (auth.uid() = user_id);
create policy "Users can insert own drill_stats"
  on public.drill_stats for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can update own drill_stats"
  on public.drill_stats for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own drill_stats"
  on public.drill_stats for delete to authenticated using (auth.uid() = user_id);

create policy "Users can view own sessions"
  on public.sessions for select to authenticated using (auth.uid() = user_id);
create policy "Users can insert own sessions"
  on public.sessions for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can update own sessions"
  on public.sessions for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own sessions"
  on public.sessions for delete to authenticated using (auth.uid() = user_id);

create policy "Users can view own session_items"
  on public.session_items for select to authenticated using (auth.uid() = user_id);
create policy "Users can insert own session_items"
  on public.session_items for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can update own session_items"
  on public.session_items for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own session_items"
  on public.session_items for delete to authenticated using (auth.uid() = user_id);

create policy "Users can view own daily_activity"
  on public.daily_activity for select to authenticated using (auth.uid() = user_id);
create policy "Users can insert own daily_activity"
  on public.daily_activity for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can update own daily_activity"
  on public.daily_activity for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own daily_activity"
  on public.daily_activity for delete to authenticated using (auth.uid() = user_id);

create policy "Users can view own xp_events"
  on public.xp_events for select to authenticated using (auth.uid() = user_id);
create policy "Users can insert own xp_events"
  on public.xp_events for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can update own xp_events"
  on public.xp_events for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own xp_events"
  on public.xp_events for delete to authenticated using (auth.uid() = user_id);

create policy "Users can view own milestones"
  on public.milestones for select to authenticated using (auth.uid() = user_id);
create policy "Users can insert own milestones"
  on public.milestones for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can update own milestones"
  on public.milestones for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own milestones"
  on public.milestones for delete to authenticated using (auth.uid() = user_id);

create policy "Users can view own user_stats"
  on public.user_stats for select to authenticated using (auth.uid() = user_id);
create policy "Users can insert own user_stats"
  on public.user_stats for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can update own user_stats"
  on public.user_stats for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own user_stats"
  on public.user_stats for delete to authenticated using (auth.uid() = user_id);
