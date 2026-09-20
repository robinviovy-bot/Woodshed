import { createBrowserRouter } from "react-router-dom";
import { RequireAuth } from "@/auth/RequireAuth";
import { RequireGuest } from "@/auth/RequireGuest";
import { RequireOnboarded } from "@/auth/RequireOnboarded";
import { ForgotPassword } from "@/pages/ForgotPassword";
import { Home } from "@/pages/Home";
import { Landing } from "@/pages/Landing";
import { Metronome } from "@/pages/Metronome";
import { Onboarding } from "@/pages/Onboarding";
import { Practice } from "@/pages/Practice";
import { Profile } from "@/pages/Profile";
import { ResetPassword } from "@/pages/ResetPassword";
import { SignIn } from "@/pages/SignIn";
import { SignUp } from "@/pages/SignUp";

// ExercisePicker, practice, and progress screens land in later build-order
// phases per SPEC.md section 12. /home is the landing spot for a signed-in,
// onboarded user; its exercise list is read-only ("coming soon") until
// Phase 4/5 give it somewhere real to link to.
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
    path: "/home",
    element: (
      <RequireAuth>
        <RequireOnboarded>
          <Home />
        </RequireOnboarded>
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
    // Standalone, reachable without finishing onboarding -- it doesn't
    // touch profile data.
    path: "/metronome",
    element: (
      <RequireAuth>
        <Metronome />
      </RequireAuth>
    ),
  },
  {
    // Phase 4: only exercises with mode 'single' work today (Practice.tsx
    // only implements that mode handler). Home only links here for
    // single-note-metronome; other exercises still show "Coming soon".
    path: "/practice/:slug",
    element: (
      <RequireAuth>
        <RequireOnboarded>
          <Practice />
        </RequireOnboarded>
      </RequireAuth>
    ),
  },
]);
