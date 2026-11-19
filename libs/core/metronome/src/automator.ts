import type { Gap, SpeedUp } from './types';

function clampToward(value: number, limit: number, direction: number): number {
  return direction > 0 ? Math.min(limit, value) : Math.max(limit, value);
}

/** Computes the BPM for a 0-based non-count-in bar under the active speed-up config. */
export function barTempo(
  baseBpm: number,
  speedUp: SpeedUp | null,
  barIndex: number,
): number {
  if (!speedUp) {
    return baseBpm;
  }

  const { startBpm, targetBpm, stepBpm, everyBars, pyramid } = speedUp;
  const delta = targetBpm - startBpm;
  if (delta === 0 || stepBpm <= 0 || everyBars <= 0) {
    return startBpm;
  }

  const direction = Math.sign(delta);
  const stepIndex = Math.floor(barIndex / everyBars);

  if (!pyramid) {
    const raw = startBpm + direction * stepIndex * stepBpm;
    return clampToward(raw, targetBpm, direction);
  }

  const stepsToTarget = Math.ceil(Math.abs(delta) / stepBpm);
  if (stepIndex <= stepsToTarget) {
    const raw = startBpm + direction * stepIndex * stepBpm;
    return clampToward(raw, targetBpm, direction);
  }

  const backSteps = stepIndex - (stepsToTarget + 1);
  const raw = targetBpm - direction * backSteps * stepBpm;
  return clampToward(raw, startBpm, -direction);
}

/** Returns whether a 0-based non-count-in bar is muted by the gap-click cycle. */
export function isBarMuted(gap: Gap | null, barIndex: number): boolean {
  if (!gap || gap.barsOff <= 0) {
    return false;
  }

  const cycle = gap.barsOn + gap.barsOff;
  if (cycle <= 0) {
    return false;
  }

  return barIndex % cycle >= gap.barsOn;
}
