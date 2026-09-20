import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
}

// Minimum 44px tap target per SPEC.md section 10 layout rules.
export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  const base = "min-h-11 rounded-control px-5 font-medium transition-colors duration-150";
  const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
    primary: "bg-accent text-background",
    secondary: "border bg-transparent text-ink",
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${className}`}
      style={variant === "secondary" ? { borderColor: "var(--color-line)" } : undefined}
      {...props}
    />
  );
}
