import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_SETTINGS,
  TapTempo,
  normalizeSettings,
  type ClickEvent,
  type MetronomeSettings,
  type PresetRepository,
} from '@tempodojo/core-metronome';

export interface MetronomeEngineLike {
  start(settings: MetronomeSettings): Promise<void>;
  update(settings: MetronomeSettings): void;
  stop(): void;
  onEvent(cb: (e: ClickEvent, delayMs: number) => void): () => void;
}

export interface MetronomeDeps {
  engine: MetronomeEngineLike;
  repo: PresetRepository;
}

export interface LivePosition {
  bar: number;
  pulse: number;
  bpm: number;
  countIn: boolean;
  muted: boolean;
}

const SAVE_DEBOUNCE_MS = 500;

/** Owns metronome settings, transport, tap tempo, live position, and persistence. */
export function useMetronome({ engine, repo }: MetronomeDeps) {
  const [settings, setSettingsState] = useState<MetronomeSettings>(DEFAULT_SETTINGS);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState<LivePosition | null>(null);
  const settingsRef = useRef(settings);
  const playingRef = useRef(false);
  const restored = useRef(false);
  const tapper = useMemo(() => new TapTempo(), []);

  useEffect(() => {
    let cancelled = false;
    repo.loadLast().then((last) => {
      if (cancelled) return;
      restored.current = true;
      if (last) {
        settingsRef.current = last;
        setSettingsState(last);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [repo]);

  useEffect(() => {
    if (!restored.current) return;
    const id = setTimeout(() => void repo.saveLast(settings), SAVE_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [settings, repo]);

  useEffect(() => {
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const off = engine.onEvent((e, delayMs) => {
      if (e.sub !== 0) return;
      const id = setTimeout(() => {
        timers.delete(id);
        if (!playingRef.current) return;
        setPosition({ bar: e.bar, pulse: e.pulse, bpm: e.bpm, countIn: e.countIn, muted: e.level === 'mute' });
      }, Math.max(0, delayMs));
      timers.add(id);
    });
    return () => {
      off();
      timers.forEach(clearTimeout);
    };
  }, [engine]);

  const setSettings = useCallback(
    (patch: Partial<MetronomeSettings> | ((s: MetronomeSettings) => Partial<MetronomeSettings>)) => {
      const current = settingsRef.current;
      const delta = typeof patch === 'function' ? patch(current) : patch;
      const next = normalizeSettings({ ...current, ...delta });
      settingsRef.current = next;
      restored.current = true;
      setSettingsState(next);
      if (playingRef.current) engine.update(next);
    },
    [engine],
  );

  const nudge = useCallback((delta: number) => setSettings((s) => ({ bpm: Math.round(s.bpm) + delta })), [setSettings]);

  const start = useCallback(async () => {
    if (playingRef.current) return;
    playingRef.current = true;
    setPlaying(true);
    await engine.start(settingsRef.current);
  }, [engine]);

  const stop = useCallback(() => {
    if (!playingRef.current) return;
    playingRef.current = false;
    setPlaying(false);
    setPosition(null);
    engine.stop();
  }, [engine]);

  const toggle = useCallback(() => (playingRef.current ? stop() : void start()), [start, stop]);

  const tap = useCallback(() => {
    const bpm = tapper.tap(performance.now());
    if (bpm !== null) setSettings({ bpm });
  }, [tapper, setSettings]);

  useEffect(() => () => engine.stop(), [engine]);

  return { settings, setSettings, nudge, playing, start, stop, toggle, tap, position };
}
