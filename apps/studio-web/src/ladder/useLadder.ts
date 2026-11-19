import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  applyClean,
  CATALOGUE,
  emptyProgress,
  isTierUnlocked,
  type Exercise,
  type Progress,
} from '@tempodojo/core-ladder';
import { DEFAULT_PREFS, type Prefs } from '@tempodojo/storage';
import type { LadderRepos, LadderState } from './types';

export function useLadder(repos: LadderRepos, now: () => number = Date.now): LadderState {
  const [loaded, setLoaded] = useState(false);
  const [progress, setProgress] = useState<Map<string, Progress>>(() => new Map());
  const [prefs, setPrefsState] = useState<Prefs>(DEFAULT_PREFS);
  const progressRef = useRef<Map<string, Progress>>(progress);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);

    Promise.all([repos.progress.all(), repos.prefs.load()]).then(([allProgress, loadedPrefs]) => {
      if (cancelled) return;
      progressRef.current = allProgress;
      setProgress(allProgress);
      setPrefsState(loadedPrefs);
      setLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, [repos]);

  const mutateProgress = useCallback(
    async (id: string, build: (current: Progress) => Progress | null) => {
      const current = progressRef.current.get(id) ?? emptyProgress(id);
      const next = build(current);
      if (!next) return;

      const optimistic = new Map(progressRef.current);
      optimistic.set(id, next);
      progressRef.current = optimistic;

      await repos.progress.put(next);
      setProgress((prev) => {
        const updated = new Map(prev);
        updated.set(id, next);
        return updated;
      });
    },
    [repos],
  );

  const progressOf = useCallback(
    (id: string): Progress => progress.get(id) ?? emptyProgress(id),
    [progress],
  );

  const unlocked = useCallback(
    (ex: Exercise): boolean =>
      (!ex.requiresDoublePedal || prefs.hasDoublePedal) &&
      isTierUnlocked(ex.track, ex.tier, CATALOGUE, progress, prefs.hasDoublePedal),
    [progress, prefs.hasDoublePedal],
  );

  const logClean = useCallback(
    (ex: Exercise, bpm: number) =>
      mutateProgress(ex.id, (current) => ({
        ...applyClean(current, bpm, ex),
        lastPracticedAt: now(),
      })),
    [mutateProgress, now],
  );

  const setWorking = useCallback(
    (ex: Exercise, bpm: number) =>
      mutateProgress(ex.id, (current) => ({
        ...current,
        workingBpm: Math.round(bpm),
        lastPracticedAt: now(),
      })),
    [mutateProgress, now],
  );

  const addTime = useCallback(
    (ex: Exercise, seconds: number) => {
      if (seconds <= 0) return Promise.resolve();
      return mutateProgress(ex.id, (current) => ({
        ...current,
        totalSeconds: current.totalSeconds + Math.round(seconds),
        lastPracticedAt: now(),
      }));
    },
    [mutateProgress, now],
  );

  const setPrefs = useCallback(
    async (p: Prefs) => {
      await repos.prefs.save(p);
      setPrefsState(p);
    },
    [repos],
  );

  return useMemo(
    () => ({
      loaded,
      catalogue: CATALOGUE,
      progress,
      prefs,
      progressOf,
      unlocked,
      logClean,
      setWorking,
      addTime,
      setPrefs,
    }),
    [loaded, progress, prefs, progressOf, unlocked, logClean, setWorking, addTime, setPrefs],
  );
}
