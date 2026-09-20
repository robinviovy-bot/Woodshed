// SPEC.md section 7: "3 circles tapped manually, reset for each new note.
// No automatic counting, no audio detection." Tapping circle i sets the
// count to i+1, so a mistaken tap can be corrected by tapping an earlier
// circle rather than only ever being able to count up.
export function RepCounter({ reps, onChange }: { reps: number; onChange: (next: number) => void }) {
  return (
    <div className="flex items-center gap-3">
      {[0, 1, 2].map((index) => (
        <button
          key={index}
          type="button"
          onClick={() => onChange(index + 1 === reps ? index : index + 1)}
          aria-label={`Rep ${index + 1}`}
          className="h-9 w-9 rounded-full border-2 transition-colors duration-150"
          style={{
            borderColor: "var(--color-accent)",
            backgroundColor: index < reps ? "var(--color-accent)" : "transparent",
          }}
        />
      ))}
    </div>
  );
}
