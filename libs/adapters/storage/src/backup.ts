import { strFromU8, strToU8, unzipSync, zipSync, type Unzipped } from 'fflate';
import type { MetronomeSettings, Preset } from '@tempodojo/core-metronome';
import type { Progress } from '@tempodojo/core-ladder';
import type { PracticeEvent } from '@tempodojo/core-practice';
import type { createDexieRepositories, Prefs } from './repositories';

export const BACKUP_FILE = 'tempodojo.json';
export const BACKUP_VERSION = 1;

const LAST_SETTINGS_KEY = 'lastSettings';
const PREFS_KEY = 'prefs';

export type Repositories = ReturnType<typeof createDexieRepositories>;

export interface BackupData {
  version: 1;
  exportedAt: number;
  presets: Preset[];
  lastSettings: MetronomeSettings | null;
  progress: Progress[];
  events: PracticeEvent[];
  prefs: Prefs;
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
  const [presets, lastSettings, progressMap, events, prefs] = await Promise.all([
    repos.presets.list(),
    repos.presets.loadLast(),
    repos.progress.all(),
    repos.events.all(),
    repos.prefs.load(),
  ]);

  const data: BackupData = {
    version: BACKUP_VERSION,
    exportedAt: now(),
    presets,
    lastSettings,
    progress: [...progressMap.values()],
    events,
    prefs,
  };

  return zipSync({ [BACKUP_FILE]: strToU8(JSON.stringify(data)) });
}

export async function readBackup(zip: Uint8Array): Promise<BackupData> {
  let files: Unzipped;
  try {
    files = unzipSync(zip);
  } catch {
    throw new BackupError('corrupt');
  }

  const entry = files[BACKUP_FILE];
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
    !Array.isArray(record.presets) ||
    !Array.isArray(record.progress) ||
    !Array.isArray(record.events) ||
    typeof record.prefs !== 'object' ||
    record.prefs === null ||
    Array.isArray(record.prefs)
  ) {
    throw new BackupError('corrupt');
  }

  return {
    ...(record as unknown as BackupData),
    lastSettings:
      record.lastSettings === undefined
        ? null
        : (record.lastSettings as MetronomeSettings | null),
  };
}

export async function importBackup(repos: Repositories, data: BackupData): Promise<void> {
  const { db } = repos;
  await db.transaction('rw', [db.presets, db.kv, db.progress, db.events], async () => {
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

    if (data.lastSettings) {
      await db.kv.put({ key: LAST_SETTINGS_KEY, value: data.lastSettings });
    } else {
      await db.kv.delete(LAST_SETTINGS_KEY);
    }

    await db.kv.put({ key: PREFS_KEY, value: data.prefs });
  });
}
