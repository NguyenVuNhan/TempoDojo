import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { PracticeEvent } from '@tempodojo/core-practice';
import type { KvRepository } from '@tempodojo/storage';
import { memoryLadderRepos } from '../ladder/test-utils';
import { FakeEngine, MemoryRepo } from '../metronome/test-utils';
import { fakeFactories, memorySongRepos, songRow, storedFile } from '../songs/test-utils';
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
  const songRepos = memorySongRepos(
    [songRow('a', { title: 'Back in Black', lastOpenedAt: 3 }), songRow('y', { title: 'Rosanna', kind: 'youtube', fileId: null, youtubeId: 'dQw4w9WgXcQ', lastOpenedAt: 2 })],
    [storedFile('f-a')],
  );
  const players = fakeFactories();
  if (lastTab) kv.rows.set('lastTab', lastTab);
  const events: PracticeEvent[] = [];
  const { repos } = memoryLadderRepos();
  const deps: AppDeps = {
    engine: new FakeEngine(),
    presets: new MemoryRepo(),
    kv,
    events: {
      add: vi.fn(async (e: PracticeEvent) => void events.push(e)),
      all: async () => [...events],
      since: async (at: number) => events.filter((e) => e.at >= at),
      replaceAll: async () => undefined,
    },
    progress: repos.progress,
    prefs: repos.prefs,
    songs: songRepos.songs,
    files: songRepos.files,
    players: players.factories,
  };
  render(<App deps={deps} />);
  return { deps, kv, events, engine: deps.engine as FakeEngine, players };
};

const tab = (name: string) => screen.getByRole('tab', { name });

describe('App shell', () => {
  it('opens on Today with four tabs in order', async () => {
    setup();
    const tabs = await screen.findAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['Today', 'Ladder', 'Songs', 'Metro']);
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
    setup('drums');
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
    const play = await screen.findByRole('button', { name: 'Play' });
    await act(async () => fireEvent.click(play));
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

  it('opens an exercise from the ladder and returns to the list', async () => {
    setup('ladder');
    fireEvent.click(await screen.findByRole('button', { name: /^Single Paradiddle(?!-)/ }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Single Paradiddle' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(await screen.findByRole('heading', { name: 'Tier 1' })).toBeTruthy();
  });

  it('an exercise play is logged with its source, and switching tabs closes it', async () => {
    const { events } = setup('ladder');
    fireEvent.click(await screen.findByRole('button', { name: /^Single Paradiddle(?!-)/ }));
    const play = await screen.findByRole('button', { name: 'Play' });
    await act(async () => fireEvent.click(play));
    fireEvent.click(tab('Today'));
    await waitFor(() => expect(events.map((e) => [e.type, e.source.kind])).toEqual([['play', 'exercise'], ['stop', 'exercise']]));
    expect(await screen.findByRole('heading', { level: 1, name: 'This week' })).toBeTruthy();
  });

  it('Songs lists the library and opens each song in its player', async () => {
    const { players } = setup('songs');
    fireEvent.click(await screen.findByRole('button', { name: /^Back in Black/ }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Back in Black' })).toBeTruthy();
    await waitFor(() => expect(players.notation.load).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    fireEvent.click(await screen.findByRole('button', { name: /^Rosanna/ }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Rosanna' })).toBeTruthy();
    expect(players.factories.video).toHaveBeenCalledWith(expect.any(HTMLElement), 'dQw4w9WgXcQ');
  });

  it('song practice is logged with the song as its source', async () => {
    const { events } = setup('songs');
    fireEvent.click(await screen.findByRole('button', { name: /^Back in Black/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Play' }));
    fireEvent.click(tab('Today'));
    await waitFor(() => expect(events.map((e) => [e.type, e.source])).toEqual([
      ['play', { kind: 'song', songId: 'a' }],
      ['stop', { kind: 'song', songId: 'a' }],
    ]));
  });
});
