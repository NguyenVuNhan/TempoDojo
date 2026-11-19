import 'fake-indexeddb/auto';
import { strToU8, zipSync } from 'fflate';
import { DEFAULT_SETTINGS } from '@tempodojo/core-metronome';
import { emptyProgress } from '@tempodojo/core-ladder';
import type { PracticeEvent } from '@tempodojo/core-practice';
import { BACKUP_FILE, BackupError, exportBackup, importBackup, readBackup } from './backup';
import { createDexieRepositories } from './repositories';

let n = 0;
const fresh = () => createDexieRepositories(`backup-test-${++n}`);

const event: PracticeEvent = { id: 'e1', type: 'play', at: 1000, source: { kind: 'metronome' } };

async function seed() {
  const r = fresh();
  await r.presets.save({ id: 'p1', name: 'Groove 90', settings: { ...DEFAULT_SETTINGS, bpm: 90 }, updatedAt: 5 });
  await r.presets.saveLast({ ...DEFAULT_SETTINGS, bpm: 77 });
  await r.progress.put({ ...emptyProgress('pas-16'), rank: 'bronze', bestCleanBpm: 70, totalSeconds: 300 });
  await r.events.add(event);
  await r.prefs.save({ weeklyTarget: { sessions: 5, minutes: 150 }, hasDoublePedal: true });
  return r;
}

const zipOf = (files: Record<string, string>) => zipSync(Object.fromEntries(Object.entries(files).map(([k, v]) => [k, strToU8(v)])));

const code = async (p: Promise<unknown>) => {
  try {
    await p;
    return 'resolved';
  } catch (e) {
    return e instanceof BackupError ? e.code : `other: ${String(e)}`;
  }
};

describe('backup', () => {
  it('round trips everything into a fresh database', async () => {
    const a = await seed();
    const bytes = await exportBackup(a, () => 42);
    const data = await readBackup(bytes);
    expect(data).toMatchObject({ version: 1, exportedAt: 42 });

    const b = fresh();
    await b.progress.put({ ...emptyProgress('pas-01'), rank: 'gold' });
    await importBackup(b, data);

    expect(await b.presets.list()).toEqual(await a.presets.list());
    expect((await b.presets.loadLast())?.bpm).toBe(77);
    expect([...(await b.progress.all()).keys()]).toEqual(['pas-16']);
    expect(await b.progress.get('pas-16')).toMatchObject({ rank: 'bronze', bestCleanBpm: 70, totalSeconds: 300 });
    expect(await b.events.all()).toEqual([event]);
    expect(await b.prefs.load()).toEqual({ weeklyTarget: { sessions: 5, minutes: 150 }, hasDoublePedal: true });
  });

  it('writes a single tempodojo.json', async () => {
    expect(BACKUP_FILE).toBe('tempodojo.json');
  });

  it('rejects a zip that is not a TempoDojo backup', async () => {
    expect(await code(readBackup(zipOf({ 'other.json': '{}' })))).toBe('not-a-backup');
    expect(await code(readBackup(zipOf({ [BACKUP_FILE]: '{"hello":1}' })))).toBe('not-a-backup');
  });

  it('rejects a backup from a newer version', async () => {
    const newer = JSON.stringify({ version: 2, exportedAt: 1, presets: [], lastSettings: null, progress: [], events: [], prefs: {} });
    expect(await code(readBackup(zipOf({ [BACKUP_FILE]: newer })))).toBe('newer-version');
  });

  it('rejects corrupt bytes and bad json', async () => {
    expect(await code(readBackup(new Uint8Array([1, 2, 3, 4])))).toBe('corrupt');
    expect(await code(readBackup(zipOf({ [BACKUP_FILE]: '{not json' })))).toBe('corrupt');
  });

  it('a rejected file leaves current data untouched', async () => {
    const a = await seed();
    await code(readBackup(zipOf({ 'other.json': '{}' })).then((d) => importBackup(a, d)));
    expect((await a.progress.all()).size).toBe(1);
  });
});
