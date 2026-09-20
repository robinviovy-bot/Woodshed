import { useEffect, useRef, useState } from "react";
import { getPitchClassesForPool, shuffle } from "@/engine/practice/notes";
import type { Pool } from "@/types/database";

type Phase = "active" | "roundComplete";

// `carryover`, when present, is guaranteed to be the queue's first note --
// it's the leftover from a pool with an odd count (naturals: 7,
// accidentals: 5) that couldn't be paired at the end of the previous lap.
function buildQueue(pool: Pool, carryover: number | null): number[] {
  const pitchClasses = getPitchClassesForPool(pool);
  if (carryover === null) return shuffle(pitchClasses);
  return [carryover, ...shuffle(pitchClasses.filter((pc) => pc !== carryover))];
}

// Mode handler for exercise 3 (mode: 'pair', SPEC.md section 4). Notes are
// dealt two at a time without replacement until the pool runs out, then
// the lap is complete -- same queue/"shuffle again" shape as mode: 'single'
// (per Robin's clarification), just consuming two notes per draw instead
// of one. naturals (7 notes) and accidentals (5) are odd, so one note is
// always left over when fewer than two remain; that note carries into the
// very next lap's first pair rather than ever being skipped. chromatic
// (12) divides evenly and never needs a carryover.
export function usePairPractice(pool: Pool) {
  const [initialQueue] = useState<number[]>(() => buildQueue(pool, null));
  const [currentPair, setCurrentPair] = useState<[number, number]>(() => [
    initialQueue[0],
    initialQueue[1],
  ]);
  const [queue, setQueue] = useState<number[]>(() => initialQueue.slice(2));
  const [phase, setPhase] = useState<Phase>("active");
  const [pairsCovered, setPairsCovered] = useState(1);
  const [pendingCarryover, setPendingCarryover] = useState<number | null>(null);

  // The setup screen can change `pool` before pressing Start, after this
  // hook has already mounted with whatever pool was selected first --
  // rebuild from scratch when that happens (skipping the initial mount,
  // which the lazy initializers above already handled correctly).
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const fresh = buildQueue(pool, null);
    setCurrentPair([fresh[0], fresh[1]]);
    setQueue(fresh.slice(2));
    setPendingCarryover(null);
    setPhase("active");
    setPairsCovered(1);
  }, [pool]);

  function drawNewPair() {
    if (queue.length < 2) {
      setPendingCarryover(queue.length === 1 ? queue[0] : null);
      setPhase("roundComplete");
      return;
    }

    const [first, second, ...rest] = queue;
    setCurrentPair([first, second]);
    setQueue(rest);
    setPairsCovered((count) => count + 1);
  }

  function shuffleAgain() {
    const fresh = buildQueue(pool, pendingCarryover);
    setCurrentPair([fresh[0], fresh[1]]);
    setQueue(fresh.slice(2));
    setPendingCarryover(null);
    setPhase("active");
    setPairsCovered((count) => count + 1);
  }

  return {
    phase,
    firstNote: currentPair[0],
    secondNote: currentPair[1],
    pairsCovered,
    drawNewPair,
    shuffleAgain,
  };
}
