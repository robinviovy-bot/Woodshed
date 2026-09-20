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
                  SignIn, ForgotPassword, ResetPassword, Onboarding, Profile
                  today; Home, ExercisePicker, Practice, Progress land in
                  later phases.
  components/     Small, reusable UI pieces used by more than one page
                  (Button, TextField, AuthLayout, Section, SegmentedControl,
                  PoolBadge, ComingSoonBadge, LoadingScreen, ...).
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
  theme/          ThemeProvider + useTheme + the shared context (split into
                  separate files so Fast Refresh / oxlint stay happy about
                  component-only exports), plus ThemeSync (adopts
                  profile.theme once a profile loads; doesn't fight with
                  Profile.tsx's own theme switcher -- see that file's
                  comment for why). Applies the `data-theme` attribute the
                  CSS tokens in styles/index.css key off of.
  lib/            Thin wrappers around external services: supabase.ts,
                  authErrors.ts (maps Supabase auth errors to the copy
                  SPEC.md section 7 asks for).
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

Deploy: the Vercel account is connected to the GitHub repo, so pushing to
`main` triggers a deploy automatically — there is no separate manual deploy
command in normal use. `npx vercel` is only for one-off preview deploys
outside that flow.

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
- [ ] Phase 5 — Remaining exercise modes (1, 3, 4) on the same engine
- [ ] Phase 6 — Session persistence, drill_stats, streak and XP logic
- [ ] Phase 7 — Home, exercise picker, progress heatmap
- [ ] Phase 8 — Milestone cards, tempo suggestion prompt
- [ ] Phase 9 — PWA manifest, service worker, icons
- [ ] Phase 10 — Deploy to Vercel
