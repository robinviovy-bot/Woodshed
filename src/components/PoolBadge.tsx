// Note pools from SPEC.md section 3.
export type Pool = "naturals" | "accidentals" | "chromatic" | "complete";

const POOL_LETTER: Record<Pool, string> = {
  naturals: "N",
  accidentals: "A",
  chromatic: "X",
  complete: "C",
};

export function PoolBadge({ pool }: { pool: Pool }) {
  return (
    <span
      className="font-mono font-numeric inline-flex h-6 w-6 items-center justify-center rounded-control border text-xs"
      style={{ borderColor: "var(--color-line)", color: "var(--color-ink-secondary)" }}
    >
      {POOL_LETTER[pool]}
    </span>
  );
}
