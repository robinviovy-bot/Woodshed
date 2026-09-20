import { Link } from "react-router-dom";
import { Button } from "@/components/Button";
import { SegmentedControl } from "@/components/SegmentedControl";
import { POOL_DESCRIPTIONS, POOL_LABELS } from "@/engine/practice/shared";
import type { Exercise, Pool } from "@/types/database";

// Shared setup screen for every mode: pick a pool, then start. Nothing
// exercise-mode-specific lives here.
export function ExerciseSetup({
  exercise,
  pool,
  onPoolChange,
  onStart,
}: {
  exercise: Exercise;
  pool: Pool;
  onPoolChange: (pool: Pool) => void;
  onStart: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-screen max-w-[480px] flex-col justify-center gap-8 px-6 py-10">
      <div>
        <h1 className="font-display text-3xl">{exercise.title}</h1>
        {exercise.description && (
          <p className="mt-1 text-sm text-ink-secondary">{exercise.description}</p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-sm text-ink-secondary">Pool</span>
        <SegmentedControl
          value={pool}
          options={exercise.available_pools}
          labels={POOL_LABELS}
          onChange={onPoolChange}
          wrap
        />
        <p className="text-xs text-ink-muted">{POOL_DESCRIPTIONS[pool]}</p>
      </div>
      <Button onClick={onStart}>Start</Button>
      <Link to="/home" className="text-center text-sm text-ink-muted">
        Back to Home
      </Link>
    </div>
  );
}
