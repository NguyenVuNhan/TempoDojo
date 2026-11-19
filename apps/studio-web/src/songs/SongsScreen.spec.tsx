import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { Song } from '@tempodojo/core-songlab';
import { SongsScreen } from './SongsScreen';
import { fakeFactories, memorySongRepos, songRow } from './test-utils';
import type { SongRepos } from './types';
import { useSongs } from './useSongs';

function Harness({ repos, probe, onOpen, confirm }: { repos: SongRepos; probe: ReturnType<typeof fakeFactories>['factories']['probeScore']; onOpen: (s: Song) => void; confirm: (m: string) => boolean }) {
  const library = useSongs(repos, probe);
  return library.loaded ? <SongsScreen library={library} onOpen={onOpen} confirm={confirm} /> : null;
}

const setup = async (songs: Song[] = [], opts: Parameters<typeof fakeFactories>[0] = {}) => {
  const seed = memorySongRepos(songs);
  const f = fakeFactories(opts);
  const onOpen = vi.fn();
  const confirm = vi.fn(() => true);
  render(<Harness repos={seed.repos} probe={f.factories.probeScore} onOpen={onOpen} confirm={confirm} />);
  await screen.findByRole('heading', { level: 1, name: 'Songs' });
  return { ...seed, ...f, onOpen, confirm };
};

const pick = (label: string, name: string, content: BlobPart = new Uint8Array([1, 2])) =>
  fireEvent.change(screen.getByLabelText(label), { target: { files: [new File([content], name)] } });

describe('SongsScreen', () => {
  it('empty library explains what to add', async () => {
    await setup();
    expect(screen.getByText('Add a Guitar Pro file, a PDF or a YouTube link to practise along with a song.')).toBeTruthy();
    expect(screen.getByText('0 songs')).toBeTruthy();
  });

  it('lists songs with their kind, sections and last tempo, and opens one', async () => {
    const { onOpen } = await setup([
      songRow('a', { title: 'Back in Black', lastPercent: 80, lastOpenedAt: 5, sections: [{ id: 's', name: 'Intro', range: { kind: 'bars', startBar: 1, endBar: 4 }, bestCleanPercent: null, exerciseId: null, fromFile: true }] }),
      songRow('b', { title: 'Rosanna', kind: 'youtube', fileId: null, youtubeId: 'dQw4w9WgXcQ', lastOpenedAt: 1 }),
      songRow('c', { title: 'Aja chart', kind: 'pdf', lastOpenedAt: null }),
    ]);
    const list = screen.getByRole('list', { name: 'Songs' });
    const rows = within(list).getAllByRole('listitem');
    expect(rows.map((r) => r.querySelector('.song-title')?.textContent)).toEqual(['Back in Black', 'Rosanna', 'Aja chart']);
    expect(rows[0].querySelector('.song-meta')?.textContent).toBe('Guitar Pro · 1 section · Last 80 %');
    expect(rows[1].querySelector('.song-meta')?.textContent).toBe('YouTube · Last 100 %');
    expect(rows[2].querySelector('.song-meta')?.textContent).toBe('PDF');
    fireEvent.click(within(rows[1]).getByRole('button', { name: /^Rosanna/ }));
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 'b' }));
    expect(screen.getByText('3 songs')).toBeTruthy();
  });

  it('imports a Guitar Pro file from the picker', async () => {
    await setup();
    pick('Add Guitar Pro or MusicXML', 'bib.gp');
    await waitFor(() => expect(screen.getByText('Back in Black')).toBeTruthy());
  });

  it('shows why an import failed', async () => {
    await setup([], { score: 'unreadable' });
    pick('Add Guitar Pro or MusicXML', 'broken.gp');
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'This file could not be opened as a Guitar Pro or MusicXML score.');
    pick('Add PDF', 'notes.mp3');
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('TempoDojo opens Guitar Pro, MusicXML and PDF files.'));
  });

  it('adds a YouTube link from its sheet', async () => {
    await setup();
    fireEvent.click(screen.getByRole('button', { name: 'Add YouTube link' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add a YouTube video' });
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Link' }), { target: { value: 'https://vimeo.com/1' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add video' }));
    expect(await within(dialog).findByRole('alert')).toHaveProperty('textContent', 'That is not a YouTube link.');
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Link' }), { target: { value: 'https://youtu.be/dQw4w9WgXcQ' } });
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Title' }), { target: { value: 'Rosanna' } });
    fireEvent.change(within(dialog).getByRole('spinbutton', { name: 'Song BPM (optional)' }), { target: { value: '86' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add video' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByText('Rosanna')).toBeTruthy();
  });

  it('removes a song after confirming', async () => {
    const { confirm, songs } = await setup([songRow('a', { title: 'Back in Black' })]);
    fireEvent.click(screen.getByRole('button', { name: 'Remove Back in Black' }));
    expect(confirm).toHaveBeenCalledWith('Remove Back in Black and its file from this device?');
    await waitFor(() => expect(screen.queryByText('Back in Black')).toBeNull());
    expect(songs.rows.size).toBe(0);
  });

  it('keeps the song when the confirm is declined', async () => {
    const { confirm } = await setup([songRow('a', { title: 'Back in Black' })]);
    confirm.mockReturnValue(false);
    fireEvent.click(screen.getByRole('button', { name: 'Remove Back in Black' }));
    expect(screen.getByText('Back in Black')).toBeTruthy();
  });
});
