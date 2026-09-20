import { RouterProvider } from "react-router-dom";
import { router } from "@/app/router";
import { AuthProvider } from "@/auth/AuthProvider";
import { ThemeSync } from "@/theme/ThemeSync";
import { ThemeProvider } from "@/theme/ThemeProvider";

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ThemeSync />
        <RouterProvider router={router} />
      </AuthProvider>
    </ThemeProvider>
  );
}
