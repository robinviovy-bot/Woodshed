import { Button } from "@/components/Button";
import { BackNav } from "@/components/BackNav";
import { SegmentedControl } from "@/components/SegmentedControl";
import { Section } from "@/components/Section";
import { Toggle } from "@/components/Toggle";
import { BpmStepper } from "@/engine/metronome/BpmStepper";
import { TimeSignaturePicker } from "@/engine/metronome/TimeSignaturePicker";
import type { TimeSignature } from "@/engine/metronome/types";
import type { AccidentalSpelling } from "@/engine/practice/notes";
import {
  ACCIDENTAL_SPELLING_LABELS,
  POOL_DESCRIPTIONS,
  POOL_LABELS,
} from "@/engine/practice/shared";
import type { Exercise, Pool } from "@/types/database";

const ACCIDENTAL_SPELLING_OPTIONS: AccidentalSpelling[] = ["sharp", "flat", "both"];

// Shared setup screen for every mode: pick a pool and the metronome
// settings for this exercise, then start. Nothing exercise-mode-specific
// lives here.
export function ExerciseSetup({
  exercise,
  lessonSlug,
  pool,
  onPoolChange,
  accidentalSpelling,
  onAccidentalSpellingChange,
  metronomeEnabled,
  onMetronomeEnabledChange,
  bpm,
  onBpmChange,
  timeSignature,
  onTimeSignatureChange,
  onStart,
}: {
  exercise: Exercise;
  lessonSlug: string;
  pool: Pool;
  onPoolChange: (pool: Pool) => void;
  accidentalSpelling: AccidentalSpelling;
  onAccidentalSpellingChange: (spelling: AccidentalSpelling) => void;
  metronomeEnabled: boolean;
  onMetronomeEnabledChange: (enabled: boolean) => void;
  bpm: number;
  onBpmChange: (bpm: number) => void;
  timeSignature: TimeSignature;
  onTimeSignatureChange: (timeSignature: TimeSignature) => void;
  onStart: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-screen max-w-[480px] flex-col gap-8 px-6 py-6">
      <BackNav to={`/lessons/${lessonSlug}`} label="Back to lesson" />

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

      <Section title="Metronome">
        <div className="flex min-h-11 items-center justify-between">
          <span className="text-sm">Metronome</span>
          <Toggle checked={metronomeEnabled} onChange={onMetronomeEnabledChange} label="Metronome" />
        </div>
        {metronomeEnabled && (
          <div className="flex flex-col items-center gap-4">
            <BpmStepper bpm={bpm} onChange={onBpmChange} />
            <TimeSignaturePicker value={timeSignature} onChange={onTimeSignatureChange} />
          </div>
        )}
      </Section>

      <Button onClick={onStart}>Start</Button>
    </div>
  );
}
