export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  labels,
  wrap = false,
}: {
  value: T;
  options: T[];
  onChange: (next: T) => void;
  labels?: Partial<Record<T, string>>;
  /** Buttons wrap onto multiple rows and size to their content, instead of
   * stretching to fill one row. Useful once there are too many options for
   * a phone-width row (e.g. the six time signatures). */
  wrap?: boolean;
}) {
  return (
    <div
      className={`inline-flex gap-1 rounded-control border border-line p-1 ${wrap ? "flex-wrap" : ""}`}
    >
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`min-h-11 rounded-control px-4 text-sm transition-colors duration-150 ${wrap ? "flex-none" : "flex-1"}`}
          style={
            value === option
              ? { backgroundColor: "var(--color-accent)", color: "var(--color-background)" }
              : { color: "var(--color-ink-secondary)" }
          }
        >
          {labels?.[option] ?? option}
        </button>
      ))}
    </div>
  );
}
