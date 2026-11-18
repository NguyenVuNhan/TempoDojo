import { DEFAULT_SETTINGS } from './meter';
import { ClickTimeline } from './timeline';
import type { MetronomeSettings } from './types';

const settings = (patch: Partial<MetronomeSettings>): MetronomeSettings => ({
  ...DEFAULT_SETTINGS,
  ...patch,
});

describe('ClickTimeline', () => {
  it('emits one bar of quarter clicks from the start time', () => {
    const tl = new ClickTimeline(settings({}), 10);
    const events = tl.take(12);
    expect(events.map((e) => e.time)).toEqual([10, 10.5, 11, 11.5]);
    expect(events.map((e) => e.level)).toEqual(['accent', 'normal', 'normal', 'normal']);
    expect(events.every((e) => e.bar === 0 && e.sub === 0 && !e.countIn && e.bpm === 120)).toBe(true);
    expect(events.map((e) => e.pulse)).toEqual([0, 1, 2, 3]);
  });

  it('take consumes events and never repeats them', () => {
    const tl = new ClickTimeline(settings({}), 0);
    const a = tl.take(1);
    const b = tl.take(1);
    const c = tl.take(2);
    expect(a.map((e) => e.time)).toEqual([0, 0.5]);
    expect(b).toEqual([]);
    expect(c.map((e) => e.time)).toEqual([1, 1.5]);
    expect(tl.peekTime()).toBe(2);
  });

  it('adds subdivision clicks at the subdivision level', () => {
    const tl = new ClickTimeline(settings({ bpm: 60, subdivision: 3 }), 0);
    const events = tl.take(1);
    expect(events).toHaveLength(3);
    expect(events[0].time).toBe(0);
    expect(events[1].time).toBeCloseTo(1 / 3, 9);
    expect(events[2].time).toBeCloseTo(2 / 3, 9);
    expect(events.map((e) => e.sub)).toEqual([0, 1, 2]);
    expect(events.map((e) => e.level)).toEqual(['accent', 'ghost', 'ghost']);
    expect(events.every((e) => e.pulse === 0)).toBe(true);
  });

  it('plays count-in bars before bar 0 without subdivisions', () => {
    const tl = new ClickTimeline(settings({ countInBars: 1, subdivision: 2 }), 0);
    const events = tl.take(2.01);
    const countIn = events.filter((e) => e.countIn);
    expect(countIn.map((e) => e.time)).toEqual([0, 0.5, 1, 1.5]);
    expect(countIn.every((e) => e.bar === -1 && e.sub === 0)).toBe(true);
    expect(countIn.map((e) => e.level)).toEqual(['accent', 'normal', 'normal', 'normal']);
    const first = events.find((e) => !e.countIn);
    expect(first).toMatchObject({ time: 2, bar: 0, pulse: 0, sub: 0, level: 'accent' });
  });

  it('applies speed-up tempo per bar from bar boundaries', () => {
    const tl = new ClickTimeline(
      settings({
        bpm: 80,
        automator: { speedUp: { startBpm: 80, targetBpm: 100, stepBpm: 10, everyBars: 1, pyramid: false }, gap: null },
      }),
      0,
    );
    const events = tl.take(7);
    const downbeats = events.filter((e) => e.pulse === 0);
    expect(downbeats[0]).toMatchObject({ bar: 0, time: 0, bpm: 80 });
    expect(downbeats[1].bar).toBe(1);
    expect(downbeats[1].time).toBeCloseTo(3, 9);
    expect(downbeats[1].bpm).toBe(90);
    expect(downbeats[2].time).toBeCloseTo(3 + (4 * 60) / 90, 9);
    expect(downbeats[2].bpm).toBe(100);
  });

  it('marks every click in a gap bar as mute but still emits it', () => {
    const tl = new ClickTimeline(settings({ subdivision: 2, automator: { speedUp: null, gap: { barsOn: 1, barsOff: 1 } } }), 0);
    const events = tl.take(6);
    expect(events.filter((e) => e.bar === 0).map((e) => e.level)).toEqual([
      'accent', 'ghost', 'normal', 'ghost', 'normal', 'ghost', 'normal', 'ghost',
    ]);
    const bar1 = events.filter((e) => e.bar === 1);
    expect(bar1).toHaveLength(8);
    expect(bar1.every((e) => e.level === 'mute')).toBe(true);
    expect(events.find((e) => e.bar === 2)?.level).toBe('accent');
  });

  it('emits muted accents as mute', () => {
    const tl = new ClickTimeline(settings({ accents: ['mute', 'accent', 'mute', 'accent'] }), 0);
    expect(tl.take(2).map((e) => e.level)).toEqual(['mute', 'accent', 'mute', 'accent']);
  });

  it('update() mid-bar applies from the next untaken pulse', () => {
    const tl = new ClickTimeline(settings({}), 0);
    expect(tl.take(1).map((e) => e.time)).toEqual([0, 0.5]);
    tl.update(settings({ bpm: 60 }));
    const next = tl.take(3);
    expect(next.map((e) => e.time)).toEqual([1, 2]);
    expect(next.map((e) => e.pulse)).toEqual([2, 3]);
    expect(next.every((e) => e.bpm === 60 && e.bar === 0)).toBe(true);
    expect(tl.take(4)[0]).toMatchObject({ time: 3, bar: 1, pulse: 0 });
  });

  it('update() to a shorter meter starts a new bar at the next pulse', () => {
    const tl = new ClickTimeline(settings({}), 0);
    tl.take(1);
    tl.update(settings({ meter: { beatsPerBar: 2, denominator: 4, beatUnit: 'quarter' }, accents: ['accent', 'normal'] }));
    expect(tl.take(1.01)[0]).toMatchObject({ time: 1, bar: 1, pulse: 0, level: 'accent' });
  });

  it('update() changes accents for remaining pulses of the bar', () => {
    const tl = new ClickTimeline(settings({}), 0);
    tl.take(1);
    tl.update(settings({ accents: ['accent', 'normal', 'ghost', 'mute'] }));
    expect(tl.take(2).map((e) => e.level)).toEqual(['ghost', 'mute']);
  });

  it('uses dotted-quarter pulses in compound meter', () => {
    const tl = new ClickTimeline(
      settings({ bpm: 60, meter: { beatsPerBar: 6, denominator: 8, beatUnit: 'dotted-quarter' }, accents: ['accent', 'normal'] }),
      0,
    );
    const events = tl.take(4);
    expect(events.map((e) => e.time)).toEqual([0, 1, 2, 3]);
    expect(events.map((e) => e.bar)).toEqual([0, 0, 1, 1]);
  });

  it('normalizes the settings it is given', () => {
    const tl = new ClickTimeline(settings({ bpm: 1000 }), 0);
    expect(tl.take(0.3).map((e) => e.time)).toEqual([0, 0.15]);
  });

  it('long run accuracy: no accumulated drift over 10 minutes', () => {
    const tl = new ClickTimeline(settings({}), 0);
    const events = tl.take(600);
    expect(events).toHaveLength(1200);
    expect(Math.abs(events[1199].time - 599.5)).toBeLessThan(1e-9);
    expect(events[1199].bar).toBe(299);
    expect(events[1199].pulse).toBe(3);
  });
});
