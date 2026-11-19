import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { exerciseById } from '@tempodojo/core-ladder';
import type { Song } from '@tempodojo/core-songlab';
import { NotationError } from '@tempodojo/notation';
import { GpPlayerScreen } from './GpPlayerScreen';
import { fakeFactories, songRow, storedFile } from './test-utils';
import type { SongLibrary } from './types';

const fakeLibrary = (song: Song): SongLibrary => ({
  loaded: true,
  songs: [song],
  importFile: vi.fn(),
  addYoutube: vi.fn(),
  update: vi.fn(async () => undefined),
  remove: vi.fn(),
  touch: vi.fn(async () => undefined),
  file: vi.fn(async () => storedFile('f-a', 'bib.gp', [4, 5, 6])),
});

const setup = async (patch: Partial<Song> = {}) => {
  const song = songRow('a', { title: 'Back in Black', ...patch });
  const library = fakeLibrary(song);
  const f = fakeFactories();
  const onBack = vi.fn();
  const onTransport = vi.fn();
  const onOpenExercise = vi.fn();
  const r = render(
    <GpPlayerScreen
      song={song}
      library={library}
      players={f.factories}
      exercises={[exerciseById('pas-16')!]}
      onBack={onBack}
      onOpenExercise={onOpenExercise}
      onTransport={onTransport}
    />,
  );
  await waitFor(() => expect(f.notation.load).toHaveBeenCalled());
  await screen.findByText('Bar 1 of 40');
  return { ...f, song, library, onBack, onTransport, onOpenExercise, unmount: r.unmount };
};

const percent = () => screen.getByTestId('song-percent').textContent;

describe('GpPlayerScreen', () => {
  it('loads the stored file and shows the song', async () => {
    const { notation, library } = await setup();
    expect(library.file).toHaveBeenCalledWith('f-a');
    expect([...notation.load.mock.calls[0][0]]).toEqual([4, 5, 6]);
    expect(screen.getByRole('heading', { level: 1, name: 'Back in Black' })).toBeTruthy();
    expect(screen.getByText('94 BPM in the file')).toBeTruthy();
    expect(library.touch).toHaveBeenCalledWith('a');
    expect(notation.setCountIn).toHaveBeenLastCalledWith(true);
    expect(notation.setMetronome).toHaveBeenLastCalledWith(false);
    expect(notation.setPercent).toHaveBeenLastCalledWith(100);
  });

  it('starts at the last tempo and nudges within 25–150 %', async () => {
    const { notation } = await setup({ lastPercent: 148 });
    expect(percent()).toBe('148 %');
    fireEvent.click(screen.getByRole('button', { name: 'Faster by 5 %' }));
    expect(percent()).toBe('150 %');
    expect(notation.setPercent).toHaveBeenLastCalledWith(150);
    for (let i = 0; i < 30; i++) fireEvent.click(screen.getByRole('button', { name: 'Slower by 5 %' }));
    expect(percent()).toBe('25 %');
    fireEvent.click(screen.getByRole('button', { name: 'Faster by 1 %' }));
    expect(percent()).toBe('26 %');
  });

  it('loops the chosen bars, ordered and clamped', async () => {
    const { notation } = await setup();
    fireEvent.change(screen.getByRole('spinbutton', { name: 'From bar' }), { target: { value: '12' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'To bar' }), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Loop' }));
    expect(notation.setLoop).toHaveBeenLastCalledWith({ startBar: 4, endBar: 12 });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'To bar' }), { target: { value: '99' } });
    expect(notation.setLoop).toHaveBeenLastCalledWith({ startBar: 12, endBar: 40 });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Loop' }));
    expect(notation.setLoop).toHaveBeenLastCalledWith(null);
  });

  it('the loop trainer speeds up on each pass and is saved with the song', async () => {
    const { notation, library } = await setup();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Loop trainer' }));
    expect(library.update).toHaveBeenLastCalledWith(expect.objectContaining({ trainer: { startPercent: 60, targetPercent: 100, stepPercent: 5, everyPasses: 2 } }));
    expect(notation.setPercent).toHaveBeenLastCalledWith(60);
    expect(percent()).toBe('60 %');
    act(() => notation.emitLoopPass());
    act(() => notation.emitLoopPass());
    expect(notation.setPercent).toHaveBeenLastCalledWith(65);
    expect(percent()).toBe('65 %');
    expect(screen.getByText('Pass 3')).toBeTruthy();
  });

  it('follows the cursor bar', async () => {
    const { notation } = await setup();
    act(() => notation.emitBar(17));
    expect(screen.getByText('Bar 17 of 40')).toBeTruthy();
  });

  it('mutes and solos tracks, drums listed first', async () => {
    const { notation } = await setup();
    fireEvent.click(screen.getByRole('button', { name: 'Tracks' }));
    const dialog = await screen.findByRole('dialog', { name: 'Tracks' });
    expect(within(dialog).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['Drums', 'Guitar', 'Bass']);
    fireEvent.click(within(dialog).getByRole('checkbox', { name: 'Mute Drums' }));
    expect(notation.setTrackMute).toHaveBeenLastCalledWith(2, true);
    fireEvent.click(within(dialog).getByRole('checkbox', { name: 'Solo Guitar' }));
    expect(notation.setTrackSolo).toHaveBeenLastCalledWith(0, true);
  });

  it('count-in and click toggles', async () => {
    const { notation } = await setup();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Count-in' }));
    expect(notation.setCountIn).toHaveBeenLastCalledWith(false);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Click' }));
    expect(notation.setMetronome).toHaveBeenLastCalledWith(true);
  });

  it('play and stop drive the player and the practice log', async () => {
    const { notation, onTransport } = await setup();
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    expect(notation.play).toHaveBeenCalled();
    expect(onTransport).toHaveBeenLastCalledWith('play', { kind: 'song', songId: 'a' });
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    expect(notation.stop).toHaveBeenCalled();
    expect(onTransport).toHaveBeenLastCalledWith('stop', { kind: 'song', songId: 'a' });
  });

  it('a section loops its bars', async () => {
    const { notation } = await setup({ sections: [{ id: 's', name: 'Fill', range: { kind: 'bars', startBar: 16, endBar: 16 }, bestCleanPercent: null, exerciseId: null, fromFile: false }] });
    fireEvent.click(screen.getByRole('button', { name: 'Sections' }));
    const dialog = await screen.findByRole('dialog', { name: 'Sections' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Loop' }));
    expect(notation.setLoop).toHaveBeenLastCalledWith({ startBar: 16, endBar: 16 });
    expect(screen.getByRole('checkbox', { name: 'Loop' })).toHaveProperty('checked', true);
  });

  it('leaving stops, saves the tempo and releases the player', async () => {
    const { notation, library, unmount, onBack, onTransport } = await setup();
    fireEvent.click(screen.getByRole('button', { name: 'Slower by 5 %' }));
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalled();
    unmount();
    expect(onTransport).toHaveBeenLastCalledWith('stop', { kind: 'song', songId: 'a' });
    expect(library.update).toHaveBeenLastCalledWith(expect.objectContaining({ lastPercent: 95 }));
    expect(notation.destroy).toHaveBeenCalled();
  });

  it('explains a file that will not open', async () => {
    const song = songRow('a');
    const f = fakeFactories();
    f.notation.load.mockRejectedValueOnce(new NotationError('unreadable'));
    render(<GpPlayerScreen song={song} library={fakeLibrary(song)} players={f.factories} exercises={[]} onBack={vi.fn()} onOpenExercise={vi.fn()} />);
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'This file could not be opened as a Guitar Pro or MusicXML score.');
  });
});

describe('GpPlayerScreen keys', () => {
  it('Space plays and stops; arrows nudge the tempo, Shift for 5 %', async () => {
    const { notation } = await setup();
    fireEvent.keyDown(window, { key: ' ' });
    expect(notation.play).toHaveBeenCalled();
    fireEvent.keyDown(window, { key: 'PageDown' });
    expect(notation.stop).toHaveBeenCalled();
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    expect(percent()).toBe('101 %');
    fireEvent.keyDown(window, { key: 'ArrowUp', shiftKey: true });
    expect(percent()).toBe('106 %');
    fireEvent.keyDown(window, { key: 'ArrowDown', shiftKey: true });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(percent()).toBe('100 %');
  });

  it('keys ignore inputs', async () => {
    const { notation } = await setup();
    const from = screen.getByRole('spinbutton', { name: 'From bar' });
    from.focus();
    fireEvent.keyDown(from, { key: ' ' });
    fireEvent.keyDown(from, { key: 'ArrowUp' });
    expect(notation.play).not.toHaveBeenCalled();
    expect(percent()).toBe('100 %');
  });
});
