import type { InputHTMLAttributes } from "react";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function TextField({ label, error, id, className = "", ...props }: TextFieldProps) {
  const fieldId = id ?? props.name;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={fieldId} className="text-sm text-ink-secondary">
        {label}
      </label>
      <input
        id={fieldId}
        className={`min-h-11 rounded-control border bg-surface px-3 text-ink ${className}`}
        style={{ borderColor: "var(--color-line)" }}
        {...props}
      />
      {error && <span className="text-sm text-danger">{error}</span>}
    </div>
  );
}
