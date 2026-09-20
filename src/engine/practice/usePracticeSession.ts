import { useRef, useState } from "react";
import { useAuth } from "@/auth/useAuth";
import { endSession, startSession, type StartedSession } from "@/lib/sessions";
import type { Exercise, Pool } from "@/types/database";

// Shared by all three mode screens so persistence isn't reimplemented per
// mode (SPEC.md section 9): begin() on "Start", finish() on "End session".
// begin() isn't awaited by callers -- it fires as soon as the drill opens
// and `result` populates once it resolves, which is always well before the
// summary screen can possibly render. finish() is fire-and-forget too: a
// failed background write shouldn't block the user leaving the screen,
// consistent with this app's "trust the user, don't verify" stance.
export function usePracticeSession(exercise: Exercise, pool: Pool) {
  const { user, profile } = useAuth();
  const [result, setResult] = useState<StartedSession | null>(null);
  const sessionRef = useRef<StartedSession | null>(null);

  function begin(bpm: number | null, timeSignature: string | null) {
    if (!user) return;
    startSession({
      userId: user.id,
      timezone: profile?.timezone ?? null,
      exercise,
      pool,
      bpm,
      timeSignature,
    }).then((started) => {
      sessionRef.current = started;
      setResult(started);
    });
  }

  function finish(notesDone: number, repsDone: number) {
    const started = sessionRef.current;
    if (!user || !started) return;
    endSession({
      userId: user.id,
      timezone: profile?.timezone ?? null,
      sessionId: started.sessionId,
      drillId: started.drillId,
      notesDone,
      repsDone,
    });
  }

  return { begin, finish, result };
}
