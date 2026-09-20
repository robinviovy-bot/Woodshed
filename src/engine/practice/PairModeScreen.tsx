import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { PoolBadge } from "@/components/PoolBadge";
import { BackButton } from "@/engine/practice/BackButton";
import { ConfidencePrompt } from "@/engine/practice/ConfidencePrompt";
import { ExerciseSetup } from "@/engine/practice/ExerciseSetup";
import { BeatIndicator } from "@/engine/metronome/BeatIndicator";
import { PlayPauseButton } from "@/engine/metronome/PlayPauseButton";
import { TapTempoButton } from "@/engine/metronome/TapTempoButton";
import { TimeSignaturePicker } from "@/engine/metronome/TimeSignaturePicker";
import { BpmStepper } from "@/engine/metronome/BpmStepper";
import type { MetronomeSound } from "@/engine/metronome/types";
import { useMetronome } from "@/engine/metronome/useMetronome";
import { PairDisplay } from "@/engine/practice/PairDisplay";
import { POOL_LABELS, pluralize, formatDuration } from "@/engine/practice/shared";
import { SessionSummary } from "@/engine/practice/SessionSummary";
import { usePairPractice } from "@/engine/practice/usePairPractice";
import type { Confidence, Exercise, Pool } from "@/types/database";

type ScreenPhase = "setup" | "practicing" | "confidence" | "summary";

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
}: {
  exercise: Exercise;
  notation: string;
  metronomeSound: MetronomeSound;
  onExit: () => void;
}) {
  const [screenPhase, setScreenPhase] = useState<ScreenPhase>("setup");
  const [pool, setPool] = useState<Pool>(exercise.default_pool);
  const [confidence, setConfidence] = useState<Confidence | null>(null);
  const [sessionStart, setSessionStart] = useState<number | null>(null);
  const [sessionEnd, setSessionEnd] = useState<number | null>(null);

  const metronome = useMetronome(40, metronomeSound);
  const practice = usePairPractice(pool);

  const stopMetronome = metronome.stop;
  useEffect(() => {
    const isActivelyPracticing = screenPhase === "practicing" && practice.phase === "active";
    if (!isActivelyPracticing) stopMetronome();
  }, [screenPhase, practice.phase, stopMetronome]);

  function handleEndSession() {
    setSessionEnd(Date.now());
    setScreenPhase("confidence");
  }

  if (screenPhase === "setup") {
    return (
      <ExerciseSetup
        exercise={exercise}
        pool={pool}
        onPoolChange={setPool}
        onStart={() => {
          setSessionStart(Date.now());
          setScreenPhase("practicing");
        }}
      />
    );
  }

  if (screenPhase === "confidence") {
    return (
      <ConfidencePrompt
        onChoose={(value) => {
          setConfidence(value);
          setScreenPhase("summary");
        }}
      />
    );
  }

  if (screenPhase === "summary") {
    const sessionSeconds =
      sessionStart && sessionEnd ? Math.round((sessionEnd - sessionStart) / 1000) : 0;
    return (
      <SessionSummary
        stats={[`${pluralize(practice.pairsCovered, "pair")} covered`, formatDuration(sessionSeconds)]}
        confidence={confidence}
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
