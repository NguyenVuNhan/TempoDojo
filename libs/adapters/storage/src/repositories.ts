import type { PresetRepository } from '@tempodojo/core-metronome';
import { emptyProgress, type Progress } from '@tempodojo/core-ladder';
import {
  DEFAULT_WEEKLY_TARGET,
  type PracticeEvent,
  type WeeklyTarget,
} from '@tempodojo/core-practice';
import { TempoDojoDb } from './db';
import { createPresetRepositoryFromDb } from './preset-repository';
import {
  createSongRepositoriesFromDb,
  type FileRepository,
  type SongRepository,
} from './song-repository';

const PREFS_KEY = 'prefs';

export interface ProgressRepository {
  all(): Promise<Map<string, Progress>>;
  get(id: string): Promise<Progress>;
  put(p: Progress): Promise<void>;
  replaceAll(ps: Progress[]): Promise<void>;
}

export interface EventRepository {
  add(e: PracticeEvent): Promise<void>;
  since(at: number): Promise<PracticeEvent[]>;
  all(): Promise<PracticeEvent[]>;
  replaceAll(es: PracticeEvent[]): Promise<void>;
}

export interface Prefs {
  weeklyTarget: WeeklyTarget;
  hasDoublePedal: boolean;
  /** Show the "1 e & a" count row above the practice staff. Missing means off. */
  showCounts?: boolean;
}

export const DEFAULT_PREFS: Prefs = {
  weeklyTarget: DEFAULT_WEEKLY_TARGET,
  hasDoublePedal: false,
};

export interface PrefsRepository {
  load(): Promise<Prefs>;
  save(p: Prefs): Promise<void>;
}

export interface KvRepository {
  get<T = unknown>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
}

export function createDexieRepositories(dbName = 'tempodojo'): {
  presets: PresetRepository;
  progress: ProgressRepository;
  events: EventRepository;
  prefs: PrefsRepository;
  kv: KvRepository;
  songs: SongRepository;
  files: FileRepository;
  db: TempoDojoDb;
} {
  const db = new TempoDojoDb(dbName);

  const presets = createPresetRepositoryFromDb(db);

  const progress: ProgressRepository = {
    async all(): Promise<Map<string, Progress>> {
      const rows = await db.progress.toArray();
      return new Map(rows.map((row) => [row.exerciseId, row]));
    },

    async get(id: string): Promise<Progress> {
      return (await db.progress.get(id)) ?? emptyProgress(id);
    },

    async put(p: Progress): Promise<void> {
      await db.progress.put(p);
    },

    async replaceAll(ps: Progress[]): Promise<void> {
      await db.transaction('rw', db.progress, async () => {
        await db.progress.clear();
        if (ps.length > 0) {
          await db.progress.bulkPut(ps);
        }
      });
    },
  };

  const events: EventRepository = {
    async add(e: PracticeEvent): Promise<void> {
      await db.events.put(e);
    },

    async since(at: number): Promise<PracticeEvent[]> {
      return db.events.where('at').aboveOrEqual(at).sortBy('at');
    },

    async all(): Promise<PracticeEvent[]> {
      return db.events.orderBy('at').toArray();
    },

    async replaceAll(es: PracticeEvent[]): Promise<void> {
      await db.transaction('rw', db.events, async () => {
        await db.events.clear();
        if (es.length > 0) {
          await db.events.bulkPut(es);
        }
      });
    },
  };

  const kv: KvRepository = {
    async get<T = unknown>(key: string): Promise<T | undefined> {
      const row = await db.kv.get(key);
      return row ? (row.value as T) : undefined;
    },

    async set(key: string, value: unknown): Promise<void> {
      await db.kv.put({ key, value });
    },
  };

  const prefs: PrefsRepository = {
    async load(): Promise<Prefs> {
      const stored = await kv.get<Partial<Prefs>>(PREFS_KEY);
      return {
        ...DEFAULT_PREFS,
        ...stored,
        weeklyTarget: {
          ...DEFAULT_WEEKLY_TARGET,
          ...(stored?.weeklyTarget ?? {}),
        },
      };
    },

    async save(p: Prefs): Promise<void> {
      await kv.set(PREFS_KEY, p);
    },
  };

  return { presets, progress, events, prefs, kv, ...createSongRepositoriesFromDb(db), db };
}
