import { DirectionArrow } from "@/engine/practice/DirectionArrow";
import { getNoteDisplay } from "@/engine/practice/notes";

// The "Start test" run (exercise 4): one big note at a time instead of the
// whole sequence at once, with the upcoming note shown small alongside it
// so there's a moment to prepare before it becomes current (per Robin).
export function SequenceTestDisplay({
  sequence,
  noteIndex,
  notation,
}: {
  sequence: number[];
  noteIndex: number;
  notation: string;
}) {
  const current = getNoteDisplay(sequence[noteIndex], notation);
  const nextIndex = noteIndex + 1;
  const next = nextIndex < sequence.length ? getNoteDisplay(sequence[nextIndex], notation) : null;

  return (
    <div className="flex items-center justify-center gap-6">
      <div className="flex flex-col items-center gap-1">
        <DirectionArrow direction={noteIndex % 2 === 0 ? "up" : "down"} />
        <span className="font-display text-7xl leading-none">{current.primary}</span>
        <span className="text-sm text-ink-muted">{current.secondary}</span>
      </div>
      {next && (
        <div className="flex flex-col items-center gap-1 opacity-50">
          <DirectionArrow direction={nextIndex % 2 === 0 ? "up" : "down"} />
          <span className="font-display text-2xl leading-none">{next.primary}</span>
          <span className="text-xs text-ink-muted">{next.secondary}</span>
        </div>
      )}
    </div>
  );
}
