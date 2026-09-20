import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { AuthLayout } from "@/components/AuthLayout";
import { Button } from "@/components/Button";
import { LoadingScreen } from "@/components/LoadingScreen";
import { TextField } from "@/components/TextField";
import { describeAuthError } from "@/lib/authErrors";
import { supabase } from "@/lib/supabase";

// Reached via the emailed reset link, which supabase-js turns into a
// temporary session on page load (see ForgotPassword.tsx's redirectTo).
// Not wrapped in RequireAuth/RequireGuest: whether a session exists here is
// exactly the thing being checked, not an access rule to enforce upfront.
export function ResetPassword() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const { error: updateError } = await supabase.auth.updateUser({ password });

    setSubmitting(false);
    if (updateError) {
      setError(describeAuthError(updateError));
      return;
    }
    navigate("/profile", { replace: true });
  }

  if (loading) return <LoadingScreen />;

  if (!session) {
    return (
      <AuthLayout title="Link expired">
        <p className="text-ink-secondary">
          This password reset link is invalid or has expired.
        </p>
        <Link to="/forgot-password" className="text-sm text-accent">
          Request a new one
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Set a new password">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <TextField
          label="New password"
          type="password"
          name="password"
          autoComplete="new-password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : "Save new password"}
        </Button>
      </form>
    </AuthLayout>
  );
}
