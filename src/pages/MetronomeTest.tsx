import { Link } from "react-router-dom";
import { SegmentedControl } from "@/components/SegmentedControl";
import { BeatIndicator } from "@/engine/metronome/BeatIndicator";
import { BpmStepper } from "@/engine/metronome/BpmStepper";
import { PlayPauseButton } from "@/engine/metronome/PlayPauseButton";
import { TapTempoButton } from "@/engine/metronome/TapTempoButton";
import { TIME_SIGNATURES, type MetronomeSound } from "@/engine/metronome/types";
import { useMetronome } from "@/engine/metronome/useMetronome";

const SOUND_OPTIONS: MetronomeSound[] = ["click", "beep"];
const SOUND_LABELS: Record<MetronomeSound, string> = { click: "Click", beep: "Beep" };

// Temporary test harness for Phase 3 (SPEC.md section 12: "the metronome as
// a standalone, reliable component"). Delete this page and its /dev/metronome
// route once Phase 4 embeds the real thing into the practice screen.
export function MetronomeTest() {
  const metronome = useMetronome();

  return (
    <div className="mx-auto flex min-h-screen max-w-[480px] flex-col gap-8 px-6 py-10">
      <div>
        <h1 className="font-display text-3xl">Metronome test</h1>
        <p className="text-sm text-ink-secondary">
          Phase 3 scratch page. <Link to="/profile" className="text-accent">Back to profile</Link>
        </p>
      </div>

      <div className="flex flex-col items-center gap-6 rounded-card border border-line p-6">
        <BeatIndicator beatsPerBar={metronome.beatsPerBar} currentBeat={metronome.currentBeat} />
        <PlayPauseButton isPlaying={metronome.isPlaying} onToggle={metronome.toggle} />
        <BpmStepper bpm={metronome.bpm} onChange={metronome.setBpm} />
        <TapTempoButton onTap={metronome.tapTempo} />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm text-ink-secondary">Time signature</span>
        <SegmentedControl
          value={metronome.timeSignature}
          options={TIME_SIGNATURES}
          onChange={metronome.setTimeSignature}
          wrap
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm text-ink-secondary">Sound</span>
        <SegmentedControl
          value={metronome.sound}
          options={SOUND_OPTIONS}
          labels={SOUND_LABELS}
          onChange={metronome.setSound}
        />
      </div>
    </div>
  );
}
