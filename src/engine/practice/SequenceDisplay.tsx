import { DirectionArrow } from "@/engine/practice/DirectionArrow";
import { getNoteDisplay } from "@/engine/practice/notes";

// SPEC.md section 7: "lays its sequence out with alternating up and down
// arrows, wrapping to two rows in complete mode so 12 notes stay readable
// at arm's length." Sized so 7 notes fit in one row and 12 (complete)
// naturally wrap to two, without forcing an exact split.
export function SequenceDisplay({
  sequence,
  notation,
}: {
  sequence: number[];
  notation: string;
}) {
  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-6">
      {sequence.map((pitchClass, index) => {
        const { primary, secondary } = getNoteDisplay(pitchClass, notation);
        return (
          <div key={index} className="flex flex-col items-center gap-1">
            <DirectionArrow direction={index % 2 === 0 ? "up" : "down"} />
            <span className="font-display text-3xl leading-none">{primary}</span>
            <span className="text-xs text-ink-muted">{secondary}</span>
          </div>
        );
      })}
    </div>
  );
}
