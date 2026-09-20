import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "@/auth/useAuth";
import { LoadingScreen } from "@/components/LoadingScreen";

// For pages that only make sense signed out (landing, sign in, sign up,
// forgot password): sends already-signed-in users onward instead.
export function RequireGuest({ children }: { children: ReactNode }) {
  const { session, profile, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (session) {
    return <Navigate to={profile?.first_name ? "/profile" : "/onboarding"} replace />;
  }

  return children;
}
