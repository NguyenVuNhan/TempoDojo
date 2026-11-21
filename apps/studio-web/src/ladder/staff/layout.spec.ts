import { CATALOGUE, exerciseById, type Exercise } from '@tempodojo/core-ladder';
import { beatsPerLineFor, countLabels, describeStaff, layoutStaff } from './layout';

const ex = (id: string) => exerciseById(id)!;

describe('staff layout', () => {
  it('count labels per subdivision', () => {
    expect(countLabels(1)).toEqual(['#']);
    expect(countLabels(2)).toEqual(['#', '&']);
    expect(countLabels(3)).toEqual(['#', '&', 'a']);
    expect(countLabels(4)).toEqual(['#', 'e', '&', 'a']);
    expect(countLabels(6)).toEqual(['#', 'la', 'li', '&', 'la', 'li']);
  });

  it('wraps 4/4 16ths to two beats per line on a phone, one bar on iPad', () => {
    const e = ex('coord-4-1');
    expect(beatsPerLineFor(360, e)).toBe(2);
    expect(beatsPerLineFor(768, e)).toBe(4);
    expect(beatsPerLineFor(0, e)).toBe(4);
    expect(beatsPerLineFor(40, e)).toBe(1);
    expect(layoutStaff(e, 2).map((s) => s.beats)).toEqual([
      [0, 1],
      [2, 3],
    ]);
    expect(layoutStaff(e, 9)).toHaveLength(1);
  });

  it('5/4 wraps by whole beats', () => {
    const e = {
      ...ex('coord-1-1'),
      meter: { beatsPerBar: 5, denominator: 4, beatUnit: 'quarter' },
      pattern: [{ voice: 'hands', steps: 'R L R L R L R L R L' }],
    } as Exercise;
    expect(layoutStaff(e, 2).map((s) => s.beats)).toEqual([[0, 1], [2, 3], [4]]);
    expect(layoutStaff(e, 2)[2].slots.map((s) => s.slot)).toEqual([8, 9]);
  });

  it('counts carry the beat number', () => {
    expect(layoutStaff(ex('coord-1-1'), 4)[0].slots.map((s) => s.count)).toEqual(['1', '&', '2', '&', '3', '&', '4', '&']);
  });

  it('stacks both hands on the backbeat, hat above snare', () => {
    const slot = layoutStaff(ex('coord-1-1'), 4)[0].slots[2];
    expect(slot.notes.map((n) => [n.drum, n.head, n.stem])).toEqual([
      ['hihat', 'x', 'up'],
      ['snare', 'normal', 'up'],
    ]);
    expect(slot.sticking.map((l) => [l.text, l.accent])).toEqual([
      ['r', false],
      ['L', true],
    ]);
    expect(slot.beat).toBe(1);
  });

  it('rests leave a slot with no notes', () => {
    const slot = layoutStaff(ex('coord-1-1'), 4)[0].slots[1];
    expect(slot.notes.map((n) => n.drum)).toEqual(['hihat']);
    expect(slot.foot).toBeNull();
  });

  it('kick sits low with its stem down', () => {
    const slot = layoutStaff(ex('coord-1-1'), 4)[0].slots[0];
    expect(slot.notes.map((n) => [n.drum, n.stem])).toEqual([
      ['hihat', 'up'],
      ['kick', 'down'],
    ]);
    expect(slot.notes[1].step).toBeGreaterThan(slot.notes[0].step);
  });

  it('rudiments sit on the snare with graces', () => {
    const para = layoutStaff(ex('pas-16'), 2)[0];
    expect(para.slots.every((s) => s.notes.every((n) => n.drum === 'snare'))).toBe(true);
    const flam = layoutStaff(ex('pas-20'), 9)[0].slots[0];
    expect(flam.sticking[0]).toMatchObject({ text: 'r', grace: 'l' });
    expect(flam.notes[0].grace).toBe('flam');
    const drag = layoutStaff(ex('pas-31'), 9)[0].slots.find((s) => s.notes[0]?.grace === 'drag')!;
    expect(drag.sticking[0].grace).toMatch(/^(ll|rr)$/);
  });

  it('ghosts are lowercase in sticking and flagged on the note', () => {
    const s = layoutStaff(ex('coord-3-1'), 4)[0].slots[1];
    expect(s.sticking).toEqual([{ text: 'l', accent: false, ghost: true, grace: null }]);
    expect(s.notes[0]).toMatchObject({ drum: 'snare', ghost: true });
  });

  it('double-pedal kicks get foot letters and no hand sticking', () => {
    const e = CATALOGUE.find((c) => c.pattern.some((l) => l.voice === 'kick' && /[RL]/.test(l.steps)))!;
    const slot = layoutStaff(e, 9)[0].slots[0];
    expect(slot.sticking).toEqual([]);
    expect(slot.foot?.text).toMatch(/^[rlRL]$/);
    expect(slot.notes[0]).toMatchObject({ drum: 'kick', stem: 'down' });
  });

  it('hi-hat foot is an x below the kick', () => {
    const slot = layoutStaff(ex('coord-1-3'), 4)[0].slots[0];
    const foot = slot.notes.find((n) => n.drum === 'hihat-foot')!;
    expect(foot).toMatchObject({ head: 'x', stem: 'down' });
    expect(foot.step).toBeGreaterThan(slot.notes.find((n) => n.drum === 'kick')!.step);
  });

  it('describes every line with its drum', () => {
    expect(describeStaff(ex('pas-16'))).toBe('Snare: accent R, L, R, R, accent L, R, L, L');
    expect(describeStaff(ex('coord-1-1'))).toBe(
      'Hi-hat: R, R, R, R, R, R, R, R; Snare: rest, rest, accent L, rest, rest, rest, accent L, rest; Kick: K, rest, rest, rest, K, rest, rest, rest',
    );
  });
  it('case shows the stroke: accented upper case, everything else lower case', () => {
    const para = layoutStaff(ex('pas-16'), 9)[0];
    expect(para.slots.map((s) => s.sticking[0].text).join('')).toBe('RlrrLrll');
  });
});
