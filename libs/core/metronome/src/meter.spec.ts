import {
  DEFAULT_SETTINGS,
  clickPreset2and4,
  defaultBeatUnit,
  nextAccent,
  normalizeSettings,
  pulseSeconds,
  pulsesPerBar,
  resizeAccents,
} from './meter';
import type { MetronomeSettings } from './types';

const settings = (patch: Partial<MetronomeSettings>): MetronomeSettings => ({
  ...DEFAULT_SETTINGS,
  ...patch,
});

describe('pulsesPerBar', () => {
  it('counts eighths in X/8 by default', () => {
    expect(pulsesPerBar({ beatsPerBar: 6, denominator: 8, beatUnit: 'eighth' })).toBe(6);
    expect(pulsesPerBar({ beatsPerBar: 7, denominator: 8, beatUnit: 'eighth' })).toBe(7);
  });
  it('groups by three for dotted-quarter pulse', () => {
    expect(pulsesPerBar({ beatsPerBar: 6, denominator: 8, beatUnit: 'dotted-quarter' })).toBe(2);
    expect(pulsesPerBar({ beatsPerBar: 12, denominator: 8, beatUnit: 'dotted-quarter' })).toBe(4);
  });
  it('counts quarters in 4/4', () => {
    expect(pulsesPerBar({ beatsPerBar: 4, denominator: 4, beatUnit: 'quarter' })).toBe(4);
  });
});

describe('defaultBeatUnit / pulseSeconds', () => {
  it('maps denominators', () => {
    expect(defaultBeatUnit(2)).toBe('half');
    expect(defaultBeatUnit(4)).toBe('quarter');
    expect(defaultBeatUnit(8)).toBe('eighth');
  });
  it('is 60/bpm', () => {
    expect(pulseSeconds(120)).toBe(0.5);
    expect(pulseSeconds(60)).toBe(1);
  });
});

describe('nextAccent', () => {
  it('cycles accent → normal → ghost → mute → accent', () => {
    expect(nextAccent('accent')).toBe('normal');
    expect(nextAccent('normal')).toBe('ghost');
    expect(nextAccent('ghost')).toBe('mute');
    expect(nextAccent('mute')).toBe('accent');
  });
});

describe('resizeAccents', () => {
  it('keeps existing levels and pads with normal', () => {
    expect(resizeAccents(['accent', 'ghost', 'mute', 'normal'], 6)).toEqual([
      'accent', 'ghost', 'mute', 'normal', 'normal', 'normal',
    ]);
  });
  it('truncates', () => {
    expect(resizeAccents(['ghost', 'normal'], 1)).toEqual(['ghost']);
  });
  it('starts a fresh pattern with an accented downbeat', () => {
    expect(resizeAccents([], 3)).toEqual(['accent', 'normal', 'normal']);
  });
  it('does not mutate its input', () => {
    const input = ['accent', 'normal'] as const;
    const copy = [...input];
    resizeAccents([...input], 4);
    expect([...input]).toEqual(copy);
  });
});

describe('clickPreset2and4', () => {
  it('mutes 1 and 3 in 4/4', () => {
    expect(clickPreset2and4({ beatsPerBar: 4, denominator: 4, beatUnit: 'quarter' })).toEqual([
      'mute', 'accent', 'mute', 'accent',
    ]);
  });
});

describe('DEFAULT_SETTINGS', () => {
  it('is 120 BPM 4/4 with an accented downbeat', () => {
    expect(DEFAULT_SETTINGS).toEqual({
      bpm: 120,
      meter: { beatsPerBar: 4, denominator: 4, beatUnit: 'quarter' },
      subdivision: 1,
      accents: ['accent', 'normal', 'normal', 'normal'],
      subdivisionLevel: 'ghost',
      countInBars: 0,
      automator: { speedUp: null, gap: null },
      soundId: 'woodblock',
    });
  });
});

describe('normalizeSettings', () => {
  it('clamps bpm to 20–400', () => {
    expect(normalizeSettings(settings({ bpm: 5 })).bpm).toBe(20);
    expect(normalizeSettings(settings({ bpm: 999 })).bpm).toBe(400);
  });
  it('clamps beatsPerBar to 1–16 and fixes accent length', () => {
    const low = normalizeSettings(settings({ meter: { beatsPerBar: 0, denominator: 4, beatUnit: 'quarter' } }));
    expect(low.meter.beatsPerBar).toBe(1);
    expect(low.accents).toHaveLength(1);
    const high = normalizeSettings(settings({ meter: { beatsPerBar: 20, denominator: 4, beatUnit: 'quarter' } }));
    expect(high.meter.beatsPerBar).toBe(16);
    expect(high.accents).toHaveLength(16);
  });
  it('resizes accents to the pulse count', () => {
    const s = normalizeSettings(
      settings({ meter: { beatsPerBar: 6, denominator: 8, beatUnit: 'dotted-quarter' }, accents: ['ghost'] }),
    );
    expect(s.accents).toEqual(['ghost', 'normal']);
  });
  it('falls back from dotted-quarter when beats are not divisible by 3', () => {
    const s = normalizeSettings(settings({ meter: { beatsPerBar: 7, denominator: 8, beatUnit: 'dotted-quarter' } }));
    expect(s.meter.beatUnit).toBe('eighth');
    expect(s.accents).toHaveLength(7);
  });
  it('normalizes invalid automator', () => {
    const badStep = normalizeSettings(
      settings({ automator: { speedUp: { startBpm: 80, targetBpm: 100, stepBpm: 0, everyBars: 4, pyramid: false }, gap: null } }),
    );
    expect(badStep.automator.speedUp).toBeNull();
    const badEvery = normalizeSettings(
      settings({ automator: { speedUp: { startBpm: 80, targetBpm: 100, stepBpm: 5, everyBars: 0, pyramid: false }, gap: null } }),
    );
    expect(badEvery.automator.speedUp).toBeNull();
    const clamped = normalizeSettings(
      settings({ automator: { speedUp: { startBpm: 5, targetBpm: 900, stepBpm: 5, everyBars: 4, pyramid: true }, gap: null } }),
    );
    expect(clamped.automator.speedUp).toEqual({ startBpm: 20, targetBpm: 400, stepBpm: 5, everyBars: 4, pyramid: true });
    expect(normalizeSettings(settings({ automator: { speedUp: null, gap: { barsOn: 0, barsOff: 1 } } })).automator.gap).toBeNull();
    expect(normalizeSettings(settings({ automator: { speedUp: null, gap: { barsOn: 2, barsOff: -1 } } })).automator.gap).toBeNull();
    expect(normalizeSettings(settings({ automator: { speedUp: null, gap: { barsOn: 2, barsOff: 2 } } })).automator.gap).toEqual({
      barsOn: 2,
      barsOff: 2,
    });
  });
  it('clamps count-in to 0–2', () => {
    expect(normalizeSettings(settings({ countInBars: 5 as never })).countInBars).toBe(2);
  });
  it('returns valid settings unchanged and does not mutate input', () => {
    const input = settings({});
    const snapshot = structuredClone(input);
    expect(normalizeSettings(input)).toEqual(snapshot);
    expect(input).toEqual(snapshot);
  });
});
