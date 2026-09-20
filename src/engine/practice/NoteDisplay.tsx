import { getNoteDisplay } from "@/engine/practice/notes";

// SPEC.md section 7: "The target note in very large type, readable from
// one meter away... with the other notation in small muted text beneath
// it (for example a big 'C' with 'do' underneath)."
export function NoteDisplay({
  pitchClass,
  notation,
  preferSharp,
}: {
  pitchClass: number;
  notation: string;
  preferSharp: boolean;
}) {
  const { primary, secondary } = getNoteDisplay(pitchClass, notation, preferSharp);
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="font-display text-8xl leading-none">{primary}</span>
      <span className="text-lg text-ink-muted">{secondary}</span>
    </div>
  );
}
