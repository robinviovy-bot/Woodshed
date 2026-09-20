// Outline icon, no fill: classic mechanical metronome viewed from the
// front (trapezoidal case with small feet, a base line, the printed tempo
// scale as tick marks on the central shaft, and the pendulum arm leaning
// right with its weight). Uses currentColor so it follows --color-ink and
// adapts automatically between light and dark themes.
export function MetronomeIcon({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="0.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ color: "var(--color-ink)" }}
      aria-hidden="true"
    >
      <path d="M9,3 L15,3 L19,20 L5,20 Z" />
      <path d="M5.7,17 L18.3,17" />
      <path d="M5,20 L5,22 M3.5,22 L6.5,22" />
      <path d="M19,20 L19,22 M17.5,22 L20.5,22" />
      <path d="M12,4 L12,18" />
      <path d="M10.5,7.5 L13.5,7.5" />
      <path d="M10.5,11 L13.5,11" />
      <path d="M10.5,14.5 L13.5,14.5" />
      <path d="M12,18 L16.5,5.5" />
      <circle cx="16.5" cy="5.5" r="1.4" />
    </svg>
  );
}
