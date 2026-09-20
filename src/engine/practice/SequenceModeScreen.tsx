import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { PoolBadge } from "@/components/PoolBadge";
import { BackButton } from "@/engine/practice/BackButton";
import { ExerciseSetup } from "@/engine/practice/ExerciseSetup";
import { BeatIndicator } from "@/engine/metronome/BeatIndicator";
import { PlayPauseButton } from "@/engine/metronome/PlayPauseButton";
import { TapTempoButton } from "@/engine/metronome/TapTempoButton";
import { TimeSignaturePicker } from "@/engine/metronome/TimeSignaturePicker";
import { BpmStepper } from "@/engine/metronome/BpmStepper";
import type { MetronomeSound } from "@/engine/metronome/types";
import { useMetronome } from "@/engine/metronome/useMetronome";
import { DirectionArrow } from "@/engine/practice/DirectionArrow";
import { getNoteDisplay } from "@/engine/practice/notes";
import { SequenceDisplay } from "@/engine/practice/SequenceDisplay";
import { SequenceTestDisplay } from "@/engine/practice/SequenceTestDisplay";
import { pluralize, formatDuration } from "@/engine/practice/shared";
import { SessionSummary } from "@/engine/practice/SessionSummary";
import { usePracticeSession } from "@/engine/practice/usePracticeSession";
import { useSequencePractice } from "@/engine/practice/useSequencePractice";
import { useSequenceTest } from "@/engine/practice/useSequenceTest";
import type { Exercise, Pool } from "@/types/database";

type ScreenPhase = "setup" | "practicing" | "summary";

// Mode: 'sequence' (exercise 4). "Draw new sequence" is always available
// (SPEC.md section 4) -- no queue, no lap-finished state. Same as pair
// mode, no "reps logged" stat: it's one continuous pass through the whole
// sequence, not something repeated a set number of times.
//
// "Start test" (added after Phase 5, per Robin) is a second, guided way to
// play the same sequence: useSequenceTest runs a 3-2-1 countdown timed to
// the metronome, then steps through the sequence one note at a time (six
// beats each, one per string) instead of showing every note at once. It
// ends automatically after the last note -- no looping, per Robin's call --
// and drops back to the normal view.
export function SequenceModeScreen({
  exercise,
  notation,
  metronomeSound,
  onExit,
  initialPool,
  initialBpm,
}: {
  exercise: Exercise;
  notation: string;
  metronomeSound: MetronomeSound;
  onExit: () => void;
  initialPool?: Pool;
  initialBpm?: number;
}) {
  const [screenPhase, setScreenPhase] = useState<ScreenPhase>(initialPool ? "practicing" : "setup");
  const [pool, setPool] = useState<Pool>(initialPool ?? exercise.default_pool);
  const [sessionStart, setSessionStart] = useState<number | null>(() => (initialPool ? Date.now() : null));
  const [sessionEnd, setSessionEnd] = useState<number | null>(null);

  const metronome = useMetronome(initialBpm ?? 40, metronomeSound);
  const practice = useSequencePractice(pool, exercise.config.sequence_length ?? 7);
  const test = useSequenceTest(practice.sequence.length, metronome);
  const session = usePracticeSession(exercise, pool);

  const stopMetronome = metronome.stop;
  useEffect(() => {
    if (screenPhase !== "practicing") stopMetronome();
  }, [screenPhase, stopMetronome]);

  // autoStarted guards session.begin() to fire exactly once for a
  // deep-linked drill (same as ExerciseSetup's onStart does normally),
  // even though this effect re-runs on every bpm/time-signature change.
  const autoStarted = useRef(false);
  useEffect(() => {
    if (initialPool && !autoStarted.current) {
      autoStarted.current = true;
      session.begin(metronome.bpm, metronome.timeSignature);
    }
  }, [initialPool, session, metronome.bpm, metronome.timeSignature]);

  function handleEndSession() {
    setSessionEnd(Date.now());
    session.finish(practice.sequencesCovered * practice.sequence.length, 0);
    setScreenPhase("summary");
  }

  if (screenPhase === "setup") {
    return (
      <ExerciseSetup
        exercise={exercise}
        pool={pool}
        onPoolChange={setPool}
        onStart={() => {
          setSessionStart(Date.now());
          session.begin(metronome.bpm, metronome.timeSignature);
          setScreenPhase("practicing");
        }}
      />
    );
  }

  if (screenPhase === "summary") {
    const sessionSeconds =
      sessionStart && sessionEnd ? Math.round((sessionEnd - sessionStart) / 1000) : 0;
    return (
      <SessionSummary
        stats={[
          `${pluralize(practice.sequencesCovered, "sequence")} covered`,
          formatDuration(sessionSeconds),
          ...(session.result?.isFirstSessionOfDay ? [`+${session.result.xpAwarded} XP`] : []),
          ...(session.result ? [`${pluralize(session.result.currentStreak, "day")} streak`] : []),
        ]}
        onDone={onExit}
      />
    );
  }

  // screenPhase === "practicing"
  const firstNote = getNoteDisplay(practice.sequence[0], notation);
  return (
    <div
      className="mx-auto flex min-h-screen max-w-[480px] flex-col justify-between gap-8 px-6 py-6"
      style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}
    >
      <div className="flex items-center justify-between">
        <BackButton onClick={handleEndSession} />
        <div className="flex items-center gap-2 text-sm text-ink-secondary">
          <PoolBadge pool={pool} />
          <span className="font-mono font-numeric">{metronome.bpm} BPM</span>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-2">
        {test.phase === "countdown" && (
          <div className="flex items-center justify-center gap-6">
            <div className="flex flex-col items-center gap-2 text-center">
              {test.countdownBeatsLeft === null ? (
                <p className="font-display text-5xl leading-none">Ready?</p>
              ) : (
                <>
                  <p className="font-display text-8xl leading-none">{test.countdownBeatsLeft}</p>
                  <p className="text-sm text-ink-secondary">Get ready</p>
                </>
              )}
            </div>
            <div className="flex flex-col items-center gap-1 opacity-50">
              <DirectionArrow direction="up" />
              <span className="font-display text-2xl leading-none">{firstNote.primary}</span>
              <span className="text-xs text-ink-muted">{firstNote.secondary}</span>
            </div>
          </div>
        )}

        {test.phase === "running" && (
          <SequenceTestDisplay sequence={practice.sequence} noteIndex={test.noteIndex} notation={notation} />
        )}

        {(test.phase === "countdown" || test.phase === "running") && (
          <Button variant="secondary" onClick={test.cancel}>
            Stop test
          </Button>
        )}

        {test.phase === "idle" && (
          <>
            <SequenceDisplay sequence={practice.sequence} notation={notation} />
            <div className="flex flex-wrap justify-center gap-3">
              <Button variant="secondary" onClick={practice.drawNewSequence}>
                Draw new sequence
              </Button>
              <Button onClick={test.start}>Start test</Button>
            </div>
          </>
        )}
      </div>

      <div className="flex flex-col items-center gap-4">
        <BeatIndicator beatsPerBar={metronome.beatsPerBar} currentBeat={metronome.currentBeat} />
        <PlayPauseButton isPlaying={metronome.isPlaying} onToggle={metronome.toggle} />
        <BpmStepper bpm={metronome.bpm} onChange={metronome.setBpm} />
        <div className="flex items-center justify-center gap-2">
          <TapTempoButton onTap={metronome.tapTempo} />
          <TimeSignaturePicker value={metronome.timeSignature} onChange={metronome.setTimeSignature} />
        </div>
      </div>
    </div>
  );
}
