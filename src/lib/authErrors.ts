import type { AuthError } from "@supabase/supabase-js";

// Maps Supabase Auth errors to the user-facing copy SPEC.md section 7 asks
// for. One deliberate deviation: SPEC.md wants "wrong password" and
// "unknown email" shown as distinct states, but Supabase's signInWithPassword
// intentionally returns the same generic error for both, to avoid letting an
// attacker discover which emails have accounts (a standard security
// practice). Unconfirmed-email and rate-limit ARE distinct signals Supabase
// exposes, so those two get specific messages.
export function describeAuthError(error: AuthError | null | undefined): string {
  if (!error) return "Something went wrong. Please try again.";

  const message = error.message.toLowerCase();

  if (error.status === 429) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  if (message.includes("email not confirmed")) {
    return "Please confirm your email before signing in — check your inbox for the confirmation link.";
  }
  if (message.includes("invalid login credentials")) {
    return "Incorrect email or password.";
  }
  if (message.includes("user already registered")) {
    return "An account with this email already exists — try signing in instead.";
  }

  return error.message || "Something went wrong. Please try again.";
}
