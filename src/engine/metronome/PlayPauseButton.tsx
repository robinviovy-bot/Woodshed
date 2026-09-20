// Fully round per SPEC.md section 10's layout rules ("fully round on the
// metronome button and the rep circles").
export function PlayPauseButton({
  isPlaying,
  onToggle,
}: {
  isPlaying: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isPlaying ? "Pause metronome" : "Start metronome"}
      className="flex h-16 w-16 items-center justify-center rounded-full"
      style={{ backgroundColor: "var(--color-accent)" }}
    >
      <svg viewBox="0 0 24 24" width="26" height="26" fill="var(--color-background)">
        {isPlaying ? (
          <>
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </>
        ) : (
          <path d="M8 5v14l11-7z" />
        )}
      </svg>
    </button>
  );
}
