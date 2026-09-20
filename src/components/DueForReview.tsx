import { Link } from "react-router-dom";
import { PoolBadge } from "@/components/PoolBadge";
import { Section } from "@/components/Section";
import type { Pool } from "@/types/database";

export interface DueForReviewItem {
  exerciseSlug: string;
  exerciseTitle: string;
  bpm: number | null;
  pool: Pool;
  relativeDate: string;
}

// SPEC.md section 7: "up to three of the stalest drills already practiced
// at least once, each a one tap row... Hide this block entirely when
// nothing has gone stale enough to surface." Each row deep-links straight
// into practicing that exact pool (and BPM, when the exercise uses one),
// skipping ExerciseSetup -- true to "one tap."
export function DueForReview({ items }: { items: DueForReviewItem[] }) {
  if (items.length === 0) return null;

  return (
    <Section title="Due for review">
      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <Link
            key={`${item.exerciseSlug}-${item.pool}-${item.bpm}`}
            to={`/practice/${item.exerciseSlug}?pool=${item.pool}${
              item.bpm !== null ? `&bpm=${item.bpm}` : ""
            }`}
            className="flex items-center justify-between gap-3 rounded-card border border-line p-4"
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-sm">{item.exerciseTitle}</span>
              <span className="text-xs text-ink-muted">{item.relativeDate}</span>
            </div>
            <div className="flex items-center gap-2">
              {item.bpm !== null && (
                <span className="font-mono font-numeric text-sm text-ink-secondary">{item.bpm} BPM</span>
              )}
              <PoolBadge pool={item.pool} />
            </div>
          </Link>
        ))}
      </div>
    </Section>
  );
}
