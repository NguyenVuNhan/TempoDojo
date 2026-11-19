import { act, renderHook, waitFor } from '@testing-library/react';
import { CATALOGUE, exerciseById } from '@tempodojo/core-ladder';
import { memoryLadderRepos, progressRow } from './test-utils';
import { useLadder } from './useLadder';

const ex = (id: string) => exerciseById(id)!;

const load = async (...args: Parameters<typeof memoryLadderRepos>) => {
  const m = memoryLadderRepos(...args);
  const hook = renderHook(() => useLadder(m.repos, () => 1000));
  await waitFor(() => expect(hook.result.current.loaded).toBe(true));
  return { ...m, hook };
};

describe('useLadder', () => {
  it('loads the catalogue, progress and prefs', async () => {
    const { hook } = await load([progressRow('pas-16', { rank: 'bronze', bestCleanBpm: 70 })]);
    const l = hook.result.current;
    expect(l.catalogue).toBe(CATALOGUE);
    expect(l.progressOf('pas-16').rank).toBe('bronze');
    expect(l.progressOf('pas-01')).toMatchObject({ rank: 'unranked', bestCleanBpm: null, totalSeconds: 0 });
    expect(l.prefs.hasDoublePedal).toBe(false);
  });

  it('tier 1 is unlocked, tier 2 locked on fresh progress, double-pedal tiers hidden', async () => {
    const { hook } = await load();
    const l = hook.result.current;
    expect(l.unlocked(ex('pas-01'))).toBe(true);
    expect(l.unlocked(ex('pas-07'))).toBe(false);
    expect(l.unlocked(ex('feet-5-1'))).toBe(false);
  });

  it('logClean saves rank and best, stamps the time, and updates state', async () => {
    const { hook, progress } = await load();
    await act(() => hook.result.current.logClean(ex('pas-16'), 70));
    expect(progress.put).toHaveBeenCalledWith(expect.objectContaining({ exerciseId: 'pas-16', rank: 'bronze', bestCleanBpm: 70, lastPracticedAt: 1000 }));
    expect(hook.result.current.progressOf('pas-16').rank).toBe('bronze');
  });

  it('a lower clean tempo keeps the higher best and rank', async () => {
    const { hook } = await load([progressRow('pas-16', { rank: 'silver', bestCleanBpm: 100, workingBpm: 100 })]);
    await act(() => hook.result.current.logClean(ex('pas-16'), 70));
    expect(hook.result.current.progressOf('pas-16')).toMatchObject({ rank: 'silver', bestCleanBpm: 100 });
  });

  it('setWorking and addTime update the row', async () => {
    const { hook, progress } = await load();
    await act(() => hook.result.current.setWorking(ex('pas-01'), 60));
    await act(() => hook.result.current.addTime(ex('pas-01'), 90));
    await act(() => hook.result.current.addTime(ex('pas-01'), 0));
    expect(hook.result.current.progressOf('pas-01')).toMatchObject({ workingBpm: 60, totalSeconds: 90, lastPracticedAt: 1000 });
    expect(progress.put).toHaveBeenCalledTimes(2);
  });

  it('setPrefs saves and unlocks double-pedal tiers when the earlier tiers are done', async () => {
    const done = CATALOGUE.filter((e) => e.track === 'feet' && e.tier === 4).map((e) => progressRow(e.id, { rank: 'bronze' }));
    const { hook, prefs } = await load(done);
    await act(() => hook.result.current.setPrefs({ ...hook.result.current.prefs, hasDoublePedal: true }));
    expect(prefs.save).toHaveBeenCalledWith(expect.objectContaining({ hasDoublePedal: true }));
    expect(hook.result.current.unlocked(ex('feet-5-1'))).toBe(true);
  });
});
