import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { getLocalDay } from "@/lib/dates";
import { supabase } from "@/lib/supabase";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function firstWeekday(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

// Replaces the old 8 week heatmap on Home, per Robin: a real month-by-month
// calendar instead, opened by tapping the streak badge. Reads the same
// per-program daily_activity data (SPEC.md section 7: "a day is warm as
// soon as anything inside the program was practiced that day"), just laid
// out as an actual calendar grid rather than a compact square grid.
export function Calendar() {
  const { user, profile } = useAuth();
  const today = getLocalDay(profile?.timezone ?? null);
  const [todayYear, todayMonth] = today.split("-").map(Number);

  const [year, setYear] = useState(todayYear);
  const [month, setMonth] = useState(todayMonth - 1); // 0-indexed
  const [practicedDays, setPracticedDays] = useState<Set<string>>(new Set());

  const isCurrentMonth = year === todayYear && month === todayMonth - 1;

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function loadMonth() {
      const { data: program } = await supabase
        .from("programs")
        .select("id")
        .eq("slug", "fretboard-101")
        .maybeSingle();
      if (cancelled || !program) return;

      const from = `${year}-${pad(month + 1)}-01`;
      const to = `${year}-${pad(month + 1)}-${pad(daysInMonth(year, month))}`;

      const { data } = await supabase
        .from("daily_activity")
        .select("day")
        .eq("user_id", user!.id)
        .eq("program_id", program.id)
        .eq("is_rest_day", false)
        .gte("day", from)
        .lte("day", to);

      if (cancelled) return;
      setPracticedDays(new Set((data ?? []).map((row) => row.day as string)));
    }

    loadMonth();
    return () => {
      cancelled = true;
    };
  }, [user, year, month]);

  function goPrevious() {
    if (month === 0) {
      setYear(year - 1);
      setMonth(11);
    } else {
      setMonth(month - 1);
    }
  }

  function goNext() {
    if (isCurrentMonth) return;
    if (month === 11) {
      setYear(year + 1);
      setMonth(0);
    } else {
      setMonth(month + 1);
    }
  }

  const leadingBlanks = Array.from({ length: firstWeekday(year, month) }, (_, i) => i);
  const days = Array.from({ length: daysInMonth(year, month) }, (_, i) => i + 1);

  return (
    <div className="mx-auto flex min-h-screen max-w-[480px] flex-col gap-8 px-6 py-10">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={goPrevious}
          aria-label="Previous month"
          className="flex h-9 w-9 items-center justify-center rounded-control border border-line text-ink-secondary"
        >
          ‹
        </button>
        <h1 className="font-display text-2xl">
          {MONTH_NAMES[month]} {year}
        </h1>
        <button
          type="button"
          onClick={goNext}
          aria-label="Next month"
          disabled={isCurrentMonth}
          className="flex h-9 w-9 items-center justify-center rounded-control border border-line text-ink-secondary disabled:opacity-30"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-2 text-center">
        {WEEKDAY_LABELS.map((label, i) => (
          <span key={i} className="text-xs text-ink-muted">
            {label}
          </span>
        ))}
        {leadingBlanks.map((i) => (
          <span key={`blank-${i}`} />
        ))}
        {days.map((day) => {
          const dayString = `${year}-${pad(month + 1)}-${pad(day)}`;
          const practiced = practicedDays.has(dayString);
          const isToday = dayString === today;
          return (
            <div
              key={day}
              className="flex aspect-square items-center justify-center rounded-full text-sm"
              style={{
                backgroundColor: practiced ? "var(--color-success)" : "transparent",
                color: practiced ? "var(--color-background)" : "var(--color-ink)",
                boxShadow: isToday && !practiced ? "inset 0 0 0 1px var(--color-accent)" : undefined,
              }}
            >
              {day}
            </div>
          );
        })}
      </div>

      <Link to="/home" className="text-center text-sm text-ink-muted">
        Back to Home
      </Link>
    </div>
  );
}
