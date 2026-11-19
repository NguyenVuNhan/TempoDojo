import { TapTempo } from './tap-tempo';

const tapAll = (times: number[]): (number | null)[] => {
  const t = new TapTempo();
  return times.map((ms) => t.tap(ms));
};

describe('TapTempo', () => {
  it('needs two taps', () => {
    expect(tapAll([0])).toEqual([null]);
  });
  it('computes bpm from the interval', () => {
    expect(tapAll([0, 500]).at(-1)).toBe(120);
    expect(tapAll([0, 500, 1000, 1500, 2000]).at(-1)).toBe(120);
  });
  it('averages intervals and rounds', () => {
    expect(tapAll([0, 600, 1100]).at(-1)).toBe(109);
  });
  it('uses only the last 4 intervals', () => {
    // first interval 1000 ms is dropped once 4 newer ones exist
    expect(tapAll([0, 1000, 1500, 2000, 2500, 3000]).at(-1)).toBe(120);
  });
  it('resets after a gap longer than 2 s', () => {
    const t = new TapTempo();
    t.tap(0);
    t.tap(500);
    expect(t.tap(3000)).toBeNull();
    expect(t.tap(3500)).toBe(120);
  });
  it('clamps to 20–400', () => {
    expect(tapAll([0, 100]).at(-1)).toBe(400);
    expect(tapAll([0, 1900, 3800]).at(-1)).toBe(32);
  });
  it('reset() forgets taps', () => {
    const t = new TapTempo();
    t.tap(0);
    t.reset();
    expect(t.tap(500)).toBeNull();
  });
});
