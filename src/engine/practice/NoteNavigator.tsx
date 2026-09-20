import { NoteDisplay } from "@/engine/practice/NoteDisplay";

function ArrowButton({
  direction,
  onClick,
  disabled,
}: {
  direction: "left" | "right";
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === "left" ? "Previous note" : "Next note"}
      className="flex h-11 w-11 items-center justify-center rounded-full disabled:opacity-0"
      style={{ color: "var(--color-ink-secondary)" }}
    >
      <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
        {direction === "left" ? (
          <path d="M15 4 7 12l8 8" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <path d="M9 4l8 8-8 8" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        )}
      </svg>
    </button>
  );
}

// Replaces separate bottom-dock Skip/Next buttons: the note itself is
// flanked by small arrows, so moving through notes happens right where
// you're looking instead of down at the dock (Robin's call).
export function NoteNavigator({
  pitchClass,
  notation,
  canGoBack,
  onPrevious,
  onNext,
}: {
  pitchClass: number;
  notation: string;
  canGoBack: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <ArrowButton direction="left" onClick={onPrevious} disabled={!canGoBack} />
      <NoteDisplay pitchClass={pitchClass} notation={notation} />
      <ArrowButton direction="right" onClick={onNext} />
    </div>
  );
}
