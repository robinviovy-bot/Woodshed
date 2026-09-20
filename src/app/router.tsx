import { createBrowserRouter } from "react-router-dom";
import { RequireAuth } from "@/auth/RequireAuth";
import { RequireGuest } from "@/auth/RequireGuest";
import { RequireOnboarded } from "@/auth/RequireOnboarded";
import { ForgotPassword } from "@/pages/ForgotPassword";
import { Landing } from "@/pages/Landing";
import { MetronomeTest } from "@/pages/MetronomeTest";
import { Onboarding } from "@/pages/Onboarding";
import { Profile } from "@/pages/Profile";
import { ResetPassword } from "@/pages/ResetPassword";
import { SignIn } from "@/pages/SignIn";
import { SignUp } from "@/pages/SignUp";

// Home, exercise picker, practice, and progress screens land in later
// build-order phases per SPEC.md section 12. Until then, /profile is the
// de facto landing spot for a signed-in, onboarded user.
export const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <RequireGuest>
        <Landing />
      </RequireGuest>
    ),
  },
  {
    path: "/sign-up",
    element: (
      <RequireGuest>
        <SignUp />
      </RequireGuest>
    ),
  },
  {
    path: "/sign-in",
    element: (
      <RequireGuest>
        <SignIn />
      </RequireGuest>
    ),
  },
  {
    path: "/forgot-password",
    element: (
      <RequireGuest>
        <ForgotPassword />
      </RequireGuest>
    ),
  },
  {
    path: "/reset-password",
    element: <ResetPassword />,
  },
  {
    path: "/onboarding",
    element: (
      <RequireAuth>
        <Onboarding />
      </RequireAuth>
    ),
  },
  {
    path: "/profile",
    element: (
      <RequireAuth>
        <RequireOnboarded>
          <Profile />
        </RequireOnboarded>
      </RequireAuth>
    ),
  },
  {
    // Phase 3 scratch route, see MetronomeTest.tsx's header comment.
    path: "/dev/metronome",
    element: (
      <RequireAuth>
        <MetronomeTest />
      </RequireAuth>
    ),
  },
]);
