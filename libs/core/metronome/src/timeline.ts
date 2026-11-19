import { barTempo, isBarMuted } from './automator';
import { normalizeSettings, pulseSeconds, pulsesPerBar } from './meter';
import type { AccentLevel, MetronomeSettings } from './types';

export interface ClickEvent {
  time: number;
  bar: number;
  pulse: number;
  sub: number;
  level: AccentLevel;
  bpm: number;
  countIn: boolean;
}

/**
 * Lazy pulse-by-pulse click event generator supporting count-in bars,
 * bar-boundary automator changes, subdivisions, and live settings updates.
 */
export class ClickTimeline {
  private settings: MetronomeSettings;
  private bar: number;
  private pulse: number;
  private anchorTime: number;
  private anchorPulse: number;
  private barBpm: number;
  private queue: ClickEvent[] = [];

  constructor(settings: MetronomeSettings, startTime: number) {
    this.settings = normalizeSettings(settings);
    this.bar = 0 - this.settings.countInBars;
    this.pulse = 0;
    this.anchorTime = startTime;
    this.anchorPulse = 0;
    this.barBpm = this.computeBarBpm(this.bar, this.settings);
  }

  /** Returns and consumes all events with time < untilTime, in time order. */
  take(untilTime: number): ClickEvent[] {
    while (this.nextPulseTime() < untilTime) {
      this.generateNextPulse();
    }

    let cut = 0;
    while (cut < this.queue.length && this.queue[cut].time < untilTime) {
      cut++;
    }
    if (cut === 0) {
      return [];
    }

    const taken = this.queue.slice(0, cut);
    this.queue = this.queue.slice(cut);
    return taken;
  }

  /**
   * Applies new settings from the next pulse not yet generated.
   * Already queued events are kept; the current bar is re-anchored at that pulse.
   */
  update(settings: MetronomeSettings): void {
    const normalized = normalizeSettings(settings);
    const nextTime = this.nextPulseTime();
    const newPulsesPerBar = pulsesPerBar(normalized.meter);

    this.settings = normalized;
    this.anchorTime = nextTime;

    if (this.pulse >= newPulsesPerBar) {
      this.bar += 1;
      this.pulse = 0;
      this.anchorPulse = 0;
    } else {
      this.anchorPulse = this.pulse;
    }

    this.barBpm = this.computeBarBpm(this.bar, this.settings);
  }

  /** Time of the next untaken event. */
  peekTime(): number {
    return this.queue.length > 0 ? this.queue[0].time : this.nextPulseTime();
  }

  private computeBarBpm(bar: number, settings: MetronomeSettings): number {
    return bar < 0
      ? settings.bpm
      : barTempo(settings.bpm, settings.automator.speedUp, bar);
  }

  private nextPulseTime(): number {
    return this.anchorTime + (this.pulse - this.anchorPulse) * pulseSeconds(this.barBpm);
  }

  private generateNextPulse(): void {
    const pulseTime = this.nextPulseTime();
    const countIn = this.bar < 0;
    const bpm = this.barBpm;

    if (countIn) {
      this.queue.push({
        time: pulseTime,
        bar: this.bar,
        pulse: this.pulse,
        sub: 0,
        level: this.pulse === 0 ? 'accent' : 'normal',
        bpm,
        countIn: true,
      });
    } else {
      const muted = isBarMuted(this.settings.automator.gap, this.bar);
      const subCount = this.settings.subdivision;
      const subSec = pulseSeconds(bpm) / subCount;

      for (let sub = 0; sub < subCount; sub++) {
        const level: AccentLevel = muted
          ? 'mute'
          : sub === 0
            ? this.settings.accents[this.pulse]
            : this.settings.subdivisionLevel;

        this.queue.push({
          time: pulseTime + sub * subSec,
          bar: this.bar,
          pulse: this.pulse,
          sub,
          level,
          bpm,
          countIn: false,
        });
      }
    }

    this.advancePulse();
  }

  private advancePulse(): void {
    const totalPulses = pulsesPerBar(this.settings.meter);
    const nextPulse = this.pulse + 1;

    if (nextPulse >= totalPulses) {
      this.anchorTime =
        this.anchorTime + (totalPulses - this.anchorPulse) * pulseSeconds(this.barBpm);
      this.anchorPulse = 0;
      this.pulse = 0;
      this.bar += 1;
      this.barBpm = this.computeBarBpm(this.bar, this.settings);
    } else {
      this.pulse = nextPulse;
    }
  }
}
