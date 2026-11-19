import { DEFAULT_SETTINGS } from '@tempodojo/core-metronome';
import { CATALOGUE, exerciseById } from './catalogue';
import {
  RANK_TEST_BARS,
  applyClean,
  checklistFor,
  emptyProgress,
  exerciseSettings,
  isTierUnlocked,
  nextTarget,
  nextUp,
  rankFor,
  rankTestSettings,
  visibleExercises,
} from './rules';
import type { Progress } from './types';

const T = { bronze: 60, silver: 80, gold: 100, master: 120 };
const ex = (id: string) => exerciseById(id)!;
const withRank = (id: string, best: number, at: number | null = null): Progress => ({
  ...emptyProgress(id),
  bestCleanBpm: best,
  workingBpm: best,
  rank: rankFor(best, ex(id).targets),
  lastPracticedAt: at,
});
const map = (...ps: Progress[]) => new Map(ps.map((p) => [p.exerciseId, p]));

describe('ranks', () => {
  it('rankFor picks the highest reached target', () => {
    expect(rankFor(null, T)).toBe('unranked');
    expect(rankFor(59, T)).toBe('unranked');
    expect(rankFor(60, T)).toBe('bronze');
    expect(rankFor(99, T)).toBe('silver');
    expect(rankFor(100, T)).toBe('gold');
    expect(rankFor(500, T)).toBe('master');
  });

  it('nextTarget walks up and ends at master', () => {
    expect(nextTarget('unranked', T)).toEqual({ rank: 'bronze', bpm: 60 });
    expect(nextTarget('gold', T)).toEqual({ rank: 'master', bpm: 120 });
    expect(nextTarget('master', T)).toBeNull();
  });

  it('emptyProgress is unranked with no tempos', () => {
    expect(emptyProgress('pas-01')).toEqual({
      exerciseId: 'pas-01',
      workingBpm: null,
      bestCleanBpm: null,
      rank: 'unranked',
      totalSeconds: 0,
      lastPracticedAt: null,
    });
  });

  it('applyClean raises best, working and rank', () => {
    const p = applyClean(emptyProgress('pas-16'), 96, ex('pas-16'));
    expect(p).toMatchObject({ bestCleanBpm: 96, workingBpm: 96, rank: 'silver' });
  });

  it('lower log keeps best and rank', () => {
    const p = applyClean(applyClean(emptyProgress('pas-16'), 130, ex('pas-16')), 100, ex('pas-16'));
    expect(p).toMatchObject({ bestCleanBpm: 130, workingBpm: 130, rank: 'gold' });
  });
});

describe('unlocking', () => {
  const tier1 = CATALOGUE.filter((e) => e.track === 'hands' && e.tier === 1);

  it('tier 1 is always open', () => {
    expect(isTierUnlocked('hands', 1, CATALOGUE, new Map(), false)).toBe(true);
    expect(isTierUnlocked('feet', 1, CATALOGUE, new Map(), false)).toBe(true);
  });

  it('tier 2 opens only when every tier 1 exercise is at least bronze', () => {
    const almost = map(...tier1.slice(1).map((e) => withRank(e.id, e.targets.bronze)));
    expect(isTierUnlocked('hands', 2, CATALOGUE, almost, false)).toBe(false);
    const all = map(...tier1.map((e) => withRank(e.id, e.targets.bronze)));
    expect(isTierUnlocked('hands', 2, CATALOGUE, all, false)).toBe(true);
    expect(isTierUnlocked('hands', 3, CATALOGUE, all, false)).toBe(false);
  });

  it('double-pedal tiers are hidden without a double pedal', () => {
    const visible = visibleExercises(CATALOGUE, false);
    expect(visible.some((e) => e.requiresDoublePedal)).toBe(false);
    expect(visibleExercises(CATALOGUE, true).some((e) => e.requiresDoublePedal)).toBe(true);
    expect(isTierUnlocked('feet', 5, CATALOGUE, new Map(), false)).toBe(false);
  });
});

describe('nextUp', () => {
  it('on fresh progress takes the first exercises of each track', () => {
    expect(nextUp(CATALOGUE, new Map(), false).map((e) => e.id)).toEqual(['pas-01', 'pas-06', 'coord-1-1', 'feet-1-1']);
  });

  it('prefers recently touched, then lowest rank, and skips master', () => {
    const progress = map(
      withRank('pas-01', ex('pas-01').targets.master, 1000),
      withRank('pas-16', ex('pas-16').targets.bronze, 5000),
      withRank('pas-20', ex('pas-20').targets.silver, 9000),
    );
    expect(nextUp(CATALOGUE, progress, false).slice(0, 2).map((e) => e.id)).toEqual(['pas-20', 'pas-16']);
  });

  it('never suggests locked exercises', () => {
    const ids = nextUp(CATALOGUE, new Map(), false).map((e) => e.id);
    expect(ids.every((id) => ex(id).tier === 1)).toBe(true);
  });
});

describe('metronome settings for an exercise', () => {
  it('loads meter, subdivision, accents and a speed-up toward the next rank', () => {
    const s = exerciseSettings(ex('pas-16'), emptyProgress('pas-16'), DEFAULT_SETTINGS);
    expect(s.bpm).toBe(55);
    expect(s.meter).toEqual({ beatsPerBar: 2, denominator: 4, beatUnit: 'quarter' });
    expect(s.subdivision).toBe(4);
    expect(s.accents).toEqual(['accent', 'accent']);
    expect(s.automator).toEqual({ speedUp: { startBpm: 55, targetBpm: 65, stepBpm: 2, everyBars: 4, pyramid: false }, gap: null });
    expect(s.soundId).toBe(DEFAULT_SETTINGS.soundId);
  });

  it('starts from the working tempo and uses 5 BPM steps for big gaps', () => {
    const p = { ...emptyProgress('pas-16'), workingBpm: 70, rank: 'bronze' as const, bestCleanBpm: 70 };
    const s = exerciseSettings(ex('pas-16'), p, DEFAULT_SETTINGS);
    expect(s.bpm).toBe(70);
    expect(s.automator.speedUp).toEqual({ startBpm: 70, targetBpm: 95, stepBpm: 5, everyBars: 4, pyramid: false });
  });

  it('has no speed-up at master', () => {
    const p = withRank('pas-16', 200);
    expect(exerciseSettings(ex('pas-16'), p, DEFAULT_SETTINGS).automator.speedUp).toBeNull();
  });

  it('rank test: target tempo, gap 2/2, one count-in bar, no speed-up', () => {
    const s = rankTestSettings(ex('pas-16'), 95, DEFAULT_SETTINGS);
    expect(s).toMatchObject({ bpm: 95, countInBars: 1, automator: { speedUp: null, gap: { barsOn: 2, barsOff: 2 } } });
    expect(s.meter.beatsPerBar).toBe(2);
    expect(RANK_TEST_BARS).toBe(8);
  });

  it('checklists: 3 items for hands, 4 for coordination and feet', () => {
    expect(checklistFor(ex('pas-16'))).toHaveLength(3);
    expect(checklistFor(ex('coord-1-1'))).toHaveLength(4);
    expect(checklistFor(ex('feet-1-1'))).toHaveLength(4);
    expect(checklistFor(ex('coord-1-1')).map((c) => c.label)).toContain('Feet never flinched or sped up');
  });
});
