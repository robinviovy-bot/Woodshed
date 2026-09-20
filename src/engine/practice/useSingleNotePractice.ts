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
// consumed via next(), matching section 7's queue/"shuffle again" language.
// chromatic draws independently at random each time instead (section 3:
// "notes drawn at random from all 12"), so it never runs out or reaches a
// "lap finished" state -- there's no queue to exhaust.
export function useSingleNotePractice(pool: Pool) {
  const isFiniteQueue = pool === "naturals" || pool === "accidentals";
  const poolSize = getPitchClassesForPool(pool).length;

  const [queue, setQueue] = useState<number[]>(() =>
    isFiniteQueue ? shuffle(getPitchClassesForPool(pool)) : [],
  );
  const [currentPitchClass, setCurrentPitchClass] = useState<number>(() =>
    isFiniteQueue ? queue[0] : drawRandomPitchClass(),
  );
  const [phase, setPhase] = useState<Phase>("active");
  const [reps, setReps] = useState(0);
  const [notesCovered, setNotesCovered] = useState(0);
  const [totalReps, setTotalReps] = useState(0);

  function next() {
    setTotalReps((total) => total + reps);
    setReps(0);
    setNotesCovered((count) => count + 1);

    if (!isFiniteQueue) {
      setCurrentPitchClass((prev) => drawRandomPitchClass(prev));
      return;
    }

    const remaining = queue.slice(1);
    setQueue(remaining);
    if (remaining.length === 0) {
      setPhase("roundComplete");
    } else {
      setCurrentPitchClass(remaining[0]);
    }
  }

  function skip() {
    setTotalReps((total) => total + reps);
    setReps(0);

    if (!isFiniteQueue) {
      setCurrentPitchClass((prev) => drawRandomPitchClass(prev));
      return;
    }

    const [first, ...rest] = queue;
    const reordered = [...rest, first];
    setQueue(reordered);
    setCurrentPitchClass(reordered[0]);
  }

  function shuffleAgain() {
    const fresh = shuffle(getPitchClassesForPool(pool));
    setQueue(fresh);
    setCurrentPitchClass(fresh[0]);
    setPhase("active");
    setReps(0);
  }

  return {
    phase,
    currentPitchClass,
    queueLength: isFiniteQueue ? poolSize : null,
    queuePosition: isFiniteQueue ? poolSize - queue.length + 1 : null,
    reps,
    notesCovered,
    totalReps,
    setReps,
    next,
    skip,
    shuffleAgain,
  };
}
