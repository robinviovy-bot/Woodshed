-- Bug fix: RequireOnboarded used to infer "onboarding done" from
-- first_name IS NOT NULL. That proxy breaks for any account whose
-- profiles row was deleted after onboarding -- Profile.tsx's "Delete
-- account" removes the profiles row but deliberately leaves the
-- auth.users row in place (no service-role Edge Function yet, see
-- CLAUDE.md). Signing back in with that account then has no profiles
-- row at all: onboarding replays, and its UPDATE-only save silently
-- affects zero rows every time, so nothing is ever saved and the loop
-- never breaks. An explicit flag replaces the first_name proxy.

alter table public.profiles
  add column onboarding_completed_at timestamptz;
