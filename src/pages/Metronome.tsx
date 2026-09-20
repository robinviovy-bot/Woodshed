import { Link } from "react-router-dom";
import { SegmentedControl } from "@/components/SegmentedControl";
import { BeatIndicator } from "@/engine/metronome/BeatIndicator";
import { BpmStepper } from "@/engine/metronome/BpmStepper";
import { PlayPauseButton } from "@/engine/metronome/PlayPauseButton";
import { TapTempoButton } from "@/engine/metronome/TapTempoButton";
import { TimeSignaturePicker } from "@/engine/metronome/TimeSignaturePicker";
import type { MetronomeSound } from "@/engine/metronome/types";
import { useMetronome } from "@/engine/metronome/useMetronome";

const SOUND_OPTIONS: MetronomeSound[] = ["click", "beep"];
const SOUND_LABELS: Record<MetronomeSound, string> = { click: "Click", beep: "Beep" };

// Standalone metronome, reachable on its own from Home for whenever you
// just want a click track without picking a drill.
export function Metronome() {
  const metronome = useMetronome();

  return (
    <div className="mx-auto flex min-h-screen max-w-[480px] flex-col gap-8 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">Metronome</h1>
        <Link to="/home" className="text-sm text-accent">
          Home
        </Link>
      </div>

      <div className="flex flex-col items-center gap-6 rounded-card border border-line p-6">
        <BeatIndicator beatsPerBar={metronome.beatsPerBar} currentBeat={metronome.currentBeat} />
        <PlayPauseButton isPlaying={metronome.isPlaying} onToggle={metronome.toggle} />
        <BpmStepper bpm={metronome.bpm} onChange={metronome.setBpm} />
        <div className="flex items-center gap-2">
          <TapTempoButton onTap={metronome.tapTempo} />
          <TimeSignaturePicker value={metronome.timeSignature} onChange={metronome.setTimeSignature} />
        </div>
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
