import { DirectionArrow } from "@/engine/practice/DirectionArrow";
import { getNoteDisplay } from "@/engine/practice/notes";

// SPEC.md section 7: "Exercise 3 shows both notes with an up arrow and a
// down arrow." First note goes up across the strings, second comes down.
export function PairDisplay({
  firstNote,
  secondNote,
  notation,
  preferSharp,
}: {
  firstNote: number;
  secondNote: number;
  notation: string;
  preferSharp: [boolean, boolean];
}) {
  const first = getNoteDisplay(firstNote, notation, preferSharp[0]);
  const second = getNoteDisplay(secondNote, notation, preferSharp[1]);

  return (
    <div className="flex items-center gap-10">
      <div className="flex flex-col items-center gap-2">
        <DirectionArrow direction="up" />
        <span className="font-display text-6xl leading-none">{first.primary}</span>
        <span className="text-base text-ink-muted">{first.secondary}</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <DirectionArrow direction="down" />
        <span className="font-display text-6xl leading-none">{second.primary}</span>
        <span className="text-base text-ink-muted">{second.secondary}</span>
      </div>
    </div>
  );
}
