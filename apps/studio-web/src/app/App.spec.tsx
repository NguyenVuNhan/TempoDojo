import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { PracticeEvent } from '@tempodojo/core-practice';
import type { KvRepository } from '@tempodojo/storage';
import { FakeEngine, MemoryRepo } from '../metronome/test-utils';
import { App, type AppDeps } from './app';

class MemoryKv implements KvRepository {
  rows = new Map<string, unknown>();
  set = vi.fn(async (key: string, value: unknown) => {
    this.rows.set(key, value);
  });
  async get<T = unknown>(key: string): Promise<T | undefined> {
    return this.rows.get(key) as T | undefined;
  }
}

const setup = (lastTab?: string) => {
  const kv = new MemoryKv();
  if (lastTab) kv.rows.set('lastTab', lastTab);
  const events: PracticeEvent[] = [];
  const deps: AppDeps = {
    engine: new FakeEngine(),
    presets: new MemoryRepo(),
    kv,
    events: { add: vi.fn(async (e: PracticeEvent) => void events.push(e)) },
  };
  render(<App deps={deps} />);
  return { deps, kv, events, engine: deps.engine as FakeEngine };
};

const tab = (name: string) => screen.getByRole('tab', { name });

describe('App shell', () => {
  it('opens on Today with three tabs in order', async () => {
    setup();
    const tabs = await screen.findAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['Today', 'Ladder', 'Metro']);
    expect(tab('Today').getAttribute('aria-selected')).toBe('true');
    expect(tab('Metro').getAttribute('aria-selected')).toBe('false');
    expect(screen.getByRole('tablist').getAttribute('aria-label')).toBe('Sections');
    expect(screen.getByRole('tabpanel', { name: 'Today' })).toBeTruthy();
    expect(screen.queryByTestId('bpm-readout')).toBeNull();
  });

  it('shows the metronome on Metro and remembers the tab', async () => {
    const { kv } = setup();
    fireEvent.click(await screen.findByRole('tab', { name: 'Metro' }));
    expect(tab('Metro').getAttribute('aria-selected')).toBe('true');
    expect(tab('Today').getAttribute('aria-selected')).toBe('false');
    expect(screen.getByRole('tabpanel', { name: 'Metro' })).toBeTruthy();
    expect(screen.getByTestId('bpm-readout')).toBeTruthy();
    await waitFor(() => expect(kv.set).toHaveBeenCalledWith('lastTab', 'metro'));
  });

  it('restores the last tab', async () => {
    setup('ladder');
    await waitFor(() => expect(tab('Ladder').getAttribute('aria-selected')).toBe('true'));
    expect(screen.getByRole('tabpanel', { name: 'Ladder' })).toBeTruthy();
  });

  it('ignores an unknown stored tab', async () => {
    setup('songs');
    await new Promise((r) => setTimeout(r, 20));
    expect(tab('Today').getAttribute('aria-selected')).toBe('true');
  });

  it('logs play and stop from the metronome', async () => {
    const { events } = setup('metro');
    const play = await screen.findByRole('button', { name: 'Play' });
    await act(async () => fireEvent.click(play));
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    await waitFor(() => expect(events.map((e) => [e.type, e.source.kind])).toEqual([
      ['play', 'metronome'],
      ['stop', 'metronome'],
    ]));
  });

  it('switching tabs while playing stops the click and logs the stop', async () => {
    const { engine, events } = setup('metro');
    await act(async () => fireEvent.click(await screen.findByRole('button', { name: 'Play' })));
    engine.stop.mockClear();
    fireEvent.click(tab('Today'));
    expect(engine.stop).toHaveBeenCalled();
    await waitFor(() => expect(events.map((e) => e.type)).toEqual(['play', 'stop']));
  });

  it('arrow keys move between tabs', async () => {
    setup();
    const today = await screen.findByRole('tab', { name: 'Today' });
    today.focus();
    fireEvent.keyDown(today, { key: 'ArrowRight' });
    expect(tab('Ladder').getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(tab('Ladder'));
    fireEvent.keyDown(tab('Ladder'), { key: 'ArrowLeft' });
    fireEvent.keyDown(tab('Today'), { key: 'ArrowLeft' });
    expect(tab('Metro').getAttribute('aria-selected')).toBe('true');
  });
});
