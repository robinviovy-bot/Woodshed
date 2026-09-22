import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { BackNav } from "@/components/BackNav";
import { LoadingScreen } from "@/components/LoadingScreen";
import type { MetronomeSound } from "@/engine/metronome/types";
import { PairModeScreen } from "@/engine/practice/PairModeScreen";
import { SequenceModeScreen } from "@/engine/practice/SequenceModeScreen";
import { SingleModeScreen } from "@/engine/practice/SingleModeScreen";
import { supabase } from "@/lib/supabase";
import type { Exercise, Pool } from "@/types/database";

type ExerciseWithProgram = Exercise & { programs: { slug: string } };

// Route entry for every exercise: loads the exercise row by slug, then
// dispatches to its mode handler. Adding a future exercise means inserting
// a row plus, at most, a new mode screen here (SPEC.md section 9) --
// nothing about this component hardcodes a specific exercise.
//
// Optional ?pool= and ?bpm= query params (from Home's "Continue" and "Due
// for review" rows) skip straight into practicing that exact drill rather
// than landing on ExerciseSetup -- true to their "one tap" spec wording.
export function Practice() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [lessonSlug, setLessonSlug] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadExercise() {
      // programs(slug) is a many-to-one embed (many exercises, one
      // program) -- PostgREST returns a single object, but this project's
      // untyped client can't tell that apart from a one-to-many embed and
      // infers it as an array regardless (same gotcha as Home.tsx's
      // drills-to-exercises embed).
      const { data, error } = await supabase
        .from("exercises")
        .select("*, programs(slug)")
        .eq("slug", slug)
        .single();
      if (cancelled) return;
      if (error || !data) {
        setLoadError(true);
        return;
      }
      const typed = data as unknown as ExerciseWithProgram;
      setExercise(typed);
      setLessonSlug(typed.programs.slug);
    }
    loadExercise();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loadError) {
    return (
      <div className="mx-auto flex min-h-screen max-w-[480px] flex-col px-6 py-6">
        <BackNav to="/home" label="Back to Home" />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="text-ink-secondary">Couldn't load that exercise.</p>
        </div>
      </div>
    );
  }

  if (!exercise || !lessonSlug) return <LoadingScreen />;

  const notation = profile?.notation ?? "en";
  const metronomeSound = (profile?.metronome_sound as MetronomeSound) ?? "click";
  const onExit = () => navigate("/home");

  const poolParam = searchParams.get("pool") as Pool | null;
  const initialPool =
    poolParam && exercise.available_pools.includes(poolParam) ? poolParam : undefined;
  const bpmParam = searchParams.get("bpm");
  const initialBpm = initialPool && bpmParam ? Number(bpmParam) : undefined;

  if (exercise.mode === "pair") {
    return (
      <PairModeScreen
        exercise={exercise}
        notation={notation}
        metronomeSound={metronomeSound}
        onExit={onExit}
        lessonSlug={lessonSlug}
        initialPool={initialPool}
        initialBpm={initialBpm}
      />
    );
  }

  if (exercise.mode === "sequence") {
    return (
      <SequenceModeScreen
        exercise={exercise}
        notation={notation}
        metronomeSound={metronomeSound}
        onExit={onExit}
        lessonSlug={lessonSlug}
        initialPool={initialPool}
        initialBpm={initialBpm}
      />
    );
  }

  return (
    <SingleModeScreen
      exercise={exercise}
      notation={notation}
      metronomeSound={metronomeSound}
      onExit={onExit}
      lessonSlug={lessonSlug}
      initialPool={initialPool}
      initialBpm={initialBpm}
    />
  );
}
