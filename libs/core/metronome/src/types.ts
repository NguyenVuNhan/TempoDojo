export type BeatUnit = 'half' | 'quarter' | 'eighth' | 'dotted-quarter';
export type AccentLevel = 'accent' | 'normal' | 'ghost' | 'mute';
export type Subdivision = 1 | 2 | 3 | 4 | 5 | 6;
export type SubdivisionLevel = 'normal' | 'ghost' | 'mute';

export interface Meter {
  beatsPerBar: number;
  denominator: 2 | 4 | 8;
  beatUnit: BeatUnit;
}

export interface SpeedUp {
  startBpm: number;
  targetBpm: number;
  stepBpm: number;
  everyBars: number;
  pyramid: boolean;
}

export interface Gap {
  barsOn: number;
  barsOff: number;
}

export interface Automator {
  speedUp: SpeedUp | null;
  gap: Gap | null;
}

export interface MetronomeSettings {
  bpm: number;
  meter: Meter;
  subdivision: Subdivision;
  /** One entry per pulse; length === pulsesPerBar(meter). */
  accents: AccentLevel[];
  subdivisionLevel: SubdivisionLevel;
  countInBars: 0 | 1 | 2;
  automator: Automator;
  soundId: string;
}

export const MIN_BPM = 20;
export const MAX_BPM = 400;
