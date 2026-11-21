import { handDrumOf, parseSteps } from './pattern';

const base = { rest: false, accent: false, ghost: false, grace: null };

describe('parseSteps', () => {
  it('parses an accented paradiddle half', () => {
    const steps = parseSteps('>R L R R');
    expect(steps).toHaveLength(4);
    expect(steps[0]).toEqual({ ...base, hand: 'R', accent: true });
    expect(steps[1]).toEqual({ ...base, hand: 'L' });
  });

  it('parses ghosts, graces and rests', () => {
    expect(parseSteps('(L)')[0]).toEqual({ ...base, hand: 'L', ghost: true });
    expect(parseSteps('>fR')[0]).toEqual({ ...base, hand: 'R', accent: true, grace: 'flam' });
    expect(parseSteps('dL')[0]).toEqual({ ...base, hand: 'L', grace: 'drag' });
    expect(parseSteps('zR')[0]).toEqual({ ...base, hand: 'R', grace: 'buzz' });
    expect(parseSteps('(fL)')[0]).toEqual({ ...base, hand: 'L', ghost: true, grace: 'flam' });
    expect(parseSteps('-')[0]).toEqual({ rest: true, hand: null, accent: false, ghost: false, grace: null });
  });

  it('parses feet', () => {
    expect(parseSteps('K H - K').map((s) => s.hand)).toEqual(['K', 'H', null, 'K']);
  });

  it.each(['>(R)', '(R', 'R)', 'X', 'fK', 'zH', 'R  L', ' R', 'R ', '', '>', 'RL', 'ff R'])('rejects %j', (bad) => {
    expect(() => parseSteps(bad)).toThrow(/Bad token|Empty pattern/);
  });
});

describe('handDrumOf', () => {
  it('defaults to snare', () => {
    expect(handDrumOf({ voice: 'hands', steps: 'R' })).toBe('snare');
    expect(handDrumOf({ voice: 'hands', steps: 'R', drum: 'ride' })).toBe('ride');
  });
});
