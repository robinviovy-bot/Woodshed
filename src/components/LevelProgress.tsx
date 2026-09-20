// SPEC.md section 6: cumulative XP required for level n is 500*n*(n-1)/2
// (0, 500, 1500, 3000... at n = 1, 2, 3, 4). The bar fills across the
// current level's own span, not total XP overall.
function xpThreshold(level: number): number {
  return 250 * level * (level - 1);
}

export function LevelProgress({ level, totalXp }: { level: number; totalXp: number }) {
  const floor = xpThreshold(level);
  const ceiling = xpThreshold(level + 1);
  const progress = Math.min(1, (totalXp - floor) / (ceiling - floor));
  const xpToNext = ceiling - totalXp;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between text-sm">
        <span>Level {level}</span>
        <span className="text-ink-muted">{xpToNext} XP to next level</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: "var(--color-line)" }}>
        <div
          className="h-full rounded-full bg-accent"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  );
}
