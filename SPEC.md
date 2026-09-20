# Woodshed — guitar practice tracker

The name comes from the jazz expression "woodshedding": going off alone to
work an instrument, patiently, for as long as it takes. That is the whole
premise of the app, so let it colour the copy: warm, plain-spoken, never
gamified in a shouty way.

Web app to track guitar practice over months and years.
Mobile first, fully usable on desktop. The entire UI is in English.

MULTI USER from day one. The first user is the author, but the app opens to
other players within weeks. Nothing may assume a single account: no hardcoded
user, no personal data in the catalog, no shortcut that works because there
happens to be one row. Treat row level security as a hard requirement rather
than hygiene.

Stack: Vite + React + TypeScript + Tailwind + Supabase, deployed on Vercel,
shipped as an installable PWA.

---

## 1. Core philosophy, read this before anything else

This app tracks an OPEN ENDED practice habit. Nothing is ever "completed",
nothing gets locked, there is no finish line. A tempo played well today goes
rusty in three weeks without maintenance, so the app measures RECENCY and
CONFIDENCE rather than completion. The single behavior it rewards is picking
up the guitar again tomorrow.

Respect this everywhere:

- No progress bars implying an end state on exercises
- No locked content, no prerequisites, no forced order
- Any drill is available at any time, including tempos already handled well
- Revisiting a lower tempo counts as good practice, never as regression
- In UI copy, prefer "practiced" over "completed" or "finished"

---

## 2. Structure

The app hosts PROGRAMS. Each program holds EXERCISES. An exercise runs at a
BPM and with a note POOL. The triplet (exercise, bpm, pool) is a DRILL, and
drills are the unit the app tracks.

More programs (triads, arpeggios, intervals) come later, so everything is data
driven from day one. Adding a program or an exercise means inserting rows,
plus at most a new exercise `mode` handler, with zero rewrite of the practice
engine.

### Catalog versus user data

Two clearly separated layers, and the distinction drives every RLS policy.

**Shared catalog**, identical for everyone, read only to users:
`programs`, `exercises`, `drills`. Authenticated users may select from these
tables and nothing more. Writes happen through migrations and seeds.

**User data**, private to its owner, never visible to anyone else:
`profiles`, `drill_stats`, `sessions`, `session_items`, `daily_activity`,
`xp_events`, `milestones`, `user_stats`. Every one of these carries a
`user_id`, every policy scopes to `auth.uid()`, and every query filters on the
current user even when RLS would already cover it. Defence in depth.

No user ever sees another user's practice data. Any future social feature will
be explicit and opt in.

---

## 3. Note pools

| Pool | Badge | Content |
|---|---|---|
| `naturals` | N | The 7 natural notes: A B C D E F G |
| `accidentals` | A | The 5 accidentals: A#/Bb C#/Db D#/Eb F#/Gb G#/Ab |
| `chromatic` | X | Notes drawn at random from all 12 |
| `complete` | C | All 12 notes, each appearing exactly once, in random order. Exercise 4 only. |

`naturals` is the default everywhere. The pool is chosen before the session
starts and holds for that session, since it defines which drill is being
practiced.

The app tracks NOTES only and never prescribes a fret range, because the
usable neck depends on the instrument. The player decides where to play each
note.

Accidentals always display both enharmonic spellings, for example "A# / Bb".

---

## 4. Program: Fretboard 101

Title: "Fretboard 101"
Subtitle: "Every note, everywhere"
Slug: `fretboard-101`

Title and subtitle live in separate columns so the program card renders them
on two lines, the title in the display face and the subtitle muted beneath it.

### Exercise 1 — Free recognition

No metronome. Pools: naturals, accidentals, chromatic.

For the drawn note, play it on each of the 6 strings, going up then down.
3 reps, then move to the next note.

### Exercise 2 — Single note with metronome

Pools: naturals, accidentals, chromatic. Tempo ladder applies.

Same as exercise 1, played to the metronome, one note per beat.

### Exercise 3 — Two alternating notes

Pools: naturals, accidentals, chromatic. Tempo ladder applies.

The app draws two notes from the pool. Play the first going up across the
6 strings, the second coming down, without stopping. A "Draw new pair" button
is always available.

Notes are dealt two at a time without replacement, the same lap/"shuffle
again" shape as the single-note exercises' queue, just consuming two notes
per draw instead of one: once the pool is exhausted, that's a lap, with the
same "shuffle again or end session" choice. Naturals (7 notes) and
accidentals (5) are odd, so one note is always left over when fewer than
two remain; that note is guaranteed to open the very next lap's first pair
rather than ever being skipped. Chromatic (12) divides evenly and never
needs this.

### Exercise 4 — Random note sequence

Pools: naturals, accidentals, chromatic, complete. Tempo ladder applies.

With naturals, accidentals or chromatic, the app draws a sequence of 7 notes
from the pool. With complete, the sequence is all 12 notes, each appearing
exactly once, in random order.

Play the first note going up across the 6 strings, the next coming down,
alternating through the whole sequence, without stopping. A "Draw new
sequence" button is always available.

A "Start test" button offers a second, guided way to play the same
sequence: "Ready?" on the beat right after pressing it, then a 3-2-1
countdown timed to the metronome (with the first note previewed small next
to "Ready?"/the countdown), then the screen shows one note at a time
(instead of the whole sequence at once) for six beats each, one beat per
string, with the next note shown small alongside the current one. The
countdown always lands the first note on the metronome's accented downbeat
("the 1"), regardless of the selected time signature. It stops
automatically after the last note and returns to the normal view. Starting
a test starts the metronome too if it wasn't already playing.

### Tempo ladder

40, 50, 60, 70, 80 BPM, applied to exercises 2, 3 and 4.

The metronome itself accepts any tempo from 30 to 240. Practicing off-ladder
is fine: for tracking purposes it maps to the nearest ladder rung, and the
session stores the actual BPM used.

### Drill count, use this as a build sanity check

| Exercise | Drills |
|---|---|
| 1 — 3 pools, no BPM | 3 |
| 2 — 3 pools × 5 BPM | 15 |
| 3 — 3 pools × 5 BPM | 15 |
| 4 — 4 pools × 5 BPM | 20 |
| **Total** | **53** |

### Reference milestone

Exercise 4, complete pool, 80 BPM, rated Solid. Celebrated once, ends nothing.

---

## 5. Freshness and confidence

### Freshness

PROGRAM level only. Individual exercises and drills carry no freshness state
of their own (see the Exercise picker in section 7). Only the whole program
(for example Fretboard 101) has a temperature, computed at read time from its
practice history. Never stored as a snapshot.

| State | Condition |
|---|---|
| Cold | Never practiced, or 14 or more days since anything in the program was last practiced |
| Cool | 7 to 13 days since anything in the program was last practiced |
| Cooling down | 3 to 6 days since anything in the program was last practiced |
| Warming up | Practiced today or yesterday, current streak of 1 to 2 consecutive days |
| Hot | Practiced today or yesterday, current streak of 3 or more consecutive days |

The streak counts any exercise, BPM, or pool inside the program as the same
practice. It is not tied to one specific drill: playing exercise 1 today,
exercise 3 tomorrow, and exercise 2 the day after keeps the same streak alive.

One missed day pauses the streak rather than breaking it (a small "paused"
mark shows next to the flame, and the state holds where it was). Missing a
second day in a row breaks the streak for real, and cooling begins. This
mirrors the app-wide streak's one-rest-day rule in section 6, so the two
systems agree with each other rather than each having their own logic.

Visually this reads as a single flame whose vividness scales continuously
through warming up, hot, cooling down, and cool, using the palette's warm
tones, never the cold blue-gray section 10 rules out elsewhere. Cold switches
to an actual snowflake shape instead of a dying ember, a deliberate break
from the flame metaphor, rendered in the same warm-neutral tones as the rest
of the palette rather than literal ice blue.

### Confidence

Self-reported at the end of each session with three buttons: "Rough", "OK",
"Solid", plus a skip option. Purely declarative, no verification. It drives
suggestions only, never gating.

### Tempo suggestion

After two consecutive Solid ratings on the same drill, show a discreet inline
prompt offering the next rung on the ladder. Dismissible, never blocking. The
user stays free to jump anywhere at any time.

---

## 6. XP, streak and levels

XP rewards CONSISTENCY ONLY. Reps, drills and confidence ratings grant zero
XP. The point is to pick up the guitar day after day, so that is the only
rewarded behavior.

### Validated day

A day counts as practiced as soon as the user starts a session on that
calendar day, in their local timezone. No timer, no minimum duration, no
verification. Trust the user. XP is awarded at that moment.

### XP formula

```
streak_multiplier = min(3.0, 1 + 0.1 * (current_streak_days - 1))
xp = round(100 * streak_multiplier)
```

Day 1 gives 100 XP, day 6 gives 150, day 11 gives 200, day 21 and beyond give
300.

### Streak with one rest day

Consecutive calendar days with a practiced day. One rest day per rolling
7 day window keeps the streak alive without granting XP.

Algorithm, run when a session starts:

```
let gap = days between today and last_practiced_day

if gap == 0: nothing changes, the day is already validated
if gap == 1: current_streak += 1
if gap >= 2:
    let missed = the gap - 1 calendar days with no practice
    count rest days already recorded in the 7 days preceding today
    if missed == 1 and that count == 0:
        record that missed day as is_rest_day
        current_streak += 1
    else:
        current_streak = 1

longest_streak = max(longest_streak, current_streak)
```

### Levels

Cumulative XP required for level n is `500 * n * (n - 1) / 2`.

Thresholds: 0, 500, 1500, 3000, 5000, 7500, 10500, 14000, and so on.

Show the current level, an XP bar toward the next one, and the XP remaining.

### Milestones

Full screen congratulation card, recorded once each: streak at 7, 30, 100 and
365 days, plus the reference milestone in section 4.

No badges, no avatar character, no leaderboard.

---

## 7. Screens

### Sign in / Sign up

Email and password via Supabase Auth, built for strangers rather than for one
known user:

- Sign up with email confirmation enabled
- Password reset by email, with a working reset page
- Clear, specific error states: wrong password, unknown email, unconfirmed
  address, rate limited
- A `profiles` row is created automatically on sign up, by database trigger
  rather than by client code, so an interrupted onboarding leaves no orphan
  account
- Onboarding after first sign up: first name, note notation preference,
  timezone captured from the browser, then a single screen explaining the
  philosophy from section 1 in two sentences, since new users arrive without
  any of this context
- Account deletion from the profile, removing every user-owned row

The landing page for signed out visitors explains in a few lines what the app
does, then offers sign up and sign in.

### Home

- First name, current level, XP bar toward the next level
- Current streak and best streak, prominently placed
- 8 week calendar heatmap of practiced days. This heatmap is PROGRAM level: a
  day is warm as soon as anything inside the program was practiced that day.
- "Due for review": up to three of the stalest drills already practiced at
  least once, each a one tap row showing exercise name, BPM, pool badge and
  relative date (plain text, no colored dot, since freshness no longer
  exists at the drill level, see section 5). Hide this block entirely when nothing
  has gone stale enough to surface.
- "Continue": resumes the last drill practiced
- Program cards with name, temperature indicator (section 5's flame/snowflake)
  and a "Practice" button

### Exercise picker

Rows are exercises. Expanding one reveals its BPM ladder, and each BPM row
reveals its available pools as a segmented control. Nothing is locked, and no
row carries any freshness indicator, since that only exists at the program
level now (section 5). This screen absorbs what a separate "Progress" screen used
to do; picking a drill to practice is the only job it needs to do well.

### Practice screen, the heart of the app

No fretboard diagram. Keep this screen radically simple.

**Top strip:** exercise name, active pool badge and BPM (for example
"Complete · 80 BPM"), and the note counter ("3 of 12").

**Center, the only thing that matters:**

- The target note in very large type, readable from one meter away, in the
  user's chosen notation, with the other notation in small muted text beneath
  it (for example a big "C" with "do" underneath)
- Exercise 3 shows both notes with an up arrow and a down arrow
- Exercise 4 lays its sequence out with alternating up and down arrows,
  wrapping to two rows in complete mode so 12 notes stay readable at arm's
  length
- Generous empty space around the note

**Rep counter:** 3 circles tapped manually, reset for each new note. No
automatic counting, no audio detection.

**Bottom dock, always thumb reachable:**

- Beat indicator: one dot per beat of the time signature, downbeat dot larger,
  current beat filled in accent color
- Large metronome play/pause button
- BPM control with -1 / +1 and -5 / +5, range 30 to 240
- Tap tempo
- Time signature selector: 4/4, 3/4, 2/4, 6/8, 5/4, 7/8
- Primary button "Next", which moves to the next note
- Secondary actions "Skip" (pushes the current note to the back of the queue)
  and "End session"

**Queue behavior:** the pool is shuffled at the start of every session. When
the queue runs out, show an inline state offering "Shuffle again" or "End
session", worded as a lap finished rather than an exercise completed. The
metronome keeps running throughout.

**On "End session":** confidence prompt (Rough / OK / Solid, skippable), then a
short summary showing notes covered, reps logged, session length, XP awarded
if it was the first session of the day, and the new streak.

**CRITICAL metronome behavior:** the metronome loops completely independently
of the exercise flow. Notes change only when the user taps "Next" (or the
prev/next arrows). The metronome keeps playing without interruption during
that change. It only ever runs while a drill is actively open, though:
reaching the end of the queue, the confidence prompt, or the summary all
stop it, since those aren't practicing anymore. Never auto-restarts on its
own after that; the player presses play again when they're ready. This
applies to every exercise, not just this one. The standalone metronome
reachable from the home screen is unaffected, since it isn't tied to any
exercise.

**Metronome implementation:** use the Web Audio API with a lookahead
scheduler, scheduling clicks about 100 ms ahead against
`audioContext.currentTime`, rather than `setInterval`, so timing stays stable.
Accent the first beat with a higher pitched click. Resume the AudioContext on
the first user gesture so iOS Safari behaves. Request a Wake Lock while a
session is open so the screen stays on, and release it on session end.

### Progress (dropped as a separate screen)

Removed in a design session with Robin, in favor of shipping a usable app
sooner rather than refining a screen nobody had tried yet. Its job of
choosing a drill is now covered entirely by the Exercise picker above, and
its freshness heatmap grid does not carry over now that freshness lives only
at the program level (section 5).

The three summary numbers this screen used to show (days practiced in the
last 30, total sessions, distinct drills touched) don't have a home for now.
Revisit once the core practice loop is actually in daily use and it's clear
whether they're missed.

### Profile

First name, last name, optional photo, note notation (English C D E F G A B or
French do ré mi fa sol la si), theme selector (dark / light / auto),
validation mode with "Manual" active by default and "Microphone detection"
visible but disabled with a "Coming soon" tag, metronome sound choice, and
timezone.

---

## 8. Supabase data model

```
profiles (id uuid PK -> auth.users, first_name, last_name, avatar_url,
  notation text default 'en', theme text default 'dark',
  validation_mode text default 'manual', metronome_sound text default 'click',
  timezone text, created_at)

programs (id, slug, title, subtitle, description, position int, created_at)

exercises (id, program_id, slug, position int, title, description,
  uses_metronome bool, mode text, available_pools text[], default_pool text,
  config jsonb, created_at)
  mode: 'single' | 'pair' | 'sequence'
  config: reps_target int, sequence_length int or null

drills (id, exercise_id, bpm int null, pool text)
  seeded as the cross product of each exercise's available_pools and its BPM
  ladder. Exercise 1 rows carry bpm null.

drill_stats (id, user_id, drill_id, first_practiced_on date,
  last_practiced_on date, session_count int default 0,
  total_reps int default 0, last_confidence text,
  consecutive_solid int default 0, updated_at)
  unique constraint on (user_id, drill_id)
  Freshness is derived at read time from last_practiced_on, never stored.

sessions (id, user_id, drill_id, started_at, ended_at, time_signature,
  actual_bpm int, notes_done int, reps_done int, confidence text)

session_items (id, session_id, note text, position int, reps_done int)

daily_activity (id, user_id, day date, program_id, xp_awarded int default 0,
  is_rest_day bool default false)
  unique constraint on (user_id, day, program_id)

xp_events (id, user_id, amount int, reason text, day date, created_at)

milestones (id, user_id, code text, achieved_on date)
  unique constraint on (user_id, code)
  codes: streak_7, streak_30, streak_100, streak_365, complete_80_solid

user_stats (user_id PK, total_xp int, level int, current_streak int,
  longest_streak int, last_practiced_day date)
```

### Security requirements

- RLS enabled on every table without exception, including the catalog ones
- Catalog tables (`programs`, `exercises`, `drills`): a select policy for
  authenticated users, and no insert, update or delete policy at all
- User tables: select, insert, update and delete policies each scoped to
  `auth.uid() = user_id`. For `profiles`, scope to `auth.uid() = id`.
- A database trigger on `auth.users` insert creates the matching `profiles`
  row, running as security definer
- Write an SQL test script that signs in as two different users and asserts
  that neither can read or write the other's rows. Run it before deploying.
- The anon key is public by design and safe in the client bundle. The service
  role key never appears in client code, in the repo, or in any Vercel
  environment variable exposed to the browser.

Write a seed script inserting the "Fretboard 101" program, its 4
exercises with their pools and config, and all 53 drills. The seed touches
catalog tables only, never user data.

---

## 9. Extensibility, important

The practice engine reads the exercise row and behaves according to its `mode`
field, with no per exercise hardcoded logic. Adding a future exercise must come
down to inserting a row with the right config and pools, and at most adding a
new `mode` handler. Structure components and state so that holds.

Planned for later, so leave room without building them now: a "Reference" tab
with an interactive fretboard diagram and theory notes, microphone based note
detection, and an optional reminder encouraging full neck coverage rather than
staying in first position.

Possible once other players join, none of it built now, but keep the data
model compatible: opt in shared streaks between friends, a teacher view over a
student's practice history, and user-authored programs. The constraint that
follows today: keep every table keyed on `user_id` and avoid any assumption
that a program belongs to nobody in particular.

---

## 10. Visual direction

Two themes, dark by default, with a toggle in the profile and an "auto" option
following the system setting. Every color comes from CSS variables so both
themes stay in sync.

### Palette, dark theme

```
background     #14120F   warm near black
surface        #1C1914
elevated       #221E19
border         #332E27
text primary   #F5F1EA
text secondary #A39B8E
text muted     #7C746A
accent         #F0A93B   amber
success        #6FAF96   muted sage
success bg     #1E3229
```

### Palette, light theme

```
background     #FAF7F2   warm paper
surface        #FFFFFF
border         #E8E1D6
text primary   #1A1815
text secondary #6B6459
text muted     #8A8073
accent         #C77A14   deepened amber for contrast on light
accent bg      #FBE9CC
success        #2F6B55
success bg     #DDEDE5
neutral fill   #EFE9DE
```

### Color semantics, strictly enforced

| Color | Meaning |
|---|---|
| amber | The drill being practiced right now, and "due for review" |
| flame tone (new, not chosen yet) | Program temperature only (section 5): full intensity at Hot, fading through Warming up and Cooling down |
| neutral fill | Cool, and Cold (Cold shows as a snowflake shape instead of a faint flame) |

Amber stays reserved and rare, exactly as before. The program-level flame
deliberately does not reuse amber, so "here, now" keeps its one meaning
instead of also standing for "this program is hot." That means a new warm
tone is needed for the flame itself, distinct from amber, picked when this
actually gets built (Phase 7) rather than guessed now. Sage no longer
represents freshness, since freshness only exists at the program level;
it stays free for other uses later (confidence ratings, for example) if
wanted.

### Typography, loaded from Google Fonts

| Role | Family |
|---|---|
| Display | "Instrument Serif" for the giant target note, 72 to 96px |
| UI | "Instrument Sans", weights 400 and 500, for everything else |
| Numerals | "JetBrains Mono" for BPM, XP, streak count and the heatmap grid, with tabular figures so numbers stay put when they change |

### Layout rules

- Warm neutrals only. Avoid the cold blue-gray default look.
- Flat surfaces. No gradients, no glow, no drop shadows beyond a hairline
  border.
- Border radius 12px on cards, 8px on controls, fully round on the metronome
  button and the rep circles.
- Practice screen splits into three bands: a thin context strip on top, the
  note centered in generous empty space, a control dock at the bottom.
- Every frequent action sits in the bottom third, reachable with a thumb.
  Minimum tap target 44px.
- The beat indicator changes brightness only. No motion that pulls the eye
  away from the note.
- Transitions stay subtle, around 150ms, nothing bouncy.
- Desktop reuses the same layout centered in a 480px column.

---

## 11. Progressive web app

Ship this as an installable PWA so it lives on the home screen.

- Web app manifest: standalone display mode, portrait orientation, app name
  "Woodshed", short name "Woodshed", theme color `#14120F`, background color
  `#14120F`, and a full icon set including 192px, 512px and an iOS 180px
  apple-touch-icon
- Service worker caching the app shell so it opens instantly and keeps working
  without a connection. Practice sessions queue locally and sync to Supabase
  once the connection returns.
- Respect the iOS safe areas: `viewport-fit=cover` plus `env(safe-area-inset-*)`
  padding, so the bottom dock stays clear of the home indicator
- Keep the Supabase session persistent so signing in happens once
- Wake Lock API during a session, released on session end
- Prepare for daily practice reminders through the Notifications API, behind
  an opt-in toggle in the profile. Ship the toggle disabled with a
  "Coming soon" tag for now.

---

## 12. Build order

1. Supabase schema, RLS policies and the seed script
2. Auth, profile and theme system with both palettes wired to CSS variables
3. The metronome as a standalone, reliable component: lookahead scheduler,
   BPM stepper, tap tempo, time signatures, beat indicator
4. The practice screen around that metronome, for exercise 2 first
5. The other three exercise modes on the same engine
6. Session persistence, drill_stats updates, streak and XP logic
7. Home (including the program-level flame/snowflake from section 5) and
   the exercise picker
8. Milestone cards and the tempo suggestion prompt
9. PWA manifest, service worker, icons
10. Deploy to Vercel
