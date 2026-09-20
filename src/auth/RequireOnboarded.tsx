import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "@/auth/useAuth";
import { LoadingScreen } from "@/components/LoadingScreen";

// Wrap this INSIDE RequireAuth. Sends users who haven't finished onboarding
// (no first_name yet -- see SPEC.md section 7) to /onboarding first.
export function RequireOnboarded({ children }: { children: ReactNode }) {
  const { profile, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!profile?.first_name) return <Navigate to="/onboarding" replace />;

  return children;
}
