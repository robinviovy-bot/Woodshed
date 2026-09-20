import type { ReactNode } from "react";

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-sm font-medium tracking-wide text-ink-secondary uppercase">{title}</h2>
      {children}
    </section>
  );
}
