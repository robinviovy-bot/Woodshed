import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { LoadingScreen } from "@/components/LoadingScreen";
import type { MetronomeSound } from "@/engine/metronome/types";
import { PairModeScreen } from "@/engine/practice/PairModeScreen";
import { SequenceModeScreen } from "@/engine/practice/SequenceModeScreen";
import { SingleModeScreen } from "@/engine/practice/SingleModeScreen";
import { supabase } from "@/lib/supabase";
import type { Exercise, Pool } from "@/types/database";

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
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadExercise() {
      const { data, error } = await supabase
        .from("exercises")
        .select("*")
        .eq("slug", slug)
        .single();
      if (cancelled) return;
      if (error || !data) {
        setLoadError(true);
        return;
      }
      setExercise(data as Exercise);
    }
    loadExercise();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loadError) {
    return (
      <div className="mx-auto flex min-h-screen max-w-[480px] flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-ink-secondary">Couldn't load that exercise.</p>
        <Link to="/home" className="text-accent">
          Back to Home
        </Link>
      </div>
    );
  }

  if (!exercise) return <LoadingScreen />;

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
      initialPool={initialPool}
      initialBpm={initialBpm}
    />
  );
}
