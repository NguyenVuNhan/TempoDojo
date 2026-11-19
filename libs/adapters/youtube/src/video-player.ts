/** A video player bound to one element. Times are seconds. */
export interface VideoPlayer {
  /** Resolves when the video can be controlled; rejects VideoError('unavailable') if it cannot load. */
  ready: Promise<void>;
  play(): void;
  pause(): void;
  seek(sec: number): void;
  time(): number;
  duration(): number;
  setRate(rate: number): void;
  /** Playback rates this video allows. */
  rates(): number[];
  onPlaying(cb: (playing: boolean) => void): () => void;
  destroy(): void;
}

export class VideoError extends Error {
  constructor(public readonly code: 'unavailable') {
    super(code);
    this.name = 'VideoError';
  }
}
