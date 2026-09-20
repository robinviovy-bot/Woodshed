import { useState } from "react";
import { ALL_PITCH_CLASSES, getPitchClassesForPool, shuffle } from "@/engine/practice/notes";
import type { Pool } from "@/types/database";

type Phase = "active" | "roundComplete";

function drawRandomPitchClass(exclude?: number): number {
  if (ALL_PITCH_CLASSES.length <= 1) return ALL_PITCH_CLASSES[0];
  let choice: number;
  do {
    choice = ALL_PITCH_CLASSES[Math.floor(Math.random() * ALL_PITCH_CLASSES.length)];
  } while (choice === exclude);
  return choice;
}

// Mode handler for exercises 1 and 2 (mode: 'single', SPEC.md section 4).
// naturals/accidentals are finite pools: shuffled once per "lap" and
// consumed as next() reaches new ground, matching section 7's queue/
// "shuffle again" language. chromatic draws independently at random each
// time instead (section 3: "notes drawn at random from all 12"), so it
// never runs out or reaches a "lap finished" state.
//
// Every note ever shown this session lives in `history`; `historyIndex`
// points at what's on screen. previous()/next() inside that history just
// move the pointer (no new draw, no queue consumed). next() only draws a
// genuinely new note once you're back at the leading edge of history --
// that's what lets you go back to review an earlier note and come forward
// again without losing your place or double-counting it.
//
// No rep tracking here: reps-per-note is an unverified instruction ("play
// it 3 times"), not something tapped/counted, per Robin's call. The
// summary screen derives "reps logged" as notesCovered * reps_target
// instead of tallying anything.
export function useSingleNotePractice(pool: Pool) {
  const isFiniteQueue = pool === "naturals" || pool === "accidentals";
  const poolSize = getPitchClassesForPool(pool).length;

  // One shuffle (or one random draw for chromatic), split into the first
  // card shown and the rest of the lap's queue. Computed once on mount via
  // useState's lazy initializer; the two states below just slice it, so
  // they can never disagree with each other.
  const [initialOrder] = useState<number[]>(() =>
    isFiniteQueue ? shuffle(getPitchClassesForPool(pool)) : [drawRandomPitchClass()],
  );
  const [pendingQueue, setPendingQueue] = useState<number[]>(() => initialOrder.slice(1));
  const [history, setHistory] = useState<number[]>(() => [initialOrder[0]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [lapStartIndex, setLapStartIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("active");
  const [notesCovered, setNotesCovered] = useState(1);

  const currentPitchClass = history[historyIndex];
  const canGoBack = historyIndex > 0;
  // Position within the CURRENT lap of whatever's on screen right now, not
  // how many notes have been drawn total -- those differ once previous()
  // lets you look at an earlier note again.
  const queuePosition = historyIndex - lapStartIndex + 1;

  function next() {
    if (historyIndex < history.length - 1) {
      // Stepping forward into a note already drawn earlier (the user had
      // gone back). Just redisplay it, nothing new to draw or count.
      setHistoryIndex(historyIndex + 1);
      return;
    }

    if (!isFiniteQueue) {
      const drawn = drawRandomPitchClass(currentPitchClass);
      setHistory([...history, drawn]);
      setHistoryIndex(historyIndex + 1);
      setNotesCovered((count) => count + 1);
      return;
    }

    if (pendingQueue.length === 0) {
      setPhase("roundComplete");
      return;
    }

    const [drawn, ...rest] = pendingQueue;
    setPendingQueue(rest);
    setHistory([...history, drawn]);
    setHistoryIndex(historyIndex + 1);
    setNotesCovered((count) => count + 1);
  }

  function previous() {
    if (!canGoBack) return;
    setHistoryIndex(historyIndex - 1);
  }

  function shuffleAgain() {
    const fresh = shuffle(getPitchClassesForPool(pool));
    const [drawn, ...rest] = fresh;
    setPendingQueue(rest);
    setHistory([...history, drawn]);
    setHistoryIndex(history.length);
    setLapStartIndex(history.length);
    setNotesCovered((count) => count + 1);
    setPhase("active");
  }

  return {
    phase,
    currentPitchClass,
    canGoBack,
    queueLength: isFiniteQueue ? poolSize : null,
    queuePosition: isFiniteQueue ? queuePosition : null,
    notesCovered,
    next,
    previous,
    shuffleAgain,
  };
}
