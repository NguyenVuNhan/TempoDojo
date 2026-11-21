import type { Meter, Subdivision } from '@tempodojo/core-metronome';

export type Track = 'hands' | 'coordination' | 'feet';
export const TRACKS: Track[] = ['hands', 'coordination', 'feet'];

export type Rank = 'unranked' | 'bronze' | 'silver' | 'gold' | 'master';
export const RANKS: Rank[] = ['unranked', 'bronze', 'silver', 'gold', 'master'];

/** hihat = the hi-hat foot (pedal). */
export type Voice = 'hands' | 'kick' | 'hihat';

/** Drum a hands line is played on. */
export type HandDrum = 'crash' | 'hihat' | 'ride' | 'tom1' | 'tom2' | 'snare' | 'floortom';

/** One bar of one voice; tokens separated by single spaces, one token per subdivision slot. */
export interface PatternLine {
  voice: Voice;
  steps: string;
  /** Hands lines only; omitted means snare. Two hands hit together by sitting on different lines. */
  drum?: HandDrum;
}

export interface Targets {
  bronze: number;
  silver: number;
  gold: number;
  master: number;
}

export interface Exercise {
  id: string;
  track: Track;
  tier: number;
  name: string;
  /** 1–2 lines: what to focus on while drilling. */
  focus: string;
  meter: Meter;
  /** Notes per beat unit; BPM counts meter.beatUnit. */
  subdivision: Subdivision;
  pattern: PatternLine[];
  targets: Targets;
  transferTip?: string;
  requiresDoublePedal?: boolean;
  family?: string;
}

export interface Progress {
  exerciseId: string;
  workingBpm: number | null;
  bestCleanBpm: number | null;
  rank: Rank;
  totalSeconds: number;
  lastPracticedAt: number | null;
}

export interface Step {
  rest: boolean;
  hand: 'R' | 'L' | 'K' | 'H' | null;
  accent: boolean;
  ghost: boolean;
  grace: 'flam' | 'drag' | 'buzz' | null;
}
