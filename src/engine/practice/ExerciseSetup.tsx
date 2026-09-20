import { Link } from "react-router-dom";
import { Button } from "@/components/Button";
import { SegmentedControl } from "@/components/SegmentedControl";
import type { AccidentalSpelling } from "@/engine/practice/notes";
import {
  ACCIDENTAL_SPELLING_LABELS,
  POOL_DESCRIPTIONS,
  POOL_LABELS,
} from "@/engine/practice/shared";
import type { Exercise, Pool } from "@/types/database";

const ACCIDENTAL_SPELLING_OPTIONS: AccidentalSpelling[] = ["sharp", "flat", "both"];

// Shared setup screen for every mode: pick a pool, then start. Nothing
// exercise-mode-specific lives here.
export function ExerciseSetup({
  exercise,
  pool,
  onPoolChange,
  accidentalSpelling,
  onAccidentalSpellingChange,
  onStart,
}: {
  exercise: Exercise;
  pool: Pool;
  onPoolChange: (pool: Pool) => void;
  accidentalSpelling: AccidentalSpelling;
  onAccidentalSpellingChange: (spelling: AccidentalSpelling) => void;
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
      {pool !== "naturals" && (
        <div className="flex flex-col gap-2">
          <span className="text-sm text-ink-secondary">Accidentals</span>
          <SegmentedControl
            value={accidentalSpelling}
            options={ACCIDENTAL_SPELLING_OPTIONS}
            labels={ACCIDENTAL_SPELLING_LABELS}
            onChange={onAccidentalSpellingChange}
            wrap
          />
          <p className="text-xs text-ink-muted">
            {accidentalSpelling === "both"
              ? "Sharps and flats, mixed at random."
              : `Always shown as ${ACCIDENTAL_SPELLING_LABELS[accidentalSpelling].toLowerCase()}.`}
          </p>
        </div>
      )}
      <Button onClick={onStart}>Start</Button>
      <Link to="/home" className="text-center text-sm text-ink-muted">
        Back to Home
      </Link>
    </div>
  );
}
