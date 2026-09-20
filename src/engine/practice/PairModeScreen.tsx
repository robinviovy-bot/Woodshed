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
import type { AccidentalSpelling } from "@/engine/practice/notes";
import { PairDisplay } from "@/engine/practice/PairDisplay";
import { POOL_LABELS, pluralize, formatDuration } from "@/engine/practice/shared";
import { SessionSummary } from "@/engine/practice/SessionSummary";
import { usePairPractice } from "@/engine/practice/usePairPractice";
import { usePracticeSession } from "@/engine/practice/usePracticeSession";
import { useSpellingChoices } from "@/engine/practice/useSpellingChoices";
import type { Exercise, Pool } from "@/types/database";

type ScreenPhase = "setup" | "practicing" | "summary";

// Mode: 'pair' (exercise 3). Notes are dealt two at a time without
// replacement until the pool runs out, same lap/"shuffle again" shape as
// mode: 'single' (see usePairPractice's header comment for the odd-pool
// carryover rule). No "reps logged" stat: the exercise is one continuous
// pass across both notes, not something repeated a set number of times.
export function PairModeScreen({
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
  const [accidentalSpelling, setAccidentalSpelling] = useState<AccidentalSpelling>("both");
  const [sessionStart, setSessionStart] = useState<number | null>(() => (initialPool ? Date.now() : null));
  const [sessionEnd, setSessionEnd] = useState<number | null>(null);

  const metronome = useMetronome(initialBpm ?? 40, metronomeSound);
  const practice = usePairPractice(pool);
  const session = usePracticeSession(exercise, pool);
  const preferSharp = useSpellingChoices(accidentalSpelling, 2, practice.pairsCovered) as [
    boolean,
    boolean,
  ];

  const stopMetronome = metronome.stop;
  useEffect(() => {
    const isActivelyPracticing = screenPhase === "practicing" && practice.phase === "active";
    if (!isActivelyPracticing) stopMetronome();
  }, [screenPhase, practice.phase, stopMetronome]);

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
    session.finish(practice.pairsCovered * 2, 0);
    setScreenPhase("summary");
  }

  if (screenPhase === "setup") {
    return (
      <ExerciseSetup
        exercise={exercise}
        pool={pool}
        onPoolChange={setPool}
        accidentalSpelling={accidentalSpelling}
        onAccidentalSpellingChange={setAccidentalSpelling}
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
          `${pluralize(practice.pairsCovered, "pair")} covered`,
          formatDuration(sessionSeconds),
          ...(session.result?.isFirstSessionOfDay ? [`+${session.result.xpAwarded} XP`] : []),
          ...(session.result ? [`${pluralize(session.result.currentStreak, "day")} streak`] : []),
        ]}
        onDone={onExit}
      />
    );
  }

  // screenPhase === "practicing"
  const isRoundComplete = practice.phase === "roundComplete";

  return (
    <div
      className="mx-auto flex min-h-screen max-w-[480px] flex-col justify-between gap-8 px-6 py-6"
      style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}
    >
      <div className="flex items-center justify-between">
        <BackButton onClick={handleEndSession} />
        <div className="flex items-center gap-2 text-sm text-ink-secondary">
          <PoolBadge pool={pool} />
          {!isRoundComplete && <span className="font-mono font-numeric">{metronome.bpm} BPM</span>}
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-8">
        {isRoundComplete ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="font-display text-2xl">Lap finished</p>
            <p className="text-sm text-ink-secondary">
              You've been through every note in {POOL_LABELS[pool]}.
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={practice.shuffleAgain}>
                Shuffle again
              </Button>
              <Button onClick={handleEndSession}>End session</Button>
            </div>
          </div>
        ) : (
          <>
            <PairDisplay
              firstNote={practice.firstNote}
              secondNote={practice.secondNote}
              notation={notation}
              preferSharp={preferSharp}
            />
            <Button variant="secondary" onClick={practice.drawNewPair}>
              Draw new pair
            </Button>
          </>
        )}
      </div>

      {!isRoundComplete && (
        <div className="flex flex-col items-center gap-4">
          <BeatIndicator beatsPerBar={metronome.beatsPerBar} currentBeat={metronome.currentBeat} />
          <PlayPauseButton isPlaying={metronome.isPlaying} onToggle={metronome.toggle} />
          <BpmStepper bpm={metronome.bpm} onChange={metronome.setBpm} />
          <div className="flex items-center justify-center gap-2">
            <TapTempoButton onTap={metronome.tapTempo} />
            <TimeSignaturePicker value={metronome.timeSignature} onChange={metronome.setTimeSignature} />
          </div>
        </div>
      )}
    </div>
  );
}
