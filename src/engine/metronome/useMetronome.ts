import { useCallback, useEffect, useRef, useState } from "react";
import { playClick } from "@/engine/metronome/sound";
import {
  BEATS_PER_BAR,
  MAX_BPM,
  MIN_BPM,
  type MetronomeSound,
  type TimeSignature,
} from "@/engine/metronome/types";

// Lookahead scheduler ("A Tale of Two Clocks" pattern), per SPEC.md:
// schedule clicks ~100ms ahead against audioContext.currentTime rather than
// setInterval, so timing doesn't drift with tab throttling or GC pauses.
// setInterval only drives how often we CHECK whether more notes need
// scheduling; the actual playback time of every click is set precisely via
// the Web Audio clock.
const SCHEDULE_AHEAD_TIME = 0.1; // seconds
const SCHEDULER_INTERVAL = 25; // ms

interface QueuedNote {
  beat: number;
  time: number;
}

export function useMetronome(initialBpm = 80, initialSound: MetronomeSound = "click") {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpmState] = useState(initialBpm);
  const [timeSignature, setTimeSignatureState] = useState<TimeSignature>("4/4");
  const [sound, setSound] = useState<MetronomeSound>(initialSound);
  const [currentBeat, setCurrentBeat] = useState(-1);

  const audioContextRef = useRef<AudioContext | null>(null);
  const schedulerIdRef = useRef<number | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const nextNoteTimeRef = useRef(0);
  const nextBeatRef = useRef(0);
  const notesInQueueRef = useRef<QueuedNote[]>([]);
  const tapTimesRef = useRef<number[]>([]);

  // Refs mirroring state that the scheduler/draw loops read on every tick.
  // Without these, the closures captured when start() was called would see
  // stale bpm/timeSignature/sound values for the rest of that play session.
  const bpmRef = useRef(bpm);
  const timeSignatureRef = useRef(timeSignature);
  const soundRef = useRef(sound);
  useEffect(() => {
    bpmRef.current = bpm;
  }, [bpm]);
  useEffect(() => {
    timeSignatureRef.current = timeSignature;
  }, [timeSignature]);
  useEffect(() => {
    soundRef.current = sound;
  }, [sound]);

  const scheduleNote = useCallback((beat: number, time: number) => {
    const audioContext = audioContextRef.current;
    if (!audioContext) return;
    playClick(audioContext, time, { accent: beat === 0, sound: soundRef.current });
    notesInQueueRef.current.push({ beat, time });
  }, []);

  const advanceNote = useCallback(() => {
    const secondsPerBeat = 60.0 / bpmRef.current;
    nextNoteTimeRef.current += secondsPerBeat;
    nextBeatRef.current = (nextBeatRef.current + 1) % BEATS_PER_BAR[timeSignatureRef.current];
  }, []);

  const scheduler = useCallback(() => {
    const audioContext = audioContextRef.current;
    if (!audioContext) return;
    while (nextNoteTimeRef.current < audioContext.currentTime + SCHEDULE_AHEAD_TIME) {
      scheduleNote(nextBeatRef.current, nextNoteTimeRef.current);
      advanceNote();
    }
  }, [scheduleNote, advanceNote]);

  const draw = useCallback(function drawFrame() {
    const audioContext = audioContextRef.current;
    if (audioContext) {
      let lastPlayed: QueuedNote | undefined;
      while (
        notesInQueueRef.current.length &&
        notesInQueueRef.current[0].time < audioContext.currentTime
      ) {
        lastPlayed = notesInQueueRef.current.shift();
      }
      if (lastPlayed) setCurrentBeat(lastPlayed.beat);
    }
    rafIdRef.current = requestAnimationFrame(drawFrame);
  }, []);

  const stop = useCallback(() => {
    if (schedulerIdRef.current !== null) {
      clearInterval(schedulerIdRef.current);
      schedulerIdRef.current = null;
    }
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    notesInQueueRef.current = [];
    setIsPlaying(false);
    setCurrentBeat(-1);
  }, []);

  const start = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    const audioContext = audioContextRef.current;
    // iOS Safari suspends new AudioContexts until a user gesture resumes
    // them; start() is only ever called from a click/tap handler, so this
    // is always inside that gesture.
    if (audioContext.state === "suspended") {
      audioContext.resume();
    }

    nextBeatRef.current = 0;
    nextNoteTimeRef.current = audioContext.currentTime + 0.05;
    schedulerIdRef.current = window.setInterval(scheduler, SCHEDULER_INTERVAL);
    rafIdRef.current = requestAnimationFrame(draw);
    setIsPlaying(true);
  }, [scheduler, draw]);

  const toggle = useCallback(() => {
    if (isPlaying) stop();
    else start();
  }, [isPlaying, start, stop]);

  const setBpm = useCallback((next: number) => {
    setBpmState(Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(next))));
  }, []);

  const setTimeSignature = useCallback((next: TimeSignature) => {
    setTimeSignatureState(next);
    nextBeatRef.current = nextBeatRef.current % BEATS_PER_BAR[next];
  }, []);

  // Tap tempo: average the gaps between the last few taps. A pause of more
  // than 2 seconds starts a fresh tap sequence instead of blending with an
  // old, unrelated one.
  const tapTempo = useCallback(() => {
    const now = performance.now();
    const taps = tapTimesRef.current;
    if (taps.length > 0 && now - taps[taps.length - 1] > 2000) {
      taps.length = 0;
    }
    taps.push(now);
    if (taps.length > 5) taps.shift();

    if (taps.length >= 2) {
      const gaps = [];
      for (let i = 1; i < taps.length; i++) gaps.push(taps[i] - taps[i - 1]);
      const averageGapMs = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
      setBpm(60000 / averageGapMs);
    }
  }, [setBpm]);

  // Stop cleanly if the component unmounts mid-play (e.g. navigating away).
  useEffect(() => stop, [stop]);

  return {
    isPlaying,
    bpm,
    timeSignature,
    sound,
    currentBeat,
    beatsPerBar: BEATS_PER_BAR[timeSignature],
    toggle,
    stop,
    setBpm,
    setTimeSignature,
    setSound,
    tapTempo,
  };
}
