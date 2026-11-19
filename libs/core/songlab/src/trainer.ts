import { barTempo } from '@tempodojo/core-metronome';

import type { LoopTrainer } from './types';

export const GP_MIN_PERCENT = 25;
export const GP_MAX_PERCENT = 150;
export const YOUTUBE_RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

/** Rounds a tempo percent and clamps it to the Guitar Pro supported range. */
export function clampGpPercent(p: number): number {
  return Math.min(GP_MAX_PERCENT, Math.max(GP_MIN_PERCENT, Math.round(p)));
}

/** Snaps a tempo percent to the nearest supported YouTube playback rate, breaking ties down. */
export function snapYoutubeRate(percent: number): number {
  const target = percent / 100;
  let best = YOUTUBE_RATES[0];
  let bestDiff = Math.abs(target - best);

  for (let i = 1; i < YOUTUBE_RATES.length; i++) {
    const rate = YOUTUBE_RATES[i];
    const diff = Math.abs(target - rate);
    if (diff < bestDiff) {
      best = rate;
      bestDiff = diff;
    }
  }

  return best;
}

/** Computes the target tempo percent for a 0-based loop trainer pass. */
export function trainerPercent(t: LoopTrainer, pass: number): number {
  return barTempo(
    t.startPercent,
    {
      startBpm: t.startPercent,
      targetBpm: t.targetPercent,
      stepBpm: t.stepPercent,
      everyBars: t.everyPasses,
      pyramid: false,
    },
    pass,
  );
}
