import Dexie, { type Table } from 'dexie';
import type { Preset } from '@tempodojo/core-metronome';
import type { Progress } from '@tempodojo/core-ladder';
import type { PracticeEvent } from '@tempodojo/core-practice';

export interface KvRow {
  key: string;
  value: unknown;
}

export class TempoDojoDb extends Dexie {
  presets!: Table<Preset, string>;
  kv!: Table<KvRow, string>;
  progress!: Table<Progress, string>;
  events!: Table<PracticeEvent, string>;

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
  }
}
