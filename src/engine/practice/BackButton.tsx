// Ends the session (confidence prompt, then summary), presented as a clear
// icon in the top strip. An X rather than a back-arrow, since an arrow
// reads too much like the note navigator's prev/next arrows (Robin's call).
export function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="End session"
      className="flex h-11 w-11 items-center justify-center rounded-full"
      style={{ color: "var(--color-ink-secondary)" }}
    >
      <svg viewBox="0 0 24 24" width="20" height="20">
        <path
          d="M5 5l14 14M19 5 5 19"
          stroke="currentColor"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
