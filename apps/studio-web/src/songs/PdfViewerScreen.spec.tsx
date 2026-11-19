import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Song } from '@tempodojo/core-songlab';
import type { KvRepository } from '@tempodojo/storage';
import { PdfViewerScreen } from './PdfViewerScreen';
import { fakeFactories, songRow, storedFile } from './test-utils';
import type { SongLibrary } from './types';

class MemoryKv implements KvRepository {
  rows = new Map<string, unknown>();
  set = vi.fn(async (k: string, v: unknown) => void this.rows.set(k, v));
  async get<T = unknown>(k: string) {
    return this.rows.get(k) as T | undefined;
  }
}

const setup = async (patch: Partial<Song> = {}, lastPage?: number) => {
  const song = songRow('p', { title: 'Aja chart', kind: 'pdf', fileId: 'f-p', fileName: 'aja.pdf', ...patch });
  const library: SongLibrary = {
    loaded: true,
    songs: [song],
    importFile: vi.fn(),
    addYoutube: vi.fn(),
    update: vi.fn(async () => undefined),
    remove: vi.fn(),
    touch: vi.fn(async () => undefined),
    file: vi.fn(async () => storedFile('f-p', 'aja.pdf', [37, 80, 68, 70])),
  };
  const kv = new MemoryKv();
  if (lastPage) kv.rows.set('pdfPage:p', lastPage);
  const f = fakeFactories({ pdfPages: 3 });
  const onTransport = vi.fn();
  render(<PdfViewerScreen song={song} library={library} players={f.factories} kv={kv} onBack={vi.fn()} onTransport={onTransport} />);
  await waitFor(() => expect(f.pdf.renderPage).toHaveBeenCalled());
  return { ...f, song, library, kv, onTransport };
};

const lastRendered = (pdf: ReturnType<typeof fakeFactories>['pdf']) => pdf.renderPage.mock.calls.at(-1)?.[0];

describe('PdfViewerScreen', () => {
  it('opens the stored PDF on page 1', async () => {
    const { pdf, factories } = await setup();
    expect([...(factories.pdf as ReturnType<typeof vi.fn>).mock.calls[0][0]]).toEqual([37, 80, 68, 70]);
    expect(lastRendered(pdf)).toBe(1);
    expect(screen.getByText('Page 1 of 3')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1, name: 'Aja chart' })).toBeTruthy();
  });

  it('turns pages with the buttons, within bounds', async () => {
    const { pdf, kv } = await setup();
    expect(screen.getByRole('button', { name: 'Previous page' })).toHaveProperty('disabled', true);
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() => expect(lastRendered(pdf)).toBe(2));
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() => expect(screen.getByText('Page 3 of 3')).toBeTruthy());
    expect(screen.getByRole('button', { name: 'Next page' })).toHaveProperty('disabled', true);
    expect(kv.set).toHaveBeenLastCalledWith('pdfPage:p', 3);
  });

  it('page-turner keys work', async () => {
    const { pdf } = await setup();
    fireEvent.keyDown(window, { key: 'PageDown' });
    await waitFor(() => expect(lastRendered(pdf)).toBe(2));
    fireEvent.keyDown(window, { key: ' ' });
    await waitFor(() => expect(lastRendered(pdf)).toBe(3));
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    await waitFor(() => expect(lastRendered(pdf)).toBe(2));
    fireEvent.keyDown(window, { key: 'PageUp' });
    await waitFor(() => expect(screen.getByText('Page 1 of 3')).toBeTruthy());
  });

  it('tapping the right or left part of the page turns it', async () => {
    const { pdf } = await setup();
    fireEvent.click(screen.getByRole('button', { name: 'Next page (right side of the page)' }));
    await waitFor(() => expect(lastRendered(pdf)).toBe(2));
    fireEvent.click(screen.getByRole('button', { name: 'Previous page (left side of the page)' }));
    await waitFor(() => expect(lastRendered(pdf)).toBe(1));
  });

  it('reopens on the last page read', async () => {
    const { pdf } = await setup({}, 3);
    await waitFor(() => expect(lastRendered(pdf)).toBe(3));
  });

  it('pairs a YouTube video for audio', async () => {
    const { library, factories } = await setup();
    fireEvent.click(screen.getByRole('button', { name: 'Pair a YouTube video' }));
    fireEvent.change(await screen.findByRole('textbox', { name: 'Link' }), { target: { value: 'https://vimeo.com/1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Pair video' }));
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'That is not a YouTube link.');
    fireEvent.change(screen.getByRole('textbox', { name: 'Link' }), { target: { value: 'https://youtu.be/dQw4w9WgXcQ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Pair video' }));
    await waitFor(() => expect(library.update).toHaveBeenLastCalledWith(expect.objectContaining({ youtubeId: 'dQw4w9WgXcQ' })));
    await waitFor(() => expect(factories.video).toHaveBeenCalledWith(expect.any(HTMLElement), 'dQw4w9WgXcQ'));
  });

  it('a paired video plays with the page and logs the song', async () => {
    const { video, onTransport } = await setup({ youtubeId: 'dQw4w9WgXcQ' });
    fireEvent.click(await screen.findByRole('button', { name: 'Play' }));
    expect(video.play).toHaveBeenCalled();
    expect(onTransport).toHaveBeenLastCalledWith('play', { kind: 'song', songId: 'p' });
  });
});
