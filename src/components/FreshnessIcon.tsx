import type { FreshnessState } from "@/lib/freshness";

// SPEC.md section 5: "a single flame whose vividness scales continuously
// through warming up, hot, cooling down, and cool" (never the cold
// blue-gray section 10 rules out elsewhere), and cold breaks from the
// metaphor entirely into a snowflake, rendered in the same warm-neutral
// tones as the rest of the palette rather than literal ice blue.
const FLAME_OPACITY: Record<Exclude<FreshnessState, "cold">, number> = {
  hot: 1,
  warming_up: 0.75,
  cooling_down: 0.45,
  cool: 1,
};

export function FreshnessIcon({ state, size = 20 }: { state: FreshnessState; size?: number }) {
  if (state === "cold") {
    return (
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="none"
        stroke="var(--color-neutral-fill)"
        strokeWidth="1.75"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M12,3 L12,21" />
        <path d="M4.8,7.5 L19.2,16.5" />
        <path d="M19.2,7.5 L4.8,16.5" />
      </svg>
    );
  }

  // "Cool" is a faint flame in the neutral-fill tone rather than the flame
  // color, per the palette table; the other three states share the flame
  // color at increasing opacity.
  const color = state === "cool" ? "var(--color-neutral-fill)" : "var(--color-flame)";

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={color}
      opacity={FLAME_OPACITY[state]}
      aria-hidden="true"
    >
      <path d="M12,2 C8,7 5.5,10 5.5,14 a6.5,6.5 0 0 0 13,0 c0,-3 -1.5,-5.5 -3.5,-7.5 c0.6,2.5 -0.4,4.5 -1.8,5 c0.8,-3 -0.2,-6 -1.7,-9.5 Z" />
    </svg>
  );
}
