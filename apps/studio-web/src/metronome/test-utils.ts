import type { ClickEvent, MetronomeSettings, Preset, PresetRepository } from '@tempodojo/core-metronome';
import type { MetronomeEngineLike } from './useMetronome';

export class FakeEngine implements MetronomeEngineLike {
  start = vi.fn(async (_s: MetronomeSettings) => undefined);
  update = vi.fn((_s: MetronomeSettings) => undefined);
  stop = vi.fn(() => undefined);
  private listeners = new Set<(e: ClickEvent, delayMs: number) => void>();
  onEvent(cb: (e: ClickEvent, delayMs: number) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }
  private audioListeners = new Set<(s: string) => void>();
  resumeTo = 'running';
  resumeAudio = vi.fn(async () => {
    this.emitAudio(this.resumeTo);
    return this.resumeTo === 'running';
  });
  onAudioState(cb: (s: string) => void): () => void {
    this.audioListeners.add(cb);
    return () => this.audioListeners.delete(cb);
  }
  emitAudio(s: string): void {
    this.audioListeners.forEach((cb) => cb(s));
  }
  emit(e: Partial<ClickEvent>): void {
    const full: ClickEvent = { time: 0, bar: 0, pulse: 0, sub: 0, level: 'normal', bpm: 120, countIn: false, ...e };
    this.listeners.forEach((cb) => cb(full, 0));
  }
}

export class MemoryRepo implements PresetRepository {
  last: MetronomeSettings | null = null;
  presets: Preset[] = [];
  saveLast = vi.fn(async (s: MetronomeSettings) => {
    this.last = s;
  });
  async loadLast() {
    return this.last;
  }
  async list() {
    return [...this.presets].sort((a, b) => b.updatedAt - a.updatedAt);
  }
  async save(p: Preset) {
    this.presets = [...this.presets.filter((x) => x.id !== p.id), p];
  }
  async remove(id: string) {
    this.presets = this.presets.filter((x) => x.id !== id);
  }
}
