import {
  MAX_BPM,
  MIN_BPM,
  type AccentLevel,
  type BeatUnit,
  type Gap,
  type Meter,
  type MetronomeSettings,
  type SpeedUp,
  type Subdivision,
} from './types';

export const DEFAULT_SETTINGS: MetronomeSettings = {
  bpm: 120,
  meter: { beatsPerBar: 4, denominator: 4, beatUnit: 'quarter' },
  subdivision: 1,
  accents: ['accent', 'normal', 'normal', 'normal'],
  subdivisionLevel: 'ghost',
  countInBars: 0,
  automator: { speedUp: null, gap: null },
  soundId: 'woodblock',
};

const BEAT_UNIT_BY_DENOMINATOR: Record<2 | 4 | 8, BeatUnit> = {
  2: 'half',
  4: 'quarter',
  8: 'eighth',
};

const NEXT_ACCENT: Record<AccentLevel, AccentLevel> = {
  accent: 'normal',
  normal: 'ghost',
  ghost: 'mute',
  mute: 'accent',
};

export function defaultBeatUnit(denominator: 2 | 4 | 8): BeatUnit {
  return BEAT_UNIT_BY_DENOMINATOR[denominator];
}

export function pulsesPerBar(meter: Meter): number {
  return meter.beatUnit === 'dotted-quarter' ? meter.beatsPerBar / 3 : meter.beatsPerBar;
}

export function pulseSeconds(bpm: number): number {
  return 60 / bpm;
}

export function nextAccent(level: AccentLevel): AccentLevel {
  return NEXT_ACCENT[level];
}

export function resizeAccents(accents: AccentLevel[], length: number): AccentLevel[] {
  if (length <= 0) {
    return [];
  }
  const result = accents.slice(0, length);
  if (result.length === 0) {
    result.push('accent');
  }
  while (result.length < length) {
    result.push('normal');
  }
  return result;
}

export function clickPreset2and4(meter: Meter): AccentLevel[] {
  const count = pulsesPerBar(meter);
  return Array.from({ length: count }, (_, i) => (i % 2 === 1 ? 'accent' : 'mute'));
}

function clamp(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, value));
}

function normalizeSpeedUp(speedUp: SpeedUp | null): SpeedUp | null {
  if (!speedUp) {
    return null;
  }
  if (!Number.isFinite(speedUp.stepBpm) || speedUp.stepBpm <= 0) {
    return null;
  }
  if (!Number.isFinite(speedUp.everyBars) || speedUp.everyBars < 1) {
    return null;
  }
  return {
    startBpm: clamp(speedUp.startBpm, MIN_BPM, MAX_BPM, DEFAULT_SETTINGS.bpm),
    targetBpm: clamp(speedUp.targetBpm, MIN_BPM, MAX_BPM, DEFAULT_SETTINGS.bpm),
    stepBpm: speedUp.stepBpm,
    everyBars: speedUp.everyBars,
    pyramid: Boolean(speedUp.pyramid),
  };
}

function normalizeGap(gap: Gap | null): Gap | null {
  if (!gap) {
    return null;
  }
  if (!Number.isFinite(gap.barsOn) || gap.barsOn < 1) {
    return null;
  }
  if (!Number.isFinite(gap.barsOff) || gap.barsOff < 0) {
    return null;
  }
  return {
    barsOn: gap.barsOn,
    barsOff: gap.barsOff,
  };
}

export function normalizeSettings(s: MetronomeSettings): MetronomeSettings {
  const bpm = clamp(s.bpm, MIN_BPM, MAX_BPM, DEFAULT_SETTINGS.bpm);
  const beatsPerBar = Math.round(clamp(s.meter.beatsPerBar, 1, 16, DEFAULT_SETTINGS.meter.beatsPerBar));
  const denominator: 2 | 4 | 8 =
    s.meter.denominator === 2 || s.meter.denominator === 4 || s.meter.denominator === 8
      ? s.meter.denominator
      : DEFAULT_SETTINGS.meter.denominator;

  let beatUnit: BeatUnit;
  if (s.meter.beatUnit === 'dotted-quarter') {
    beatUnit = denominator === 8 && beatsPerBar % 3 === 0 ? 'dotted-quarter' : defaultBeatUnit(denominator);
  } else if (
    s.meter.beatUnit === 'half' ||
    s.meter.beatUnit === 'quarter' ||
    s.meter.beatUnit === 'eighth'
  ) {
    beatUnit = s.meter.beatUnit;
  } else {
    beatUnit = defaultBeatUnit(denominator);
  }

  const meter: Meter = { beatsPerBar, denominator, beatUnit };
  const accents = resizeAccents(Array.isArray(s.accents) ? s.accents : [], pulsesPerBar(meter));
  const subdivision = Math.round(clamp(s.subdivision, 1, 6, DEFAULT_SETTINGS.subdivision)) as Subdivision;
  const countInBars = Math.round(clamp(s.countInBars, 0, 2, DEFAULT_SETTINGS.countInBars)) as 0 | 1 | 2;

  return {
    bpm,
    meter,
    subdivision,
    accents,
    subdivisionLevel: s.subdivisionLevel,
    countInBars,
    automator: {
      speedUp: normalizeSpeedUp(s.automator.speedUp),
      gap: normalizeGap(s.automator.gap),
    },
    soundId: s.soundId,
  };
}
