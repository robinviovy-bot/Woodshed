-- Woodshed catalog seed: "Fretboard 101" (SPEC.md section 4).
-- Touches catalog tables only (programs, exercises, drills), never user data.
-- Safe to re-run: every insert is keyed on a unique slug/relationship, so
-- re-running this script is a no-op rather than a duplicate.

insert into public.programs (slug, title, subtitle, description, position)
values (
  'fretboard-101',
  'Fretboard 101',
  'Every note, everywhere',
  'Learn to find every note, on every string, anywhere on the neck.',
  1
)
on conflict (slug) do nothing;

-- config.reps_target is 3 for every exercise (SPEC.md section 7: "Rep
-- counter: 3 circles tapped manually, reset for each new note").
-- config.sequence_length is 7 for exercise 4's naturals/accidentals/
-- chromatic pools; the complete pool always uses all 12 notes instead,
-- which the practice engine special-cases rather than reading from config
-- (SPEC.md section 4: "With complete, the sequence is all 12 notes").
-- config.autoStartMetronome is true only for exercise 4, whose "Start
-- test" run starts the metronome itself as part of its own countdown --
-- unrelated to, and not overridden by, the pause-until-Play default every
-- exercise's practicing screen otherwise launches with.
insert into public.exercises (
  program_id, slug, position, title, description, uses_metronome, mode,
  available_pools, default_pool, config
)
select
  p.id, x.slug, x.position, x.title, x.description, x.uses_metronome, x.mode,
  x.available_pools, 'naturals', x.config
from public.programs p
cross join (
  values
    (
      'free-recognition', 1, 'Free recognition',
      'No metronome. Play the drawn note on each of the 6 strings, going up then down. 3 reps, then move to the next note.',
      false, 'single',
      array['naturals', 'accidentals', 'chromatic'],
      '{"reps_target": 3, "sequence_length": null, "autoStartMetronome": false}'::jsonb
    ),
    (
      'single-note-metronome', 2, 'Single note with metronome',
      'Same as free recognition, played to the metronome, one note per beat.',
      true, 'single',
      array['naturals', 'accidentals', 'chromatic'],
      '{"reps_target": 3, "sequence_length": null, "autoStartMetronome": false}'::jsonb
    ),
    (
      'two-alternating-notes', 3, 'Two alternating notes',
      'Play the first drawn note going up across the 6 strings, the second coming down, without stopping.',
      true, 'pair',
      array['naturals', 'accidentals', 'chromatic'],
      '{"reps_target": 3, "sequence_length": null, "autoStartMetronome": false}'::jsonb
    ),
    (
      'random-note-sequence', 4, 'Random note sequence',
      'Play a drawn sequence of notes, alternating up and down across the 6 strings, without stopping.',
      true, 'sequence',
      array['naturals', 'accidentals', 'chromatic', 'complete'],
      '{"reps_target": 3, "sequence_length": 7, "autoStartMetronome": true}'::jsonb
    )
) as x (slug, position, title, description, uses_metronome, mode, available_pools, config)
where p.slug = 'fretboard-101'
on conflict (program_id, slug) do nothing;

-- Exercise 1: one drill per pool, no BPM (3 drills).
insert into public.drills (exercise_id, bpm, pool)
select e.id, null, pool
from public.exercises e
cross join unnest(e.available_pools) as pool
where e.slug = 'free-recognition'
on conflict (exercise_id, bpm, pool) do nothing;

-- Exercises 2-4: full tempo ladder x each exercise's pools
-- (15 + 15 + 20 = 50 drills; 53 total with exercise 1).
insert into public.drills (exercise_id, bpm, pool)
select e.id, bpm, pool
from public.exercises e
cross join unnest(array[40, 50, 60, 70, 80]) as bpm
cross join unnest(e.available_pools) as pool
where e.slug in ('single-note-metronome', 'two-alternating-notes', 'random-note-sequence')
on conflict (exercise_id, bpm, pool) do nothing;
