import Dexie, { type Table } from 'dexie';
import type { Preset } from '@tempodojo/core-metronome';

export interface KvRow {
  key: string;
  value: unknown;
}

export class TempoDojoDb extends Dexie {
  presets!: Table<Preset, string>;
  kv!: Table<KvRow, string>;

  constructor(name: string) {
    super(name);
    this.version(1).stores({
      presets: 'id, updatedAt',
      kv: 'key',
    });
  }
}
