import { useNavigate } from "react-router-dom";

// Goes up one level in the screen hierarchy (lesson list -> home, exercise
// config -> lesson list), by route rather than browser history, so it's
// correct even landing on a direct URL or from a PWA home-screen launch.
// Visually distinct from BackButton's X (which ends an active practice
// session) -- this one's a plain chevron, never shown on the practicing
// screen itself.
export function BackNav({ to, label = "Back" }: { to: string; label?: string }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      aria-label={label}
      className="flex h-11 w-11 items-center justify-center rounded-full"
      style={{ color: "var(--color-ink-secondary)" }}
    >
      <svg viewBox="0 0 24 24" width="20" height="20">
        <path
          d="M15 5 8 12l7 7"
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
