import { Button } from "@/components/Button";

// Shared across every mode. `stats` are pre-formatted lines (each mode's
// numbers mean different things -- notes/pairs/sequences covered -- so the
// mode screen decides the wording, this just lays them out).
export function SessionSummary({ stats, onDone }: { stats: string[]; onDone: () => void }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-[480px] flex-col items-center justify-center gap-6 px-6 py-10 text-center">
      <h1 className="font-display text-3xl">Nice work</h1>
      <div className="flex flex-col gap-1 text-ink-secondary">
        {stats.map((stat) => (
          <p key={stat}>{stat}</p>
        ))}
      </div>
      <Button onClick={onDone}>Done</Button>
    </div>
  );
}
