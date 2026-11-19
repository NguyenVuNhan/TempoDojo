import type { MetronomeSettings } from './types';

export interface Preset {
  id: string;
  name: string;
  settings: MetronomeSettings;
  updatedAt: number;
}

export interface PresetRepository {
  list(): Promise<Preset[]>;
  save(preset: Preset): Promise<void>;
  remove(id: string): Promise<void>;
  loadLast(): Promise<MetronomeSettings | null>;
  saveLast(settings: MetronomeSettings): Promise<void>;
}
