import type { LoopRange, Section } from './types';

/** Creates a new user-defined section with empty progress. */
export function newSection(name: string, range: LoopRange, id: string): Section {
  return {
    id,
    name,
    range,
    bestCleanPercent: null,
    exerciseId: null,
    fromFile: false,
  };
}

/** Returns a new section with bestCleanPercent raised to the rounded percent if higher. */
export function recordSectionClean(s: Section, percent: number): Section {
  return {
    ...s,
    bestCleanPercent: Math.max(s.bestCleanPercent ?? 0, Math.round(percent)),
  };
}
