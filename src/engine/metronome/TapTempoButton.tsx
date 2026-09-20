export function TapTempoButton({ onTap }: { onTap: () => void }) {
  return (
    <button
      type="button"
      onClick={onTap}
      className="min-h-11 rounded-control border border-line px-4 text-sm text-ink-secondary"
    >
      Tap tempo
    </button>
  );
}
