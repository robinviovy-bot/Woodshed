// "Play the first going up across the 6 strings, the second coming down"
// (SPEC.md section 4, exercises 3 and 4). Up/down here means string
// traversal direction, not pitch.
export function DirectionArrow({ direction }: { direction: "up" | "down" }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" style={{ color: "var(--color-ink-muted)" }}>
      <path
        d={direction === "up" ? "M6 15l6-6 6 6" : "M6 9l6 6 6-6"}
        stroke="currentColor"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
