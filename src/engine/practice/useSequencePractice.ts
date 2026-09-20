import { useEffect, useRef, useState } from "react";
import {
  ALL_PITCH_CLASSES,
  drawRandomFrom,
  getPitchClassesForPool,
  shuffle,
} from "@/engine/practice/notes";
import type { Pool } from "@/types/database";

// Mode handler for exercise 4 (mode: 'sequence', SPEC.md sections 3-4).
// naturals/accidentals/chromatic draw `sequenceLength` (7, from the
// exercise's config.sequence_length) independent random notes -- repeats
// allowed, since section 3 only promises "no repeats" for the complete
// pool specifically ("all 12 notes, each appearing exactly once"). complete
// ignores sequenceLength entirely and shuffles all 12 instead (documented
// in supabase/seed.sql). Like pair mode, "Draw new sequence" is always
// available -- no queue, no "lap finished" state.
function drawSequence(pool: Pool, sequenceLength: number): number[] {
  if (pool === "complete") return shuffle(ALL_PITCH_CLASSES);

  const options = getPitchClassesForPool(pool);
  const sequence: number[] = [];
  for (let i = 0; i < sequenceLength; i++) {
    sequence.push(drawRandomFrom(options, sequence[i - 1]));
  }
  return sequence;
}

export function useSequencePractice(pool: Pool, sequenceLength: number) {
  const [sequence, setSequence] = useState<number[]>(() => drawSequence(pool, sequenceLength));
  const [sequencesCovered, setSequencesCovered] = useState(1);

  // The setup screen can change `pool` before pressing Start, after this
  // hook has already mounted with whatever pool was selected first --
  // redraw when that happens (skipping the initial mount, which the lazy
  // initializer above already handled correctly).
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setSequence(drawSequence(pool, sequenceLength));
    setSequencesCovered(1);
  }, [pool, sequenceLength]);

  function drawNewSequence() {
    setSequence(drawSequence(pool, sequenceLength));
    setSequencesCovered((count) => count + 1);
  }

  return {
    sequence,
    sequencesCovered,
    drawNewSequence,
  };
}
