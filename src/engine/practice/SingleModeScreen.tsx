import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { PoolBadge } from "@/components/PoolBadge";
import { BackButton } from "@/engine/practice/BackButton";
import { ExerciseSetup } from "@/engine/practice/ExerciseSetup";
import { BeatIndicator } from "@/engine/metronome/BeatIndicator";
import { BpmStepper } from "@/engine/metronome/BpmStepper";
import { PlayPauseButton } from "@/engine/metronome/PlayPauseButton";
import { TapTempoButton } from "@/engine/metronome/TapTempoButton";
import { TimeSignaturePicker } from "@/engine/metronome/TimeSignaturePicker";
import type { MetronomeSound } from "@/engine/metronome/types";
import { useMetronome } from "@/engine/metronome/useMetronome";
import { NoteNavigator } from "@/engine/practice/NoteNavigator";
import { POOL_LABELS, pluralize, formatDuration } from "@/engine/practice/shared";
import { SessionSummary } from "@/engine/practice/SessionSummary";
import { useSingleNotePractice } from "@/engine/practice/useSingleNotePractice";
import type { Exercise, Pool } from "@/types/database";

type ScreenPhase = "setup" | "practicing" | "summary";

// Mode: 'single' (exercises 1 and 2). No session persistence yet -- Phase
// 6's job. Everything here is in-memory only, discarded on "Done".
export function SingleModeScreen({
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
  const [sessionStart, setSessionStart] = useState<number | null>(null);
  const [sessionEnd, setSessionEnd] = useState<number | null>(null);

  const metronome = useMetronome(40, metronomeSound);
  const practice = useSingleNotePractice(pool);

  // The metronome only ever runs while a drill is actively open (SPEC.md's
  // practice-screen section): reaching lap-finished or the summary both
  // stop it. It never auto-restarts on its own.
  const stopMetronome = metronome.stop;
  useEffect(() => {
    const isActivelyPracticing = screenPhase === "practicing" && practice.phase === "active";
    if (!isActivelyPracticing) stopMetronome();
  }, [screenPhase, practice.phase, stopMetronome]);

  function handleEndSession() {
    setSessionEnd(Date.now());
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
          setScreenPhase("practicing");
        }}
      />
    );
  }

  if (screenPhase === "summary") {
    const sessionSeconds =
      sessionStart && sessionEnd ? Math.round((sessionEnd - sessionStart) / 1000) : 0;
    // Reps aren't tallied (see useSingleNotePractice's header comment) --
    // derived instead by trusting the "play it N times" instruction was
    // followed.
    const repsLogged = practice.notesCovered * exercise.config.reps_target;
    return (
      <SessionSummary
        stats={[
          `${pluralize(practice.notesCovered, "note")} covered`,
          `${pluralize(repsLogged, "rep")} logged`,
          formatDuration(sessionSeconds),
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
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <BackButton onClick={handleEndSession} />
          <div className="flex items-center gap-2 text-sm text-ink-secondary">
            <PoolBadge pool={pool} />
            {exercise.uses_metronome && !isRoundComplete && (
              <span className="font-mono font-numeric">{metronome.bpm} BPM</span>
            )}
          </div>
        </div>
        {practice.queueLength && (
          <span className="text-center text-xs text-ink-muted">
            {practice.queuePosition} of {practice.queueLength}
          </span>
        )}
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
            <NoteNavigator
              pitchClass={practice.currentPitchClass}
              notation={notation}
              canGoBack={practice.canGoBack}
              onPrevious={practice.previous}
              onNext={practice.next}
            />
            <p className="text-sm text-ink-muted">
              Play it {pluralize(exercise.config.reps_target, "time")}
            </p>
          </>
        )}
      </div>

      {exercise.uses_metronome && !isRoundComplete && (
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
