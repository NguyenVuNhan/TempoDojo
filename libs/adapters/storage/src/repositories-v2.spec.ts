import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { DEFAULT_SETTINGS } from '@tempodojo/core-metronome';
import { emptyProgress } from '@tempodojo/core-ladder';
import { DEFAULT_WEEKLY_TARGET, type PracticeEvent } from '@tempodojo/core-practice';
import { DEFAULT_PREFS, createDexieRepositories } from './repositories';

let counter = 0;
const fresh = () => createDexieRepositories(`tempodojo-v2-${++counter}`);

const event = (id: string, at: number, type: 'play' | 'stop' = 'play'): PracticeEvent => ({
  id,
  type,
  at,
  source: { kind: 'metronome' },
});

describe('createDexieRepositories (schema v2)', () => {
  it('v1 database upgrades keeping presets and last settings', async () => {
    const name = `tempodojo-v1-${++counter}`;
    const v1 = new Dexie(name);
    v1.version(1).stores({ presets: 'id, updatedAt', kv: 'key' });
    await v1.table('presets').put({ id: 'p1', name: 'Old', updatedAt: 1, settings: DEFAULT_SETTINGS });
    await v1.table('kv').put({ key: 'lastSettings', value: { ...DEFAULT_SETTINGS, bpm: 88 } });
    v1.close();

    const repos = createDexieRepositories(name);
    expect((await repos.presets.list()).map((p) => p.name)).toEqual(['Old']);
    expect((await repos.presets.loadLast())?.bpm).toBe(88);
    expect(await repos.progress.all()).toEqual(new Map());
  });

  it('progress: missing returns empty, put/get/all round-trip', async () => {
    const { progress } = fresh();
    expect(await progress.get('pas-01')).toEqual(emptyProgress('pas-01'));
    const p = { ...emptyProgress('pas-16'), bestCleanBpm: 90, rank: 'bronze' as const, lastPracticedAt: 5 };
    await progress.put(p);
    expect(await progress.get('pas-16')).toEqual(p);
    expect([...(await progress.all()).keys()]).toEqual(['pas-16']);
  });

  it('progress: replaceAll clears then writes', async () => {
    const { progress } = fresh();
    await progress.put(emptyProgress('a'));
    await progress.replaceAll([emptyProgress('b')]);
    expect([...(await progress.all()).keys()]).toEqual(['b']);
  });

  it('events: add, since (inclusive, ordered by time), all, replaceAll', async () => {
    const { events } = fresh();
    await events.add(event('e3', 300));
    await events.add(event('e1', 100));
    await events.add(event('e2', 200, 'stop'));
    expect((await events.since(200)).map((e) => e.id)).toEqual(['e2', 'e3']);
    expect((await events.all()).map((e) => e.id)).toEqual(['e1', 'e2', 'e3']);
    await events.replaceAll([event('x', 1)]);
    expect((await events.all()).map((e) => e.id)).toEqual(['x']);
  });

  it('prefs: defaults, then save/load merged over defaults', async () => {
    const { prefs } = fresh();
    expect(DEFAULT_PREFS).toEqual({ weeklyTarget: DEFAULT_WEEKLY_TARGET, hasDoublePedal: false });
    expect(await prefs.load()).toEqual(DEFAULT_PREFS);
    await prefs.save({ ...DEFAULT_PREFS, hasDoublePedal: true });
    expect(await prefs.load()).toEqual({ ...DEFAULT_PREFS, hasDoublePedal: true });
  });

  it('prefs: showCounts is off for prefs saved before it existed, and round-trips', async () => {
    const repos = fresh();
    await repos.db.kv.put({ key: 'prefs', value: { hasDoublePedal: false } });
    expect((await repos.prefs.load()).showCounts ?? false).toBe(false);
    await repos.prefs.save({ ...(await repos.prefs.load()), showCounts: true });
    expect((await repos.prefs.load()).showCounts).toBe(true);
  });

  it('prefs: a partial stored value is merged with defaults', async () => {
    const repos = fresh();
    await repos.db.kv.put({ key: 'prefs', value: { hasDoublePedal: true } });
    expect(await repos.prefs.load()).toEqual({ ...DEFAULT_PREFS, hasDoublePedal: true });
  });

  it('kv: get/set small values (used for last tab)', async () => {
    const { kv } = fresh();
    expect(await kv.get('lastTab')).toBeUndefined();
    await kv.set('lastTab', 'ladder');
    expect(await kv.get('lastTab')).toBe('ladder');
  });
});
