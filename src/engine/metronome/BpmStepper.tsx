import { MAX_BPM, MIN_BPM } from "@/engine/metronome/types";

function StepButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-11 min-w-11 rounded-control border border-line text-sm text-ink-secondary"
    >
      {label}
    </button>
  );
}

// Range 30 to 240 per SPEC.md; setBpm (from useMetronome) already clamps.
// The slider is for fast, rough changes across the full range; the
// -5/-1/+1/+5 steps stay alongside it for landing exactly on the tempo
// ladder's rungs (40/50/60/70/80), which a slider is too imprecise for.
export function BpmStepper({ bpm, onChange }: { bpm: number; onChange: (next: number) => void }) {
  return (
    <div className="flex w-full max-w-xs flex-col items-center gap-3">
      <input
        type="range"
        min={MIN_BPM}
        max={MAX_BPM}
        value={bpm}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
        style={{ accentColor: "var(--color-accent)" }}
        aria-label="Tempo"
      />
      <div className="flex items-center gap-2">
        <StepButton label="-5" onClick={() => onChange(bpm - 5)} />
        <StepButton label="-1" onClick={() => onChange(bpm - 1)} />
        <div className="flex min-w-20 flex-col items-center">
          <span className="font-mono font-numeric text-3xl">{bpm}</span>
          <span className="text-xs text-ink-muted">BPM</span>
        </div>
        <StepButton label="+1" onClick={() => onChange(bpm + 1)} />
        <StepButton label="+5" onClick={() => onChange(bpm + 5)} />
      </div>
      <span className="sr-only" aria-live="polite">
        {bpm} beats per minute, range {MIN_BPM} to {MAX_BPM}
      </span>
    </div>
  );
}
