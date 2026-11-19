import { strFromU8, strToU8, unzipSync, zipSync, type Unzipped } from 'fflate';
import type { MetronomeSettings, Preset } from '@tempodojo/core-metronome';
import type { Progress } from '@tempodojo/core-ladder';
import type { PracticeEvent } from '@tempodojo/core-practice';
import type { Song } from '@tempodojo/core-songlab';
import type { createDexieRepositories, Prefs } from './repositories';

export const BACKUP_FILE = 'tempodojo.json';
export const BACKUP_VERSION = 2;

const LAST_SETTINGS_KEY = 'lastSettings';
const PREFS_KEY = 'prefs';

export type Repositories = ReturnType<typeof createDexieRepositories>;

export interface BackupFile {
  id: string;
  name: string;
  type: string;
  size: number;
  addedAt: number;
  bytes: Uint8Array;
}

export interface BackupData {
  version: 1 | 2;
  exportedAt: number;
  presets: Preset[];
  lastSettings: MetronomeSettings | null;
  progress: Progress[];
  events: PracticeEvent[];
  prefs: Prefs;
  songs: Song[];
  files: BackupFile[];
}

export type BackupErrorCode = 'not-a-backup' | 'newer-version' | 'corrupt';

export class BackupError extends Error {
  constructor(public readonly code: BackupErrorCode) {
    super(code);
    this.name = 'BackupError';
  }
}

export async function exportBackup(
  repos: Repositories,
  now: () => number = Date.now,
): Promise<Uint8Array> {
  const [presets, lastSettings, progressMap, events, prefs, songs, storedFiles] = await Promise.all([
    repos.presets.list(),
    repos.presets.loadLast(),
    repos.progress.all(),
    repos.events.all(),
    repos.prefs.load(),
    repos.songs.list(),
    repos.files.all(),
  ]);

  const json = {
    version: BACKUP_VERSION,
    exportedAt: now(),
    presets,
    lastSettings,
    progress: [...progressMap.values()],
    events,
    prefs,
    songs,
    files: storedFiles.map(({ id, name, type, size, addedAt }) => ({
      id,
      name,
      type,
      size,
      addedAt,
    })),
  };

  const entries: Record<string, Uint8Array> = {
    [BACKUP_FILE]: strToU8(JSON.stringify(json)),
  };
  for (const file of storedFiles) {
    entries[`files/${file.id}`] = file.bytes;
  }

  return zipSync(entries);
}

export async function readBackup(zip: Uint8Array): Promise<BackupData> {
  let zipFiles: Unzipped;
  try {
    zipFiles = unzipSync(zip);
  } catch {
    throw new BackupError('corrupt');
  }

  const entry = zipFiles[BACKUP_FILE];
  if (!entry) {
    throw new BackupError('not-a-backup');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(strFromU8(entry));
  } catch {
    throw new BackupError('corrupt');
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new BackupError('not-a-backup');
  }

  const record = parsed as Record<string, unknown>;
  if (typeof record.version !== 'number') {
    throw new BackupError('not-a-backup');
  }

  if (record.version > BACKUP_VERSION) {
    throw new BackupError('newer-version');
  }

  if (
    (record.version !== 1 && record.version !== 2) ||
    !Array.isArray(record.presets) ||
    !Array.isArray(record.progress) ||
    !Array.isArray(record.events) ||
    typeof record.prefs !== 'object' ||
    record.prefs === null ||
    Array.isArray(record.prefs)
  ) {
    throw new BackupError('corrupt');
  }

  let songs: Song[] = [];
  let files: BackupFile[] = [];

  if (record.version === 2) {
    if (!Array.isArray(record.songs) || !Array.isArray(record.files)) {
      throw new BackupError('corrupt');
    }

    songs = record.songs as Song[];
    files = record.files.map((item) => {
      if (
        typeof item !== 'object' ||
        item === null ||
        Array.isArray(item) ||
        typeof (item as Record<string, unknown>).id !== 'string'
      ) {
        throw new BackupError('corrupt');
      }

      const meta = item as Omit<BackupFile, 'bytes'>;
      const bytes = zipFiles[`files/${meta.id}`];
      if (!bytes) {
        throw new BackupError('corrupt');
      }

      return {
        id: meta.id,
        name: meta.name,
        type: meta.type,
        size: meta.size,
        addedAt: meta.addedAt,
        bytes,
      };
    });
  }

  return {
    ...(record as unknown as BackupData),
    version: record.version,
    lastSettings:
      record.lastSettings === undefined
        ? null
        : (record.lastSettings as MetronomeSettings | null),
    songs,
    files,
  };
}

export async function importBackup(repos: Repositories, data: BackupData): Promise<void> {
  const { db } = repos;
  await db.transaction(
    'rw',
    [db.presets, db.kv, db.progress, db.events, db.songs, db.files],
    async () => {
      await db.presets.clear();
      if (data.presets.length > 0) {
        await db.presets.bulkPut(data.presets);
      }

      await db.progress.clear();
      if (data.progress.length > 0) {
        await db.progress.bulkPut(data.progress);
      }

      await db.events.clear();
      if (data.events.length > 0) {
        await db.events.bulkPut(data.events);
      }

      await db.songs.clear();
      if (data.songs.length > 0) {
        await db.songs.bulkPut(data.songs);
      }

      await db.files.clear();
      if (data.files.length > 0) {
        await db.files.bulkPut(
          data.files.map(({ id, name, type, bytes, size, addedAt }) => ({
            id,
            name,
            type,
            bytes,
            size,
            addedAt,
          })),
        );
      }

      if (data.lastSettings) {
        await db.kv.put({ key: LAST_SETTINGS_KEY, value: data.lastSettings });
      } else {
        await db.kv.delete(LAST_SETTINGS_KEY);
      }

      await db.kv.put({ key: PREFS_KEY, value: data.prefs });
    },
  );
}
