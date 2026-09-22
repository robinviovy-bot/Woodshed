import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { LoadingScreen } from "@/components/LoadingScreen";
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
import type { AccidentalSpelling } from "@/engine/practice/notes";
import { NoteNavigator } from "@/engine/practice/NoteNavigator";
import { POOL_LABELS, pluralize, formatDuration } from "@/engine/practice/shared";
import { SessionSummary } from "@/engine/practice/SessionSummary";
import { useConfirmLeaveGuard } from "@/engine/practice/useConfirmLeaveGuard";
import { useExerciseMetronomePrefs } from "@/engine/practice/useExerciseMetronomePrefs";
import { usePracticeSession } from "@/engine/practice/usePracticeSession";
import { useSingleNotePractice } from "@/engine/practice/useSingleNotePractice";
import { useSpellingChoices } from "@/engine/practice/useSpellingChoices";
import type { Exercise, Pool } from "@/types/database";

type ScreenPhase = "setup" | "practicing" | "summary";

interface SingleModeScreenProps {
  exercise: Exercise;
  notation: string;
  metronomeSound: MetronomeSound;
  onExit: () => void;
  lessonSlug: string;
  initialPool?: Pool;
  initialBpm?: number;
}

// Mode: 'single' (exercises 1 and 2). initialPool/initialBpm (from Home's
// "Continue" and "Due for review" rows) skip ExerciseSetup entirely and
// start practicing immediately -- see Practice.tsx's header comment.
//
// This outer component waits for the user's per-exercise metronome
// preference to load before mounting the screen that actually owns
// useMetronome -- its initial bpm/time signature only take effect at
// mount, so they need to already be known rather than settling in after.
export function SingleModeScreen(props: SingleModeScreenProps) {
  const prefs = useExerciseMetronomePrefs(props.exercise.id, props.exercise.uses_metronome, 40, "6/4");
  if (!prefs.loaded) return <LoadingScreen />;
  return <SingleModeScreenLoaded {...props} prefs={prefs} />;
}

function SingleModeScreenLoaded({
  exercise,
  notation,
  metronomeSound,
  onExit,
  lessonSlug,
  initialPool,
  initialBpm,
  prefs,
}: SingleModeScreenProps & { prefs: ReturnType<typeof useExerciseMetronomePrefs> }) {
  const [screenPhase, setScreenPhase] = useState<ScreenPhase>(initialPool ? "practicing" : "setup");
  const [pool, setPool] = useState<Pool>(initialPool ?? exercise.default_pool);
  const [accidentalSpelling, setAccidentalSpelling] = useState<AccidentalSpelling>("both");
  const [sessionStart, setSessionStart] = useState<number | null>(() => (initialPool ? Date.now() : null));
  const [sessionEnd, setSessionEnd] = useState<number | null>(null);

  const metronome = useMetronome(initialBpm ?? prefs.bpm, metronomeSound, prefs.timeSignature);
  const practice = useSingleNotePractice(pool);
  const session = usePracticeSession(exercise, pool);
  const [preferSharp] = useSpellingChoices(accidentalSpelling, 1, practice.historyIndex);
  const leaveGuard = useConfirmLeaveGuard(screenPhase === "practicing");

  // Persists whichever bpm/time signature the player currently has,
  // whatever changed it -- ExerciseSetup's controls, the practicing dock's
  // own stepper/picker, or tap tempo -- so the "last settings" restored
  // next visit (per Robin) always reflect the true current value instead
  // of only changes made through one specific control.
  const prefsUpdate = prefs.update;
  useEffect(() => {
    prefsUpdate({ bpm: metronome.bpm, timeSignature: metronome.timeSignature });
  }, [metronome.bpm, metronome.timeSignature, prefsUpdate]);

  function handleMetronomeEnabledChange(enabled: boolean) {
    prefs.update({ enabled });
  }

  // The metronome only ever runs while a drill is actively open (SPEC.md's
  // practice-screen section): reaching lap-finished or the summary both
  // stop it. It never auto-restarts on its own, and no longer starts on
  // its own at launch either -- the player presses Play when ready.
  const stopMetronome = metronome.stop;
  useEffect(() => {
    const isActivelyPracticing = screenPhase === "practicing" && practice.phase === "active";
    if (!isActivelyPracticing) stopMetronome();
  }, [screenPhase, practice.phase, stopMetronome]);

  // autoStarted guards session.begin() to fire exactly once for a
  // deep-linked drill (same as ExerciseSetup's onStart does normally).
  const autoStarted = useRef(false);
  useEffect(() => {
    if (initialPool && !autoStarted.current) {
      autoStarted.current = true;
      session.begin(prefs.enabled ? metronome.bpm : null, metronome.timeSignature);
    }
  }, [initialPool, session, prefs.enabled, metronome.bpm, metronome.timeSignature]);

  function handleEndSession() {
    setSessionEnd(Date.now());
    // Reps aren't tallied (see useSingleNotePractice's header comment) --
    // derived instead by trusting the "play it N times" instruction was
    // followed.
    session.finish(practice.notesCovered, practice.notesCovered * exercise.config.reps_target);
    setScreenPhase("summary");
  }

  if (screenPhase === "setup") {
    return (
      <ExerciseSetup
        exercise={exercise}
        lessonSlug={lessonSlug}
        pool={pool}
        onPoolChange={setPool}
        accidentalSpelling={accidentalSpelling}
        onAccidentalSpellingChange={setAccidentalSpelling}
        metronomeEnabled={prefs.enabled}
        onMetronomeEnabledChange={handleMetronomeEnabledChange}
        bpm={metronome.bpm}
        onBpmChange={metronome.setBpm}
        timeSignature={metronome.timeSignature}
        onTimeSignatureChange={metronome.setTimeSignature}
        onStart={() => {
          setSessionStart(Date.now());
          session.begin(prefs.enabled ? metronome.bpm : null, metronome.timeSignature);
          setScreenPhase("practicing");
        }}
      />
    );
  }

  if (screenPhase === "summary") {
    const sessionSeconds =
      sessionStart && sessionEnd ? Math.round((sessionEnd - sessionStart) / 1000) : 0;
    const repsLogged = practice.notesCovered * exercise.config.reps_target;
    return (
      <SessionSummary
        stats={[
          `${pluralize(practice.notesCovered, "note")} covered`,
          `${pluralize(repsLogged, "rep")} logged`,
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
      {leaveGuard.isBlocked && (
        <ConfirmDialog
          title="Leave this session?"
          message="You haven't ended this session yet. Leaving now won't save your progress."
          confirmLabel="Leave"
          cancelLabel="Stay"
          onConfirm={leaveGuard.confirmLeave}
          onCancel={leaveGuard.cancelLeave}
        />
      )}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <BackButton onClick={handleEndSession} />
          <div className="flex items-center gap-2 text-sm text-ink-secondary">
            <PoolBadge pool={pool} />
            {prefs.enabled && !isRoundComplete && (
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
              preferSharp={preferSharp}
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

      {prefs.enabled && !isRoundComplete && (
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
