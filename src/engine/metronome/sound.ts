import type { MetronomeSound } from "@/engine/metronome/types";

// Synthesized, not sample-based, so there's nothing to load or cache.
// "click" is a short, high, percussive tick; "beep" is a softer, longer
// sine tone. Either way the downbeat plays higher-pitched than the rest,
// per SPEC.md: "Accent the first beat with a higher pitched click."
const SOUND_PROFILES: Record<MetronomeSound, { accentFreq: number; freq: number; duration: number }> = {
  click: { accentFreq: 1000, freq: 800, duration: 0.03 },
  beep: { accentFreq: 1200, freq: 880, duration: 0.08 },
};

export function playClick(
  audioContext: AudioContext,
  time: number,
  { accent, sound }: { accent: boolean; sound: MetronomeSound },
) {
  const profile = SOUND_PROFILES[sound];
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.frequency.value = accent ? profile.accentFreq : profile.freq;
  oscillator.connect(gain);
  gain.connect(audioContext.destination);

  // Fast attack, exponential decay to near-silence -- keeps every click
  // sounding percussive regardless of duration, and avoids the audible pop
  // a hard stop would cause.
  gain.gain.setValueAtTime(0.001, time);
  gain.gain.exponentialRampToValueAtTime(accent ? 0.9 : 0.6, time + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.001, time + profile.duration);

  oscillator.start(time);
  oscillator.stop(time + profile.duration + 0.01);
}
