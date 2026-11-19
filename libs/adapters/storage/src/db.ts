import Dexie, { type Table } from 'dexie';
import type { Preset } from '@tempodojo/core-metronome';
import type { Progress } from '@tempodojo/core-ladder';
import type { PracticeEvent } from '@tempodojo/core-practice';
import type { Song } from '@tempodojo/core-songlab';
import type { StoredFile } from './song-repository';

export interface KvRow {
  key: string;
  value: unknown;
}

export class TempoDojoDb extends Dexie {
  presets!: Table<Preset, string>;
  kv!: Table<KvRow, string>;
  progress!: Table<Progress, string>;
  events!: Table<PracticeEvent, string>;
  songs!: Table<Song, string>;
  files!: Table<StoredFile, string>;

  constructor(name: string) {
    super(name);
    this.version(1).stores({
      presets: 'id, updatedAt',
      kv: 'key',
    });
    this.version(2).stores({
      presets: 'id, updatedAt',
      kv: 'key',
      progress: 'exerciseId, lastPracticedAt',
      events: 'id, at',
    });
    this.version(3).stores({
      presets: 'id, updatedAt',
      kv: 'key',
      progress: 'exerciseId, lastPracticedAt',
      events: 'id, at',
      songs: 'id, lastOpenedAt',
      files: 'id',
    });
  }
}
