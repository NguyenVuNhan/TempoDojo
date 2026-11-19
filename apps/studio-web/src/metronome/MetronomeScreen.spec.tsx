import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  DEFAULT_SETTINGS,
  type ClickEvent,
  type MetronomeSettings,
  type Preset,
  type PresetRepository,
} from '@tempodojo/core-metronome';
import { MetronomeScreen } from './MetronomeScreen';
import type { MetronomeEngineLike } from './useMetronome';

class FakeEngine implements MetronomeEngineLike {
  start = vi.fn(async (_s: MetronomeSettings) => undefined);
  update = vi.fn((_s: MetronomeSettings) => undefined);
  stop = vi.fn(() => undefined);
  private listeners = new Set<(e: ClickEvent, delayMs: number) => void>();
  onEvent(cb: (e: ClickEvent, delayMs: number) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }
  emit(e: Partial<ClickEvent>): void {
    const full: ClickEvent = { time: 0, bar: 0, pulse: 0, sub: 0, level: 'normal', bpm: 120, countIn: false, ...e };
    this.listeners.forEach((cb) => cb(full, 0));
  }
}

class MemoryRepo implements PresetRepository {
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

const renderScreen = async (last: MetronomeSettings | null = null) => {
  const engine = new FakeEngine();
  const repo = new MemoryRepo();
  repo.last = last;
  render(<MetronomeScreen deps={{ engine, repo }} />);
  await waitFor(() => expect(screen.getByTestId('bpm-readout')).toBeTruthy());
  return { engine, repo };
};

const bpm = () => screen.getByTestId('bpm-readout').textContent?.replace(/\D/g, '');

describe('MetronomeScreen', () => {
  it('shows the default tempo', async () => {
    await renderScreen();
    expect(bpm()).toBe('120');
  });

  it('restores the last settings on mount', async () => {
    await renderScreen({ ...DEFAULT_SETTINGS, bpm: 90 });
    await waitFor(() => expect(bpm()).toBe('90'));
  });

  it('nudges tempo with the ± pads and clamps at 20', async () => {
    await renderScreen({ ...DEFAULT_SETTINGS, bpm: 22 });
    await waitFor(() => expect(bpm()).toBe('22'));
    fireEvent.click(screen.getByRole('button', { name: 'Increase tempo by 1' }));
    expect(bpm()).toBe('23');
    fireEvent.click(screen.getByRole('button', { name: 'Decrease tempo by 5' }));
    expect(bpm()).toBe('20');
    fireEvent.click(screen.getByRole('button', { name: 'Increase tempo by 5' }));
    fireEvent.click(screen.getByRole('button', { name: 'Decrease tempo by 1' }));
    expect(bpm()).toBe('24');
  });

  it('changes tempo by dragging the readout up (1 BPM per 8 px)', async () => {
    await renderScreen();
    const readout = screen.getByTestId('bpm-readout');
    fireEvent.pointerDown(readout, { clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(readout, { clientY: 84, pointerId: 1 });
    fireEvent.pointerUp(readout, { clientY: 84, pointerId: 1 });
    expect(bpm()).toBe('122');
  });

  it('starts and stops the engine', async () => {
    const { engine } = await renderScreen();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    });
    expect(engine.start).toHaveBeenCalledTimes(1);
    expect(engine.start.mock.calls[0][0].bpm).toBe(120);
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    expect(engine.stop).toHaveBeenCalledTimes(1);
  });

  it('pushes tempo changes to the engine while playing', async () => {
    const { engine } = await renderScreen();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    });
    fireEvent.click(screen.getByRole('button', { name: 'Increase tempo by 1' }));
    expect(engine.update).toHaveBeenLastCalledWith(expect.objectContaining({ bpm: 121 }));
  });

  it('cycles a beat accent when its LED is tapped', async () => {
    await renderScreen();
    const beat2 = screen.getByRole('button', { name: 'Beat 2: normal' });
    fireEvent.click(beat2);
    expect(screen.getByRole('button', { name: 'Beat 2: ghost' })).toBeTruthy();
  });

  it('lights the LED of the pulse being played', async () => {
    const { engine } = await renderScreen();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    });
    await act(async () => {
      engine.emit({ pulse: 1, sub: 0 });
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(screen.getByRole('button', { name: 'Beat 2: normal' }).getAttribute('data-active')).toBe('true');
    expect(screen.getByRole('button', { name: 'Beat 1: accent' }).getAttribute('data-active')).toBe('false');
  });

  it('sets tempo from taps', async () => {
    const now = vi.spyOn(performance, 'now');
    await renderScreen();
    const tap = screen.getByRole('button', { name: 'Tap tempo' });
    now.mockReturnValue(1000);
    fireEvent.click(tap);
    now.mockReturnValue(1600);
    fireEvent.click(tap);
    expect(bpm()).toBe('100');
    now.mockRestore();
  });

  it('saves settings for next time (debounced)', async () => {
    const { repo } = await renderScreen();
    fireEvent.click(screen.getByRole('button', { name: 'Increase tempo by 1' }));
    await waitFor(() => expect(repo.saveLast).toHaveBeenLastCalledWith(expect.objectContaining({ bpm: 121 })), {
      timeout: 1500,
    });
  });
});
