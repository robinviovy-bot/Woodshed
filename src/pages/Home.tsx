import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/Button";
import { Section } from "@/components/Section";
import { supabase } from "@/lib/supabase";
import type { Exercise, Program } from "@/types/database";

type ExerciseSummary = Pick<Exercise, "id" | "slug" | "title" | "position">;
type ProgramWithExercises = Program & { exercises: ExerciseSummary[] };

// All 4 exercises have a real practice screen as of Phase 5.
export function Home() {
  const [program, setProgram] = useState<ProgramWithExercises | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadProgram() {
      const { data } = await supabase
        .from("programs")
        .select("*, exercises(id, slug, title, position)")
        .eq("slug", "fretboard-101")
        .single();

      if (cancelled) return;
      if (data) {
        const typed = data as ProgramWithExercises;
        setProgram({ ...typed, exercises: [...typed.exercises].sort((a, b) => a.position - b.position) });
      }
      setLoading(false);
    }

    loadProgram();
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

      <Section title="Metronome">
        <Link to="/metronome">
          <Button variant="primary" className="w-full">
            Open metronome
          </Button>
        </Link>
      </Section>

      <Section title={program?.title ?? "Fretboard 101"}>
        {loading ? (
          <p className="text-sm text-ink-muted">Loading…</p>
        ) : (
          <div className="flex flex-col gap-2">
            {program?.exercises.map((exercise) => (
              <Link
                key={exercise.id}
                to={`/practice/${exercise.slug}`}
                className="flex items-center justify-between rounded-card border border-line p-4"
              >
                <span className="text-sm">{exercise.title}</span>
                <span className="text-sm text-accent">Practice</span>
              </Link>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
