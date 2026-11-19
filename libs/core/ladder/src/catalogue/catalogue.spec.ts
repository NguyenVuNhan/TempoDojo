import { pulsesPerBar } from '@tempodojo/core-metronome';
import { parseSteps } from '../pattern';
import { CATALOGUE, exerciseById } from './index';

const byTrack = (track: string) => CATALOGUE.filter((e) => e.track === track);
const tiersOf = (track: string) => [...new Set(byTrack(track).map((e) => e.tier))].sort((a, b) => a - b);
const pas = (n: number) => `pas-${String(n).padStart(2, '0')}`;

describe('CATALOGUE', () => {
  it('has unique ids', () => {
    const ids = CATALOGUE.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('lists tracks in order: hands, coordination, feet; tiers non-decreasing within a track', () => {
    const order = CATALOGUE.map((e) => e.track);
    const firstCoord = order.indexOf('coordination');
    const firstFeet = order.indexOf('feet');
    expect(order.slice(0, firstCoord).every((t) => t === 'hands')).toBe(true);
    expect(order.slice(firstCoord, firstFeet).every((t) => t === 'coordination')).toBe(true);
    expect(order.slice(firstFeet).every((t) => t === 'feet')).toBe(true);
    for (const track of ['hands', 'coordination', 'feet']) {
      const tiers = byTrack(track).map((e) => e.tier);
      expect(tiers).toEqual([...tiers].sort((a, b) => a - b));
    }
  });

  it('contains exactly the 40 PAS rudiments in Vic Firth tiers', () => {
    const hands = byTrack('hands');
    expect(hands.map((e) => e.id).sort()).toEqual(Array.from({ length: 40 }, (_, i) => pas(i + 1)));
    const tierOf = (n: number) => exerciseById(pas(n))?.tier;
    expect([1, 6, 4, 16, 20, 31].map(tierOf)).toEqual([1, 1, 1, 1, 1, 1]);
    expect([7, 9, 10, 17, 19, 21, 22, 24, 32, 38].every((n) => tierOf(n) === 2)).toBe(true);
    expect([18, 26, 30, 36, 37].every((n) => tierOf(n) === 4)).toBe(true);
    expect([1, 2, 3, 4].map((t) => hands.filter((e) => e.tier === t).length)).toEqual([6, 10, 19, 5]);
    expect(hands.filter((e) => e.tier === 1).map((e) => e.id)).toEqual(['pas-01', 'pas-06', 'pas-04', 'pas-16', 'pas-20', 'pas-31']);
  });

  it('names key rudiments correctly', () => {
    expect(exerciseById('pas-01')?.name).toBe('Single Stroke Roll');
    expect(exerciseById('pas-16')?.name).toBe('Single Paradiddle');
    expect(exerciseById('pas-20')?.name).toBe('Flam');
    expect(exerciseById('pas-34')?.name).toBe('Lesson 25');
    expect(exerciseById('pas-40')?.name).toBe('Triple Ratamacue');
    expect(exerciseById('nope')).toBeUndefined();
  });

  it('every pattern line parses and fills exactly one bar', () => {
    for (const ex of CATALOGUE) {
      expect(ex.pattern.length).toBeGreaterThan(0);
      for (const line of ex.pattern) {
        const steps = parseSteps(line.steps);
        expect({ id: ex.id, voice: line.voice, n: steps.length }).toEqual({
          id: ex.id,
          voice: line.voice,
          n: pulsesPerBar(ex.meter) * ex.subdivision,
        });
      }
    }
  });

  it('hands rudiments have one hands line using only R/L/rests; paradiddle starts with an accent', () => {
    for (const ex of byTrack('hands')) {
      expect(ex.pattern.map((l) => l.voice)).toEqual(['hands']);
      expect(parseSteps(ex.pattern[0].steps).every((s) => s.rest || s.hand === 'R' || s.hand === 'L')).toBe(true);
    }
    expect(exerciseById('pas-16')?.pattern[0].steps).toBe('>R L R R >L R L L');
    expect(parseSteps(exerciseById('pas-20')!.pattern[0].steps).some((s) => s.grace === 'flam')).toBe(true);
    expect(parseSteps(exerciseById('pas-31')!.pattern[0].steps).some((s) => s.grace === 'drag')).toBe(true);
    expect(parseSteps(exerciseById('pas-04')!.pattern[0].steps).every((s) => s.rest || s.grace === 'buzz')).toBe(true);
  });

  it('uses the family targets from the research', () => {
    const t = (n: number) => exerciseById(pas(n))?.targets;
    expect(t(1)).toEqual({ bronze: 70, silver: 100, gold: 135, master: 170 });
    expect(t(6)).toEqual({ bronze: 75, silver: 110, gold: 145, master: 180 });
    expect(t(16)).toEqual({ bronze: 65, silver: 95, gold: 125, master: 155 });
    expect(t(20)).toEqual({ bronze: 55, silver: 80, gold: 105, master: 130 });
    expect(t(21)).toEqual({ bronze: 65, silver: 95, gold: 125, master: 150 });
    expect(t(38)).toEqual({ bronze: 45, silver: 65, gold: 85, master: 105 });
  });

  it('targets strictly increase and every exercise has focus text', () => {
    for (const ex of CATALOGUE) {
      const { bronze, silver, gold, master } = ex.targets;
      expect(bronze < silver && silver < gold && gold < master).toBe(true);
      expect(bronze).toBeGreaterThanOrEqual(20);
      expect(ex.focus.trim().length).toBeGreaterThan(10);
    }
  });

  it('coordination: 6 contiguous tiers, ≥3 each, every exercise has hands, kick and hihat lines', () => {
    expect(tiersOf('coordination')).toEqual([1, 2, 3, 4, 5, 6]);
    for (const tier of [1, 2, 3, 4, 5, 6]) {
      expect(byTrack('coordination').filter((e) => e.tier === tier).length).toBeGreaterThanOrEqual(3);
    }
    for (const ex of byTrack('coordination')) {
      expect(ex.pattern.map((l) => l.voice).sort()).toEqual(['hands', 'hihat', 'kick']);
      expect(ex.id).toMatch(/^coord-\d-\d+$/);
    }
    expect(exerciseById('coord-1-1')).toBeDefined();
  });

  it('feet: tiers 1–6, double pedal only on 5–6', () => {
    expect(tiersOf('feet')).toEqual([1, 2, 3, 4, 5, 6]);
    for (const ex of byTrack('feet')) {
      expect(ex.id).toMatch(/^feet-\d-\d+$/);
      expect(Boolean(ex.requiresDoublePedal)).toBe(ex.tier >= 5);
      expect(ex.pattern.some((l) => l.voice === 'hands')).toBe(false);
      if (!ex.requiresDoublePedal) {
        for (const l of ex.pattern) {
          expect(parseSteps(l.steps).every((s) => s.rest || s.hand === 'K' || s.hand === 'H')).toBe(true);
        }
      }
    }
    expect(exerciseById('feet-1-1')).toBeDefined();
  });
});
