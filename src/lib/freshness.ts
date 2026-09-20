import { daysBetween } from "@/lib/dates";

export type FreshnessState = "cold" | "cool" | "cooling_down" | "warming_up" | "hot";

export interface Freshness {
  state: FreshnessState;
  isPaused: boolean;
}

// SPEC.md section 5's table, computed at read time from user_stats rather
// than stored: Cold (never, or 14+ days), Cool (7-13), Cooling down (3-6),
// Warming up (today/yesterday, streak 1-2), Hot (today/yesterday, streak
// 3+). Only one program exists today (Fretboard 101), so reusing the
// app-wide user_stats.current_streak/last_practiced_day for a per-program
// card is exact, not an approximation -- CLAUDE.md flags that this needs
// its own per-program daily_activity query once a second program exists.
//
// A gap of exactly 2 days (one full missed day) is deliberately shown as
// still-warm-but-paused rather than immediately cooling: SPEC.md's one
// rest-day grace period means the streak likely survives once the next
// session starts and the write-time algorithm (lib/sessions.ts) actually
// re-checks it ("the state holds where it was"). This read path doesn't
// re-verify that the grace day wasn't already spent in the trailing week
// -- a rare edge case the next session start resolves for real either way.
export function computeFreshness(
  lastPracticedDay: string | null,
  currentStreak: number,
  today: string,
): Freshness {
  if (!lastPracticedDay) return { state: "cold", isPaused: false };

  const gap = daysBetween(lastPracticedDay, today);
  const warmState: FreshnessState = currentStreak >= 3 ? "hot" : "warming_up";

  if (gap <= 1) return { state: warmState, isPaused: false };
  if (gap === 2) return { state: warmState, isPaused: true };
  if (gap <= 6) return { state: "cooling_down", isPaused: false };
  if (gap <= 13) return { state: "cool", isPaused: false };
  return { state: "cold", isPaused: false };
}
