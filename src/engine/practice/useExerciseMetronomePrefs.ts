import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/auth/useAuth";
import type { TimeSignature } from "@/engine/metronome/types";
import { supabase } from "@/lib/supabase";

export interface MetronomePrefValues {
  enabled: boolean;
  bpm: number;
  timeSignature: TimeSignature;
}

const SAVE_DEBOUNCE_MS = 500;

function storageKey(userId: string, exerciseId: string) {
  return `woodshed:metronome-pref:${userId}:${exerciseId}`;
}

function readLocal(userId: string, exerciseId: string): MetronomePrefValues | null {
  try {
    const raw = localStorage.getItem(storageKey(userId, exerciseId));
    return raw ? (JSON.parse(raw) as MetronomePrefValues) : null;
  } catch {
    return null;
  }
}

function writeLocal(userId: string, exerciseId: string, values: MetronomePrefValues) {
  try {
    localStorage.setItem(storageKey(userId, exerciseId), JSON.stringify(values));
  } catch {
    // Best-effort cache only -- a full or blocked localStorage just means
    // no fallback next time Supabase is unreachable, not a broken save.
  }
}

// Loads, then persists, a user's per-exercise metronome preferences
// (on/off, BPM, time signature) -- restored the next time this exercise's
// setup screen is visited. Supabase-backed; falls back to a local cache
// on read or write failure, per Robin's call, so a flaky connection
// doesn't lose the setting. Takes primitive defaults (not an object) so
// they're safe to depend on directly -- an inline object literal from the
// caller would otherwise be a new reference every render and re-trigger
// the load effect endlessly.
export function useExerciseMetronomePrefs(
  exerciseId: string,
  defaultEnabled: boolean,
  defaultBpm: number,
  defaultTimeSignature: TimeSignature,
) {
  const { user } = useAuth();
  const [values, setValues] = useState<MetronomePrefValues>({
    enabled: defaultEnabled,
    bpm: defaultBpm,
    timeSignature: defaultTimeSignature,
  });
  const [loaded, setLoaded] = useState(false);
  const saveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Synchronizing with an external system (Supabase, with a localStorage
    // fallback) -- exerciseId is stable for the life of one mode-screen
    // mount in practice, but this reset keeps loaded correct if it ever
    // isn't.
    // oxlint-disable-next-line react/set-state-in-effect
    setLoaded(false);

    async function load() {
      if (!user) return;
      const defaults: MetronomePrefValues = {
        enabled: defaultEnabled,
        bpm: defaultBpm,
        timeSignature: defaultTimeSignature,
      };
      const { data, error } = await supabase
        .from("exercise_metronome_prefs")
        .select("metronome_enabled, bpm, time_signature")
        .eq("user_id", user.id)
        .eq("exercise_id", exerciseId)
        .maybeSingle();

      if (cancelled) return;
      if (!error && data) {
        setValues({
          enabled: data.metronome_enabled,
          bpm: data.bpm,
          timeSignature: data.time_signature as TimeSignature,
        });
      } else {
        setValues(readLocal(user.id, exerciseId) ?? defaults);
      }
      setLoaded(true);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user, exerciseId, defaultEnabled, defaultBpm, defaultTimeSignature]);

  const persist = useCallback(
    (next: MetronomePrefValues) => {
      if (!user) return;
      writeLocal(user.id, exerciseId, next);
      supabase
        .from("exercise_metronome_prefs")
        .upsert(
          {
            user_id: user.id,
            exercise_id: exerciseId,
            metronome_enabled: next.enabled,
            bpm: next.bpm,
            time_signature: next.timeSignature,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,exercise_id" },
        )
        .then(({ error }) => {
          // Local cache above already has it; Supabase failing here just
          // means the next load falls back to that cache.
          if (error) console.error("Failed to save metronome preference", error);
        });
    },
    [user, exerciseId],
  );

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, []);

  const update = useCallback(
    (patch: Partial<MetronomePrefValues>) => {
      setValues((current) => {
        const next = { ...current, ...patch };
        if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = window.setTimeout(() => persist(next), SAVE_DEBOUNCE_MS);
        return next;
      });
    },
    [persist],
  );

  return { ...values, loaded, update };
}
