-- Per-user, per-exercise metronome preferences (on/off, BPM, time
-- signature). Metronome is now paused by default at exercise launch and
-- can be toggled per exercise from ExerciseSetup, including exercises that
-- never used to have any metronome UI at all (exercises.uses_metronome is
-- catalog data shared by every user; this table is what actually decides
-- whether the metronome UI shows during practice, seeded from
-- uses_metronome but overridable per user from then on).
create table public.exercise_metronome_prefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  metronome_enabled boolean not null,
  bpm int not null,
  time_signature text not null,
  updated_at timestamptz not null default now(),
  unique (user_id, exercise_id)
);

alter table public.exercise_metronome_prefs enable row level security;

create policy "Users can view own exercise_metronome_prefs"
  on public.exercise_metronome_prefs for select to authenticated using (auth.uid() = user_id);
create policy "Users can insert own exercise_metronome_prefs"
  on public.exercise_metronome_prefs for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can update own exercise_metronome_prefs"
  on public.exercise_metronome_prefs for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own exercise_metronome_prefs"
  on public.exercise_metronome_prefs for delete to authenticated using (auth.uid() = user_id);

-- autoStartMetronome: true only for random-note-sequence's "Start test"
-- guided run, which starts the metronome itself as an integral part of its
-- own countdown -- distinct from, and unaffected by, the new
-- pause-until-Play default that now applies to every exercise's initial
-- launch (SPEC.md/CLAUDE.md: entering a drill never auto-starts anymore).
update public.exercises
set config = config || '{"autoStartMetronome": false}'::jsonb
where slug in ('free-recognition', 'single-note-metronome', 'two-alternating-notes');

update public.exercises
set config = config || '{"autoStartMetronome": true}'::jsonb
where slug = 'random-note-sequence';
