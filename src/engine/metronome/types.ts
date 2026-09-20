// Time signatures from SPEC.md section 7. Each beat gets one dot in the
// beat indicator, so "beats per bar" is just the signature's top number.
export type TimeSignature = "4/4" | "3/4" | "2/4" | "6/8" | "5/4" | "7/8";

export const TIME_SIGNATURES: TimeSignature[] = ["4/4", "3/4", "2/4", "6/8", "5/4", "7/8"];

export const BEATS_PER_BAR: Record<TimeSignature, number> = {
  "4/4": 4,
  "3/4": 3,
  "2/4": 2,
  "6/8": 6,
  "5/4": 5,
  "7/8": 7,
};

export type MetronomeSound = "click" | "beep";

export const MIN_BPM = 30;
export const MAX_BPM = 240;
