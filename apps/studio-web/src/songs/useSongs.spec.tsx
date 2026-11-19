import { act, renderHook, waitFor } from '@testing-library/react';
import { fakeFactories, memorySongRepos, songRow, storedFile } from './test-utils';
import { SongImportError } from './types';
import { useSongs } from './useSongs';

let ids = 0;
const makeId = () => `id${++ids}`;
const fileOf = (name: string, bytes: number[] | string = [1, 2, 3]) =>
  new File([typeof bytes === 'string' ? bytes : new Uint8Array(bytes)], name);

const setup = async (opts: Parameters<typeof fakeFactories>[0] = {}, seed = memorySongRepos()) => {
  ids = 0;
  const f = fakeFactories(opts);
  const hook = renderHook(() => useSongs(seed.repos, f.factories.probeScore, () => 500, makeId));
  await waitFor(() => expect(hook.result.current.loaded).toBe(true));
  return { ...seed, ...f, hook };
};

const code = async (p: Promise<unknown>) => {
  try {
    await p;
    return 'resolved';
  } catch (e) {
    return e instanceof SongImportError ? e.code : `other: ${String(e)}`;
  }
};

describe('useSongs', () => {
  it('lists stored songs, last opened first', async () => {
    const seed = memorySongRepos([songRow('a', { lastOpenedAt: 10 }), songRow('b', { lastOpenedAt: 90 })]);
    const { hook } = await setup({}, seed);
    expect(hook.result.current.songs.map((s) => s.id)).toEqual(['b', 'a']);
  });

  it('imports a Guitar Pro file with its title, file and marker sections', async () => {
    const { hook, files } = await setup({
      score: { title: 'Back in Black', barCount: 20, tempo: 94, markers: [{ bar: 1, name: 'Intro' }, { bar: 9, name: 'Verse' }] },
    });
    let song;
    await act(async () => {
      song = await hook.result.current.importFile(fileOf('bib.gp5', [7, 8, 9]));
    });
    expect(song).toMatchObject({ title: 'Back in Black', kind: 'gp', fileName: 'bib.gp5', lastPercent: 100, createdAt: 500, lastOpenedAt: null });
    const stored = files.rows.get(song!.fileId!);
    expect([...stored!.bytes]).toEqual([7, 8, 9]);
    expect(stored).toMatchObject({ name: 'bib.gp5', size: 3, addedAt: 500 });
    expect(song!.sections.map((s) => [s.name, s.range])).toEqual([
      ['Intro', { kind: 'bars', startBar: 1, endBar: 8 }],
      ['Verse', { kind: 'bars', startBar: 9, endBar: 20 }],
    ]);
    expect(hook.result.current.songs).toHaveLength(1);
  });

  it('falls back to the file name when the score has no title', async () => {
    const { hook } = await setup({ score: { title: '', barCount: 4, tempo: 100, markers: [] } });
    let song;
    await act(async () => {
      song = await hook.result.current.importFile(fileOf('My Fill.musicxml'));
    });
    expect(song).toMatchObject({ title: 'My Fill', kind: 'gp' });
  });

  it('rejects an unreadable score and stores nothing', async () => {
    const { hook, files, songs } = await setup({ score: 'unreadable' });
    let result = '';
    await act(async () => {
      result = await code(hook.result.current.importFile(fileOf('broken.gp')));
    });
    expect(result).toBe('unreadable-score');
    expect(files.rows.size).toBe(0);
    expect(songs.rows.size).toBe(0);
  });

  it('imports a PDF titled from its file name, and refuses a fake one', async () => {
    const { hook, factories } = await setup();
    let song;
    await act(async () => {
      song = await hook.result.current.importFile(fileOf('Rosanna drums.pdf', '%PDF-1.7 rest'));
    });
    expect(song).toMatchObject({ title: 'Rosanna drums', kind: 'pdf', sections: [] });
    expect(factories.probeScore).not.toHaveBeenCalled();
    let result = '';
    await act(async () => {
      result = await code(hook.result.current.importFile(fileOf('fake.pdf', 'hello')));
    });
    expect(result).toBe('unreadable-pdf');
  });

  it('refuses other file types', async () => {
    const { hook } = await setup();
    let result = '';
    await act(async () => {
      result = await code(hook.result.current.importFile(fileOf('song.mp3')));
    });
    expect(result).toBe('unsupported');
  });

  it('adds a YouTube link with its BPM, and refuses other links', async () => {
    const { hook } = await setup();
    let song;
    await act(async () => {
      song = await hook.result.current.addYoutube({ url: 'https://youtu.be/dQw4w9WgXcQ?si=x', title: '  Rosanna (drum sheet) ', bpm: 86 });
    });
    expect(song).toMatchObject({ kind: 'youtube', youtubeId: 'dQw4w9WgXcQ', title: 'Rosanna (drum sheet)', bpm: 86, fileId: null });
    let blank;
    await act(async () => {
      blank = await hook.result.current.addYoutube({ url: 'youtube.com/watch?v=dQw4w9WgXcQ', title: '', bpm: null });
    });
    expect(blank).toMatchObject({ title: 'YouTube video' });
    let result = '';
    await act(async () => {
      result = await code(hook.result.current.addYoutube({ url: 'https://vimeo.com/1', title: 'x', bpm: null }));
    });
    expect(result).toBe('bad-youtube-link');
  });

  it('update, touch, remove and file', async () => {
    const seed = memorySongRepos([songRow('a')], [storedFile('f-a')]);
    const { hook, songs } = await setup({}, seed);
    await act(() => hook.result.current.update({ ...hook.result.current.songs[0], lastPercent: 80 }));
    expect(songs.rows.get('a')?.lastPercent).toBe(80);
    await act(() => hook.result.current.touch('a'));
    expect(songs.rows.get('a')?.lastOpenedAt).toBe(500);
    expect((await hook.result.current.file('f-a'))?.name).toBe('f-a.gp');
    await act(() => hook.result.current.remove('a'));
    expect(hook.result.current.songs).toEqual([]);
    expect(songs.remove).toHaveBeenCalledWith('a');
  });
});
