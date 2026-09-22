import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { LoadingScreen } from "@/components/LoadingScreen";
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
import type { AccidentalSpelling } from "@/engine/practice/notes";
import { getNoteDisplay } from "@/engine/practice/notes";
import { SequenceDisplay } from "@/engine/practice/SequenceDisplay";
import { SequenceTestDisplay } from "@/engine/practice/SequenceTestDisplay";
import { pluralize, formatDuration } from "@/engine/practice/shared";
import { SessionSummary } from "@/engine/practice/SessionSummary";
import { useConfirmLeaveGuard } from "@/engine/practice/useConfirmLeaveGuard";
import { useExerciseMetronomePrefs } from "@/engine/practice/useExerciseMetronomePrefs";
import { usePracticeSession } from "@/engine/practice/usePracticeSession";
import { useSequencePractice } from "@/engine/practice/useSequencePractice";
import { useSequenceTest } from "@/engine/practice/useSequenceTest";
import { useSpellingChoices } from "@/engine/practice/useSpellingChoices";
import type { Exercise, Pool } from "@/types/database";

type ScreenPhase = "setup" | "practicing" | "summary";

interface SequenceModeScreenProps {
  exercise: Exercise;
  notation: string;
  metronomeSound: MetronomeSound;
  onExit: () => void;
  lessonSlug: string;
  initialPool?: Pool;
  initialBpm?: number;
}

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
// and drops back to the normal view. Whether it starts the metronome
// itself is driven by exercise.config.autoStartMetronome (true for this
// exercise) rather than being unconditional -- entering the practicing
// screen itself never auto-starts, for any exercise, regardless of this
// flag; it only governs "Start test" specifically.
//
// This outer component waits for the user's per-exercise metronome
// preference to load before mounting the screen that actually owns
// useMetronome -- see SingleModeScreen's header comment for why.
export function SequenceModeScreen(props: SequenceModeScreenProps) {
  const prefs = useExerciseMetronomePrefs(props.exercise.id, props.exercise.uses_metronome, 40, "6/4");
  if (!prefs.loaded) return <LoadingScreen />;
  return <SequenceModeScreenLoaded {...props} prefs={prefs} />;
}

function SequenceModeScreenLoaded({
  exercise,
  notation,
  metronomeSound,
  onExit,
  lessonSlug,
  initialPool,
  initialBpm,
  prefs,
}: SequenceModeScreenProps & { prefs: ReturnType<typeof useExerciseMetronomePrefs> }) {
  const [screenPhase, setScreenPhase] = useState<ScreenPhase>(initialPool ? "practicing" : "setup");
  const [pool, setPool] = useState<Pool>(initialPool ?? exercise.default_pool);
  const [accidentalSpelling, setAccidentalSpelling] = useState<AccidentalSpelling>("both");
  const [sessionStart, setSessionStart] = useState<number | null>(() => (initialPool ? Date.now() : null));
  const [sessionEnd, setSessionEnd] = useState<number | null>(null);

  const metronome = useMetronome(initialBpm ?? prefs.bpm, metronomeSound, prefs.timeSignature);
  const practice = useSequencePractice(pool, exercise.config.sequence_length ?? 7);
  const test = useSequenceTest(practice.sequence.length, metronome, exercise.config.autoStartMetronome);
  const session = usePracticeSession(exercise, pool);
  const preferSharp = useSpellingChoices(
    accidentalSpelling,
    practice.sequence.length,
    practice.sequencesCovered,
  );
  const leaveGuard = useConfirmLeaveGuard(screenPhase === "practicing");

  // See SingleModeScreen's matching effect: persists whichever bpm/time
  // signature is current, whatever control changed it.
  const prefsUpdate = prefs.update;
  useEffect(() => {
    prefsUpdate({ bpm: metronome.bpm, timeSignature: metronome.timeSignature });
  }, [metronome.bpm, metronome.timeSignature, prefsUpdate]);

  function handleMetronomeEnabledChange(enabled: boolean) {
    prefs.update({ enabled });
  }

  const stopMetronome = metronome.stop;
  useEffect(() => {
    if (screenPhase !== "practicing") stopMetronome();
  }, [screenPhase, stopMetronome]);

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
    session.finish(practice.sequencesCovered * practice.sequence.length, 0);
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
  const firstNote = getNoteDisplay(practice.sequence[0], notation, preferSharp[0]);
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
      <div className="flex items-center justify-between">
        <BackButton onClick={handleEndSession} />
        <div className="flex items-center gap-2 text-sm text-ink-secondary">
          <PoolBadge pool={pool} />
          {prefs.enabled && <span className="font-mono font-numeric">{metronome.bpm} BPM</span>}
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
          <SequenceTestDisplay
            sequence={practice.sequence}
            noteIndex={test.noteIndex}
            notation={notation}
            preferSharp={preferSharp}
          />
        )}

        {(test.phase === "countdown" || test.phase === "running") && (
          <Button variant="secondary" onClick={test.cancel}>
            Stop test
          </Button>
        )}

        {test.phase === "idle" && (
          <>
            <SequenceDisplay sequence={practice.sequence} notation={notation} preferSharp={preferSharp} />
            <div className="flex flex-wrap justify-center gap-3">
              <Button variant="secondary" onClick={practice.drawNewSequence}>
                Draw new sequence
              </Button>
              {/* "Start test" is timed entirely by the metronome, so it
                  doesn't make sense with the metronome turned off for this
                  exercise. */}
              {prefs.enabled && <Button onClick={test.start}>Start test</Button>}
            </div>
          </>
        )}
      </div>

      {prefs.enabled && (
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
