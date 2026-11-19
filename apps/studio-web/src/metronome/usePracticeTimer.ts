import { useCallback, useEffect, useRef, useState } from 'react';

export interface PracticeTimerOptions {
  playing: boolean;
  countdownSec: number | null;
  onCountdownEnd: () => void;
}

export interface PracticeTimerState {
  elapsedSec: number;
  remainingSec: number | null;
  reset: () => void;
}

/** Tracks whole seconds played while playing and fires onCountdownEnd once when countdown reaches 0. */
export function usePracticeTimer({
  playing,
  countdownSec,
  onCountdownEnd,
}: PracticeTimerOptions): PracticeTimerState {
  const [elapsedSec, setElapsedSec] = useState(0);
  const elapsedMsRef = useRef(0);
  const lastTickRef = useRef<number | null>(null);
  const playingRef = useRef(playing);
  const firedRef = useRef(false);
  const onCountdownEndRef = useRef(onCountdownEnd);

  playingRef.current = playing;
  onCountdownEndRef.current = onCountdownEnd;

  useEffect(() => {
    firedRef.current = false;
  }, [countdownSec]);

  useEffect(() => {
    if (!playing) {
      lastTickRef.current = null;
      return;
    }

    lastTickRef.current = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      if (lastTickRef.current !== null) {
        elapsedMsRef.current += Math.max(0, now - lastTickRef.current);
      }
      lastTickRef.current = now;
      const nextSec = Math.floor(elapsedMsRef.current / 1000);
      setElapsedSec((prev) => (prev === nextSec ? prev : nextSec));
    }, 250);

    return () => {
      if (lastTickRef.current !== null) {
        elapsedMsRef.current += Math.max(0, Date.now() - lastTickRef.current);
        lastTickRef.current = null;
        const nextSec = Math.floor(elapsedMsRef.current / 1000);
        setElapsedSec((prev) => (prev === nextSec ? prev : nextSec));
      }
      clearInterval(id);
    };
  }, [playing]);

  const remainingSec =
    countdownSec === null ? null : Math.max(0, countdownSec - elapsedSec);

  useEffect(() => {
    if (countdownSec !== null && remainingSec === 0 && !firedRef.current) {
      firedRef.current = true;
      onCountdownEndRef.current();
    }
  }, [countdownSec, remainingSec]);

  const reset = useCallback(() => {
    elapsedMsRef.current = 0;
    lastTickRef.current = playingRef.current ? Date.now() : null;
    firedRef.current = false;
    setElapsedSec(0);
  }, []);

  return { elapsedSec, remainingSec, reset };
}
