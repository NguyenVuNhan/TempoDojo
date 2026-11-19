import type { ScoreInfo } from '@tempodojo/core-songlab';

export interface TrackInfo {
  index: number;
  name: string;
  isDrums: boolean;
}

/** A Guitar Pro / MusicXML score player bound to one element. Bars are 1-based. */
export interface NotationPlayer {
  /** Rejects with NotationError('unreadable') when the bytes are not a score alphaTab can read. */
  load(bytes: Uint8Array): Promise<ScoreInfo>;
  tracks(): TrackInfo[];
  play(): void;
  pause(): void;
  stop(): void;
  /** Percent of the file tempo, 25–150. */
  setPercent(percent: number): void;
  /** Loop these bars, or play the whole song when null. */
  setLoop(range: { startBar: number; endBar: number } | null): void;
  setCountIn(on: boolean): void;
  setMetronome(on: boolean): void;
  setTrackMute(index: number, muted: boolean): void;
  setTrackSolo(index: number, solo: boolean): void;
  /** Which tracks are drawn. */
  showTracks(indexes: number[]): void;
  /** The bar under the playback cursor. */
  onBar(cb: (bar: number) => void): () => void;
  onPlaying(cb: (playing: boolean) => void): () => void;
  /** Fires each time looped playback wraps back to the range start. */
  onLoopPass(cb: () => void): () => void;
  destroy(): void;
}

export class NotationError extends Error {
  constructor(public readonly code: 'unreadable') {
    super(code);
    this.name = 'NotationError';
  }
}

export interface NotationOptions {
  /** 2 on phones, 4 on wider screens. */
  barsPerRow: number;
  scrollElement?: HTMLElement;
}
