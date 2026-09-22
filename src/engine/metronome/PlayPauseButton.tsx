import { useEffect } from "react";

// Fully round per SPEC.md section 10's layout rules ("fully round on the
// metronome button and the rep circles"). Space bar toggles play/pause on
// desktop wherever this renders -- guarded against firing while focus is
// in a text field, since none of the screens that render this ever have
// one active at the same time, but a stray future one shouldn't hijack
// spacebar typing.
export function PlayPauseButton({
  isPlaying,
  onToggle,
}: {
  isPlaying: boolean;
  onToggle: () => void;
}) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.code !== "Space") return;
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      event.preventDefault();
      onToggle();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onToggle]);

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
