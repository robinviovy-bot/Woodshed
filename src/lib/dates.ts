// Calendar-day helpers shared by the streak write path (lib/sessions.ts)
// and the freshness read path (lib/freshness.ts), so "today" and "days
// since" always mean the same thing in both places.

// "Today" in the user's own timezone, as a plain YYYY-MM-DD date (matching
// every date column in the schema) rather than a UTC-shifted one -- a
// session started at 11pm local time must count for that local day, not
// whatever day it happens to be in UTC. Falls back to the browser's own
// timezone if the profile hasn't captured one yet.
export function getLocalDay(timezone: string | null): string {
  const tz = timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

// Whole calendar days between two YYYY-MM-DD strings (b - a), treating
// both as UTC midnight purely so subtraction gives a clean day count --
// the values themselves already came from getLocalDay, so no further
// timezone conversion applies here.
export function daysBetween(a: string, b: string): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / msPerDay);
}

export function shiftDay(day: string, deltaDays: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + deltaDays);
  return date.toISOString().slice(0, 10);
}

// Plain text, no colored dot (SPEC.md section 7's "Due for review" row --
// freshness no longer exists at the drill level).
export function formatRelativeDate(day: string, today: string): string {
  const gap = daysBetween(day, today);
  if (gap === 0) return "Today";
  if (gap === 1) return "Yesterday";
  if (gap < 7) return `${gap} days ago`;
  if (gap < 14) return "1 week ago";
  if (gap < 30) return `${Math.floor(gap / 7)} weeks ago`;
  if (gap < 60) return "1 month ago";
  return `${Math.floor(gap / 30)} months ago`;
}
