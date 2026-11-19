import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { strToU8, zipSync } from 'fflate';
import { DEFAULT_SETTINGS } from '@tempodojo/core-metronome';
import { emptyProgress } from '@tempodojo/core-ladder';
import type { Song } from '@tempodojo/core-songlab';
import { BACKUP_FILE, BackupError, exportBackup, importBackup, readBackup } from './backup';
import { createDexieRepositories } from './repositories';
import type { StoredFile } from './song-repository';

let n = 0;
const fresh = () => createDexieRepositories(`songs-test-${++n}`);

const song = (id: string, patch: Partial<Song> = {}): Song => ({
  id,
  title: `Song ${id}`,
  kind: 'gp',
  fileId: `f-${id}`,
  fileName: `${id}.gp`,
  youtubeId: null,
  bpm: null,
  sections: [],
  lastPercent: 100,
  trainer: null,
  createdAt: 1,
  lastOpenedAt: null,
  ...patch,
});

const file = (id: string, bytes: number[]): StoredFile => ({
  id,
  name: `${id}.gp`,
  type: 'application/octet-stream',
  bytes: new Uint8Array(bytes),
  size: bytes.length,
  addedAt: 5,
});

describe('song and file repositories', () => {
  it('v3 database upgrades a v2 database keeping progress and presets', async () => {
    const name = `songs-upgrade-${++n}`;
    const v2 = new Dexie(name);
    v2.version(2).stores({ presets: 'id, updatedAt', kv: 'key', progress: 'exerciseId, lastPracticedAt', events: 'id, at' });
    await v2.table('presets').put({ id: 'p1', name: 'Keep', settings: DEFAULT_SETTINGS, updatedAt: 1 });
    await v2.table('progress').put({ ...emptyProgress('pas-16'), rank: 'bronze' });
    v2.close();

    const r = createDexieRepositories(name);
    expect((await r.presets.list()).map((p) => p.name)).toEqual(['Keep']);
    expect((await r.progress.get('pas-16')).rank).toBe('bronze');
    expect(await r.songs.list()).toEqual([]);
  });

  it('list orders by last opened, then newest added', async () => {
    const r = fresh();
    await r.songs.put(song('a', { createdAt: 1, lastOpenedAt: null }));
    await r.songs.put(song('b', { createdAt: 2, lastOpenedAt: 50 }));
    await r.songs.put(song('c', { createdAt: 3, lastOpenedAt: 90 }));
    await r.songs.put(song('d', { createdAt: 4, lastOpenedAt: null }));
    expect((await r.songs.list()).map((s) => s.id)).toEqual(['c', 'b', 'd', 'a']);
    expect((await r.songs.get('b'))?.title).toBe('Song b');
  });

  it('remove deletes the file too and leaves other songs alone', async () => {
    const r = fresh();
    await r.files.put(file('f-a', [1, 2, 3]));
    await r.files.put(file('f-b', [4, 5]));
    await r.songs.put(song('a'));
    await r.songs.put(song('b'));
    await r.songs.remove('a');
    expect((await r.songs.list()).map((s) => s.id)).toEqual(['b']);
    expect(await r.files.get('f-a')).toBeUndefined();
    expect([...((await r.files.get('f-b'))?.bytes ?? [])]).toEqual([4, 5]);
  });

  it('a youtube song without a file removes cleanly', async () => {
    const r = fresh();
    await r.songs.put(song('y', { kind: 'youtube', fileId: null, fileName: null, youtubeId: 'dQw4w9WgXcQ' }));
    await r.songs.remove('y');
    expect(await r.songs.list()).toEqual([]);
  });
});

describe('backup v2', () => {
  it('v2 round trip keeps songs and file bytes, replacing what was there', async () => {
    const a = fresh();
    await a.songs.put(song('a', { sections: [{ id: 's1', name: 'Fill', range: { kind: 'bars', startBar: 8, endBar: 8 }, bestCleanPercent: 85, exerciseId: 'feet-2-1', fromFile: false }] }));
    await a.files.put(file('f-a', [0, 255, 7, 9]));

    const data = await readBackup(await exportBackup(a, () => 42));
    expect(data.version).toBe(2);
    expect(data.songs).toHaveLength(1);
    expect(data.files.map((f) => [f.id, [...f.bytes]])).toEqual([['f-a', [0, 255, 7, 9]]]);

    const b = fresh();
    await b.songs.put(song('other'));
    await b.files.put(file('f-other', [1]));
    await importBackup(b, data);

    expect((await b.songs.list()).map((s) => s.id)).toEqual(['a']);
    expect((await b.songs.get('a'))?.sections[0]).toMatchObject({ name: 'Fill', bestCleanPercent: 85, exerciseId: 'feet-2-1' });
    expect([...((await b.files.get('f-a'))?.bytes ?? [])]).toEqual([0, 255, 7, 9]);
    expect(await b.files.get('f-other')).toBeUndefined();
  });

  it('file bytes travel as zip entries, not inside the JSON', async () => {
    const a = fresh();
    await a.files.put(file('f-a', [1, 2, 3]));
    const { unzipSync, strFromU8 } = await import('fflate');
    const entries = unzipSync(await exportBackup(a));
    expect(Object.keys(entries).sort()).toEqual([BACKUP_FILE, 'files/f-a']);
    expect(strFromU8(entries[BACKUP_FILE])).not.toContain('"bytes"');
  });

  it('reads a v1 backup as having no songs', async () => {
    const v1 = JSON.stringify({ version: 1, exportedAt: 1, presets: [], lastSettings: null, progress: [], events: [], prefs: { weeklyTarget: { sessions: 4, minutes: 120 }, hasDoublePedal: false } });
    const data = await readBackup(zipSync({ [BACKUP_FILE]: strToU8(v1) }));
    expect(data.songs).toEqual([]);
    expect(data.files).toEqual([]);
  });

  it('a v2 backup missing a listed file is corrupt', async () => {
    const json = JSON.stringify({
      version: 2, exportedAt: 1, presets: [], lastSettings: null, progress: [], events: [],
      prefs: { weeklyTarget: { sessions: 4, minutes: 120 }, hasDoublePedal: false },
      songs: [song('a')], files: [{ id: 'f-a', name: 'a.gp', type: 'x', size: 3, addedAt: 1 }],
    });
    await expect(readBackup(zipSync({ [BACKUP_FILE]: strToU8(json) }))).rejects.toEqual(new BackupError('corrupt'));
  });
});
