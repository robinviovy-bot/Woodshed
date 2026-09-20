import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { STORAGE_KEY, ThemeContext, readStoredTheme, type Theme } from "@/theme/theme-context";

// Reads/writes the user's preferred theme to localStorage for now; once
// profiles exist (SPEC.md section 8) this should sync with the `theme`
// column instead, with localStorage only as an offline fallback.
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(readStoredTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const value = useMemo(() => ({ theme, setTheme }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
