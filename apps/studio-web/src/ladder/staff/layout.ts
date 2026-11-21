import {
  handDrumOf,
  parseSteps,
  type Exercise,
  type HandDrum,
  type PatternLine,
  type Step,
} from '@tempodojo/core-ladder';
import { pulsesPerBar, type Subdivision } from '@tempodojo/core-metronome';
import { DRUM_LABEL } from '../labels';

export { DRUM_LABEL } from '../labels';

export type StaffDrum = HandDrum | 'kick' | 'hihat-foot';

/** Staff position in half-spaces from the top line (0 = top line F5, 8 = bottom line E4). */
export const STAFF_STEP: Record<StaffDrum, number> = {
  crash: -2,
  hihat: -1,
  ride: 0,
  tom1: 1,
  tom2: 2,
  snare: 3,
  floortom: 5,
  kick: 7,
  'hihat-foot': 9,
};

export const X_HEAD: ReadonlySet<StaffDrum> = new Set<StaffDrum>([
  'crash',
  'hihat',
  'ride',
  'hihat-foot',
]);

export interface StaffNote {
  drum: StaffDrum;
  step: number;
  head: 'x' | 'normal';
  stem: 'up' | 'down';
  ghost: boolean;
  grace: 'flam' | 'drag' | 'buzz' | null;
}

export interface StickLetter {
  text: string;
  accent: boolean;
  ghost: boolean;
  grace: string | null;
}

export interface StaffSlot {
  slot: number;
  beat: number;
  notes: StaffNote[];
  sticking: StickLetter[];
  foot: StickLetter | null;
  count: string;
}

export interface StaffSystem {
  beats: number[];
  slots: StaffSlot[];
}

export const MIN_SLOT_PX = 40;

export function countLabels(sub: Subdivision): string[] {
  switch (sub) {
    case 1:
      return ['#'];
    case 2:
      return ['#', '&'];
    case 3:
      return ['#', '&', 'a'];
    case 4:
      return ['#', 'e', '&', 'a'];
    case 5:
      return ['#', '·', '·', '·', '·'];
    case 6:
      return ['#', 'la', 'li', '&', 'la', 'li'];
    default: {
      const labels = ['#'];
      for (let i = 1; i < sub; i++) {
        labels.push('·');
      }
      return labels;
    }
  }
}

export function beatsPerLineFor(widthPx: number, ex: Exercise): number {
  const beats = pulsesPerBar(ex.meter);
  if (widthPx <= 0) {
    return beats;
  }
  // widthPx is the content width (padding already excluded).
  const fit = Math.floor(widthPx / (ex.subdivision * MIN_SLOT_PX));
  return Math.min(Math.max(fit, 1), beats);
}

const OTHER_HAND_LOWER: Record<NonNullable<Step['hand']>, string> = {
  R: 'l',
  L: 'r',
  K: 'k',
  H: 'h',
};

function stickingGrace(step: Step): string | null {
  if (!step.hand) return null;
  if (step.grace === 'flam') return OTHER_HAND_LOWER[step.hand];
  if (step.grace === 'drag') return OTHER_HAND_LOWER[step.hand].repeat(2);
  return null;
}

function makeStickLetter(step: Step): StickLetter {
  const hand = step.hand ?? '';
  return {
    // Case shows the stroke: accented (full) strokes upper case, everything else lower case.
    text: step.accent ? hand.toUpperCase() : hand.toLowerCase(),
    accent: step.accent,
    ghost: step.ghost,
    grace: stickingGrace(step),
  };
}

export function layoutStaff(ex: Exercise, beatsPerLine: number): StaffSystem[] {
  const beats = pulsesPerBar(ex.meter);
  const sub = ex.subdivision;
  const totalSlots = beats * sub;

  const parsedLines = ex.pattern.map((line) => ({
    line,
    steps: parseSteps(line.steps),
  }));

  const countPattern = countLabels(sub);

  const allSlots: StaffSlot[] = [];

  for (let slotIdx = 0; slotIdx < totalSlots; slotIdx++) {
    const beat = Math.floor(slotIdx / sub);
    const slotInBeat = slotIdx % sub;
    const baseLabel = countPattern[slotInBeat] ?? '';
    const count = baseLabel.replace('#', String(beat + 1));

    const handEntries: { note: StaffNote; stick: StickLetter }[] = [];
    const otherNotes: StaffNote[] = [];
    let foot: StickLetter | null = null;

    for (const { line, steps } of parsedLines) {
      const step = steps[slotIdx];
      if (!step || step.rest) {
        continue;
      }

      if (line.voice === 'hands') {
        const drum = handDrumOf(line);
        const note: StaffNote = {
          drum,
          step: STAFF_STEP[drum],
          head: X_HEAD.has(drum) ? 'x' : 'normal',
          stem: 'up',
          ghost: step.ghost,
          grace: step.grace,
        };
        const stick = makeStickLetter(step);
        handEntries.push({ note, stick });
      } else if (line.voice === 'kick') {
        const drum: StaffDrum = 'kick';
        otherNotes.push({
          drum,
          step: STAFF_STEP[drum],
          head: X_HEAD.has(drum) ? 'x' : 'normal',
          stem: 'down',
          ghost: step.ghost,
          grace: step.grace,
        });
        if (step.hand === 'R' || step.hand === 'L') {
          foot = makeStickLetter(step);
        }
      } else if (line.voice === 'hihat') {
        const drum: StaffDrum = 'hihat-foot';
        otherNotes.push({
          drum,
          step: STAFF_STEP[drum],
          head: X_HEAD.has(drum) ? 'x' : 'normal',
          stem: 'down',
          ghost: step.ghost,
          grace: step.grace,
        });
      }
    }

    // Sort hand entries by note step ascending (top to bottom on staff)
    handEntries.sort((a, b) => a.note.step - b.note.step);

    const notes = [...handEntries.map((e) => e.note), ...otherNotes].sort(
      (a, b) => a.step - b.step,
    );
    const sticking = handEntries.map((e) => e.stick);

    allSlots.push({
      slot: slotIdx,
      beat,
      notes,
      sticking,
      foot,
      count,
    });
  }

  const effectiveBeatsPerLine =
    beatsPerLine >= beats ? beats : Math.max(1, Math.floor(beatsPerLine));

  const systems: StaffSystem[] = [];
  for (let b = 0; b < beats; b += effectiveBeatsPerLine) {
    const systemBeats: number[] = [];
    const endBeat = Math.min(b + effectiveBeatsPerLine, beats);
    for (let currentBeat = b; currentBeat < endBeat; currentBeat++) {
      systemBeats.push(currentBeat);
    }
    const startSlot = b * sub;
    const endSlot = endBeat * sub;
    systems.push({
      beats: systemBeats,
      slots: allSlots.slice(startSlot, endSlot),
    });
  }

  return systems;
}

function describeStep(step: Step): string {
  if (step.rest) return 'rest';
  const parts: string[] = [];
  if (step.accent) parts.push('accent');
  if (step.ghost) parts.push('ghost');
  if (step.grace) parts.push(step.grace);
  if (step.hand) parts.push(step.hand);
  return parts.join(' ');
}

function lineLabel(line: PatternLine): string {
  if (line.voice === 'hands') {
    return DRUM_LABEL[handDrumOf(line)];
  }
  if (line.voice === 'kick') {
    return DRUM_LABEL.kick;
  }
  return DRUM_LABEL['hihat-foot'];
}

export function describeStaff(ex: Exercise): string {
  return ex.pattern
    .map((line) => {
      const steps = parseSteps(line.steps);
      const stepDescs = steps.map(describeStep).join(', ');
      return `${lineLabel(line)}: ${stepDescs}`;
    })
    .join('; ');
}
