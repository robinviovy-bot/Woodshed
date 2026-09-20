import type { Confidence, Pool } from "@/types/database";

export const POOL_LABELS: Record<Pool, string> = {
  naturals: "Naturals",
  accidentals: "Accidentals",
  chromatic: "Chromatic",
  complete: "Complete",
};

export const CONFIDENCE_OPTIONS: Confidence[] = ["rough", "ok", "solid"];
export const CONFIDENCE_LABELS: Record<Confidence, string> = {
  rough: "Rough",
  ok: "OK",
  solid: "Solid",
};

export function pluralize(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

export function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}
