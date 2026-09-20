import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { supabase } from "@/lib/supabase";

type Notation = "en" | "fr";

// SPEC.md section 7: "Onboarding after first sign up: first name, note
// notation preference, timezone captured from the browser, then a single
// screen explaining the philosophy from section 1 in two sentences."
export function Onboarding() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<"details" | "philosophy">("details");
  const [firstName, setFirstName] = useState("");
  const [notation, setNotation] = useState<Notation>("en");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDetailsSubmit(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    setSubmitting(true);
    setError(null);

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ first_name: firstName, notation, timezone })
      .eq("id", user.id);

    setSubmitting(false);
    if (updateError) {
      setError("Couldn't save that. Please try again.");
      return;
    }
    setStep("philosophy");
  }

  async function handleContinue() {
    await refreshProfile();
    navigate("/home", { replace: true });
  }

  if (step === "philosophy") {
    return (
      <div className="mx-auto flex min-h-screen max-w-[480px] flex-col justify-center gap-8 px-6 py-10">
        <div className="flex flex-col gap-3">
          <h1 className="font-display text-3xl">Welcome, {firstName}</h1>
          <p className="text-ink-secondary">
            Nothing here is ever finished. No levels to clear, no content to unlock. Woodshed
            just notices what's gone quiet, so all you have to do is come back and play.
          </p>
        </div>
        <Button variant="primary" onClick={handleContinue}>
          Let's go
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-[480px] flex-col justify-center gap-8 px-6 py-10">
      <div>
        <h1 className="font-display text-3xl">A couple of things first</h1>
      </div>
      <form onSubmit={handleDetailsSubmit} className="flex flex-col gap-4">
        <TextField
          label="First name"
          name="firstName"
          required
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
        />
        <div className="flex flex-col gap-1.5">
          <span className="text-sm text-ink-secondary">Note names</span>
          <div className="inline-flex gap-1 rounded-control border border-line p-1">
            {(["en", "fr"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setNotation(option)}
                className="min-h-11 flex-1 rounded-control px-4 text-sm transition-colors duration-150"
                style={
                  notation === option
                    ? { backgroundColor: "var(--color-accent)", color: "var(--color-background)" }
                    : { color: "var(--color-ink-secondary)" }
                }
              >
                {option === "en" ? "C D E F G A B" : "do ré mi fa sol la si"}
              </button>
            ))}
          </div>
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : "Continue"}
        </Button>
      </form>
    </div>
  );
}
