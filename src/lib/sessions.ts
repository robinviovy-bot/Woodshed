import { daysBetween, getLocalDay, shiftDay } from "@/lib/dates";
import { supabase } from "@/lib/supabase";
import type { Exercise, Pool } from "@/types/database";

// SPEC.md section 6: cumulative XP required for level n is 500*n*(n-1)/2,
// i.e. thresholds 0, 500, 1500, 3000, 5000... at n = 1, 2, 3, 4, 5.
function computeLevel(totalXp: number): number {
  let level = 1;
  while (250 * (level + 1) * level <= totalXp) level++;
  return level;
}

// A "drill" is a fixed (exercise, pool, bpm) combination from the seeded
// ladder (40/50/60/70/80, or bpm null for exercise 1's no-metronome rows),
// but the practice screens let BPM drift freely within a session rather
// than pinning it to a ladder rung. Session/drill_stats rows still need a
// concrete drill_id, so this picks the nearest ladder rung to whatever BPM
// the metronome was actually at -- an approximation, not a strict schema
// mismatch: actual_bpm on the session row keeps the real value regardless.
async function resolveDrillId(exerciseId: string, pool: Pool, bpm: number | null): Promise<string | null> {
  const { data } = await supabase.from("drills").select("id, bpm").eq("exercise_id", exerciseId).eq("pool", pool);
  if (!data || data.length === 0) return null;
  if (bpm === null) return (data.find((d) => d.bpm === null) ?? data[0]).id;

  let best = data[0];
  let bestDiff = Infinity;
  for (const drill of data) {
    if (drill.bpm === null) continue;
    const diff = Math.abs(drill.bpm - bpm);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = drill;
    }
  }
  return best.id;
}

export interface StartedSession {
  sessionId: string;
  drillId: string;
  isFirstSessionOfDay: boolean;
  xpAwarded: number;
  currentStreak: number;
}

// Called once a drill actually starts (SPEC.md section 6: "a day counts as
// practiced as soon as the user starts a session on that calendar day").
// Creates the session row and, if this is the first session of the local
// day, runs the streak-with-one-rest-day algorithm and awards XP.
export async function startSession({
  userId,
  timezone,
  exercise,
  pool,
  bpm,
  timeSignature,
}: {
  userId: string;
  timezone: string | null;
  exercise: Exercise;
  pool: Pool;
  bpm: number | null;
  timeSignature: string | null;
}): Promise<StartedSession | null> {
  const drillId = await resolveDrillId(exercise.id, pool, bpm);
  if (!drillId) return null;

  const { data: sessionRow, error: sessionError } = await supabase
    .from("sessions")
    .insert({ user_id: userId, drill_id: drillId, time_signature: timeSignature, actual_bpm: bpm })
    .select("id")
    .single();
  if (sessionError || !sessionRow) return null;

  const today = getLocalDay(timezone);
  const { data: stats } = await supabase
    .from("user_stats")
    .select("total_xp, current_streak, longest_streak, last_practiced_day")
    .eq("user_id", userId)
    .maybeSingle();

  let currentStreak = stats?.current_streak ?? 0;
  let longestStreak = stats?.longest_streak ?? 0;
  let totalXp = stats?.total_xp ?? 0;
  const lastPracticedDay = stats?.last_practiced_day ?? null;

  let isFirstSessionOfDay = false;

  if (lastPracticedDay === null) {
    currentStreak = 1;
    isFirstSessionOfDay = true;
  } else {
    const gap = daysBetween(lastPracticedDay, today);
    if (gap === 1) {
      currentStreak += 1;
      isFirstSessionOfDay = true;
    } else if (gap >= 2) {
      const missed = gap - 1;
      const sevenDaysAgo = shiftDay(today, -7);
      const { count: restDaysInWindow } = await supabase
        .from("daily_activity")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_rest_day", true)
        .gte("day", sevenDaysAgo)
        .lt("day", today);

      if (missed === 1 && (restDaysInWindow ?? 0) === 0) {
        await supabase.from("daily_activity").upsert(
          {
            user_id: userId,
            day: shiftDay(today, -1),
            program_id: exercise.program_id,
            is_rest_day: true,
            xp_awarded: 0,
          },
          { onConflict: "user_id,day,program_id" },
        );
        currentStreak += 1;
      } else {
        currentStreak = 1;
      }
      isFirstSessionOfDay = true;
    }
    // gap === 0: today is already validated, nothing changes.
  }

  let xpAwarded = 0;
  if (isFirstSessionOfDay) {
    longestStreak = Math.max(longestStreak, currentStreak);
    const streakMultiplier = Math.min(3.0, 1 + 0.1 * (currentStreak - 1));
    xpAwarded = Math.round(100 * streakMultiplier);
    totalXp += xpAwarded;

    await supabase.from("xp_events").insert({
      user_id: userId,
      amount: xpAwarded,
      reason: "daily_practice",
      day: today,
    });
    await supabase.from("daily_activity").upsert(
      {
        user_id: userId,
        day: today,
        program_id: exercise.program_id,
        xp_awarded: xpAwarded,
        is_rest_day: false,
      },
      { onConflict: "user_id,day,program_id" },
    );
  }

  await supabase.from("user_stats").upsert(
    {
      user_id: userId,
      total_xp: totalXp,
      level: computeLevel(totalXp),
      current_streak: currentStreak,
      longest_streak: longestStreak,
      last_practiced_day: today,
    },
    { onConflict: "user_id" },
  );

  return { sessionId: sessionRow.id, drillId, isFirstSessionOfDay, xpAwarded, currentStreak };
}

// Called on "End session": closes out the session row and folds the
// drill's totals into drill_stats. No confidence column is written --
// that prompt was removed from the flow for now (see CLAUDE.md).
export async function endSession({
  userId,
  timezone,
  sessionId,
  drillId,
  notesDone,
  repsDone,
}: {
  userId: string;
  timezone: string | null;
  sessionId: string;
  drillId: string;
  notesDone: number;
  repsDone: number;
}): Promise<void> {
  await supabase
    .from("sessions")
    .update({ ended_at: new Date().toISOString(), notes_done: notesDone, reps_done: repsDone })
    .eq("id", sessionId);

  const today = getLocalDay(timezone);
  const { data: existing } = await supabase
    .from("drill_stats")
    .select("first_practiced_on, session_count, total_reps")
    .eq("user_id", userId)
    .eq("drill_id", drillId)
    .maybeSingle();

  await supabase.from("drill_stats").upsert(
    {
      user_id: userId,
      drill_id: drillId,
      first_practiced_on: existing?.first_practiced_on ?? today,
      last_practiced_on: today,
      session_count: (existing?.session_count ?? 0) + 1,
      total_reps: (existing?.total_reps ?? 0) + repsDone,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,drill_id" },
  );
}
