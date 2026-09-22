import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "@/auth/useAuth";
import { LoadingScreen } from "@/components/LoadingScreen";

// Wrap this INSIDE RequireAuth. Sends users who haven't finished onboarding
// yet (see SPEC.md section 7) to /onboarding first. Keyed on
// onboarding_completed_at rather than first_name being set -- that used to
// be the proxy, but it breaks for an account whose profiles row no longer
// exists (e.g. after "Delete account", which doesn't remove auth.users):
// with no row, profile is null every time, not just missing a name.
export function RequireOnboarded({ children }: { children: ReactNode }) {
  const { profile, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!profile?.onboarding_completed_at) return <Navigate to="/onboarding" replace />;

  return children;
}
