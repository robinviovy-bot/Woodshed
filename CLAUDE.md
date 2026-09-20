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

## 3. Folder structure

```
src/
  app/            Root app wiring: router.tsx (route table), App.tsx composes
                  providers + router. Not screens themselves.
  pages/          Route-level screens (one per route): SignIn, Home,
                  ExercisePicker, Practice, Progress, Profile, etc.
  components/     Small, reusable UI pieces used by more than one page
                  (Button, FreshnessDot, PoolBadge, Card, ...).
  engine/         The generic practice engine (mode handlers for
                  'single' | 'pair' | 'sequence', metronome, session state).
                  Reads exercise config; never branches on a specific
                  exercise or program by name. See section 9 of SPEC.md.
  theme/          ThemeProvider + useTheme + the shared context (split into
                  separate files so Fast Refresh / oxlint stay happy about
                  component-only exports). Applies the `data-theme` attribute
                  the CSS tokens in styles/index.css key off of.
  lib/            Thin wrappers around external services: supabase.ts today.
  styles/         index.css: Tailwind import + CSS custom property tokens
                  for both themes.
  types/          Shared TypeScript types (mostly DB row shapes), added as
                  the schema lands in Phase 1.
supabase/         SQL migrations, seed script, and the RLS test script (added
                  in Phase 1).
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
- Tailwind v4 has no `tailwind.config.js`; theme values are declared in the
  `@theme` block of `src/styles/index.css` and Tailwind derives utilities
  from them automatically (e.g. `--color-accent` → `bg-accent`,
  `text-accent`, `border-accent`).
- Freshness and pool are modeled as string union types (`Freshness`,
  `Pool`) colocated with the component that first needed them
  (`components/FreshnessDot.tsx`, `components/PoolBadge.tsx`); import the
  type from there rather than redeclaring it.

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
- [ ] Phase 1 — Supabase schema, RLS policies, seed script, RLS test script
- [ ] Phase 2 — Auth, profile, theme system wired to real palettes (this
  phase should retire `DesignPreview.tsx`)
- [ ] Phase 3 — Metronome (lookahead scheduler, BPM stepper, tap tempo, time
  signatures, beat indicator) as a standalone component
- [ ] Phase 4 — Practice screen around the metronome, exercise 2 first
- [ ] Phase 5 — Remaining exercise modes (1, 3, 4) on the same engine
- [ ] Phase 6 — Session persistence, drill_stats, streak and XP logic
- [ ] Phase 7 — Home, exercise picker, progress heatmap
- [ ] Phase 8 — Milestone cards, tempo suggestion prompt
- [ ] Phase 9 — PWA manifest, service worker, icons
- [ ] Phase 10 — Deploy to Vercel
