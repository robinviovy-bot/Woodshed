import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { AuthLayout } from "@/components/AuthLayout";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { describeAuthError } from "@/lib/authErrors";
import { supabase } from "@/lib/supabase";

export function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    setSubmitting(false);
    if (signInError) {
      setError(describeAuthError(signInError));
    }
    // On success, AuthProvider's onAuthStateChange picks up the new session
    // and RequireGuest on this route redirects onward automatically.
  }

  return (
    <AuthLayout title="Woodshed" subtitle="Welcome back">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <TextField
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <TextField
          label="Password"
          type="password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <div className="flex flex-col gap-2 text-sm text-ink-secondary">
        <Link to="/forgot-password" className="text-accent">
          Forgot your password?
        </Link>
        <p>
          New to Woodshed?{" "}
          <Link to="/sign-up" className="text-accent">
            Create an account
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
