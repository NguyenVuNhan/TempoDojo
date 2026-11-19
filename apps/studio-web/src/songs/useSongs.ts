import { useCallback, useEffect, useRef, useState } from 'react';
import { parseYoutubeId, sectionsFromMarkers, type ScoreInfo, type Song, type SongKind } from '@tempodojo/core-songlab';
import { readBytes } from '../platform/readBytes';
import { SongImportError, type PlayerFactories, type SongLibrary, type SongRepos } from './types';

const SCORE_EXTENSIONS = new Set(['gp', 'gp3', 'gp4', 'gp5', 'gpx', 'gp7', 'xml', 'musicxml', 'mxl']);

function sortSongs(list: Song[]): Song[] {
  return [...list].sort((a, b) => {
    if (a.lastOpenedAt !== b.lastOpenedAt) {
      if (a.lastOpenedAt === null) return 1;
      if (b.lastOpenedAt === null) return -1;
      return b.lastOpenedAt - a.lastOpenedAt;
    }
    return b.createdAt - a.createdAt;
  });
}

function splitFileName(name: string): { base: string; ext: string } {
  const dot = name.lastIndexOf('.');
  if (dot < 0) return { base: name, ext: '' };
  return {
    base: dot > 0 ? name.slice(0, dot) : name,
    ext: name.slice(dot + 1).toLowerCase(),
  };
}

function isPdfHeader(bytes: Uint8Array): boolean {
  return bytes.length >= 4 && bytes[0] === 37 && bytes[1] === 80 && bytes[2] === 68 && bytes[3] === 70;
}

/** Manages the persisted song library, file imports, YouTube links, and sort order. */
export function useSongs(
  repos: SongRepos,
  probe: PlayerFactories['probeScore'],
  now: () => number = Date.now,
  makeId: () => string = () => crypto.randomUUID(),
): SongLibrary {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loaded, setLoaded] = useState(false);

  const songsRef = useRef(songs);
  songsRef.current = songs;
  const nowRef = useRef(now);
  nowRef.current = now;
  const makeIdRef = useRef(makeId);
  makeIdRef.current = makeId;
  const probeRef = useRef(probe);
  probeRef.current = probe;

  useEffect(() => {
    let cancelled = false;
    repos.songs.list().then((list) => {
      if (cancelled) return;
      setSongs(sortSongs(list));
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [repos]);

  const importFile = useCallback(
    async (file: File): Promise<Song> => {
      const { base, ext } = splitFileName(file.name);
      let kind: SongKind;
      if (SCORE_EXTENSIONS.has(ext)) {
        kind = 'gp';
      } else if (ext === 'pdf') {
        kind = 'pdf';
      } else {
        throw new SongImportError('unsupported');
      }

      const bytes = await readBytes(file);
      let info: ScoreInfo | null = null;

      if (kind === 'gp') {
        try {
          info = await probeRef.current(bytes);
        } catch {
          throw new SongImportError('unreadable-score');
        }
      } else if (!isPdfHeader(bytes)) {
        throw new SongImportError('unreadable-pdf');
      }

      const nextId = makeIdRef.current;
      const fileId = nextId();
      const songId = nextId();
      const sections = info ? sectionsFromMarkers(info, nextId) : [];
      const title = info && info.title.trim() ? info.title : base;
      const timestamp = nowRef.current();

      await repos.files.put({
        id: fileId,
        name: file.name,
        type: file.type || 'application/octet-stream',
        bytes,
        size: bytes.length,
        addedAt: timestamp,
      });

      const song: Song = {
        id: songId,
        title,
        kind,
        fileId,
        fileName: file.name,
        youtubeId: null,
        bpm: null,
        sections,
        lastPercent: 100,
        trainer: null,
        createdAt: timestamp,
        lastOpenedAt: null,
      };

      await repos.songs.put(song);
      setSongs((prev) => sortSongs([...prev, song]));
      return song;
    },
    [repos],
  );

  const addYoutube = useCallback(
    async (input: { url: string; title: string; bpm: number | null }): Promise<Song> => {
      const youtubeId = parseYoutubeId(input.url);
      if (!youtubeId) {
        throw new SongImportError('bad-youtube-link');
      }

      const title = input.title.trim() || 'YouTube video';
      const bpm =
        input.bpm !== null && Number.isFinite(input.bpm) && input.bpm > 0
          ? Math.round(input.bpm)
          : null;

      const song: Song = {
        id: makeIdRef.current(),
        title,
        kind: 'youtube',
        fileId: null,
        fileName: null,
        youtubeId,
        bpm,
        sections: [],
        lastPercent: 100,
        trainer: null,
        createdAt: nowRef.current(),
        lastOpenedAt: null,
      };

      await repos.songs.put(song);
      setSongs((prev) => sortSongs([...prev, song]));
      return song;
    },
    [repos],
  );

  const update = useCallback(
    async (song: Song): Promise<void> => {
      await repos.songs.put(song);
      setSongs((prev) => sortSongs(prev.map((s) => (s.id === song.id ? song : s))));
    },
    [repos],
  );

  const touch = useCallback(
    async (id: string): Promise<void> => {
      const existing = songsRef.current.find((s) => s.id === id) ?? (await repos.songs.get(id));
      if (!existing) return;
      const updated: Song = { ...existing, lastOpenedAt: nowRef.current() };
      await repos.songs.put(updated);
      setSongs((prev) => sortSongs(prev.map((s) => (s.id === id ? updated : s))));
    },
    [repos],
  );

  const remove = useCallback(
    async (id: string): Promise<void> => {
      await repos.songs.remove(id);
      setSongs((prev) => prev.filter((s) => s.id !== id));
    },
    [repos],
  );

  const file = useCallback((id: string) => repos.files.get(id), [repos]);

  return {
    loaded,
    songs,
    importFile,
    addYoutube,
    update,
    remove,
    touch,
    file,
  };
}
