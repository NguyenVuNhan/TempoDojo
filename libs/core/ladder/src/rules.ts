import {
  MIN_BPM,
  normalizeSettings,
  pulsesPerBar,
  type AccentLevel,
  type MetronomeSettings,
  type SpeedUp,
} from '@tempodojo/core-metronome';
import { parseSteps } from './pattern';
import {
  RANKS,
  TRACKS,
  type Exercise,
  type Progress,
  type Rank,
  type Targets,
  type Track,
} from './types';

export const RANK_TEST_BARS = 8;

export interface ChecklistItem {
  id: string;
  label: string;
}

const BASE_CHECKLIST: readonly ChecklistItem[] = [
  { id: 'timing', label: 'Came back in on beat 1 after every silent bar' },
  { id: 'heights', label: 'Stick heights even, ghosts quiet' },
  { id: 'relaxed', label: 'Stayed relaxed' },
];

const FEET_CHECKLIST_ITEM: ChecklistItem = {
  id: 'feet',
  label: 'Feet never flinched or sped up',
};

const NEXT_UP_QUOTA: Record<Track, number> = {
  hands: 2,
  coordination: 1,
  feet: 1,
};

/** Returns a fresh, unranked progress record for an exercise. */
export function emptyProgress(exerciseId: string): Progress {
  return {
    exerciseId,
    workingBpm: null,
    bestCleanBpm: null,
    rank: 'unranked',
    totalSeconds: 0,
    lastPracticedAt: null,
  };
}

/** Returns the highest rank whose target BPM is <= bpm, or 'unranked' if none/null. */
export function rankFor(bpm: number | null, t: Targets): Rank {
  if (bpm === null) {
    return 'unranked';
  }
  if (bpm >= t.master) {
    return 'master';
  }
  if (bpm >= t.gold) {
    return 'gold';
  }
  if (bpm >= t.silver) {
    return 'silver';
  }
  if (bpm >= t.bronze) {
    return 'bronze';
  }
  return 'unranked';
}

/** Returns the next rank and target BPM above the given rank, or null at master. */
export function nextTarget(rank: Rank, t: Targets): { rank: Rank; bpm: number } | null {
  const idx = RANKS.indexOf(rank);
  if (idx < 0 || idx >= RANKS.length - 1) {
    return null;
  }
  const next = RANKS[idx + 1] as Exclude<Rank, 'unranked'>;
  return { rank: next, bpm: t[next] };
}

/** Records a clean tempo without ever lowering bestCleanBpm, workingBpm, or rank. */
export function applyClean(p: Progress, bpm: number, ex: Exercise): Progress {
  const bestCleanBpm = Math.max(p.bestCleanBpm ?? 0, bpm);
  const workingBpm = Math.max(p.workingBpm ?? 0, bpm);
  const candidateRank = rankFor(bestCleanBpm, ex.targets);
  const rank = RANKS.indexOf(p.rank) >= RANKS.indexOf(candidateRank) ? p.rank : candidateRank;
  return {
    ...p,
    bestCleanBpm,
    workingBpm,
    rank,
  };
}

/** Filters out exercises that require a double pedal when the user does not have one. */
export function visibleExercises(catalogue: Exercise[], hasDoublePedal: boolean): Exercise[] {
  if (hasDoublePedal) {
    return [...catalogue];
  }
  return catalogue.filter((ex) => !ex.requiresDoublePedal);
}

/** Returns true when the given tier of a track is visible and unlocked. */
export function isTierUnlocked(
  track: Track,
  tier: number,
  catalogue: Exercise[],
  progress: Map<string, Progress>,
  hasDoublePedal: boolean,
): boolean {
  const tierExercises = catalogue.filter((ex) => ex.track === track && ex.tier === tier);
  if (tierExercises.length === 0) {
    return false;
  }
  if (!hasDoublePedal && tierExercises.some((ex) => ex.requiresDoublePedal)) {
    return false;
  }
  if (tier <= 1) {
    return true;
  }
  const prevTierExercises = catalogue.filter((ex) => ex.track === track && ex.tier === tier - 1);
  if (prevTierExercises.length === 0) {
    return false;
  }
  const bronzeIndex = RANKS.indexOf('bronze');
  return prevTierExercises.every((ex) => {
    const rank = progress.get(ex.id)?.rank ?? 'unranked';
    return RANKS.indexOf(rank) >= bronzeIndex;
  });
}

function compareNullableDesc(a: number | null, b: number | null): number {
  if (a !== null && b !== null) {
    return b - a;
  }
  if (a !== null) {
    return -1;
  }
  if (b !== null) {
    return 1;
  }
  return 0;
}

/** Picks up to 2 hands, 1 coordination, and 1 feet unlocked non-master exercises. */
export function nextUp(
  catalogue: Exercise[],
  progress: Map<string, Progress>,
  hasDoublePedal: boolean,
): Exercise[] {
  const indexed = catalogue.map((ex, index) => ({ ex, index }));
  const result: Exercise[] = [];

  for (const track of TRACKS) {
    const candidates = indexed.filter(({ ex }) => {
      if (ex.track !== track) {
        return false;
      }
      if (!hasDoublePedal && ex.requiresDoublePedal) {
        return false;
      }
      if (!isTierUnlocked(track, ex.tier, catalogue, progress, hasDoublePedal)) {
        return false;
      }
      const rank = progress.get(ex.id)?.rank ?? 'unranked';
      return rank !== 'master';
    });

    candidates.sort((a, b) => {
      const pA = progress.get(a.ex.id);
      const pB = progress.get(b.ex.id);

      const timeCmp = compareNullableDesc(pA?.lastPracticedAt ?? null, pB?.lastPracticedAt ?? null);
      if (timeCmp !== 0) {
        return timeCmp;
      }

      const rankA = RANKS.indexOf(pA?.rank ?? 'unranked');
      const rankB = RANKS.indexOf(pB?.rank ?? 'unranked');
      if (rankA !== rankB) {
        return rankA - rankB;
      }

      return a.index - b.index;
    });

    const quota = NEXT_UP_QUOTA[track];
    for (const item of candidates.slice(0, quota)) {
      result.push(item.ex);
    }
  }

  return result;
}

function accentsForExercise(ex: Exercise): AccentLevel[] {
  const line = ex.pattern.find((p) => p.voice === 'hands') ?? ex.pattern[0];
  const steps = line ? parseSteps(line.steps) : [];
  const pulseCount = pulsesPerBar(ex.meter);
  const accents: AccentLevel[] = Array.from({ length: pulseCount }, (_, i) => {
    const step = steps[i * ex.subdivision];
    return step?.accent ? 'accent' : 'normal';
  });

  if (accents.length > 0 && !accents.some((a) => a === 'accent')) {
    accents[0] = 'accent';
  }

  return accents;
}

/** Builds normalized metronome settings for practicing an exercise with speed-up toward the next rank. */
export function exerciseSettings(
  ex: Exercise,
  p: Progress,
  base: MetronomeSettings,
): MetronomeSettings {
  const bpm = p.workingBpm ?? Math.max(MIN_BPM, ex.targets.bronze - 10);
  const next = nextTarget(p.rank, ex.targets);
  const speedUp: SpeedUp | null =
    next !== null && next.bpm > bpm
      ? {
          startBpm: bpm,
          targetBpm: next.bpm,
          stepBpm: next.bpm - bpm <= 10 ? 2 : 5,
          everyBars: 4,
          pyramid: false,
        }
      : null;

  return normalizeSettings({
    ...base,
    bpm,
    meter: ex.meter,
    subdivision: ex.subdivision,
    accents: accentsForExercise(ex),
    countInBars: 0,
    automator: {
      speedUp,
      gap: null,
    },
  });
}

/** Builds normalized metronome settings for an 8-bar rank test with 2/2 gap click and 1 count-in bar. */
export function rankTestSettings(
  ex: Exercise,
  bpm: number,
  base: MetronomeSettings,
): MetronomeSettings {
  return normalizeSettings({
    ...base,
    bpm,
    meter: ex.meter,
    subdivision: ex.subdivision,
    accents: accentsForExercise(ex),
    countInBars: 1,
    automator: {
      speedUp: null,
      gap: { barsOn: 2, barsOff: 2 },
    },
  });
}

/** Returns the self-check items required to claim a rank for the given exercise. */
export function checklistFor(ex: Exercise): ChecklistItem[] {
  if (ex.track === 'coordination' || ex.track === 'feet') {
    return [...BASE_CHECKLIST, FEET_CHECKLIST_ITEM];
  }
  return [...BASE_CHECKLIST];
}
