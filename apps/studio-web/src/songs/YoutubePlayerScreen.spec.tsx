import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Song } from '@tempodojo/core-songlab';
import { FakeEngine } from '../metronome/test-utils';
import { fakeFactories, songRow } from './test-utils';
import type { SongLibrary } from './types';
import { YoutubePlayerScreen } from './YoutubePlayerScreen';

const fakeLibrary = (song: Song): SongLibrary => ({
  loaded: true,
  songs: [song],
  importFile: vi.fn(),
  addYoutube: vi.fn(),
  update: vi.fn(async () => undefined),
  remove: vi.fn(),
  touch: vi.fn(async () => undefined),
  file: vi.fn(async () => undefined),
});

const setup = async (patch: Partial<Song> = {}, allowed?: number[]) => {
  const song = songRow('y', { title: 'Rosanna', kind: 'youtube', fileId: null, fileName: null, youtubeId: 'dQw4w9WgXcQ', ...patch });
  const library = fakeLibrary(song);
  const f = fakeFactories();
  if (allowed) f.video.allowed = allowed;
  const engine = new FakeEngine();
  const onTransport = vi.fn();
  const r = render(
    <YoutubePlayerScreen
      song={song}
      library={library}
      players={f.factories}
      engine={engine}
      exercises={[]}
      onBack={vi.fn()}
      onOpenExercise={vi.fn()}
      onTransport={onTransport}
      pollMs={10}
    />,
  );
  await screen.findByRole('radiogroup', { name: 'Speed' });
  return { ...f, song, library, engine, onTransport, unmount: r.unmount };
};

describe('YoutubePlayerScreen', () => {
  it('opens the video and shows the song', async () => {
    const { factories } = await setup();
    expect(factories.video).toHaveBeenCalledWith(expect.any(HTMLElement), 'dQw4w9WgXcQ');
    expect(screen.getByRole('heading', { level: 1, name: 'Rosanna' })).toBeTruthy();
  });

  it('sets A and B from the video time, in order', async () => {
    const { video } = await setup();
    video.t = 92.4;
    fireEvent.click(screen.getByRole('button', { name: 'Set A' }));
    video.t = 65;
    fireEvent.click(screen.getByRole('button', { name: 'Set B' }));
    expect(screen.getByText('A 1:05 · B 1:32')).toBeTruthy();
  });

  it('reaching B jumps back to A and counts the pass', async () => {
    const { video } = await setup();
    video.t = 65;
    fireEvent.click(screen.getByRole('button', { name: 'Set A' }));
    video.t = 92;
    fireEvent.click(screen.getByRole('button', { name: 'Set B' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Loop A to B' }));
    video.t = 92.1;
    await waitFor(() => expect(video.seek).toHaveBeenLastCalledWith(65));
    expect(screen.getByText('Pass 2')).toBeTruthy();
  });

  it('offers only the speeds the video allows and remembers the choice', async () => {
    const { video, library } = await setup({}, [0.5, 1, 1.5]);
    expect(screen.getAllByRole('radio').map((r) => r.closest('label')?.textContent)).toEqual(['0.5×', '1×', '1.5×']);
    expect(screen.getByRole('radio', { name: '1×' })).toHaveProperty('checked', true);
    fireEvent.click(screen.getByRole('radio', { name: '0.5×' }));
    expect(video.setRate).toHaveBeenLastCalledWith(0.5);
    expect(library.update).toHaveBeenLastCalledWith(expect.objectContaining({ lastPercent: 50 }));
  });

  it('count-in needs the song BPM', async () => {
    const { library } = await setup();
    expect(screen.getByRole('checkbox', { name: 'Count-in' })).toHaveProperty('disabled', true);
    expect(screen.getByText("Add the song's BPM to count in.")).toBeTruthy();
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Song BPM' }), { target: { value: '86' } });
    fireEvent.blur(screen.getByRole('spinbutton', { name: 'Song BPM' }));
    expect(library.update).toHaveBeenLastCalledWith(expect.objectContaining({ bpm: 86 }));
    expect(screen.getByRole('checkbox', { name: 'Count-in' })).toHaveProperty('disabled', false);
  });

  it('with a BPM, each pass counts in one bar on the click before the video plays', async () => {
    const { video, engine } = await setup({ bpm: 100, lastPercent: 50 });
    video.t = 10;
    fireEvent.click(screen.getByRole('button', { name: 'Set A' }));
    video.t = 20;
    fireEvent.click(screen.getByRole('button', { name: 'Set B' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Loop A to B' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Count-in' }));
    video.play.mockClear();
    video.t = 20.05;
    await waitFor(() => expect(engine.start).toHaveBeenCalled());
    expect(video.pause).toHaveBeenCalled();
    expect(video.seek).toHaveBeenLastCalledWith(10);
    expect(engine.start.mock.calls[0][0]).toMatchObject({ bpm: 50, subdivision: 1, countInBars: 0, meter: { beatsPerBar: 4 } });
    expect(video.play).not.toHaveBeenCalled();
    act(() => engine.emit({ bar: 1, pulse: 0, sub: 0 }));
    expect(engine.stop).toHaveBeenCalled();
    expect(video.play).toHaveBeenCalled();
  });

  it('the loop trainer steps the speed per pass, snapped to allowed rates', async () => {
    const { video } = await setup({ trainer: { startPercent: 50, targetPercent: 100, stepPercent: 25, everyPasses: 1 } });
    expect(video.setRate).toHaveBeenLastCalledWith(0.5);
    video.t = 1;
    fireEvent.click(screen.getByRole('button', { name: 'Set A' }));
    video.t = 5;
    fireEvent.click(screen.getByRole('button', { name: 'Set B' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Loop A to B' }));
    video.t = 5.5;
    await waitFor(() => expect(video.setRate).toHaveBeenLastCalledWith(0.75));
  });

  it('play and stop drive the video and the practice log; leaving stops', async () => {
    const { video, onTransport, unmount } = await setup();
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    expect(video.play).toHaveBeenCalled();
    expect(onTransport).toHaveBeenLastCalledWith('play', { kind: 'song', songId: 'y' });
    unmount();
    expect(onTransport).toHaveBeenLastCalledWith('stop', { kind: 'song', songId: 'y' });
    expect(video.destroy).toHaveBeenCalled();
  });
});
