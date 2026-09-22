# CLAUDE.md — Woodshed

Read `SPEC.md` in full before making product decisions. This file is the
working-session map: philosophy to hold onto, hard constraints, where code
lives, and what's already built. It does not restate SPEC.md — when in
doubt, SPEC.md wins.

## 1. Core philosophy — do not lose this

Woodshed tracks an OPEN ENDED practice habit. Nothing is ever "completed",
nothing is locked, there is no finish line. The app measures RECENCY and
CONFIDENCE, not completion, because a tempo played well today goes rusty in
three weeks without upkeep. The one behavior it rewards is picking up the
guitar again tomorrow.

Concretely, this rules out:

- Progress bars implying an end state on exercises
- Locked content, prerequisites, or forced order
- Treating a lower tempo revisit as regression
- UI copy that says "completed" or "finished" instead of "practiced"

Every screen, every bit of copy, every new feature gets checked against this
before anything else. If a design choice would make the app feel like a
checklist to clear, it's wrong regardless of how convenient it is to build.

## 2. Multi-user and RLS — hard constraints, not hygiene

This app has real users beyond the author within weeks. Nothing may assume a
single account.

- **Shared catalog** (`programs`, `exercises`, `drills`): identical for
  everyone, read-only to authenticated users, written only by migrations and
  seeds. No insert/update/delete policy exists on these tables at all.
- **User data** (`profiles`, `drill_stats`, `sessions`, `session_items`,
  `daily_activity`, `xp_events`, `milestones`, `user_stats`): every table
  carries `user_id`, every RLS policy scopes to `auth.uid()`, and every
  client query filters on the current user explicitly even though RLS
  already covers it. Defence in depth is required, not optional.
- RLS is enabled on **every** table without exception, including the
  catalog ones (catalog tables just get a select-only policy).
- Never write a query, a component, or a migration that only works because
  there happens to be one row or one account today. If you catch yourself
  doing that, stop and fix it properly instead.
- Whenever a policy changes, re-run the RLS test script (see section 8 below)
  before considering the change done.
- `session_items` carries a `user_id` column even though SPEC.md section 8's
  literal schema line for it omits one -- added deliberately so the
  defence-in-depth filtering section 2 asks for doesn't require a join
  through `sessions` on every query. Flagged for Robin when it was added;
  revisit if that decision should change.

## 3. Folder structure

```
src/
  app/            Root app wiring: router.tsx (route table), App.tsx composes
                  providers + router. Not screens themselves.
  auth/           AuthProvider (session + profile context, split context/
                  hook/provider into separate files like theme/ does) and
                  three route guards: RequireAuth (redirects signed-out
                  visitors to /sign-in), RequireGuest (redirects signed-in
                  users away from landing/sign-in/sign-up/forgot-password),
                  RequireOnboarded (redirects to /onboarding when
                  profile.first_name is still null -- wrap INSIDE
                  RequireAuth, never the reverse).
  pages/          Route-level screens (one per route): Landing, SignUp,
                  SignIn, ForgotPassword, ResetPassword, Onboarding, Profile,
                  Home, Metronome, Practice, ExercisePicker, Calendar (Phase
                  7, the month-by-month practiced-days view opened from
                  Home's streak badge). No Progress
                  screen -- dropped entirely in the freshness redesign (see
                  the design-session note below); the exercise picker
                  absorbed its job.
  components/     Small, reusable UI pieces used by more than one page
                  (Button, TextField, AuthLayout, Section, SegmentedControl,
                  PoolBadge, ComingSoonBadge, LoadingScreen, ...).
                  MetronomeIcon and FreshnessIcon (Phase 6) are hand-drawn
                  SVGs rather than an icon library dependency, both keyed
                  to `currentColor`/CSS variables so they follow the theme.
  engine/         The generic practice engine (mode handlers for
                  'single' | 'pair' | 'sequence', metronome, session state).
                  Reads exercise config; never branches on a specific
                  exercise or program by name. See section 9 of SPEC.md.
                  metronome/ (Phase 3): useMetronome is the lookahead
                  scheduler (Web Audio, not setInterval, for timing
                  stability); BeatIndicator, PlayPauseButton, BpmStepper,
                  TapTempoButton are its UI pieces, kept separate rather than
                  one bundled component since Phase 4's practice screen will
                  interleave them with other controls, not drop in a single
                  block. sound.ts synthesizes both "click" and "beep" with
                  oscillators, nothing sample-based to load.
                  practice/ (Phases 4-5): notes.ts is the shared pitch-class
                  <-> EN/FR naming module every mode uses. One hook per
                  mode -- useSingleNotePractice (exercises 1-2),
                  usePairPractice (exercise 3), useSequencePractice
                  (exercise 4) -- each owning its own queue/lap logic, not a
                  shared generic interface, since the three modes' shapes
                  differ too much to force one (a pair is two notes with
                  directions, a sequence is a list, a single is one note
                  with history). Practice.tsx (in pages/) is a thin
                  dispatcher on exercise.mode to *ModeScreen.tsx here, which
                  is where "adding an exercise means inserting a row plus at
                  most a new mode handler" (SPEC.md section 9) actually
                  lives. ExerciseSetup, SessionSummary, BackButton are
                  shared across all three mode screens.
  theme/          ThemeProvider + useTheme + the shared context (split into
                  separate files so Fast Refresh / oxlint stay happy about
                  component-only exports), plus ThemeSync (adopts
                  profile.theme once a profile loads; doesn't fight with
                  Profile.tsx's own theme switcher -- see that file's
                  comment for why). Applies the `data-theme` attribute the
                  CSS tokens in styles/index.css key off of.
  lib/            Thin wrappers around external services: supabase.ts,
                  authErrors.ts (maps Supabase auth errors to the copy
                  SPEC.md section 7 asks for). Phase 6 added dates.ts
                  (getLocalDay/daysBetween/shiftDay, the calendar-day math
                  shared by both of the below), sessions.ts (the write
                  path -- startSession/endSession, SPEC.md section 6's
                  streak-with-one-rest-day algorithm and XP formula), and
                  freshness.ts (the read path -- computeFreshness, SPEC.md
                  section 5's Cold/Cool/Cooling down/Warming up/Hot table).
                  Not lib code but tied to it: engine/practice/
                  usePracticeSession.ts is what the three mode screens
                  actually call (begin() on Start, finish() on End
                  session), so persistence isn't reimplemented per mode.
  styles/         index.css: Tailwind import + CSS custom property tokens
                  for both themes.
  types/          Shared TypeScript types. database.ts holds row shapes for
                  every table in the Phase 1 schema (snake_case, matching
                  columns 1:1, no mapping layer) plus the Pool/ExerciseMode/
                  Confidence/MilestoneCode unions -- import Pool from here
                  rather than redeclaring it (PoolBadge does this).
supabase/
  migrations/     Hand-written SQL migrations. No Supabase CLI in use yet --
                  applied by pasting into the Supabase dashboard's SQL
                  Editor. 20260920000000_initial_schema.sql is the full
                  schema, RLS policies, and the new-user trigger from
                  SPEC.md section 8. 20260921000000_avatars_storage.sql adds
                  the public "avatars" Storage bucket + RLS policies scoped
                  to each user's own {user_id}/ folder (Profile.tsx's photo
                  upload).
  seed.sql        Fretboard 101: the program, its 4 exercises, and all 53
                  drills, generated by cross product (pools x BPM ladder)
                  rather than hand-enumerated. Re-running it is a no-op
                  (every insert is ON CONFLICT DO NOTHING).
  tests/
    rls_test.sql  The RLS test script SPEC.md section 8 requires. Run it
                  after any policy change -- see the file's header comment
                  for the copy/paste workflow (it needs two real test users
                  created via the dashboard first).
```

Rule of thumb: if a component only makes sense on one screen, it lives next
to that screen (or inline in the page file) rather than in `components/`.
Anything reused, or that other pages will plausibly need, goes in
`components/`.

## 4. Naming conventions

- Component and page files: `PascalCase.tsx`, one component per file, named
  exports (`export function Button(...)`), not default exports.
- Non-component modules (`lib/`, `engine/` logic): `camelCase.ts`.
- Path alias `@/` maps to `./src/` — use it instead of relative `../../`
  chains.
- CSS custom properties live under `--color-*`, `--font-*`, `--radius-*` in
  `src/styles/index.css`. Names were chosen to avoid Tailwind utility-class
  stutter: SPEC.md's "text primary" is `--color-ink` (not
  `--color-text-primary`, which would generate `text-text-primary`);
  SPEC.md's "border" is `--color-line` (avoids `border-border`). The mapping
  from spec wording to variable name is commented directly above each
  declaration in that file — check there before assuming a name.
  `--color-danger` is not in SPEC.md's palette at all (added in Phase 2 for
  form errors and the account-deletion confirmation, so error text doesn't
  have to repurpose `--color-accent`, which section 10 reserves for
  "here, now"). Flagged for Robin alongside the Phase 0 palette gaps.
  `--color-flame` fills in section 10's "flame tone (new, not chosen yet)"
  (added in Phase 6 once the freshness icon needed an actual color):
  deliberately redder/warmer than `--color-accent` so program temperature
  and "here, now" stay visually distinct per section 10's color semantics
  table.
- Tailwind v4 has no `tailwind.config.js`; theme values are declared in the
  `@theme` block of `src/styles/index.css` and Tailwind derives utilities
  from them automatically (e.g. `--color-accent` → `bg-accent`,
  `text-accent`, `border-accent`).
- `Pool`, `ExerciseMode`, `Confidence`, and `MilestoneCode` are string union
  types in `types/database.ts` — import from there, don't redeclare
  (`components/PoolBadge.tsx` does this correctly). There is no `Freshness`
  type anymore: freshness was reworked to a program-level hot/cold scale
  (SPEC.md section 5) and `components/FreshnessDot.tsx` was deleted as dead
  code in Phase 3 once its only caller (the retired `DesignPreview`) was
  gone. The program-level temperature indicator gets built in Phase 7.

## 5. Commands (PowerShell)

```powershell
npm run dev      # start the local dev server (Vite)
npm run build    # type-check (tsc -b) then production build
npm run lint     # oxlint — this template uses oxlint, not eslint
npm run preview  # serve the production build locally
```

Deploy: the Vercel project (created in Phase 10, see the build-order log)
is connected to the GitHub repo, so pushing to `main` triggers a deploy
automatically — there is no separate manual deploy command in normal use.
`npx vercel` is only for one-off preview deploys outside that flow. Live
at https://woodshed-liard.vercel.app.

## 6. Environment variables

`.env.local` holds `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` and is
git-ignored (covered by the `*.local` rule). `.env.local.example` is the
committed template. The `VITE_` prefix means both values end up in the
client bundle — that's expected and safe for the anon key, which is public
by design (RLS is what actually protects data). The service role key must
never get a `VITE_` prefix, never appear in client code, and never enter
this repo or a Vercel env var exposed to the browser.

## 7. Working style reminders

- One phase at a time, following SPEC.md section 12's build order. Don't
  jump ahead to later phases even if it looks convenient.
- Commit at the end of each phase with a clear message.
- Keep components small; keep the practice engine generic (SPEC.md section
  9) — adding an exercise should mean inserting rows plus at most a new
  `mode` handler, never a rewrite.
- Ask rather than silently deciding when a choice affects how the app feels.
- No em dashes in any user-facing app copy (UI text, error messages, etc.).
  Robin finds them an AI tell. Use a period or comma instead. This does not
  apply to code comments or this file.
- Flag ambiguity or contradictions in SPEC.md instead of guessing past them.

## 8. Build-order log

Tracks SPEC.md section 12. Update this after finishing each phase.

- [x] **Phase 0 — Groundwork** (this session): Vite + React + TS scaffold;
  Tailwind v4 (via `@tailwindcss/vite`, no config file); React Router with a
  placeholder single-route table; Supabase JS client wrapper
  (`src/lib/supabase.ts`, unused until Phase 1); path alias `@/`; design
  tokens for both themes as CSS variables wired through Tailwind's `@theme`;
  Google Fonts (Instrument Serif, Instrument Sans, JetBrains Mono) loaded via
  `index.html`; throwaway `/` route rendering `DesignPreview` with a live
  theme switcher; git initialized and pushed to GitHub; `.env.local`
  scaffolded with placeholders.
  - Flagged for Robin: SPEC.md section 10 only lists "accent bg" and
    "neutral fill" values for the *light* theme. Dark-theme values for
    `--color-accent-tint` and `--color-neutral-fill` were invented
    (`#3a2b12`, and reusing the border color, respectively) — worth a look
    on the design preview page and an explicit decision rather than
    inheriting a guess.
- [x] **Phase 1 — Supabase schema, RLS, seed, RLS test**: migration applied
  (`supabase/migrations/20260920000000_initial_schema.sql`, run via the SQL
  Editor — no Supabase CLI in use yet); seed applied
  (`supabase/seed.sql` — confirmed 1 program, 4 exercises, 53 drills);
  TypeScript row types added (`src/types/database.ts`); RLS test script
  (`supabase/tests/rls_test.sql`) run against two fixture users
  (rls-test-a/b@example.com) — all 8 blocks PASS, including user B being
  correctly blocked from reading/updating/deleting user A's rows and from
  writing to the catalog. Test fixture rows cleaned up; the two fixture
  auth users were left in place so this script stays ready to re-run
  whenever a policy changes.
  - Flagged for Robin: SPEC.md section 2 says every user-data table
    "carries a `user_id`," but section 8's literal schema line for
    `session_items` doesn't list one. Resolved by adding `user_id` to
    `session_items` anyway (see section 2 above) — revisit if you'd rather
    scope its policies via a join through `sessions` instead.
- [x] **Phase 2 — Auth, profile, theme system**: `DesignPreview.tsx`
  retired. Built: Landing, SignUp, SignIn (with distinct error copy for
  unconfirmed-email and rate-limited, generic "incorrect email or password"
  for wrong-password/unknown-email — see the flag below), ForgotPassword,
  ResetPassword (handles the emailed recovery link), Onboarding (name +
  notation, timezone auto-captured via `Intl.DateTimeFormat`, then the
  section-1 philosophy screen), and Profile (photo upload to Supabase
  Storage, details, theme switcher that saves instantly, validation mode
  display, metronome sound preference, notifications toggle disabled with
  "Coming soon," account deletion). `AuthProvider` holds session + profile
  in context; `ThemeSync` adopts `profile.theme` on load. Manually verified
  end-to-end against a fixture account (sign in → onboarding → profile
  edits → theme persists to DB → sign out → wrong-password error) via
  browser automation. Not yet verified: the real sign-up + email
  confirmation path, since that needs Robin's own inbox — try creating a
  real account next.
  - Flagged for Robin: SPEC.md section 7 asks for distinct "wrong password"
    vs "unknown email" error states, but Supabase's signInWithPassword
    deliberately returns the same generic error for both (prevents account
    enumeration). Kept the generic message rather than working around a
    deliberate security control.
  - Flagged for Robin: full account deletion only removes user-owned data
    rows, not the `auth.users` row itself — that needs a service-role Edge
    Function (out of scope for this phase). The account technically still
    exists after "Delete account," just empty and signed out.
  - Flagged for Robin: SPEC.md's Profile screen doesn't specify what
    metronome sound options should exist beyond the `'click'` default.
    Added a placeholder "Click"/"Beep" choice — the DB column just stores a
    string, and Phase 3's actual Web Audio metronome will decide what these
    mean (or whether more options make sense).
- **Design session (2026-09-20, before Phase 3): freshness reworked to
  program-level hot/cold.** Documentation only, nothing implemented yet.
  SPEC.md sections 5 and 7 were rewritten in place to reflect this (read
  those directly rather than this summary):
  - Freshness now exists only at the program level (Cold, Cool, Cooling
    down, Warming up, Hot), driven by a streak that counts any practice
    inside the program, not one specific drill. One missed day pauses the
    streak (small "paused" mark), a second missed day breaks it.
    Individual exercises/drills carry no freshness state at all anymore.
  - The Progress screen (the old exercise x BPM heatmap grid) is dropped
    entirely. The Exercise picker absorbs its job; picking a drill to
    practice is now its only responsibility.
  - Visual: one flame shape whose vividness scales through the four warm
    states, using a new warm tone that is deliberately NOT amber (keeps
    amber's "here, now" meaning from getting diluted). Cold switches to an
    actual snowflake shape, kept in warm-neutral tones, not literal blue.
  - Implementation notes for whenever this becomes real (Phase 6 or 7):
    the existing `daily_activity` table (already keyed on user_id, day,
    program_id, with an `is_rest_day` flag) looks like the right place to
    compute the per-program streak from at read time, but its `is_rest_day`
    today reflects the single app-wide streak from section 6, not a
    per-program one. Once a second program exists this needs its own
    per-program rest-day semantics, not a shared flag. Work this out
    properly at implementation time rather than guessing now.
  - Explicitly deprioritized per Robin: getting the practice loop usable
    matters more right now than refining a screen nobody has tried yet.
    Don't revisit this further until Phase 7.
- [x] **Phase 3 — Metronome**: `src/engine/metronome/` holds `useMetronome`
  (Web Audio lookahead scheduler, schedules ~100ms ahead of
  `audioContext.currentTime`, a 25ms `setInterval` only decides when to
  schedule more, never triggers sound directly) plus its UI pieces
  (`BeatIndicator`, `PlayPauseButton`, `BpmStepper`, `TapTempoButton`) and
  `sound.ts` (oscillator-synthesized "click"/"beep", resolving the Phase 2
  flag about what those options mean). `SegmentedControl` extracted from
  `Profile.tsx` into `components/` since the time signature picker needed
  the same pattern (now supports a `wrap` mode for more than a couple of
  options). Verified: play/pause, all 6 time signatures (beat indicator dot
  count updates correctly), BPM stepper and tap tempo both apply live
  without interrupting playback, sound switching same. Also deleted
  `FreshnessDot.tsx` as dead code (see section 4 above). Also added a BPM
  slider (`BpmStepper.tsx`) alongside the stepper buttons per Robin's
  request, native `<input type="range">` with `accentColor` rather than a
  custom-built slider.
  - **Small pull-forward from Phase 7, per Robin:** a real (not throwaway)
    `Home` page now exists at `/home`, the new default landing spot after
    sign-in/onboarding (replacing `/profile`). It lists Fretboard 101's
    exercises read from Supabase (real data, not hardcoded) and a
    permanent "Open metronome" shortcut. The metronome itself moved from
    the temporary `/dev/metronome` to a permanent `/metronome` route
    (`MetronomeTest.tsx` renamed to `Metronome.tsx`). Exercise rows show
    "Coming soon" rather than a dead or fake link, since Phase 4/5 haven't
    built anywhere for them to go yet, Robin's explicit call over having
    them open the metronome as a stand-in. Once exercise 2's practice
    screen exists (this session's next step), wire its row here; leave the
    rest "Coming soon" until Phase 5.
  - Not built yet, deliberately: Wake Lock. SPEC.md ties it to "while a
    session is open," and there's no session concept until Phase 4. Add it
    there, not here.
- [x] **Phase 4 — Practice screen (exercise 2)**: `src/engine/practice/`
  holds `notes.ts` (pitch classes 0-11, EN/FR display, dual enharmonic
  spelling for accidentals per SPEC.md section 3) and
  `useSingleNotePractice` (the mode: 'single' handler used by exercises 1
  and 2 -- naturals/accidentals are a shuffled finite queue consumed via
  `next()`, matching section 7's "shuffle again when it runs out"; chromatic
  draws independently at random each time per section 3's literal wording,
  so it never reaches a "lap finished" state). `Practice.tsx` fetches the
  exercise by slug from Supabase and drives setup -> practicing ->
  confidence -> summary. Home's "Single note with metronome" row now links
  to `/practice/single-note-metronome`; the other three exercises stay
  "Coming soon" until Phase 5 gives 'pair'/'sequence' their own handlers.
  Verified end-to-end: pool selection, note advancement with the rep
  counter resetting each time, the metronome running uninterrupted through
  every note change and into the "lap finished" state (the critical
  requirement from section 7), confidence prompt, and a summary with
  correct counts.
  - **No persistence at all yet, deliberately.** Notes covered/reps/session
    length in the summary are computed purely in memory and discarded on
    "Done" -- nothing is written to `sessions`, `session_items`,
    `drill_stats`, `xp_events`, or `user_stats`. That's Phase 6's job
    exactly per the build order; don't be surprised the numbers vanish on
    reload until then.
  - Not built yet, deliberately: Wake Lock (still Phase 4's own SPEC.md
    line, but sequenced after this core loop landed -- add it once a
    session's lifecycle is meaningful, i.e. alongside Phase 6's real
    persistence, since right now a "session" is just component state that
    vanishes on navigation anyway).
  - **Revised after Robin tried it (same session):** the original bottom
    dock (Skip + Next buttons, always-expanded 6-option time signature
    row, small "End session" text link) got simplified. `NoteNavigator`
    puts prev/next arrows directly beside the note instead of the dock;
    `useSingleNotePractice` reworked from a one-way queue to a
    `history`/`historyIndex` model so previous() can step back through
    notes already shown without re-drawing or double-counting them (next()
    only draws a genuinely new note once you're back at the leading edge).
    `queuePosition` is now derived from where you're actually looking
    (`historyIndex - lapStartIndex + 1`), not a one-way "how many drawn"
    counter, since those diverge as soon as you go back. Skip (push to
    back of queue) is gone entirely, replaced by plain back/forward
    history browsing. `TimeSignaturePicker` (new,
    `engine/metronome/`) collapses to just the current value until tapped,
    used in both `Practice.tsx` and `Metronome.tsx` for consistency. The
    top-strip back-arrow button now does what "End session" used to.
  - **Also removed after Robin tried it:** the tap-to-fill rep counter
    (`RepCounter.tsx`, deleted). A manually-tapped tally that nothing
    verifies didn't add anything real, so it's now a plain instruction
    ("Play it {reps_target} times", reading the exercise's actual config
    value rather than a hardcoded "3"). `useSingleNotePractice` no longer
    tracks reps at all. The summary's "reps logged" is now derived
    (`notesCovered * config.reps_target`) instead of tallied, trusting the
    instruction was followed, same unverified spirit as the confidence
    rating right above it.
  - **Reversed a "CRITICAL" spec line, per Robin:** SPEC.md's practice
    screen used to say the metronome "keeps playing... across the end of
    the queue." It now does the opposite on purpose: the metronome only
    ever runs while a drill is actively open, and stops itself (never
    auto-restarts) the moment you hit lap-finished, the confidence prompt,
    or the summary. SPEC.md's wording was updated to match rather than
    left contradicting the code. Implemented as a `useEffect` in
    `Practice.tsx` watching `screenPhase`/`practice.phase`, calling the
    now-exposed `metronome.stop()`. Applies to every exercise mode, not
    just this one; the standalone `/metronome` tool is unaffected since
    it's not tied to a drill. Verified: played through a full lap with the
    metronome running, confirmed it stopped at lap-finished and did not
    resume on its own after "Shuffle again."
- [x] **Phase 5 — Remaining exercise modes (1, 3, 4)**: `Practice.tsx`
  became a thin dispatcher on `exercise.mode`; exercise-specific logic
  moved into `SingleModeScreen`/`PairModeScreen`/`SequenceModeScreen`
  under `engine/practice/` (see the folder-structure note above for why
  each mode gets its own hook rather than a shared interface). Exercise 1
  (free recognition) just reuses `useSingleNotePractice` with
  `uses_metronome: false`, no new code needed beyond wiring it up. Home no
  longer gates any exercise behind "Coming soon" -- all 4 are real now.
  - **Exercise 3 (pair) redesigned mid-build, per Robin:** originally built
    as always-fresh random draws (matching a literal reading of "Draw new
    pair... always available"), then reworked to the queue-exhaustion/lap
    model once Robin clarified the intent: draw two notes at a time
    without replacement until the pool runs out, exactly like the
    single-note exercises' lap mechanic. Naturals (7) and accidentals (5)
    are odd, so the leftover note carries into the next lap's first pair
    (Robin's choice among three options) rather than ever being skipped.
    SPEC.md section 4 updated to state this explicitly.
  - **Real bug found and fixed while testing:** all three mode hooks
    (`useSingleNotePractice`, `usePairPractice`, `useSequencePractice`)
    seeded their queue/pair/sequence from `pool` via a `useState` lazy
    initializer, which only runs once at mount. Since the mode screen
    mounts before the user even sees the setup screen, changing the pool
    in `ExerciseSetup` before pressing Start had no effect -- the hook
    kept using whichever pool was active at mount (the exercise's
    `default_pool`). Fixed in all three with a `useEffect` on `[pool]`
    that rebuilds state from scratch, skipping the first run via a ref
    (the lazy initializer already got mount right). Caught by browser
    testing: selecting Complete for exercise 4 showed only 7 notes with a
    repeat instead of 12 uniques -- verified fixed afterward, along with
    re-verifying pair mode's pool switch and the pair/sequence exhaustion
    math (chromatic: exactly 6 unique pairs across 12 notes, no repeats;
    naturals: 3 pairs then correct carryover into the next lap).
  - Exercises 3/4 have no "reps logged" summary stat, unlike exercises 1-2:
    both are one continuous pass through a pattern ("without stopping"),
    not something repeated a set number of times, so `reps_target` doesn't
    apply the same way. Their summaries show pairs/sequences covered and
    duration only.
  - **Layout bug found after Phase 5, per Robin:** all three mode screens'
    outer container used `justify-between` with no minimum gap between the
    middle content and the metronome controls below it. On a short
    viewport (a phone in landscape, which is how you'd prop one up to read
    notes while playing) there's no leftover space for `justify-between` to
    distribute, so the "Draw new sequence"/"Draw new pair"/note-navigator
    area and the metronome's play button ended up almost touching. Fixed by
    adding a fixed `gap-8` to all three screens' outer container -- this is
    a floor `justify-between` still adds extra space on top of on taller
    viewports, not a replacement for it. Verified on an 812x375 emulated
    viewport (the shortest realistic case) across all three modes.
  - **"Start test" added after Phase 5, per Robin:** a second way to play
    exercise 4's sequence, alongside the existing "Draw new sequence" full
    list. `useSequenceTest` (`engine/practice/`) runs a 3-2-1 countdown
    timed to the metronome (auto-starting it if it wasn't already playing),
    then steps through the same sequence one note at a time -- the current
    note big, the next one small beside it (`SequenceTestDisplay.tsx`) --
    six metronome beats per note, one per string. It stops automatically
    after the last note and drops back to the normal view; per Robin, it
    does not loop. Counts against a new `tickCount` on `useMetronome`
    (beats elapsed since the current play started, resetting on `start()`)
    rather than `currentBeat`, which wraps every bar and would tie the
    six-beats-per-note timing to whichever time signature happens to be
    selected. `useMetronome` also now exports `start` directly (previously
    only reachable via `toggle`) since the test needs to start playback
    without also being able to stop it from the same call.
  - **Two bugs and a request found once Robin tried the test, fixed same
    session:** (1) `useMetronome.stop()` wasn't resetting `tickCount`, only
    `start()` was -- if the metronome had been played and paused before
    pressing "Start test," the countdown's baseline read that stale nonzero
    value, showing a number like "10" instead of "3" until real elapsed
    beats caught back up to it. Fixed by resetting `tickCount` in `stop()`
    too, and by having `useSequenceTest.start()` use 0 directly as the
    baseline whenever it's the one starting the metronome, rather than
    trusting a `tickCount` read that could still be stale from the same
    render. (2) The beat that started the first note could land anywhere
    in the bar, not on the accented downbeat -- added
    `useMetronome.setUpcomingBeat()` (overrides the bar position of the
    next scheduled beat without touching its timing) and had
    `useSequenceTest.start()` call it so the countdown always lands note 1
    exactly on "the 1," regardless of time signature. (3) The countdown
    now also previews the first note small alongside the countdown number,
    matching the current/next layout used once the run is underway.
  - **Lead-in reshaped to "Ready?" then 3-2-1, per Robin:** the countdown's
    very first beat now shows "Ready?" (no number) instead of "3", with
    "3", "2", "1" on the next three beats and note 1 starting on the beat
    after that -- `LEAD_IN_BEATS` in `useSequenceTest.ts` went from 3 to 4
    to fit the extra beat, and `countdownBeatsLeft` is `number | null` now
    (`null` meaning "Ready?"). The downbeat-alignment math already took the
    lead-in length as a variable, so it needed no separate change beyond
    that constant. Also stress-tested "Stop test" from every phase (Ready,
    3-2-1, mid-run) after Robin hit an error there -- couldn't reproduce a
    crash on a clean reload; the likely cause was Vite Fast Refresh
    tripping over a mounted practice screen while this file and
    useMetronome.ts were being edited live in the same session, not a
    logic bug in the shipped code.
  - **Confidence prompt removed from the end-of-session flow, per Robin:**
    "How did that feel?" added a decision the summary screen didn't need
    yet -- nothing persists the answer until Phase 6 exists, so asking for
    it was complexity without payoff. All three mode screens now go
    straight from "End session" to the summary; `ScreenPhase` dropped its
    `"confidence"` value entirely rather than keeping it around unused.
    `ConfidencePrompt.tsx` is deleted (not just unwired) and
    `SessionSummary` no longer takes a `confidence` prop, per the project's
    own no-dead-code stance -- git history has the exact prior
    implementation if Phase 6 wants to reinstate the same screen once
    there's somewhere for the rating to go. SPEC.md section 7's "confidence
    prompt (Rough / OK / Solid, skippable)" line is left as-is: it still
    describes the intended eventual flow, same as this section's earlier
    Wake Lock deferrals.
- **Another small pull-forward from Phase 7, per Robin:** Home no longer
  lists Fretboard 101's exercises directly. It now shows a "Lessons"
  section ("Lessons" is a placeholder name -- flagged to Robin that
  something more musical like "Etudes" might fit better, trivial to swap
  later) listing programs (today: just Fretboard 101), each linking to the
  new `ExercisePicker` page (`pages/ExercisePicker.tsx`, route
  `/lessons/:slug`) for that program's exercise list -- exactly what Home
  used to render inline, just moved one level down now that Home has more
  than one kind of thing on it. New `components/MetronomeIcon.tsx` replaces
  the old "Metronome" section and its "Open metronome" button with a bare
  icon link (no label -- Robin's call, the shape reads on its own): a
  hand-drawn outline SVG of a classic mechanical metronome (trapezoidal
  case, small feet, a base line, tick marks on the central shaft, a
  pendulum arm leaning right ending in a circular weight), `currentColor`
  + `var(--color-ink)` so it follows the theme like every other icon here.
- **Home header finished, per Robin:** the "Profile" text link is now the
  user's own photo (or a first-initial fallback, same pattern as
  Profile.tsx's own photo circle) in a small `h-10 w-10` circle, still
  linking to `/profile`. `MetronomeIcon` grew to `size={56}` and centered
  on its own row (Robin's call: the other tools it'll eventually sit
  alongside aren't built yet, so there's nothing to center it against).
  Next to the avatar: `components/FreshnessIcon.tsx` (flame or, at Cold, a
  snowflake -- SPEC.md section 5) plus the numeric streak, both reading
  `user_stats` -- this is what actually pulled Phase 6 forward, since
  neither means anything without real session data behind it. See the
  Phase 6 entry directly below for the persistence work this required,
  and its "per-program freshness" note for why the same freshness read
  also appears on the Fretboard 101 lesson card.
- [x] **Phase 6 — Session persistence, drill_stats, streak and XP logic**
  (pulled forward out of order, per Robin, once it became clear the
  streak/freshness UI they wanted on Home couldn't mean anything without
  it -- see the Home entry below for how those two requests turned into
  this phase happening now instead of after Phase 7). `lib/sessions.ts`
  is the write path: `startSession()` runs on "Start" (SPEC.md section 6:
  "a day counts as practiced as soon as the user starts a session"),
  creates the `sessions` row, and -- only on the first session of the
  local day -- runs the streak-with-one-rest-day algorithm and the XP
  formula verbatim from section 6, upserting `user_stats`, `xp_events`,
  and `daily_activity`. `endSession()` runs on "End session", closing the
  `sessions` row and folding totals into `drill_stats`. Both are called
  through `engine/practice/usePracticeSession.ts` from all three mode
  screens identically, so persistence didn't need reimplementing per mode
  (SPEC.md section 9). Neither is awaited by its caller: `begin()` fires
  when the drill opens and its result (XP awarded, new streak) populates
  well before the summary screen can render; `finish()` is fire-and-forget
  since a failed background write shouldn't block leaving the screen,
  matching the "trust the user, don't verify" stance already used for
  reps and (until last session) confidence. Verified end-to-end in the
  browser: completing a drill shows "+100 XP" and "1 day streak" in the
  summary, a second drill the same day shows the streak with no XP line
  (day already validated), and Home's streak badge and lesson card update
  to match immediately after.
  - **Scope cut, deliberately:** milestones (`milestones` table, full
    screen congratulation cards) are Phase 8's job specifically and are
    not touched here -- writing rows nothing ever displays would be dead
    functionality. Same for the level/XP bar, 8 week heatmap, and "due for
    review" block SPEC.md's Home section describes: `user_stats.level` is
    computed and stored correctly (the formula's cheap and the column
    already exists) but nothing surfaces it yet.
  - **Two approximations, both flagged in code comments:** (1) a
    "session" is schema-tied to a specific seeded `drill_id` (exercise +
    pool + one BPM-ladder rung), but the practice screens let BPM drift
    freely rather than pinning it to a rung -- `resolveDrillId()` in
    lib/sessions.ts picks the nearest ladder rung to whatever BPM the
    metronome actually was at, while `sessions.actual_bpm` keeps the real
    value regardless. Exact today since every mode screen starts at the
    ladder's own 40 BPM. (2) `lib/freshness.ts`'s read-time state at
    exactly a 2-day gap (one full missed day) always shows as still-warm-
    but-paused rather than re-checking whether that grace day was already
    spent in the trailing week -- SPEC.md section 5's "the state holds
    where it was" language covers the common case; the rare edge case
    (a second missed day arriving right after an already-used grace day)
    resolves for real the moment the next session actually starts and
    lib/sessions.ts re-runs the algorithm properly.
  - **Per-program freshness, resolved for now by not solving it yet:**
    both the Home streak badge and the Fretboard 101 lesson card's
    freshness icon read the same `user_stats` row (current_streak,
    last_practiced_day) rather than a per-program `daily_activity` query.
    Exact while there's only one program (SPEC.md section 5 asks for
    program-level freshness, and "any practice at all" already equals
    "any practice in this program" when it's the only one). This is
    exactly the gap flagged back in the freshness design session: revisit
    with a real per-program query, and per-program `is_rest_day`
    semantics, once a second program exists.
- [x] **Phase 7 — Home, exercise picker, progress heatmap** (the exercise
  picker's BPM-ladder expansion is the one piece deliberately left out --
  see the scope-cut note below; everything else SPEC.md section 7's Home
  bullet list asks for is built). Home now shows, top to bottom: the
  header (avatar, streak badge -- both from the Phase 6 entry above), the
  metronome icon, a greeting line with best streak plus
  `components/LevelProgress.tsx` (level and an XP bar filling across the
  current level's own span, `250*n*(n-1)` per SPEC.md section 6), a
  "Continue" button (resumes the most recently practiced drill) when one
  exists, `components/DueForReview.tsx` (up to three drills stale 3+ days
  per `drill_stats.last_practiced_on`, hidden entirely when none qualify)
  when any exist, then Lessons. "Continue" and "Due for review" rows both
  deep-link straight into practicing via new `?pool=&bpm=` query params on
  `/practice/:slug` (`Practice.tsx` reads them and passes
  `initialPool`/`initialBpm` to whichever mode screen renders) rather than
  landing on ExerciseSetup -- true to SPEC.md's "one tap row" wording.
  Each mode screen starts `screenPhase` at `"practicing"` directly when
  `initialPool` is set, and an `autoStarted` ref-guarded effect calls
  `usePracticeSession.begin()` once on mount in ExerciseSetup's onStart's
  place.
  - **Heatmap replaced by a real calendar, per Robin, same session:** the
    original 8 week small-square heatmap (`components/ActivityHeatmap.tsx`)
    is deleted -- Robin found it unnecessary on Home itself and asked for
    a proper month-by-month calendar instead, opened by tapping the streak
    badge (now a `Link` to it) rather than shown inline. New
    `pages/Calendar.tsx` (route `/calendar`) renders one month at a time
    with prev/next navigation (next disabled once you're back at the
    current month), reading the same per-program `daily_activity` data the
    heatmap used to, scoped to Fretboard 101's real `program_id`.
  - **Continue button redesigned, per Robin, same session:** "Continue"
    centered as the main line, with the lesson and exercise name on a
    smaller second line underneath (`{lessonTitle} · {exerciseTitle}`) so
    it fits on one row -- needed extending the drills-to-exercises embed
    query one level further, to `exercises(..., programs(title))`, since
    `ContinueItem` didn't carry a lesson name before.
  - **Scope cut, per Robin:** the exercise picker itself doesn't get the
    "expanding rows reveal a BPM ladder, each BPM reveals a pool segmented
    control" treatment SPEC.md section 7 describes -- with only one lesson
    today, the flat "tap an exercise, then pick a pool inside it" flow
    already built is straightforward enough. Revisit once a second lesson
    exists and picking a lesson-then-exercise actually needs the extra
    structure. This is also why `lib/sessions.ts`'s nearest-BPM-rung
    `resolveDrillId()` approximation (Phase 6) stays as-is rather than
    getting resolved by a real ladder-picking UI.
  - **A Supabase client-typing gotcha, for next time:** `drills.select("*,
    exercises(...)")` is a many-to-one embed (many drills, one exercise),
    which PostgREST returns as a single object per row -- but this
    project's untyped Supabase client can't tell the difference from a
    one-to-many embed and infers `exercises` as an array regardless.
    Verified against the live response in the browser before committing to
    `as unknown as DrillWithExercise[]` in Home.tsx rather than trusting
    the inferred array type. The other direction (`programs.select("*,
    exercises(...)")`, genuinely one-to-many) really is an array, as
    Home.tsx's `ProgramWithExercises` cast from Phase 3 already assumed
    correctly -- the inferred type just happens to be right there and
    wrong here, so don't trust it either way without checking.
- [ ] **Phase 8 — Milestone cards, tempo suggestion prompt.** Deferred, per
  Robin: not the priority right now. Worth noting for whenever this comes
  back up: both features partly depend on the confidence rating that was
  removed from the practice flow (see the Phase 5 area's "Confidence
  prompt removed" entry) -- the `streak_7/30/100/365` milestones don't
  need it (`user_stats.current_streak` alone is enough), but
  `complete_80_solid` and the tempo suggestion ("after two consecutive
  Solid ratings, offer the next BPM rung") genuinely can't work without
  confidence data existing again. Flagged to Robin; explicitly not solved
  now.
- [ ] **Phase 9 — PWA manifest, service worker, icons.** Deferred, per
  Robin, in favor of shipping the plain website now (see Phase 10) and
  iterating with real daily use before investing in installability. Robin
  is using it today via Safari's "Add to Home Screen" instead, which works
  as a shortcut but shows a generic screenshot-style icon and the Safari
  chrome, not a real app icon or full-screen launch -- exactly what this
  phase would fix. Wake Lock (deferred since Phase 4) also still lives
  here.
- [x] **Phase 10 — Deploy to Vercel.** The Vercel project did not already
  exist despite what Phase 0's log said (that line was aspirational, not
  actually done back then) -- created fresh this session: New Project →
  Import the GitHub repo → Vercel auto-detected the Vite framework preset
  correctly (build command and output directory needed no manual config).
  Live at https://woodshed-liard.vercel.app.
  - **Three real gotchas hit during setup, worth remembering:** (1) Robin
    had the right Supabase values saved under `NEXT_PUBLIC_SUPABASE_URL`/
    `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` names (Next.js convention) --
    this is a Vite project, so the Vercel environment variables must be
    named exactly `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
    (`lib/supabase.ts` reads those literal names via `import.meta.env`)
    or the client throws at load. Supabase's newer "Publishable key"
    (`sb_publishable_...`, under Project Settings -> API Keys) is the
    direct successor to the legacy JWT "anon" key and is what
    `VITE_SUPABASE_ANON_KEY` wants -- confirmed compatible with this
    project's `@supabase/supabase-js@^2.116.0`. The "Secret key"/legacy
    "service_role" key on that same page must never go in a Vercel env
    var, per section 2 and section 6's environment variable rules. (2)
    Supabase's Authentication -> URL Configuration still had the local-dev
    default ("Site URL" pointing at `localhost`), so the first sign-up
    confirmation email linked back to Robin's own machine instead of the
    live site (`ERR_CONNECTION_REFUSED`). Fixed by setting Site URL to the
    Vercel domain and adding `<domain>/**` to Redirect URLs -- but the
    already-sent email's link was baked with the old URL and stayed
    broken, so getting a working confirmation required deleting that
    user row in Authentication -> Users and signing up again afterward.
    Whenever the production domain changes (a custom domain, for
    instance), this Supabase setting needs updating again or the same
    failure mode will recur. (3) React Router's client-side routes
    (`/home`, `/practice/:slug`, etc.) worked fine when navigated to via
    in-app links, but requesting one of those paths directly -- exactly
    what Safari's "Add to Home Screen" does, and what a page refresh or a
    bookmark does too -- got a genuine 404 from Vercel, since nothing on
    the server actually serves a file at `/home`; only the React app
    running client-side knows that route exists. Fixed with a new
    `vercel.json` at the repo root rewriting every path to `/index.html`
    (Vercel still serves real static files -- JS/CSS bundles, images --
    directly first; the rewrite only kicks in when no file matches, which
    is exactly the SPA-routing case). Any static host for a client-routed
    SPA needs this same fallback, not just Vercel.
- **Post-launch fixes, found once Robin was using the real deployed site:**
  a real crash and a design change, both in exercise 4's "Start test" area.
  - **Crash fixed: pausing mid countdown/run.** Robin hit "Unexpected
    application error" pressing pause during the sequence test. Root cause:
    the play/pause button is really a start/full-stop toggle
    (`useMetronome.toggle`), and `stop()` resets `tickCount` to 0 the same
    way a fresh `start()` does. `useSequenceTest`'s elapsed-beats math
    (`tickCount - baselineTickRef.current`) went negative the instant that
    happened, producing a negative `noteIndex` that `SequenceTestDisplay`
    fed straight into `getNoteDisplay(sequence[negativeIndex], ...)` --
    `sequence[-2]` is `undefined` in JS, and `getNoteDisplay` throws on an
    unrecognized pitch class. This is, in hindsight, exactly the "Unknown
    pitch class: undefined" error seen intermittently in the browser
    console earlier in the project and dismissed at the time as Vite Fast
    Refresh churn from live-editing -- it was real, just not yet triggered
    on purpose. Fixed with a dedicated effect that treats the metronome
    going silent mid-test the same as pressing "Stop test" (phase back to
    idle) rather than trying to resume a paused beat count -- resuming
    playback afterward now just plays the metronome normally instead of
    resurrecting the test.
  - **Accidental note display redesigned, per Robin.** Showing both
    enharmonic spellings at once (e.g. "C# / Db", per the original SPEC.md
    section 3 reading) took too much horizontal space and wrapped
    awkwardly, especially with several accidentals on screen together (the
    accidentals pool, or a pair/sequence that draws more than one). Setup
    now asks up front -- Sharps / Flats / Both, shown whenever the chosen
    pool isn't naturals-only -- and `getNoteDisplay` shows exactly one
    spelling instead of joining both with `/`. "Both" re-rolls sharp vs.
    flat at random each time a note is drawn (new `resolveSpelling` in
    notes.ts) rather than fixing one choice for the whole session, so every
    spelling still turns up over time; the underlying pitch-class draw
    logic (no repeats until a lap/pool is exhausted) is completely
    unaffected, since spelling is decided independently on top of it. New
    `engine/practice/useSpellingChoices.ts` resolves `count` choices at
    once, memoized on a stable per-occurrence key (`historyIndex` for
    single mode, `pairsCovered` for pair, `sequencesCovered` for sequence)
    so "both" mode doesn't flicker between spellings on unrelated
    re-renders (a metronome tick, for instance) -- only a genuinely new
    draw re-rolls it. `useSingleNotePractice` now exposes `historyIndex`
    for exactly this purpose, having not needed to before.
- **Metronome auto-starts on drill open, defaults to 6/4, per Robin.**
  Previously every practice screen landed with the metronome paused,
  needing a manual tap before it made any sound -- now `metronome.start()`
  is called alongside `usePracticeSession.begin()`, both in
  ExerciseSetup's `onStart` and in the deep-link `autoStarted` effect
  (Home's "Continue"/"Due for review"), so pressing Start (or tapping one
  of those rows) goes straight into a playing metronome. Doesn't apply to
  exercise 1 (`uses_metronome: false`) -- guarded the same way the BPM
  readout already was. Also added `"6/4"` as a genuinely new
  `TimeSignature` (`engine/metronome/types.ts` -- SPEC.md section 7
  previously listed only 4/4, 3/4, 2/4, 6/8, 5/4, 7/8) and gave
  `useMetronome` a third `initialTimeSignature` parameter (default stays
  `"4/4"`, unchanged for existing callers) so each Fretboard 101 mode
  screen can pass `"6/4"` explicitly -- one beat per string, matching
  exercise 4's "Start test" run, which already steps one note per six
  beats regardless of signature. The standalone `/metronome` tool calls
  `useMetronome()` with no arguments and stays at 4/4, unaffected, per
  Robin's explicit call to keep it separate from the exercises' default.
  - **Known gap, not addressed:** the deep-link auto-start
    (`autoStarted` effect) calls `metronome.start()` from inside a
    `useEffect` after navigation, not synchronously inside a click
    handler like ExerciseSetup's `onStart` does. iOS Safari's autoplay
    policy generally only treats a click's own synchronous call stack as
    a "user gesture" for creating/resuming an `AudioContext` -- an effect
    firing after the click (and after a route change re-mounts the
    screen) may not qualify, so this path could silently end up with
    `isPlaying: true` but no actual sound on iOS specifically. Untested
    on a real device; if Robin reports the metronome looking like it's
    playing but staying silent right after tapping "Continue," this is
    the first place to look.
- **Bug fix: onboarding replaying on every login.** `RequireOnboarded`
  used `!profile?.first_name` as a proxy for "onboarding done," which
  broke for any account whose `profiles` row stopped existing after a
  real onboarding -- concretely, `Profile.tsx`'s "Delete account" deletes
  the `profiles` row but deliberately leaves `auth.users` in place (no
  service-role Edge Function yet, per the Phase 2 flag above). Signing
  back in with such an account fetches no profile row at all, so
  `RequireOnboarded` redirected to `/onboarding` every time, and
  `Onboarding.tsx`'s old `UPDATE ... WHERE id = user.id` silently
  affected zero rows against a missing row, so nothing was ever actually
  saved -- an unbreakable loop. Fixed with an explicit
  `onboarding_completed_at timestamptz` column on `profiles`
  (`supabase/migrations/20260921010000_onboarding_completed_flag.sql`),
  which `RequireOnboarded` now checks instead of `first_name`, and by
  switching `Onboarding.tsx`'s save from `update` to `upsert` so it also
  recreates a missing row rather than failing to match one. The
  underlying "Delete account doesn't remove auth.users" gap is
  unchanged and can still leave a navigable zombie account -- flagged
  again, not solved here.
- **Follow-up: the fix above didn't fully land, found by testing against
  the real deployed app with Robin.** Two separate things, both in
  `src/auth/`: (1) `RequireGuest.tsx` was missed in the first pass -- it
  still branched on `profile?.first_name` to decide where a signed-in
  visitor lands, and it's this guard, not `RequireOnboarded`, that runs
  right after a successful sign-in (the sign-in page is wrapped in
  `RequireGuest`). Now checks `onboarding_completed_at` too. (2) The real
  bug: `AuthProvider`'s `onAuthStateChange` handler updated
  `session`/`user` synchronously but fetched the matching `profile`
  asynchronously without setting `loading` back to `true` for that gap --
  `loading` was only ever true during the very first mount. So for the
  length of that fetch, any guard reading context saw a fresh
  `session`/`user` paired with a stale `profile` (`null`, left over from
  the sign-out right before), decided onboarding wasn't done, and
  navigated to `/onboarding` -- deterministically, every sign-in,
  regardless of what's actually in the database. Once that `<Navigate>`
  fires there's nothing to bring the user back, so the onboarding form
  has to be completed again to escape. Confirmed via a three-way SQL
  check with Robin (before onboarding / after onboarding in a stale
  cached tab / after onboarding in a freshly loaded tab) that the write
  itself was fine all along -- `onboarding_completed_at` was landing
  correctly in `profiles`; the guard just never waited for it. Fixed by
  setting `loading` around the `onAuthStateChange` fetch the same way
  `init()` already does. General lesson for this codebase: any route
  guard reading `profile` from `useAuth()` needs `loading` to be a true
  guarantee that `session` and `profile` are from the same moment, not
  just "the app has mounted once."
