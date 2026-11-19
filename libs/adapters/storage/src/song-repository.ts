import type { Song } from '@tempodojo/core-songlab';
import type { TempoDojoDb } from './db';

export interface StoredFile {
  id: string;
  name: string;
  type: string;
  bytes: Uint8Array;
  size: number;
  addedAt: number;
}

export interface FileRepository {
  put(f: StoredFile): Promise<void>;
  get(id: string): Promise<StoredFile | undefined>;
  remove(id: string): Promise<void>;
  all(): Promise<StoredFile[]>;
  replaceAll(fs: StoredFile[]): Promise<void>;
}

export interface SongRepository {
  list(): Promise<Song[]>;
  get(id: string): Promise<Song | undefined>;
  put(s: Song): Promise<void>;
  remove(id: string): Promise<void>;
  replaceAll(ss: Song[]): Promise<void>;
}

export function createSongRepositoriesFromDb(db: TempoDojoDb): {
  songs: SongRepository;
  files: FileRepository;
} {
  const songs: SongRepository = {
    async list(): Promise<Song[]> {
      const rows = await db.songs.toArray();
      return rows.sort((a, b) => {
        if (a.lastOpenedAt !== null && b.lastOpenedAt !== null) {
          if (b.lastOpenedAt !== a.lastOpenedAt) {
            return b.lastOpenedAt - a.lastOpenedAt;
          }
        } else if (a.lastOpenedAt !== null) {
          return -1;
        } else if (b.lastOpenedAt !== null) {
          return 1;
        }
        return b.createdAt - a.createdAt;
      });
    },

    async get(id: string): Promise<Song | undefined> {
      return db.songs.get(id);
    },

    async put(s: Song): Promise<void> {
      await db.songs.put(s);
    },

    async remove(id: string): Promise<void> {
      await db.transaction('rw', [db.songs, db.files], async () => {
        const existing = await db.songs.get(id);
        await db.songs.delete(id);
        if (existing?.fileId) {
          await db.files.delete(existing.fileId);
        }
      });
    },

    async replaceAll(ss: Song[]): Promise<void> {
      await db.transaction('rw', db.songs, async () => {
        await db.songs.clear();
        if (ss.length > 0) {
          await db.songs.bulkPut(ss);
        }
      });
    },
  };

  const files: FileRepository = {
    async put(f: StoredFile): Promise<void> {
      await db.files.put(f);
    },

    async get(id: string): Promise<StoredFile | undefined> {
      return db.files.get(id);
    },

    async remove(id: string): Promise<void> {
      await db.files.delete(id);
    },

    async all(): Promise<StoredFile[]> {
      return db.files.toArray();
    },

    async replaceAll(fs: StoredFile[]): Promise<void> {
      await db.transaction('rw', db.files, async () => {
        await db.files.clear();
        if (fs.length > 0) {
          await db.files.bulkPut(fs);
        }
      });
    },
  };

  return { songs, files };
}

export async function storageUsage(): Promise<{ usedBytes: number; quotaBytes: number } | null> {
  try {
    if (typeof navigator === 'undefined' || typeof navigator.storage?.estimate !== 'function') {
      return null;
    }
    const { usage, quota } = await navigator.storage.estimate();
    return {
      usedBytes: usage ?? 0,
      quotaBytes: quota ?? 0,
    };
  } catch {
    return null;
  }
}
