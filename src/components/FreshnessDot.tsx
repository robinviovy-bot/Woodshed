// Freshness scale from SPEC.md section 5. Reads as a fade from sage toward
// neutral -- never a hard on/off state -- so a neglected drill visibly loses
// color rather than turning a "wrong" color.
export type Freshness = "fresh" | "warm" | "fading" | "cold" | "untouched";

const FRESHNESS_STYLE: Record<Freshness, { backgroundColor: string }> = {
  fresh: { backgroundColor: "var(--color-success)" },
  warm: {
    backgroundColor: "color-mix(in srgb, var(--color-success) 55%, var(--color-neutral-fill))",
  },
  fading: {
    backgroundColor: "color-mix(in srgb, var(--color-success) 25%, var(--color-neutral-fill))",
  },
  cold: { backgroundColor: "var(--color-neutral-fill)" },
  untouched: { backgroundColor: "var(--color-neutral-fill)" },
};

export function FreshnessDot({ freshness }: { freshness: Freshness }) {
  return (
    <span
      className="inline-block h-2.5 w-2.5 rounded-full"
      style={FRESHNESS_STYLE[freshness]}
      aria-label={freshness}
      title={freshness}
    />
  );
}
