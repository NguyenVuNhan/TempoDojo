import { MAX_BPM, MIN_BPM } from './types';

const MAX_INTERVALS = 4;
const RESET_GAP_MS = 2000;

export class TapTempo {
  private lastTapMs: number | null = null;
  private intervals: number[] = [];

  tap(timestampMs: number): number | null {
    if (this.lastTapMs === null || timestampMs - this.lastTapMs > RESET_GAP_MS) {
      this.lastTapMs = timestampMs;
      this.intervals = [];
      return null;
    }

    const interval = timestampMs - this.lastTapMs;
    this.lastTapMs = timestampMs;
    this.intervals.push(interval);
    if (this.intervals.length > MAX_INTERVALS) {
      this.intervals.shift();
    }

    const sum = this.intervals.reduce((acc, value) => acc + value, 0);
    const avg = sum / this.intervals.length;
    const bpm = Math.round(60000 / avg);
    return Math.min(MAX_BPM, Math.max(MIN_BPM, bpm));
  }

  reset(): void {
    this.lastTapMs = null;
    this.intervals = [];
  }
}
