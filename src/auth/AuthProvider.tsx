import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { AuthContext } from "@/auth/auth-context";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types/database";

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (error) {
    console.error("Failed to fetch profile", error);
    return null;
  }
  return data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const {
        data: { session: initialSession },
      } = await supabase.auth.getSession();
      if (cancelled) return;

      setSession(initialSession);
      setUser(initialSession?.user ?? null);

      if (initialSession?.user) {
        const initialProfile = await fetchProfile(initialSession.user.id);
        if (!cancelled) setProfile(initialProfile);
      }

      if (!cancelled) setLoading(false);
    }

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (nextSession?.user) {
        // Route guards (RequireAuth/RequireGuest/RequireOnboarded) read
        // `loading` to know whether `profile` is trustworthy yet. Without
        // this, session/user update synchronously above while `profile`
        // still holds its previous value (null, right after a sign-out) for
        // the length of this await -- long enough for a guard to re-render,
        // see an empty profile, and redirect to /onboarding before the real
        // profile ever loads. Once that redirect fires there's no coming
        // back from it automatically, so this must be closed, not just
        // fast.
        setLoading(true);
        const nextProfile = await fetchProfile(nextSession.user.id);
        setProfile(nextProfile);
        setLoading(false);
      } else {
        setProfile(null);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const nextProfile = await fetchProfile(user.id);
    setProfile(nextProfile);
  }, [user]);

  const value = useMemo(
    () => ({ session, user, profile, loading, refreshProfile }),
    [session, user, profile, loading, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
