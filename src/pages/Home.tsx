import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MetronomeIcon } from "@/components/MetronomeIcon";
import { Section } from "@/components/Section";
import { supabase } from "@/lib/supabase";
import type { Program } from "@/types/database";

type ProgramSummary = Pick<Program, "id" | "slug" | "title" | "subtitle" | "position">;

// The metronome gets an icon-only link, not a labelled section -- its
// shape is recognizable on its own and it isn't a lesson. Everything
// lesson-like (today: just Fretboard 101) lives under "Lessons" instead,
// each one linking to ExercisePicker for its exercise list.
export function Home() {
  const [programs, setPrograms] = useState<ProgramSummary[] | null>(null);

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

  return (
    <div className="mx-auto flex min-h-screen max-w-[480px] flex-col gap-10 px-6 py-10">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-3xl">Woodshed</h1>
        <Link to="/profile" className="text-sm text-accent">
          Profile
        </Link>
      </header>

      <Link to="/metronome" aria-label="Open metronome" className="self-start">
        <MetronomeIcon />
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
                className="flex flex-col gap-0.5 rounded-card border border-line p-4"
              >
                <span className="text-sm">{program.title}</span>
                {program.subtitle && (
                  <span className="text-sm text-ink-secondary">{program.subtitle}</span>
                )}
              </Link>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
