import type { ScoreInfo, Song } from '@tempodojo/core-songlab';
import { NotationError, type NotationPlayer, type TrackInfo } from '@tempodojo/notation';
import type { PdfDoc } from '@tempodojo/pdf';
import type { FileRepository, SongRepository, StoredFile } from '@tempodojo/storage';
import type { VideoPlayer } from '@tempodojo/youtube';
import type { PlayerFactories, SongRepos } from './types';

export class MemorySongs implements SongRepository {
  rows = new Map<string, Song>();
  constructor(private files: MemoryFiles) {}
  put = vi.fn(async (s: Song) => {
    this.rows.set(s.id, s);
  });
  async list() {
    return [...this.rows.values()].sort(
      (a, b) => (b.lastOpenedAt ?? -1) - (a.lastOpenedAt ?? -1) || b.createdAt - a.createdAt,
    );
  }
  async get(id: string) {
    return this.rows.get(id);
  }
  remove = vi.fn(async (id: string) => {
    const s = this.rows.get(id);
    this.rows.delete(id);
    if (s?.fileId) this.files.rows.delete(s.fileId);
  });
  async replaceAll(ss: Song[]) {
    this.rows = new Map(ss.map((s) => [s.id, s]));
  }
}

export class MemoryFiles implements FileRepository {
  rows = new Map<string, StoredFile>();
  put = vi.fn(async (f: StoredFile) => {
    this.rows.set(f.id, f);
  });
  async get(id: string) {
    return this.rows.get(id);
  }
  async remove(id: string) {
    this.rows.delete(id);
  }
  async all() {
    return [...this.rows.values()];
  }
  async replaceAll(fs: StoredFile[]) {
    this.rows = new Map(fs.map((f) => [f.id, f]));
  }
}

export function memorySongRepos(songs: Song[] = [], files: StoredFile[] = []) {
  const f = new MemoryFiles();
  files.forEach((x) => f.rows.set(x.id, x));
  const s = new MemorySongs(f);
  songs.forEach((x) => s.rows.set(x.id, x));
  const repos: SongRepos = { songs: s, files: f };
  return { repos, songs: s, files: f };
}

export const songRow = (id: string, patch: Partial<Song> = {}): Song => ({
  id,
  title: `Song ${id}`,
  kind: 'gp',
  fileId: `f-${id}`,
  fileName: `${id}.gp`,
  youtubeId: null,
  bpm: null,
  sections: [],
  lastPercent: 100,
  trainer: null,
  createdAt: 1,
  lastOpenedAt: null,
  ...patch,
});

export const storedFile = (id: string, name = `${id}.gp`, bytes: number[] = [1, 2, 3]): StoredFile => ({
  id,
  name,
  type: 'application/octet-stream',
  bytes: new Uint8Array(bytes),
  size: bytes.length,
  addedAt: 1,
});

/** Records every call; tests drive bar/playing/loop events with the emit helpers. */
export class FakeNotationPlayer implements NotationPlayer {
  info: ScoreInfo = { title: 'Back in Black', barCount: 40, tempo: 94, markers: [] };
  trackList: TrackInfo[] = [
    { index: 0, name: 'Guitar', isDrums: false },
    { index: 1, name: 'Bass', isDrums: false },
    { index: 2, name: 'Drums', isDrums: true },
  ];
  private bar = new Set<(bar: number) => void>();
  private playing = new Set<(p: boolean) => void>();
  private pass = new Set<() => void>();
  load = vi.fn(async (_bytes: Uint8Array) => this.info);
  tracks = () => this.trackList;
  play = vi.fn(() => this.emitPlaying(true));
  pause = vi.fn(() => this.emitPlaying(false));
  stop = vi.fn(() => this.emitPlaying(false));
  setPercent = vi.fn();
  setLoop = vi.fn();
  setCountIn = vi.fn();
  setMetronome = vi.fn();
  setTrackMute = vi.fn();
  setTrackSolo = vi.fn();
  showTracks = vi.fn();
  destroy = vi.fn();
  onBar(cb: (bar: number) => void) {
    this.bar.add(cb);
    return () => this.bar.delete(cb);
  }
  onPlaying(cb: (p: boolean) => void) {
    this.playing.add(cb);
    return () => this.playing.delete(cb);
  }
  onLoopPass(cb: () => void) {
    this.pass.add(cb);
    return () => this.pass.delete(cb);
  }
  emitBar(b: number) {
    this.bar.forEach((cb) => cb(b));
  }
  emitPlaying(p: boolean) {
    this.playing.forEach((cb) => cb(p));
  }
  emitLoopPass() {
    this.pass.forEach((cb) => cb());
  }
}

export class FakeVideoPlayer implements VideoPlayer {
  t = 0;
  length = 240;
  allowed = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
  ready = Promise.resolve();
  private playing = new Set<(p: boolean) => void>();
  play = vi.fn(() => this.playing.forEach((cb) => cb(true)));
  pause = vi.fn(() => this.playing.forEach((cb) => cb(false)));
  seek = vi.fn((sec: number) => {
    this.t = sec;
  });
  time = () => this.t;
  duration = () => this.length;
  setRate = vi.fn();
  rates = () => this.allowed;
  onPlaying(cb: (p: boolean) => void) {
    this.playing.add(cb);
    return () => this.playing.delete(cb);
  }
  destroy = vi.fn();
}

export class FakePdf implements PdfDoc {
  constructor(public pageCount = 3) {}
  renderPage = vi.fn(async (_page: number, _canvas: HTMLCanvasElement, _w: number) => undefined);
  destroy = vi.fn();
}

export function fakeFactories(opts: { score?: ScoreInfo | 'unreadable'; pdfPages?: number } = {}) {
  const notation = new FakeNotationPlayer();
  const video = new FakeVideoPlayer();
  const pdf = new FakePdf(opts.pdfPages ?? 3);
  const factories: PlayerFactories = {
    notation: vi.fn(() => notation),
    video: vi.fn(() => video),
    pdf: vi.fn(async () => pdf),
    probeScore: vi.fn(async () => {
      if (opts.score === 'unreadable') throw new NotationError('unreadable');
      return opts.score ?? notation.info;
    }),
  };
  return { factories, notation, video, pdf };
}
