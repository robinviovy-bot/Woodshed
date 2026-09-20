import type { Pool } from "@/types/database";

// Pitch classes 0-11 (C=0, chromatic upward). SPEC.md section 3 defines
// naturals as the 7 natural notes and accidentals as the 5 remaining ones,
// each always shown with both enharmonic spellings.
interface NaturalNote {
  pitchClass: number;
  en: string;
  fr: string;
}

interface AccidentalNote {
  pitchClass: number;
  enSharp: string;
  enFlat: string;
  frSharp: string;
  frFlat: string;
}

const NATURALS: NaturalNote[] = [
  { pitchClass: 0, en: "C", fr: "do" },
  { pitchClass: 2, en: "D", fr: "ré" },
  { pitchClass: 4, en: "E", fr: "mi" },
  { pitchClass: 5, en: "F", fr: "fa" },
  { pitchClass: 7, en: "G", fr: "sol" },
  { pitchClass: 9, en: "A", fr: "la" },
  { pitchClass: 11, en: "B", fr: "si" },
];

const ACCIDENTALS: AccidentalNote[] = [
  { pitchClass: 1, enSharp: "C#", enFlat: "Db", frSharp: "do#", frFlat: "réb" },
  { pitchClass: 3, enSharp: "D#", enFlat: "Eb", frSharp: "ré#", frFlat: "mib" },
  { pitchClass: 6, enSharp: "F#", enFlat: "Gb", frSharp: "fa#", frFlat: "solb" },
  { pitchClass: 8, enSharp: "G#", enFlat: "Ab", frSharp: "sol#", frFlat: "lab" },
  { pitchClass: 10, enSharp: "A#", enFlat: "Bb", frSharp: "la#", frFlat: "sib" },
];

export const NATURAL_PITCH_CLASSES = NATURALS.map((n) => n.pitchClass);
export const ACCIDENTAL_PITCH_CLASSES = ACCIDENTALS.map((n) => n.pitchClass);
export const ALL_PITCH_CLASSES = [...NATURAL_PITCH_CLASSES, ...ACCIDENTAL_PITCH_CLASSES].sort(
  (a, b) => a - b,
);

export function getPitchClassesForPool(pool: Pool): number[] {
  switch (pool) {
    case "naturals":
      return NATURAL_PITCH_CLASSES;
    case "accidentals":
      return ACCIDENTAL_PITCH_CLASSES;
    case "chromatic":
    case "complete":
      return ALL_PITCH_CLASSES;
  }
}

export interface NoteDisplay {
  primary: string;
  secondary: string;
}

// Setup-time choice (per Robin): showing an accidental's full "C# / Db"
// dual spelling everywhere was too wide and kept wrapping on a phone,
// especially with several accidentals on screen at once (the accidentals
// pool, or a pair/sequence that happens to draw more than one). Instead
// the player picks up front whether they want sharps, flats, or both --
// "both" re-rolls sharp-vs-flat at random each time a note is drawn
// (resolveSpelling below), not a fixed choice for the whole session, so
// they still see every spelling over time.
export type AccidentalSpelling = "sharp" | "flat" | "both";

export function resolveSpelling(spelling: AccidentalSpelling): boolean {
  if (spelling === "sharp") return true;
  if (spelling === "flat") return false;
  return Math.random() < 0.5;
}

// "primary" is whatever notation the profile prefers, "secondary" the
// other one underneath in muted text, per SPEC.md section 7's practice
// screen ("a big 'C' with 'do' underneath"). For an accidental, `preferSharp`
// (resolved once per drawn note -- see useSpellingChoices -- not
// recomputed on every render) picks which single spelling to show.
export function getNoteDisplay(pitchClass: number, notation: string, preferSharp = true): NoteDisplay {
  const natural = NATURALS.find((n) => n.pitchClass === pitchClass);
  if (natural) {
    return notation === "fr"
      ? { primary: natural.fr, secondary: natural.en }
      : { primary: natural.en, secondary: natural.fr };
  }

  const accidental = ACCIDENTALS.find((a) => a.pitchClass === pitchClass);
  if (!accidental) throw new Error(`Unknown pitch class: ${pitchClass}`);

  const en = preferSharp ? accidental.enSharp : accidental.enFlat;
  const fr = preferSharp ? accidental.frSharp : accidental.frFlat;
  return notation === "fr" ? { primary: fr, secondary: en } : { primary: en, secondary: fr };
}

// Shared by the pair (exercise 3) and sequence (exercise 4) mode handlers,
// which both draw fresh notes on demand rather than consuming a queue.
export function drawRandomFrom(options: number[], exclude?: number): number {
  if (options.length <= 1) return options[0];
  let choice: number;
  do {
    choice = options[Math.floor(Math.random() * options.length)];
  } while (choice === exclude);
  return choice;
}

export function drawDistinctPair(options: number[]): [number, number] {
  const first = drawRandomFrom(options);
  const second = drawRandomFrom(options, first);
  return [first, second];
}

export function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
