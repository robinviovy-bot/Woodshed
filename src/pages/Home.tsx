import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { FreshnessIcon } from "@/components/FreshnessIcon";
import { MetronomeIcon } from "@/components/MetronomeIcon";
import { Section } from "@/components/Section";
import { getLocalDay } from "@/lib/dates";
import { computeFreshness, type Freshness } from "@/lib/freshness";
import { supabase } from "@/lib/supabase";
import type { Program } from "@/types/database";

type ProgramSummary = Pick<Program, "id" | "slug" | "title" | "subtitle" | "position">;

// The metronome gets an icon-only link, not a labelled section -- its
// shape is recognizable on its own and it isn't a lesson. Everything
// lesson-like (today: just Fretboard 101) lives under "Lessons" instead,
// each one linking to ExercisePicker for its exercise list.
//
// The streak badge next to the avatar and each lesson card's freshness
// icon both read the same user_stats row (current_streak,
// last_practiced_day) -- exact while there's only one program, since
// "any practice in the program" and "any practice at all" are the same
// thing today. A second program will need its own daily_activity-based
// per-program streak instead (flagged in CLAUDE.md).
export function Home() {
  const { user, profile } = useAuth();
  const [programs, setPrograms] = useState<ProgramSummary[] | null>(null);
  const [freshness, setFreshness] = useState<Freshness | null>(null);
  const [streak, setStreak] = useState(0);

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

    async function loadStreak() {
      const { data } = await supabase
        .from("user_stats")
        .select("current_streak, last_practiced_day")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (cancelled) return;
      const today = getLocalDay(profile?.timezone ?? null);
      setStreak(data?.current_streak ?? 0);
      setFreshness(computeFreshness(data?.last_practiced_day ?? null, data?.current_streak ?? 0, today));
    }

    loadStreak();
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
            <div className="flex items-center gap-1">
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
            </div>
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
