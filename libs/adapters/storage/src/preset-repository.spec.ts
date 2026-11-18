import 'fake-indexeddb/auto';
import { DEFAULT_SETTINGS, type MetronomeSettings, type Preset } from '@tempodojo/core-metronome';
import { createDexiePresetRepository, requestPersistentStorage } from './preset-repository';

let dbCounter = 0;
const freshRepo = () => createDexiePresetRepository(`tempodojo-test-${++dbCounter}`);

const preset = (id: string, name: string, updatedAt: number, bpm = 100): Preset => ({
  id,
  name,
  updatedAt,
  settings: { ...DEFAULT_SETTINGS, bpm },
});

describe('createDexiePresetRepository', () => {
  it('lists presets newest first', async () => {
    const repo = freshRepo();
    await repo.save(preset('a', 'Old', 1));
    await repo.save(preset('b', 'New', 2));
    expect((await repo.list()).map((p) => p.id)).toEqual(['b', 'a']);
  });

  it('upserts by id', async () => {
    const repo = freshRepo();
    await repo.save(preset('a', 'First', 1));
    await repo.save(preset('a', 'Renamed', 3, 90));
    const all = await repo.list();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ id: 'a', name: 'Renamed', updatedAt: 3 });
    expect(all[0].settings.bpm).toBe(90);
  });

  it('removes presets', async () => {
    const repo = freshRepo();
    await repo.save(preset('a', 'A', 1));
    await repo.save(preset('b', 'B', 2));
    await repo.remove('a');
    expect((await repo.list()).map((p) => p.id)).toEqual(['b']);
  });

  it('returns null before any last settings are saved', async () => {
    expect(await freshRepo().loadLast()).toBeNull();
  });

  it('round-trips last settings', async () => {
    const repo = freshRepo();
    const s: MetronomeSettings = { ...DEFAULT_SETTINGS, bpm: 87, countInBars: 1 };
    await repo.saveLast(s);
    expect(await repo.loadLast()).toEqual(s);
  });

  it('repairs invalid stored settings on load', async () => {
    const repo = freshRepo();
    await repo.saveLast({ ...DEFAULT_SETTINGS, bpm: 900 });
    expect((await repo.loadLast())?.bpm).toBe(400);
  });

  it('keeps data between repository instances on the same database', async () => {
    const name = `tempodojo-test-${++dbCounter}`;
    await createDexiePresetRepository(name).save(preset('a', 'Kept', 1));
    expect((await createDexiePresetRepository(name).list()).map((p) => p.name)).toEqual(['Kept']);
  });
});

describe('requestPersistentStorage', () => {
  it('returns false when the Storage API is unavailable', async () => {
    expect(await requestPersistentStorage()).toBe(false);
  });
});
