import { useEffect } from "react";
import { useAuth } from "@/auth/useAuth";
import type { Theme } from "@/theme/theme-context";
import { useTheme } from "@/theme/useTheme";

function isTheme(value: string): value is Theme {
  return value === "dark" || value === "light" || value === "auto";
}

// Once a profile loads (sign-in, or a fresh session on another device),
// adopt its saved theme preference. Profile.tsx's theme switcher updates
// both the live theme and the DB directly, so this effect only fires again
// when a *new* profile object arrives (login, onboarding, refreshProfile),
// not on every local theme change -- no feedback loop with the switcher.
export function ThemeSync() {
  const { profile } = useAuth();
  const { setTheme } = useTheme();

  useEffect(() => {
    if (profile?.theme && isTheme(profile.theme)) {
      setTheme(profile.theme);
    }
  }, [profile, setTheme]);

  return null;
}
