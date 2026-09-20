import { createBrowserRouter } from "react-router-dom";
import { DesignPreview } from "@/pages/DesignPreview";

// Placeholder route table for Phase 0. Real screens (sign in, home, practice,
// progress, profile) land in later build-order phases per SPEC.md section 12.
export const router = createBrowserRouter([
  {
    path: "/",
    element: <DesignPreview />,
  },
]);
