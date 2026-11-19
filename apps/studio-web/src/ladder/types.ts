import type { Exercise, Progress } from '@tempodojo/core-ladder';
import type { Prefs, PrefsRepository, ProgressRepository } from '@tempodojo/storage';

export interface LadderRepos {
  progress: ProgressRepository;
  prefs: PrefsRepository;
}

/** Shared ladder state for Today, Ladder and Exercise screens (returned by useLadder). */
export interface LadderState {
  /** False until progress and prefs have been read from storage. */
  loaded: boolean;
  catalogue: Exercise[];
  progress: Map<string, Progress>;
  prefs: Prefs;
  /** Stored progress or emptyProgress(id). */
  progressOf(id: string): Progress;
  /** Exercise visible (double pedal) and its tier unlocked. */
  unlocked(ex: Exercise): boolean;
  /** applyClean + lastPracticedAt = now, saved. Never lowers best or rank. */
  logClean(ex: Exercise, bpm: number): Promise<void>;
  /** workingBpm = bpm, lastPracticedAt = now, saved. */
  setWorking(ex: Exercise, bpm: number): Promise<void>;
  /** totalSeconds += seconds, lastPracticedAt = now, saved. Ignores seconds <= 0. */
  addTime(ex: Exercise, seconds: number): Promise<void>;
  setPrefs(p: Prefs): Promise<void>;
}
