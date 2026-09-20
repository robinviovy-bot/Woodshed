import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { Button } from "@/components/Button";
import { DueForReview, type DueForReviewItem } from "@/components/DueForReview";
import { FreshnessIcon } from "@/components/FreshnessIcon";
import { LevelProgress } from "@/components/LevelProgress";
import { MetronomeIcon } from "@/components/MetronomeIcon";
import { Section } from "@/components/Section";
import { daysBetween, formatRelativeDate, getLocalDay } from "@/lib/dates";
import { computeFreshness, type Freshness } from "@/lib/freshness";
import { supabase } from "@/lib/supabase";
import type { Pool, Program } from "@/types/database";

type ProgramSummary = Pick<Program, "id" | "slug" | "title" | "subtitle" | "position">;

interface DrillWithExercise {
  id: string;
  bpm: number | null;
  pool: Pool;
  exercises: {
    slug: string;
    title: string;
    program_id: string;
    programs: { title: string } | null;
  } | null;
}

interface ContinueItem {
  exerciseSlug: string;
  exerciseTitle: string;
  lessonTitle: string;
  bpm: number | null;
  pool: Pool;
}

const STALE_AFTER_DAYS = 3; // matches "cooling down"'s onset in the freshness table

// The metronome gets an icon-only link, not a labelled section -- its
// shape is recognizable on its own and it isn't a lesson. Everything
// lesson-like (today: just Fretboard 101) lives under "Lessons" instead,
// each one linking to ExercisePicker for its exercise list.
//
// The streak badge (now a link to /calendar, per Robin -- the 8 week
// heatmap that used to live here is gone in favor of that dedicated page)
// next to the avatar, the level/XP bar, best streak, and each lesson
// card's freshness icon all read the same user_stats row (current_streak,
// longest_streak, total_xp, last_practiced_day) -- exact while there's
// only one program, since "any practice in the program" and "any practice
// at all" are the same thing today. "Due for review" DOES scope to the
// one real program (via drills/exercises' own program_id), since that
// data already exists per-program correctly -- only the streak/level
// numbers are the single-program shortcut. A second program will need its
// own daily_activity-based per-program streak instead (flagged in
// CLAUDE.md).
export function Home() {
  const { user, profile } = useAuth();
  const [programs, setPrograms] = useState<ProgramSummary[] | null>(null);
  const [freshness, setFreshness] = useState<Freshness | null>(null);
  const [streak, setStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [levelInfo, setLevelInfo] = useState<{ level: number; totalXp: number } | null>(null);
  const [dueItems, setDueItems] = useState<DueForReviewItem[]>([]);
  const [continueItem, setContinueItem] = useState<ContinueItem | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPrograms() {
      const { data } = await supabase
        .from("programs")
        .select("id, slug, title, subtitle, position")
        .order("position");

      if (cancelled) return;
      if (data) setPrograms(data as ProgramSummary[]);
    }

    loadPrograms();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const userId = user.id;

    async function loadDashboard() {
      const today = getLocalDay(profile?.timezone ?? null);

      const [{ data: stats }, { data: program }, { data: drillRows }] = await Promise.all([
        supabase
          .from("user_stats")
          .select("total_xp, level, current_streak, longest_streak, last_practiced_day")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase.from("programs").select("id").eq("slug", "fretboard-101").maybeSingle(),
        supabase.from("drills").select("id, bpm, pool, exercises(slug, title, program_id, programs(title))"),
      ]);

      if (cancelled) return;

      const currentStreak = stats?.current_streak ?? 0;
      setStreak(currentStreak);
      setLongestStreak(stats?.longest_streak ?? 0);
      setLevelInfo({ level: stats?.level ?? 1, totalXp: stats?.total_xp ?? 0 });
      setFreshness(computeFreshness(stats?.last_practiced_day ?? null, currentStreak, today));

      if (!program || !drillRows) return;
      // Supabase's untyped client can't tell this is a many-to-one embed
      // (drills.exercise_id -> exercises.id), so it infers `exercises` as
      // an array; PostgREST actually returns a single object for a
      // forward FK embed like this one (verified against the live
      // response), matching the interface above.
      const drills = drillRows as unknown as DrillWithExercise[];
      const drillById = new Map(drills.map((drill) => [drill.id, drill]));

      const [{ data: drillStatRows }, { data: lastSession }] = await Promise.all([
        supabase
          .from("drill_stats")
          .select("drill_id, last_practiced_on")
          .eq("user_id", userId)
          .not("last_practiced_on", "is", null),
        supabase
          .from("sessions")
          .select("drill_id")
          .eq("user_id", userId)
          .order("started_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (cancelled) return;

      const due = (drillStatRows ?? [])
        .map((row) => ({ drill: drillById.get(row.drill_id), lastPracticedOn: row.last_practiced_on as string }))
        .filter(
          (row): row is { drill: DrillWithExercise; lastPracticedOn: string } =>
            !!row.drill?.exercises && row.drill.exercises.program_id === program.id,
        )
        .filter((row) => daysBetween(row.lastPracticedOn, today) >= STALE_AFTER_DAYS)
        .sort((a, b) => daysBetween(b.lastPracticedOn, today) - daysBetween(a.lastPracticedOn, today))
        .slice(0, 3)
        .map(
          (row): DueForReviewItem => ({
            exerciseSlug: row.drill.exercises!.slug,
            exerciseTitle: row.drill.exercises!.title,
            bpm: row.drill.bpm,
            pool: row.drill.pool,
            relativeDate: formatRelativeDate(row.lastPracticedOn, today),
          }),
        );
      setDueItems(due);

      const lastDrill = lastSession ? drillById.get(lastSession.drill_id) : null;
      setContinueItem(
        lastDrill?.exercises
          ? {
              exerciseSlug: lastDrill.exercises.slug,
              exerciseTitle: lastDrill.exercises.title,
              lessonTitle: lastDrill.exercises.programs?.title ?? "",
              bpm: lastDrill.bpm,
              pool: lastDrill.pool,
            }
          : null,
      );
    }

    loadDashboard();
    return () => {
      cancelled = true;
    };
  }, [user, profile?.timezone]);

  return (
    <div className="mx-auto flex min-h-screen max-w-[480px] flex-col gap-10 px-6 py-10">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-3xl">Woodshed</h1>
        <div className="flex items-center gap-3">
          {freshness && (
            <Link to="/calendar" aria-label="Practice calendar" className="flex items-center gap-1">
              <FreshnessIcon state={freshness.state} />
              <span className="font-mono font-numeric text-sm text-ink-secondary">{streak}</span>
              {freshness.isPaused && (
                <svg
                  viewBox="0 0 24 24"
                  width="10"
                  height="10"
                  fill="var(--color-ink-muted)"
                  aria-label="Streak paused"
                >
                  <rect x="5" y="4" width="5" height="16" rx="1.5" />
                  <rect x="14" y="4" width="5" height="16" rx="1.5" />
                </svg>
              )}
            </Link>
          )}
          <Link
            to="/profile"
            aria-label="Profile"
            className="h-10 w-10 overflow-hidden rounded-full border border-line"
            style={{ backgroundColor: "var(--color-surface)" }}
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center font-display text-base text-ink-secondary">
                {(profile?.first_name ?? "?").charAt(0).toUpperCase()}
              </span>
            )}
          </Link>
        </div>
      </header>

      <Link to="/metronome" aria-label="Open metronome" className="flex justify-center">
        <MetronomeIcon size={56} />
      </Link>

      {levelInfo && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ink-secondary">
            Hey {profile?.first_name ?? "there"}, best streak {pluralizeDays(longestStreak)}.
          </p>
          <LevelProgress level={levelInfo.level} totalXp={levelInfo.totalXp} />
        </div>
      )}

      {continueItem && (
        <Link
          to={`/practice/${continueItem.exerciseSlug}?pool=${continueItem.pool}${
            continueItem.bpm !== null ? `&bpm=${continueItem.bpm}` : ""
          }`}
        >
          <Button variant="primary" className="flex w-full flex-col items-center gap-0.5 py-2.5">
            <span>Continue</span>
            <span className="text-xs font-normal opacity-80">
              {continueItem.lessonTitle} · {continueItem.exerciseTitle}
            </span>
          </Button>
        </Link>
      )}

      <DueForReview items={dueItems} />

      <Section title="Lessons">
        {programs === null ? (
          <p className="text-sm text-ink-muted">Loading…</p>
        ) : (
          <div className="flex flex-col gap-2">
            {programs.map((program) => (
              <Link
                key={program.id}
                to={`/lessons/${program.slug}`}
                className="flex items-center justify-between gap-3 rounded-card border border-line p-4"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm">{program.title}</span>
                  {program.subtitle && (
                    <span className="text-sm text-ink-secondary">{program.subtitle}</span>
                  )}
                </div>
                {freshness && <FreshnessIcon state={freshness.state} size={24} />}
              </Link>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function pluralizeDays(count: number): string {
  return `${count} day${count === 1 ? "" : "s"}`;
}
