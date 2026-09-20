import { shiftDay } from "@/lib/dates";

const WEEKS = 8;
const DAYS_PER_WEEK = 7;

// SPEC.md section 7: "8 week calendar heatmap of practiced days... a day
// is warm as soon as anything inside the program was practiced that day."
// `practicedDays` is the set of YYYY-MM-DD days (already scoped to one
// program) that had at least one non-rest-day daily_activity row.
export function ActivityHeatmap({ today, practicedDays }: { today: string; practicedDays: Set<string> }) {
  const totalDays = WEEKS * DAYS_PER_WEEK;
  const days = Array.from({ length: totalDays }, (_, i) => shiftDay(today, i - (totalDays - 1)));
  const weeks = Array.from({ length: WEEKS }, (_, w) => days.slice(w * DAYS_PER_WEEK, (w + 1) * DAYS_PER_WEEK));

  return (
    <div className="flex gap-1">
      {weeks.map((week, i) => (
        <div key={i} className="flex flex-col gap-1">
          {week.map((day) => (
            <span
              key={day}
              className="h-3 w-3 rounded-sm"
              style={{
                backgroundColor: practicedDays.has(day) ? "var(--color-success)" : "var(--color-line)",
              }}
              title={day}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
