import { useState } from "react";
import { SegmentedControl } from "@/components/SegmentedControl";
import { TIME_SIGNATURES, type TimeSignature } from "@/engine/metronome/types";

// Collapsed to just the current value by default (all 6 options at once is
// more than this control needs most of the time); tapping it reveals the
// full picker, and choosing a value collapses it back down.
export function TimeSignaturePicker({
  value,
  onChange,
}: {
  value: TimeSignature;
  onChange: (next: TimeSignature) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="min-h-11 rounded-control border border-line px-4 font-mono font-numeric text-sm text-ink-secondary"
      >
        {value}
      </button>
    );
  }

  return (
    <SegmentedControl
      value={value}
      options={TIME_SIGNATURES}
      onChange={(next) => {
        onChange(next);
        setExpanded(false);
      }}
      wrap
    />
  );
}
