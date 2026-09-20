import { createBrowserRouter } from "react-router-dom";
import { RequireAuth } from "@/auth/RequireAuth";
import { RequireGuest } from "@/auth/RequireGuest";
import { RequireOnboarded } from "@/auth/RequireOnboarded";
import { Calendar } from "@/pages/Calendar";
import { ExercisePicker } from "@/pages/ExercisePicker";
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

// /home is the landing spot for a signed-in, onboarded user. Its "Lessons"
// list links to ExercisePicker (one lesson today: Fretboard 101), which in
// turn links to Practice for each of that lesson's exercises.
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
    path: "/calendar",
    element: (
      <RequireAuth>
        <RequireOnboarded>
          <Calendar />
        </RequireOnboarded>
      </RequireAuth>
    ),
  },
  {
    path: "/lessons/:slug",
    element: (
      <RequireAuth>
        <RequireOnboarded>
          <ExercisePicker />
        </RequireOnboarded>
      </RequireAuth>
    ),
  },
  {
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
