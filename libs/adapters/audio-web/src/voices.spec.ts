import { VOICES, renderClick } from './voices';

const peak = (s: Float32Array) => s.reduce((m, v) => Math.max(m, Math.abs(v)), 0);

describe('VOICES', () => {
  it('offers at least four voices including woodblock', () => {
    expect(VOICES.length).toBeGreaterThanOrEqual(4);
    expect(VOICES.map((v) => v.id)).toContain('woodblock');
    expect(new Set(VOICES.map((v) => v.id)).size).toBe(VOICES.length);
  });
});

describe('renderClick', () => {
  for (const voice of VOICES) {
    it(`${voice.id}: short, bounded, and level-ordered`, () => {
      const rate = 48000;
      const accent = renderClick(voice.id, 'accent', rate);
      const normal = renderClick(voice.id, 'normal', rate);
      const ghost = renderClick(voice.id, 'ghost', rate);
      for (const s of [accent, normal, ghost]) {
        expect(s.length).toBeGreaterThan(0);
        expect(s.length).toBeLessThanOrEqual(0.06 * rate);
        expect(peak(s)).toBeLessThanOrEqual(1);
      }
      expect(peak(accent)).toBeGreaterThan(peak(normal));
      expect(peak(normal)).toBeGreaterThan(peak(ghost));
      expect(peak(ghost)).toBeGreaterThan(0);
      expect(peak(ghost)).toBeLessThanOrEqual(0.4 * peak(normal));
    });
  }

  it('falls back to woodblock for an unknown voice', () => {
    expect(renderClick('nope', 'normal', 44100)).toEqual(renderClick('woodblock', 'normal', 44100));
  });

  it('respects the sample rate', () => {
    expect(renderClick('woodblock', 'normal', 96000).length).toBeGreaterThan(renderClick('woodblock', 'normal', 48000).length);
  });
});
