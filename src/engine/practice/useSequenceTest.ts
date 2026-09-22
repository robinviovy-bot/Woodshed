import { useEffect, useRef, useState } from "react";
import type { useMetronome } from "@/engine/metronome/useMetronome";

type Phase = "idle" | "countdown" | "running";

// "Ready?" (no number yet) on the beat right after pressing Start, then
// 3, 2, 1 on the next three beats -- note 1 starts on the beat after that,
// the 4th one counted from the press (per Robin).
const LEAD_IN_BEATS = 4;
// One beat per string -- a guitar has six, so each note in the sequence
// gets six metronome beats before the test moves on to the next one.
const BEATS_PER_NOTE = 6;

// Drives exercise 4's "Start test" run (per Robin): "Ready?", then a 3-2-1
// countdown timed to the metronome, then the sequence steps through one
// note at a time, six beats each, ending automatically after the last
// note. Counts against metronome.tickCount (raw beats since play started,
// not currentBeat, which wraps every bar and would tie the
// six-beats-per-note count to whatever time signature happens to be
// selected). start() also realigns the metronome's upcoming beat so the
// one that starts note 1 lands on the accented downbeat, "the 1," instead
// of wherever it happens to fall.
export function useSequenceTest(
  sequenceLength: number,
  metronome: ReturnType<typeof useMetronome>,
  autoStartMetronome: boolean,
) {
  const [phase, setPhase] = useState<Phase>("idle");
  // null means "Ready?" (no number yet); otherwise the digit to show.
  const [countdownBeatsLeft, setCountdownBeatsLeft] = useState<number | null>(null);
  const [noteIndex, setNoteIndex] = useState(0);

  const baselineTickRef = useRef(0);
  const runBaselineRef = useRef(0);

  const { tickCount, isPlaying, beatsPerBar, start: startMetronome, stop: stopMetronome, setUpcomingBeat } =
    metronome;

  // Pausing (the play/pause button is really a start/full-stop toggle --
  // see useMetronome.toggle) resets tickCount the same way a fresh start()
  // does, which would otherwise make the elapsed-beats math below go
  // negative and crash SequenceTestDisplay on an out-of-range note index.
  // Treat a manual pause mid countdown/run the same as "Stop test" rather
  // than trying to resume a paused beat count.
  useEffect(() => {
    // This IS the external system (the metronome) being synchronized into
    // local state, not state that could be derived during render: phase
    // must actually change (and stay changed) so resuming playback
    // afterward doesn't resurrect a stale countdown/run instead of
    // staying idle.
    // oxlint-disable-next-line react/set-state-in-effect
    if (phase !== "idle" && !isPlaying) setPhase("idle");
  }, [isPlaying, phase]);

  useEffect(() => {
    if (phase === "idle" || !isPlaying) return;

    if (phase === "countdown") {
      const elapsed = tickCount - baselineTickRef.current;
      if (elapsed >= LEAD_IN_BEATS) {
        runBaselineRef.current = tickCount;
        setNoteIndex(0);
        setPhase("running");
      } else {
        setCountdownBeatsLeft(elapsed === 0 ? null : LEAD_IN_BEATS - elapsed);
      }
      return;
    }

    // phase === "running"
    const elapsed = tickCount - runBaselineRef.current;
    const index = Math.floor(elapsed / BEATS_PER_NOTE);
    if (index >= sequenceLength) {
      stopMetronome();
      setPhase("idle");
      return;
    }
    if (index !== noteIndex) setNoteIndex(index);
  }, [tickCount, phase, isPlaying, sequenceLength, noteIndex, stopMetronome]);

  function start() {
    // Read isPlaying BEFORE calling startMetronome(), which resets
    // tickCount to 0 -- if we're the ones starting it, the baseline is 0
    // by definition, not whatever tickCount happened to hold a moment ago
    // (that stale-read race was the bug behind the countdown showing
    // something like "10" instead of "3").
    const willStartFresh = !isPlaying;
    // If the metronome isn't already running and this exercise isn't
    // flagged to auto-start it (exercise.config.autoStartMetronome), there's
    // nothing this test can time itself against -- the player needs to
    // press Play first. Every exercise's practicing screen otherwise leaves
    // the metronome paused until Play is pressed manually.
    if (willStartFresh && !autoStartMetronome) return;
    baselineTickRef.current = willStartFresh ? 0 : tickCount;
    setCountdownBeatsLeft(null);
    setPhase("countdown");
    if (willStartFresh) startMetronome();

    // Line up so the beat that starts note 1 (the LEAD_IN_BEATS-th beat
    // from now) is the accented downbeat -- "the 1" -- regardless of the
    // selected time signature's beats-per-bar. Must run after
    // startMetronome(), which would otherwise overwrite this with its own
    // reset to beat 0.
    const target = (((beatsPerBar - (LEAD_IN_BEATS - 1)) % beatsPerBar) + beatsPerBar) % beatsPerBar;
    setUpcomingBeat(target);
  }

  function cancel() {
    stopMetronome();
    setPhase("idle");
  }

  return { phase, countdownBeatsLeft, noteIndex, start, cancel };
}
