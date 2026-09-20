import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "@/auth/useAuth";
import { LoadingScreen } from "@/components/LoadingScreen";

// Redirects signed-out visitors to sign in. Does not check onboarding
// status -- see RequireOnboarded for that.
export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!session) return <Navigate to="/sign-in" replace />;

  return children;
}
