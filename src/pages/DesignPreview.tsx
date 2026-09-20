import { useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/Button";
import { FreshnessDot, type Freshness } from "@/components/FreshnessDot";
import { PoolBadge, type Pool } from "@/components/PoolBadge";
import { type Theme } from "@/theme/theme-context";
import { useTheme } from "@/theme/useTheme";

// Throwaway page for Phase 0: lets Robin sanity-check the palette,
// typography, and a few sample components in both themes before any real
// screen gets built. Safe to delete once Phase 2 (auth/profile/theme) lands.

const SWATCHES: { label: string; specName: string; varName: string }[] = [
  { label: "Background", specName: "background", varName: "--color-background" },
  { label: "Surface", specName: "surface", varName: "--color-surface" },
  { label: "Elevated", specName: "elevated", varName: "--color-elevated" },
  { label: "Line", specName: "border", varName: "--color-line" },
  { label: "Ink", specName: "text primary", varName: "--color-ink" },
  { label: "Ink secondary", specName: "text secondary", varName: "--color-ink-secondary" },
  { label: "Ink muted", specName: "text muted", varName: "--color-ink-muted" },
  { label: "Accent", specName: "accent", varName: "--color-accent" },
  { label: "Accent tint", specName: "accent bg", varName: "--color-accent-tint" },
  { label: "Success", specName: "success", varName: "--color-success" },
  { label: "Success tint", specName: "success bg", varName: "--color-success-tint" },
  { label: "Neutral fill", specName: "neutral fill", varName: "--color-neutral-fill" },
];

const FRESHNESS_LEVELS: Freshness[] = ["fresh", "warm", "fading", "cold", "untouched"];
const POOLS: Pool[] = ["naturals", "accidentals", "chromatic", "complete"];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-ui text-sm font-medium tracking-wide uppercase text-ink-secondary">
        {title}
      </h2>
      {children}
    </section>
  );
}

function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const options: Theme[] = ["dark", "light", "auto"];

  return (
    <div className="inline-flex gap-1 rounded-control border border-line p-1">
      {options.map((option) => (
        <button
          key={option}
          onClick={() => setTheme(option)}
          className="min-h-11 rounded-control px-4 text-sm capitalize transition-colors duration-150"
          style={
            theme === option
              ? { backgroundColor: "var(--color-accent)", color: "var(--color-background)" }
              : { color: "var(--color-ink-secondary)" }
          }
        >
          {option}
        </button>
      ))}
    </div>
  );
}

function BeatIndicator() {
  const [currentBeat] = useState(0);
  const beats = [0, 1, 2, 3];

  return (
    <div className="flex items-center gap-3">
      {beats.map((beat) => (
        <span
          key={beat}
          className="rounded-full"
          style={{
            width: beat === 0 ? 14 : 10,
            height: beat === 0 ? 14 : 10,
            backgroundColor:
              beat === currentBeat ? "var(--color-accent)" : "var(--color-neutral-fill)",
          }}
        />
      ))}
    </div>
  );
}

function RepCircles() {
  const [tapped, setTapped] = useState(1);

  return (
    <div className="flex items-center gap-3">
      {[0, 1, 2].map((index) => (
        <button
          key={index}
          onClick={() => setTapped(index + 1)}
          className="h-9 w-9 rounded-full border-2 transition-colors duration-150"
          style={{
            borderColor: "var(--color-accent)",
            backgroundColor: index < tapped ? "var(--color-accent)" : "transparent",
          }}
          aria-label={`Rep ${index + 1}`}
        />
      ))}
    </div>
  );
}

export function DesignPreview() {
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-12 px-6 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Woodshed</h1>
          <p className="text-sm text-ink-secondary">Design preview — throwaway, Phase 0 only</p>
        </div>
        <ThemeSwitcher />
      </header>

      <Section title="Palette">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {SWATCHES.map((swatch) => (
            <div
              key={swatch.varName}
              className="flex flex-col gap-2 rounded-card border border-line p-3"
              style={{ backgroundColor: "var(--color-surface)" }}
            >
              <div
                className="h-12 w-full rounded-control border border-line"
                style={{ backgroundColor: `var(${swatch.varName})` }}
              />
              <div>
                <p className="text-sm font-medium">{swatch.label}</p>
                <p className="font-mono text-xs text-ink-muted">{swatch.specName}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Typography">
        <div
          className="flex flex-col items-center gap-1 rounded-card border border-line py-10"
          style={{ backgroundColor: "var(--color-surface)" }}
        >
          <span className="font-display text-8xl leading-none">C</span>
          <span className="text-sm text-ink-muted">do</span>
        </div>
        <div className="flex flex-col gap-2">
          <p className="font-ui text-base">
            Instrument Sans 400 — "A tempo played well today goes rusty in three weeks."
          </p>
          <p className="font-ui text-base font-medium">
            Instrument Sans 500 — "Due for review" section header weight.
          </p>
        </div>
        <div className="flex flex-wrap gap-6">
          <div>
            <p className="font-mono font-numeric text-4xl">120</p>
            <p className="text-xs text-ink-muted">BPM</p>
          </div>
          <div>
            <p className="font-mono font-numeric text-4xl">1,540</p>
            <p className="text-xs text-ink-muted">XP</p>
          </div>
          <div>
            <p className="font-mono font-numeric text-4xl">42</p>
            <p className="text-xs text-ink-muted">Streak</p>
          </div>
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap gap-3">
          <Button variant="primary">Practice</Button>
          <Button variant="secondary">Skip</Button>
        </div>
      </Section>

      <Section title="Freshness">
        <div className="flex flex-wrap gap-5">
          {FRESHNESS_LEVELS.map((level) => (
            <div key={level} className="flex items-center gap-2">
              <FreshnessDot freshness={level} />
              <span className="text-sm text-ink-secondary capitalize">{level}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Pool badges">
        <div className="flex gap-3">
          {POOLS.map((pool) => (
            <div key={pool} className="flex items-center gap-2">
              <PoolBadge pool={pool} />
              <span className="text-sm text-ink-secondary capitalize">{pool}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Practice screen controls">
        <div
          className="flex flex-col gap-6 rounded-card border border-line p-6"
          style={{ backgroundColor: "var(--color-surface)" }}
        >
          <div className="flex flex-col gap-2">
            <span className="text-xs text-ink-muted">Beat indicator</span>
            <BeatIndicator />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs text-ink-muted">Rep counter (tap to preview)</span>
            <RepCircles />
          </div>
        </div>
      </Section>

      <Section title="Card">
        <div
          className="rounded-card border border-line p-5"
          style={{ backgroundColor: "var(--color-elevated)" }}
        >
          <p className="font-ui font-medium">Fretboard 101</p>
          <p className="text-sm text-ink-secondary">Every note, everywhere</p>
        </div>
      </Section>
    </div>
  );
}
