import {
  ClickTimeline,
  type AccentLevel,
  type ClickEvent,
  type MetronomeSettings,
} from '@tempodojo/core-metronome';
import { renderClick } from './voices';

export interface AudioClock {
  readonly currentTime: number;
  readonly sampleRate: number;
  play(samples: Float32Array, when: number): void;
}

export interface Ticker {
  start(fn: () => void, intervalMs: number): void;
  stop(): void;
}

type PlayableLevel = Exclude<AccentLevel, 'mute'>;

/**
 * Lookahead audio scheduler that pulls upcoming click events from a ClickTimeline
 * and schedules non-muted clicks onto an AudioClock ahead of playback.
 */
export class LookaheadScheduler {
  private readonly clock: AudioClock;
  private readonly ticker: Ticker;
  private readonly tickMs: number;
  private readonly aheadSec: number;

  private timeline: ClickTimeline | null = null;
  private onEvent?: (e: ClickEvent) => void;
  private soundId = '';
  private sampleCache = new Map<PlayableLevel, Float32Array>();
  private isRunning = false;

  constructor(
    clock: AudioClock,
    ticker: Ticker,
    opts?: { tickMs?: number; aheadSec?: number },
  ) {
    this.clock = clock;
    this.ticker = ticker;
    this.tickMs = opts?.tickMs ?? 25;
    this.aheadSec = opts?.aheadSec ?? 0.1;
  }

  get running(): boolean {
    return this.isRunning;
  }

  start(settings: MetronomeSettings, onEvent?: (e: ClickEvent) => void): void {
    if (this.isRunning) {
      this.stop();
    }
    this.setSoundId(settings.soundId);
    this.onEvent = onEvent;
    this.timeline = new ClickTimeline(settings, this.clock.currentTime + 0.05);
    this.isRunning = true;
    this.ticker.start(() => this.tick(), this.tickMs);
  }

  update(settings: MetronomeSettings): void {
    this.setSoundId(settings.soundId);
    this.timeline?.update(settings);
  }

  stop(): void {
    this.isRunning = false;
    this.ticker.stop();
    this.timeline = null;
    this.onEvent = undefined;
  }

  private tick(): void {
    if (!this.isRunning || !this.timeline) {
      return;
    }
    const events = this.timeline.take(this.clock.currentTime + this.aheadSec);
    for (const event of events) {
      this.onEvent?.(event);
      if (event.level !== 'mute' && event.time >= this.clock.currentTime) {
        this.clock.play(this.sampleFor(event.level), event.time);
      }
    }
  }

  private setSoundId(soundId: string): void {
    if (this.soundId !== soundId) {
      this.soundId = soundId;
      this.sampleCache.clear();
    }
  }

  private sampleFor(level: PlayableLevel): Float32Array {
    const cached = this.sampleCache.get(level);
    if (cached) {
      return cached;
    }
    const rendered = renderClick(this.soundId, level, this.clock.sampleRate);
    this.sampleCache.set(level, rendered);
    return rendered;
  }
}
