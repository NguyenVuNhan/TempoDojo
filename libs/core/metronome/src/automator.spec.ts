import { barTempo, isBarMuted } from './automator';
import type { SpeedUp } from './types';

const ramp = (patch: Partial<SpeedUp>): SpeedUp => ({
  startBpm: 80,
  targetBpm: 100,
  stepBpm: 5,
  everyBars: 4,
  pyramid: false,
  ...patch,
});

describe('barTempo', () => {
  it('returns base bpm without a speed-up', () => {
    expect(barTempo(97, null, 0)).toBe(97);
    expect(barTempo(97, null, 50)).toBe(97);
  });
  it('steps every N bars and holds at target', () => {
    const s = ramp({});
    expect([0, 1, 2, 3].map((b) => barTempo(80, s, b))).toEqual([80, 80, 80, 80]);
    expect(barTempo(80, s, 4)).toBe(85);
    expect(barTempo(80, s, 16)).toBe(100);
    expect(barTempo(80, s, 40)).toBe(100);
  });
  it('never passes the target', () => {
    const s = ramp({ stepBpm: 7 });
    expect(barTempo(80, s, 8)).toBe(94);
    expect(barTempo(80, s, 12)).toBe(100);
  });
  it('descending ramp', () => {
    const s = ramp({ startBpm: 120, targetBpm: 100, stepBpm: 10, everyBars: 2 });
    expect(barTempo(120, s, 0)).toBe(120);
    expect(barTempo(120, s, 2)).toBe(110);
    expect(barTempo(120, s, 4)).toBe(100);
    expect(barTempo(120, s, 10)).toBe(100);
  });
  it('pyramid goes up, holds one step, comes back down, holds at start', () => {
    const s = ramp({ startBpm: 80, targetBpm: 90, stepBpm: 5, everyBars: 1, pyramid: true });
    expect([0, 1, 2, 3, 4, 5, 6, 7].map((b) => barTempo(80, s, b))).toEqual([80, 85, 90, 90, 85, 80, 80, 80]);
  });
  it('pyramid respects everyBars', () => {
    const s = ramp({ startBpm: 80, targetBpm: 85, stepBpm: 5, everyBars: 2, pyramid: true });
    expect([0, 1, 2, 3, 4, 5, 6, 7].map((b) => barTempo(80, s, b))).toEqual([80, 80, 85, 85, 85, 85, 80, 80]);
  });
});

describe('isBarMuted', () => {
  it('mutes the off bars of each cycle', () => {
    const three1 = [0, 1, 2, 3, 4, 5, 6, 7].map((b) => isBarMuted({ barsOn: 3, barsOff: 1 }, b));
    expect(three1).toEqual([false, false, false, true, false, false, false, true]);
    const two2 = [0, 1, 2, 3].map((b) => isBarMuted({ barsOn: 2, barsOff: 2 }, b));
    expect(two2).toEqual([false, false, true, true]);
  });
  it('never mutes without a gap or with zero off bars', () => {
    expect(isBarMuted(null, 3)).toBe(false);
    expect(isBarMuted({ barsOn: 2, barsOff: 0 }, 3)).toBe(false);
  });
});
