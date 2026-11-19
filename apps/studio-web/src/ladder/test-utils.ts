import { emptyProgress, type Progress } from '@tempodojo/core-ladder';
import { DEFAULT_PREFS, type Prefs, type PrefsRepository, type ProgressRepository } from '@tempodojo/storage';
import type { LadderRepos } from './types';

export class MemoryProgress implements ProgressRepository {
  rows = new Map<string, Progress>();
  put = vi.fn(async (p: Progress) => {
    this.rows.set(p.exerciseId, p);
  });
  async all() {
    return new Map(this.rows);
  }
  async get(id: string) {
    return this.rows.get(id) ?? emptyProgress(id);
  }
  async replaceAll(ps: Progress[]) {
    this.rows = new Map(ps.map((p) => [p.exerciseId, p]));
  }
}

export class MemoryPrefs implements PrefsRepository {
  value: Prefs = DEFAULT_PREFS;
  save = vi.fn(async (p: Prefs) => {
    this.value = p;
  });
  async load() {
    return this.value;
  }
}

export const progressRow = (exerciseId: string, patch: Partial<Progress>): Progress => ({ ...emptyProgress(exerciseId), ...patch });

export function memoryLadderRepos(rows: Progress[] = [], prefs: Partial<Prefs> = {}) {
  const progress = new MemoryProgress();
  rows.forEach((r) => progress.rows.set(r.exerciseId, r));
  const prefsRepo = new MemoryPrefs();
  prefsRepo.value = { ...DEFAULT_PREFS, ...prefs };
  const repos: LadderRepos = { progress, prefs: prefsRepo };
  return { repos, progress, prefs: prefsRepo };
}
