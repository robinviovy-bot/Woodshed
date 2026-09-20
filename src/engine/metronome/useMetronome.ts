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

export function useMetronome(
  initialBpm = 80,
  initialSound: MetronomeSound = "click",
  initialTimeSignature: TimeSignature = "4/4",
) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpmState] = useState(initialBpm);
  const [timeSignature, setTimeSignatureState] = useState<TimeSignature>(initialTimeSignature);
  const [sound, setSound] = useState<MetronomeSound>(initialSound);
  const [currentBeat, setCurrentBeat] = useState(-1);
  const [tickCount, setTickCount] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const schedulerIdRef = useRef<number | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const nextNoteTimeRef = useRef(0);
  const nextBeatRef = useRef(0);
  const notesInQueueRef = useRef<QueuedNote[]>([]);
  const tapTimesRef = useRef<number[]>([]);
  const tickCountRef = useRef(0);

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
      let played = 0;
      while (
        notesInQueueRef.current.length &&
        notesInQueueRef.current[0].time < audioContext.currentTime
      ) {
        lastPlayed = notesInQueueRef.current.shift();
        played++;
      }
      if (lastPlayed) {
        setCurrentBeat(lastPlayed.beat);
        tickCountRef.current += played;
        setTickCount(tickCountRef.current);
      }
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
    // Also reset here, not just in start(): tickCount means "beats since
    // the current play began," which is 0 whenever nothing is playing.
    // Leaving a stale nonzero value here was the bug behind
    // useSequenceTest's countdown showing something like "10" instead of
    // "3" -- its baseline was read before this start()'s own reset had
    // landed.
    tickCountRef.current = 0;
    setTickCount(0);
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
    // Reset so anything counting beats since this play started (the
    // sequence test run, see useSequenceTest) has a clean baseline.
    tickCountRef.current = 0;
    setTickCount(0);
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

  // Overrides the bar position of the next scheduled beat without touching
  // its timing, so a caller can line up which future beat lands on the
  // accented downbeat (beat 0) -- used by useSequenceTest so the test run's
  // first note starts exactly on "the 1," regardless of time signature.
  const setUpcomingBeat = useCallback((beat: number) => {
    nextBeatRef.current = beat;
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
    // Beats elapsed since the current play started (never resets on its
    // own while playing, unlike currentBeat which wraps every bar) --
    // what useSequenceTest counts against to time the test run's 3-2-1
    // countdown and its six-beats-per-note advance regardless of the
    // chosen time signature.
    tickCount,
    beatsPerBar: BEATS_PER_BAR[timeSignature],
    start,
    toggle,
    stop,
    setBpm,
    setTimeSignature,
    setUpcomingBeat,
    setSound,
    tapTempo,
  };
}
