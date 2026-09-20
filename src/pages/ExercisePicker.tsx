import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { LoadingScreen } from "@/components/LoadingScreen";
import { supabase } from "@/lib/supabase";
import type { Exercise, Program } from "@/types/database";

type ExerciseSummary = Pick<Exercise, "id" | "slug" | "title" | "position">;
type ProgramWithExercises = Program & { exercises: ExerciseSummary[] };

// Route entry for a lesson (SPEC.md's "program"): loads it by slug along
// with its exercises, then lists them exactly the way Home used to before
// there was more than one lesson to pick from.
export function ExercisePicker() {
  const { slug } = useParams<{ slug: string }>();
  const [program, setProgram] = useState<ProgramWithExercises | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadProgram() {
      const { data, error } = await supabase
        .from("programs")
        .select("*, exercises(id, slug, title, position)")
        .eq("slug", slug)
        .single();

      if (cancelled) return;
      if (error || !data) {
        setLoadError(true);
        return;
      }
      const typed = data as ProgramWithExercises;
      setProgram({ ...typed, exercises: [...typed.exercises].sort((a, b) => a.position - b.position) });
    }

    loadProgram();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loadError) {
    return (
      <div className="mx-auto flex min-h-screen max-w-[480px] flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-ink-secondary">Couldn't load that lesson.</p>
        <Link to="/home" className="text-accent">
          Back to Home
        </Link>
      </div>
    );
  }

  if (!program) return <LoadingScreen />;

  return (
    <div className="mx-auto flex min-h-screen max-w-[480px] flex-col gap-8 px-6 py-10">
      <div>
        <h1 className="font-display text-3xl">{program.title}</h1>
        {program.subtitle && <p className="mt-1 text-sm text-ink-secondary">{program.subtitle}</p>}
      </div>

      <div className="flex flex-col gap-2">
        {program.exercises.map((exercise) => (
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

      <Link to="/home" className="text-center text-sm text-ink-muted">
        Back to Home
      </Link>
    </div>
  );
}
