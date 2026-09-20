import { useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import type { User } from "@supabase/supabase-js";
import { useAuth } from "@/auth/useAuth";
import { Button } from "@/components/Button";
import { ComingSoonBadge } from "@/components/ComingSoonBadge";
import { Section } from "@/components/Section";
import { SegmentedControl } from "@/components/SegmentedControl";
import { TextField } from "@/components/TextField";
import { supabase } from "@/lib/supabase";
import type { Theme } from "@/theme/theme-context";
import { useTheme } from "@/theme/useTheme";
import type { Profile as ProfileRow } from "@/types/database";

type Notation = "en" | "fr";

const THEME_OPTIONS: Theme[] = ["dark", "light", "auto"];
const THEME_LABELS: Record<Theme, string> = { dark: "Dark", light: "Light", auto: "Auto" };
const NOTATION_OPTIONS: { value: Notation; label: string }[] = [
  { value: "en", label: "C D E F G A B" },
  { value: "fr", label: "do ré mi fa sol la si" },
];
const METRONOME_SOUND_OPTIONS = ["click", "beep"];
const METRONOME_SOUND_LABELS: Record<string, string> = { click: "Click", beep: "Beep" };

// RequireAuth + RequireOnboarded (see the router) already wait for
// useAuth()'s loading flag before this ever mounts, so by the time it does,
// user/profile are guaranteed present -- this gate just satisfies that for
// TypeScript and hands ProfileScreen non-null props, so its form state can
// be seeded directly from profile instead of synced in via an effect.
export function Profile() {
  const { user, profile } = useAuth();
  if (!user || !profile) return null;
  return <ProfileScreen user={user} profile={profile} />;
}

function ProfileScreen({ user, profile }: { user: User; profile: ProfileRow }) {
  const { refreshProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [firstName, setFirstName] = useState(profile.first_name ?? "");
  const [lastName, setLastName] = useState(profile.last_name ?? "");
  const [notation, setNotation] = useState<Notation>(profile.notation === "fr" ? "fr" : "en");
  const [metronomeSound, setMetronomeSound] = useState(profile.metronome_sound);
  const [timezone, setTimezone] = useState(profile.timezone ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSaveDetails(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setSaved(false);

    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: firstName,
        last_name: lastName || null,
        notation,
        metronome_sound: metronomeSound,
        timezone: timezone || null,
      })
      .eq("id", user.id);

    setSaving(false);
    if (!error) {
      setSaved(true);
      await refreshProfile();
    }
  }

  async function handleThemeChange(next: Theme) {
    setTheme(next);
    await supabase.from("profiles").update({ theme: next }).eq("id", user.id);
  }

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setAvatarUploading(true);
    setAvatarError(null);

    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setAvatarUploading(false);
      setAvatarError("Couldn't upload that photo. Please try again.");
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(path);

    await supabase
      .from("profiles")
      .update({ avatar_url: `${publicUrl}?t=${Date.now()}` })
      .eq("id", user.id);
    await refreshProfile();
    setAvatarUploading(false);
  }

  async function handleDeleteAccount() {
    setDeleting(true);

    const userId = user.id;
    // Every user-owned table, per SPEC.md section 8. Deletes the full
    // account's data; the auth.users row itself needs a service-role Edge
    // Function to remove, which is out of scope for this phase (flagged in
    // CLAUDE.md) -- signing out afterward leaves nothing reachable for now.
    await supabase.from("session_items").delete().eq("user_id", userId);
    await supabase.from("sessions").delete().eq("user_id", userId);
    await supabase.from("drill_stats").delete().eq("user_id", userId);
    await supabase.from("daily_activity").delete().eq("user_id", userId);
    await supabase.from("xp_events").delete().eq("user_id", userId);
    await supabase.from("milestones").delete().eq("user_id", userId);
    await supabase.from("user_stats").delete().eq("user_id", userId);
    await supabase.from("profiles").delete().eq("id", userId);

    await supabase.auth.signOut();
    navigate("/", { replace: true });
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-[480px] flex-col gap-10 px-6 py-10">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-3xl">Profile</h1>
        <Button variant="secondary" onClick={handleSignOut}>
          Sign out
        </Button>
      </header>

      <Section title="Photo">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="h-16 w-16 overflow-hidden rounded-full border border-line"
            style={{ backgroundColor: "var(--color-surface)" }}
            aria-label="Change profile photo"
          >
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center font-display text-2xl text-ink-secondary">
                {(profile.first_name ?? "?").charAt(0).toUpperCase()}
              </span>
            )}
          </button>
          <div className="flex flex-col gap-1">
            <Button
              type="button"
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
            >
              {avatarUploading ? "Uploading…" : "Change photo"}
            </Button>
            {avatarError && <span className="text-sm text-danger">{avatarError}</span>}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>
      </Section>

      <Section title="Details">
        <form onSubmit={handleSaveDetails} className="flex flex-col gap-4">
          <TextField
            label="First name"
            name="firstName"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
          <TextField
            label="Last name"
            name="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
          <div className="flex flex-col gap-1.5">
            <span className="text-sm text-ink-secondary">Note names</span>
            <SegmentedControl
              value={notation}
              options={["en", "fr"]}
              onChange={setNotation}
              labels={{ en: NOTATION_OPTIONS[0].label, fr: NOTATION_OPTIONS[1].label }}
            />
          </div>
          <TextField
            label="Timezone"
            name="timezone"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
          />
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : saved ? "Saved" : "Save changes"}
          </Button>
        </form>
      </Section>

      <Section title="Theme">
        <SegmentedControl
          value={theme}
          options={THEME_OPTIONS}
          onChange={handleThemeChange}
          labels={THEME_LABELS}
        />
      </Section>

      <Section title="Validation">
        <div className="flex flex-col gap-2">
          <div className="inline-flex gap-1 rounded-control border border-line p-1">
            <span
              className="min-h-11 flex-1 rounded-control px-4 py-2.5 text-center text-sm"
              style={{ backgroundColor: "var(--color-accent)", color: "var(--color-background)" }}
            >
              Manual
            </span>
            <span className="flex min-h-11 flex-1 items-center justify-center gap-2 px-4 text-sm text-ink-muted">
              Microphone detection
              <ComingSoonBadge />
            </span>
          </div>
        </div>
      </Section>

      <Section title="Metronome sound">
        <SegmentedControl
          value={metronomeSound}
          options={METRONOME_SOUND_OPTIONS}
          labels={METRONOME_SOUND_LABELS}
          onChange={(next) => {
            setMetronomeSound(next);
            supabase.from("profiles").update({ metronome_sound: next }).eq("id", user.id);
          }}
        />
      </Section>

      <Section title="Notifications">
        <div className="flex items-center justify-between rounded-card border border-line p-4">
          <div className="flex items-center gap-2">
            <span className="text-sm">Daily practice reminder</span>
            <ComingSoonBadge />
          </div>
          <input type="checkbox" disabled className="h-5 w-5" />
        </div>
      </Section>

      <Section title="Danger zone">
        {!confirmingDelete ? (
          <Button variant="secondary" onClick={() => setConfirmingDelete(true)}>
            Delete account
          </Button>
        ) : (
          <div className="flex flex-col gap-3 rounded-card border p-4" style={{ borderColor: "var(--color-danger)" }}>
            <p className="text-sm text-ink-secondary">
              This permanently deletes every drill you've practiced, every session, and your
              profile. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setConfirmingDelete(false)} disabled={deleting}>
                Cancel
              </Button>
              <Button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="text-background"
                style={{ backgroundColor: "var(--color-danger)" }}
              >
                {deleting ? "Deleting…" : "Yes, delete everything"}
              </Button>
            </div>
          </div>
        )}
      </Section>
    </div>
  );
}
