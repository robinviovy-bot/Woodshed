// SPEC.md section 7: "one dot per beat... downbeat dot larger, current beat
// filled in accent color" and "changes brightness only, no motion that
// pulls the eye away from the note."
export function BeatIndicator({
  beatsPerBar,
  currentBeat,
}: {
  beatsPerBar: number;
  currentBeat: number;
}) {
  return (
    <div className="flex items-center gap-3">
      {Array.from({ length: beatsPerBar }, (_, beat) => {
        const isDownbeat = beat === 0;
        const isCurrent = beat === currentBeat;
        return (
          <span
            key={beat}
            className="rounded-full transition-colors duration-150"
            style={{
              width: isDownbeat ? 14 : 10,
              height: isDownbeat ? 14 : 10,
              backgroundColor: isCurrent ? "var(--color-accent)" : "var(--color-neutral-fill)",
            }}
          />
        );
      })}
    </div>
  );
}
