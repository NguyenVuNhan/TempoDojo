import type { Track } from '@tempodojo/core-ladder';

export type PracticeSource =
  | { kind: 'metronome' }
  | { kind: 'exercise'; exerciseId: string; track: Track }
  | { kind: 'song'; songId: string };

export interface PracticeEvent {
  id: string;
  type: 'play' | 'stop';
  /** epoch ms */
  at: number;
  source: PracticeSource;
}

export interface Interval {
  start: number;
  end: number;
  source: PracticeSource;
}

export interface Session {
  start: number;
  end: number;
  playedMs: number;
  intervals: Interval[];
}

export interface WeeklyTarget {
  sessions: number;
  minutes: number;
}

export const SESSION_GAP_MS = 600_000;
export const MAX_OPEN_PLAY_MS = 1_800_000;
export const DEFAULT_WEEKLY_TARGET: WeeklyTarget = { sessions: 4, minutes: 120 };
