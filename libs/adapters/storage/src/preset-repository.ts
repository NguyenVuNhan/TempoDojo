import {
  normalizeSettings,
  type MetronomeSettings,
  type Preset,
  type PresetRepository,
} from '@tempodojo/core-metronome';
import { TempoDojoDb } from './db';

const LAST_SETTINGS_KEY = 'lastSettings';

export function createDexiePresetRepository(dbName = 'tempodojo'): PresetRepository {
  const db = new TempoDojoDb(dbName);

  return {
    async list(): Promise<Preset[]> {
      return db.presets.orderBy('updatedAt').reverse().toArray();
    },

    async save(preset: Preset): Promise<void> {
      await db.presets.put(preset);
    },

    async remove(id: string): Promise<void> {
      await db.presets.delete(id);
    },

    async loadLast(): Promise<MetronomeSettings | null> {
      const row = await db.kv.get(LAST_SETTINGS_KEY);
      if (!row) {
        return null;
      }
      return normalizeSettings(row.value as MetronomeSettings);
    },

    async saveLast(settings: MetronomeSettings): Promise<void> {
      await db.kv.put({ key: LAST_SETTINGS_KEY, value: settings });
    },
  };
}

export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (typeof navigator === 'undefined' || typeof navigator.storage?.persist !== 'function') {
      return false;
    }
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
