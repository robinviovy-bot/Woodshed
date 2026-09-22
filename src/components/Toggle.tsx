// Generic on/off switch. The clickable button is 44px square (SPEC.md's
// minimum tap target) even though the visual pill inside it is smaller,
// same "small visual centered in a full-size hit area" shape as
// PlayPauseButton and BackButton.
export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="flex h-11 w-11 items-center justify-center"
    >
      <span
        className="flex h-7 w-12 items-center rounded-full p-1 transition-colors duration-150"
        style={{ backgroundColor: checked ? "var(--color-accent)" : "var(--color-line)" }}
      >
        <span
          className="h-5 w-5 rounded-full transition-transform duration-150"
          style={{
            backgroundColor: "var(--color-background)",
            transform: checked ? "translateX(20px)" : "translateX(0)",
          }}
        />
      </span>
    </button>
  );
}
