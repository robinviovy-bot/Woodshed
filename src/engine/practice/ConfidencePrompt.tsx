import { Button } from "@/components/Button";
import { CONFIDENCE_LABELS, CONFIDENCE_OPTIONS } from "@/engine/practice/shared";
import type { Confidence } from "@/types/database";

// Shared across every mode: "Rough / OK / Solid", skippable, purely
// declarative (SPEC.md section 5).
export function ConfidencePrompt({ onChoose }: { onChoose: (confidence: Confidence | null) => void }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-[480px] flex-col items-center justify-center gap-6 px-6 py-10 text-center">
      <h1 className="font-display text-3xl">How did that feel?</h1>
      <div className="flex gap-3">
        {CONFIDENCE_OPTIONS.map((option) => (
          <Button key={option} variant="secondary" onClick={() => onChoose(option)}>
            {CONFIDENCE_LABELS[option]}
          </Button>
        ))}
      </div>
      <button type="button" className="text-sm text-ink-muted" onClick={() => onChoose(null)}>
        Skip
      </button>
    </div>
  );
}
