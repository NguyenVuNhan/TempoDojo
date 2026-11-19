export type SongKind = 'gp' | 'youtube' | 'pdf';

/** Bars are 1-based and inclusive; times are seconds. */
export type LoopRange =
  | { kind: 'bars'; startBar: number; endBar: number }
  | { kind: 'time'; startSec: number; endSec: number };

export interface Section {
  id: string;
  name: string;
  range: LoopRange;
  /** Highest tempo (percent of the original) played cleanly; never lowered. */
  bestCleanPercent: number | null;
  /** Ladder exercise this section needs, e.g. a fill that needs 16th kick doubles. */
  exerciseId: string | null;
  /** Imported from the score's own section markers. */
  fromFile: boolean;
}

/** Loop starts slow and steps toward the target every N passes (percent of original tempo). */
export interface LoopTrainer {
  startPercent: number;
  targetPercent: number;
  stepPercent: number;
  everyPasses: number;
}

export interface Song {
  id: string;
  title: string;
  kind: SongKind;
  /** Stored blob for gp / pdf songs. */
  fileId: string | null;
  fileName: string | null;
  /** The video for youtube songs, or the audio paired with a pdf. */
  youtubeId: string | null;
  /** Song tempo, needed only for a YouTube count-in. */
  bpm: number | null;
  sections: Section[];
  /** Last tempo used, percent of the original (100 = as written / recorded). */
  lastPercent: number;
  trainer: LoopTrainer | null;
  createdAt: number;
  lastOpenedAt: number | null;
}

/** What the notation adapter reports about a loaded score. Bars are 1-based. */
export interface ScoreInfo {
  title: string;
  barCount: number;
  tempo: number;
  markers: { bar: number; name: string }[];
}
