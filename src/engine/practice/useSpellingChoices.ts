import { useMemo } from "react";
import { resolveSpelling, type AccidentalSpelling } from "@/engine/practice/notes";

// Resolves `count` sharp/flat choices, re-rolling only when `key` changes
// (a stable value identifying "this drawn note/pair/sequence" -- history
// index, pairs covered, sequences covered) rather than on every render,
// so "both" mode doesn't flicker between spellings while the metronome
// or other unrelated state ticks. Natural notes ignore the result; a
// value is still produced for every position since callers don't know in
// advance which positions land on an accidental.
export function useSpellingChoices(
  spelling: AccidentalSpelling,
  count: number,
  key: unknown,
): boolean[] {
  return useMemo(() => {
    // `key` isn't read here -- it exists purely to force a re-roll when it
    // changes (a new note/pair/sequence was drawn). This `void` keeps the
    // linter from flagging it as an "unused" dependency.
    void key;
    return Array.from({ length: count }, () => resolveSpelling(spelling));
  }, [spelling, count, key]);
}
