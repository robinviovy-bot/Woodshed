import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { Button } from "@/components/Button";
import { LoadingScreen } from "@/components/LoadingScreen";
import { PoolBadge } from "@/components/PoolBadge";
import { SegmentedControl } from "@/components/SegmentedControl";
import { BeatIndicator } from "@/engine/metronome/BeatIndicator";
import { BpmStepper } from "@/engine/metronome/BpmStepper";
import { PlayPauseButton } from "@/engine/metronome/PlayPauseButton";
import { TapTempoButton } from "@/engine/metronome/TapTempoButton";
import { TIME_SIGNATURES, type MetronomeSound } from "@/engine/metronome/types";
import { useMetronome } from "@/engine/metronome/useMetronome";
import { NoteDisplay } from "@/engine/practice/NoteDisplay";
import { RepCounter } from "@/engine/practice/RepCounter";
import { useSingleNotePractice } from "@/engine/practice/useSingleNotePractice";
import { supabase } from "@/lib/supabase";
import type { Confidence, Exercise, Pool } from "@/types/database";

type ScreenPhase = "setup" | "practicing" | "confidence" | "summary";

const POOL_LABELS: Record<Pool, string> = {
  naturals: "Naturals",
  accidentals: "Accidentals",
  chromatic: "Chromatic",
  complete: "Complete",
};

const CONFIDENCE_OPTIONS: Confidence[] = ["rough", "ok", "solid"];
const CONFIDENCE_LABELS: Record<Confidence, string> = { rough: "Rough", ok: "OK", solid: "Solid" };

function pluralize(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

// Practice screen for mode: 'single' (exercises 1 and 2). No session
// persistence yet -- drill_stats/sessions/XP land in Phase 6. Everything
// here is in-memory only, discarded on "Done".
export function Practice() {
  const { slug } = useParams<{ slug: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [screenPhase, setScreenPhase] = useState<ScreenPhase>("setup");
  const [pool, setPool] = useState<Pool>("naturals");
  const [confidence, setConfidence] = useState<Confidence | null>(null);
  const [sessionStart, setSessionStart] = useState<number | null>(null);
  const [sessionEnd, setSessionEnd] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadExercise() {
      const { data, error } = await supabase
        .from("exercises")
        .select("*")
        .eq("slug", slug)
        .single();
      if (cancelled) return;
      if (error || !data) {
        setLoadError(true);
        return;
      }
      const loaded = data as Exercise;
      setExercise(loaded);
      setPool(loaded.default_pool);
    }
    loadExercise();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const metronome = useMetronome(40, (profile?.metronome_sound as MetronomeSound) ?? "click");
  const practice = useSingleNotePractice(pool);

  if (loadError) {
    return (
      <div className="mx-auto flex min-h-screen max-w-[480px] flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-ink-secondary">Couldn't load that exercise.</p>
        <Link to="/home" className="text-accent">
          Back to Home
        </Link>
      </div>
    );
  }

  if (!exercise) return <LoadingScreen />;

  function handleEndSession() {
    setSessionEnd(Date.now());
    setScreenPhase("confidence");
  }

  if (screenPhase === "setup") {
    return (
      <div className="mx-auto flex min-h-screen max-w-[480px] flex-col justify-center gap-8 px-6 py-10">
        <div>
          <h1 className="font-display text-3xl">{exercise.title}</h1>
          {exercise.description && (
            <p className="mt-1 text-sm text-ink-secondary">{exercise.description}</p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-sm text-ink-secondary">Pool</span>
          <SegmentedControl
            value={pool}
            options={exercise.available_pools}
            labels={POOL_LABELS}
            onChange={setPool}
          />
        </div>
        <Button
          onClick={() => {
            setSessionStart(Date.now());
            setScreenPhase("practicing");
          }}
        >
          Start
        </Button>
        <Link to="/home" className="text-center text-sm text-ink-muted">
          Back to Home
        </Link>
      </div>
    );
  }

  if (screenPhase === "confidence") {
    return (
      <div className="mx-auto flex min-h-screen max-w-[480px] flex-col items-center justify-center gap-6 px-6 py-10 text-center">
        <h1 className="font-display text-3xl">How did that feel?</h1>
        <div className="flex gap-3">
          {CONFIDENCE_OPTIONS.map((option) => (
            <Button
              key={option}
              variant="secondary"
              onClick={() => {
                setConfidence(option);
                setScreenPhase("summary");
              }}
            >
              {CONFIDENCE_LABELS[option]}
            </Button>
          ))}
        </div>
        <button
          type="button"
          className="text-sm text-ink-muted"
          onClick={() => {
            setConfidence(null);
            setScreenPhase("summary");
          }}
        >
          Skip
        </button>
      </div>
    );
  }

  if (screenPhase === "summary") {
    const sessionSeconds =
      sessionStart && sessionEnd ? Math.round((sessionEnd - sessionStart) / 1000) : 0;
    return (
      <div className="mx-auto flex min-h-screen max-w-[480px] flex-col items-center justify-center gap-6 px-6 py-10 text-center">
        <h1 className="font-display text-3xl">Nice work</h1>
        <div className="flex flex-col gap-1 text-ink-secondary">
          <p>{pluralize(practice.notesCovered, "note")} covered</p>
          <p>{pluralize(practice.totalReps, "rep")} logged</p>
          <p>{formatDuration(sessionSeconds)}</p>
          {confidence && <p className="mt-2 text-ink-muted">Marked {CONFIDENCE_LABELS[confidence]}</p>}
        </div>
        <Button onClick={() => navigate("/home")}>Done</Button>
      </div>
    );
  }

  // screenPhase === "practicing"
  const isRoundComplete = practice.phase === "roundComplete";

  return (
    <div
      className="mx-auto flex min-h-screen max-w-[480px] flex-col justify-between px-6 py-6"
      style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-sm text-ink-secondary">
          <span>{exercise.title}</span>
          <div className="flex items-center gap-2">
            <PoolBadge pool={pool} />
            {exercise.uses_metronome && (
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
            <NoteDisplay pitchClass={practice.currentPitchClass} notation={profile?.notation ?? "en"} />
            <RepCounter reps={practice.reps} onChange={practice.setReps} />
          </>
        )}
      </div>

      <div className="flex flex-col items-center gap-4">
        {exercise.uses_metronome && (
          <>
            <BeatIndicator beatsPerBar={metronome.beatsPerBar} currentBeat={metronome.currentBeat} />
            <PlayPauseButton isPlaying={metronome.isPlaying} onToggle={metronome.toggle} />
            <BpmStepper bpm={metronome.bpm} onChange={metronome.setBpm} />
            <div className="flex flex-wrap items-center justify-center gap-2">
              <TapTempoButton onTap={metronome.tapTempo} />
              <SegmentedControl
                value={metronome.timeSignature}
                options={TIME_SIGNATURES}
                onChange={metronome.setTimeSignature}
                wrap
              />
            </div>
          </>
        )}

        {!isRoundComplete && (
          <>
            <div className="flex w-full items-center gap-3">
              <Button variant="secondary" onClick={practice.skip} className="flex-1">
                Skip
              </Button>
              <Button onClick={practice.next} className="flex-[2]">
                Next
              </Button>
            </div>
            <button type="button" onClick={handleEndSession} className="text-sm text-ink-muted">
              End session
            </button>
          </>
        )}
      </div>
    </div>
  );
}
