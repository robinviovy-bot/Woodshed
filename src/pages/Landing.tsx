import { Link } from "react-router-dom";
import { Button } from "@/components/Button";

// SPEC.md section 7: "The landing page for signed out visitors explains in
// a few lines what the app does, then offers sign up and sign in."
export function Landing() {
  return (
    <div className="mx-auto flex min-h-screen max-w-[480px] flex-col justify-center gap-8 px-6 py-10">
      <div className="flex flex-col gap-3">
        <h1 className="font-display text-4xl">Woodshed</h1>
        <p className="text-ink-secondary">
          A quiet place to keep your guitar practice honest. Work through drills for as long as
          it takes. Woodshed just notices what's gone fresh and what's gone quiet, so all you
          have to do is come back and play.
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <Link to="/sign-up">
          <Button variant="primary" className="w-full">
            Sign up
          </Button>
        </Link>
        <Link to="/sign-in">
          <Button variant="secondary" className="w-full">
            Sign in
          </Button>
        </Link>
      </div>
    </div>
  );
}
