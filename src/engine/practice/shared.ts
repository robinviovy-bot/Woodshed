import type { Pool } from "@/types/database";

export const POOL_LABELS: Record<Pool, string> = {
  naturals: "Naturals",
  accidentals: "Accidentals",
  chromatic: "Chromatic",
  complete: "Complete",
};

// Plain-language, notation-independent (no note letters, since those'd
// need to switch between EN/FR spelling too) -- shown on ExerciseSetup so
// picking a pool doesn't require already knowing music theory jargon.
export const POOL_DESCRIPTIONS: Record<Pool, string> = {
  naturals: "The 7 natural notes, no sharps or flats.",
  accidentals: "The 5 sharp and flat notes.",
  chromatic: "All 12 notes, picked at random each time.",
  complete: "All 12 notes, each one played exactly once before repeating.",
};

export function pluralize(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

export function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}
