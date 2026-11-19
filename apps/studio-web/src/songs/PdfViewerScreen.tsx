import { useCallback, useEffect, useRef, useState } from 'react';
import type { PracticeSource } from '@tempodojo/core-practice';
import { YOUTUBE_RATES, parseYoutubeId, type Song } from '@tempodojo/core-songlab';
import type { PdfDoc } from '@tempodojo/pdf';
import type { KvRepository } from '@tempodojo/storage';
import { Sheet } from '@tempodojo/ui-kit';
import type { VideoPlayer } from '@tempodojo/youtube';
import { useWakeLock } from '../platform/useWakeLock';
import type { PlayerFactories, SongLibrary } from './types';
import './pdf-viewer.css';

export interface PdfViewerScreenProps {
  song: Song;
  library: SongLibrary;
  players: PlayerFactories;
  kv: KvRepository;
  onBack: () => void;
  onTransport?: (type: 'play' | 'stop', source: PracticeSource) => void;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

/** PDF chart viewer with large turn targets, Bluetooth page-turner keys, remembered page, and optional paired YouTube audio. */
export function PdfViewerScreen({
  song,
  library,
  players,
  kv,
  onBack,
  onTransport,
}: PdfViewerScreenProps) {
  useWakeLock(true);

  const [current, setCurrent] = useState<Song>(song);
  const [doc, setDoc] = useState<PdfDoc | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);

  const [pairOpen, setPairOpen] = useState(false);
  const [linkInput, setLinkInput] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);

  const [videoPlaying, setVideoPlaying] = useState(false);
  const [rate, setRate] = useState(1);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoHostRef = useRef<HTMLDivElement>(null);

  const currentRef = useRef(current);
  currentRef.current = current;
  const libraryRef = useRef(library);
  libraryRef.current = library;
  const kvRef = useRef(kv);
  kvRef.current = kv;
  const onTransportRef = useRef(onTransport);
  onTransportRef.current = onTransport;

  const docRef = useRef<PdfDoc | null>(null);
  const pageRef = useRef(page);
  const videoRef = useRef<VideoPlayer | null>(null);
  const videoPlayingRef = useRef(false);

  const persist = useCallback((patch: Partial<Song>) => {
    const next = { ...currentRef.current, ...patch };
    currentRef.current = next;
    setCurrent(next);
    void libraryRef.current.update(next);
  }, []);

  // Load the PDF on mount and restore the last read page if valid.
  useEffect(() => {
    let cancelled = false;
    let loadedDoc: PdfDoc | null = null;

    const open = async () => {
      void libraryRef.current.touch(song.id);
      try {
        if (!song.fileId) {
          if (!cancelled) setError(true);
          return;
        }
        const file = await libraryRef.current.file(song.fileId);
        if (cancelled) return;
        if (!file) {
          setError(true);
          return;
        }
        const nextDoc = await players.pdf(file.bytes);
        if (cancelled) {
          nextDoc.destroy();
          return;
        }
        loadedDoc = nextDoc;
        const saved = await kvRef.current.get<number>(`pdfPage:${song.id}`);
        if (cancelled) {
          nextDoc.destroy();
          loadedDoc = null;
          return;
        }
        const initialPage =
          typeof saved === 'number' && Number.isInteger(saved) && saved >= 1 && saved <= nextDoc.pageCount
            ? saved
            : 1;
        docRef.current = nextDoc;
        pageRef.current = initialPage;
        setPage(initialPage);
        setDoc(nextDoc);
      } catch {
        if (!cancelled) setError(true);
      }
    };

    void open();

    return () => {
      cancelled = true;
      const toDestroy = loadedDoc ?? docRef.current;
      docRef.current = null;
      toDestroy?.destroy();
    };
  }, [song.id, song.fileId, players]);

  // Observe container width so the PDF re-renders on resize or orientation change.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setContainerWidth(el.clientWidth);
    measure();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(measure);
      ro.observe(el);
      return () => ro.disconnect();
    }
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // Render the active page whenever the document, page number, or container width changes.
  useEffect(() => {
    if (!doc || !canvasRef.current || !containerRef.current) return;
    const width = containerRef.current.clientWidth || 600;
    void doc.renderPage(page, canvasRef.current, width);
  }, [doc, page, containerWidth]);

  const turn = useCallback((delta: number) => {
    const activeDoc = docRef.current;
    if (!activeDoc) return;
    const prev = pageRef.current;
    const next = Math.max(1, Math.min(activeDoc.pageCount, prev + delta));
    if (next === prev) return;
    pageRef.current = next;
    setPage(next);
    void kvRef.current.set(`pdfPage:${currentRef.current.id}`, next);
  }, []);

  // Bluetooth page turners and keyboard navigation.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
      if (isEditableTarget(e.target)) return;

      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        turn(1);
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp' || e.key === 'ArrowUp') {
        e.preventDefault();
        turn(-1);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [turn]);

  // Mount and tear down the paired YouTube player when youtubeId changes or on unmount.
  useEffect(() => {
    const youtubeId = current.youtubeId;
    const host = videoHostRef.current;
    if (!youtubeId || !host) {
      videoPlayingRef.current = false;
      setVideoPlaying(false);
      return;
    }

    const player = players.video(host, youtubeId);
    videoRef.current = player;
    setRate(1);

    const unsub = player.onPlaying((playing) => {
      videoPlayingRef.current = playing;
      setVideoPlaying(playing);
    });

    return () => {
      unsub();
      if (videoPlayingRef.current) {
        player.pause();
        videoPlayingRef.current = false;
        onTransportRef.current?.('stop', { kind: 'song', songId: currentRef.current.id });
      }
      player.destroy();
      if (videoRef.current === player) {
        videoRef.current = null;
      }
    };
  }, [current.youtubeId, players]);

  const toggleVideo = () => {
    const player = videoRef.current;
    if (!player) return;
    if (videoPlaying) {
      player.pause();
      videoPlayingRef.current = false;
      setVideoPlaying(false);
      onTransport?.('stop', { kind: 'song', songId: current.id });
    } else {
      player.play();
      videoPlayingRef.current = true;
      setVideoPlaying(true);
      onTransport?.('play', { kind: 'song', songId: current.id });
    }
  };

  const openPairSheet = () => {
    setLinkInput('');
    setLinkError(null);
    setPairOpen(true);
  };

  const handlePairSubmit = () => {
    const id = parseYoutubeId(linkInput);
    if (!id) {
      setLinkError('That is not a YouTube link.');
      return;
    }
    persist({ youtubeId: id });
    setPairOpen(false);
  };

  const pageCount = doc?.pageCount ?? 1;

  return (
    <main className="pdf-page">
      <header className="running-head">
        <button type="button" className="head-button" onClick={onBack}>
          Back
        </button>
        <span>PDF</span>
      </header>

      <h1 className="pdf-title">{current.title}</h1>

      <section className="pdf-audio" aria-label="Paired audio">
        {current.youtubeId && (
          <>
            <div className="pdf-video-box" ref={videoHostRef} />
            <button
              type="button"
              className="pdf-video-play"
              onClick={toggleVideo}
              aria-pressed={videoPlaying}
            >
              {videoPlaying ? 'Stop' : 'Play'}
            </button>
            <div className="segmented pdf-speed" role="radiogroup" aria-label="Speed">
              {YOUTUBE_RATES.map((r) => (
                <label key={r}>
                  <input
                    type="radio"
                    name="pdf-video-speed"
                    value={r}
                    checked={rate === r}
                    onChange={() => {
                      setRate(r);
                      videoRef.current?.setRate(r);
                    }}
                  />
                  <span>{r}×</span>
                </label>
              ))}
            </div>
          </>
        )}

        <button type="button" className="text-button pdf-pair-btn" onClick={openPairSheet}>
          {current.youtubeId ? 'Change video' : 'Pair a YouTube video'}
        </button>
      </section>

      <section className="pdf-stage" ref={containerRef} aria-label="PDF page">
        {error ? (
          <p className="pdf-alert" role="alert">
            This PDF could not be opened.
          </p>
        ) : (
          <div className="pdf-canvas-wrap">
            <canvas ref={canvasRef} className="pdf-canvas" />
            <button
              type="button"
              className="pdf-tap pdf-tap-prev"
              aria-label="Previous page (left side of the page)"
              onClick={() => turn(-1)}
            />
            <button
              type="button"
              className="pdf-tap pdf-tap-next"
              aria-label="Next page (right side of the page)"
              onClick={() => turn(1)}
            />
          </div>
        )}
      </section>

      <nav className="pdf-turn" aria-label="Page navigation">
        <p className="pdf-counter">{`Page ${page} of ${pageCount}`}</p>
        <div className="pdf-turn-buttons">
          <button
            type="button"
            className="pdf-turn-btn"
            disabled={!doc || page <= 1}
            onClick={() => turn(-1)}
          >
            Previous page
          </button>
          <button
            type="button"
            className="pdf-turn-btn"
            disabled={!doc || page >= pageCount}
            onClick={() => turn(1)}
          >
            Next page
          </button>
        </div>
      </nav>

      <Sheet open={pairOpen} title="Pair a YouTube video" onClose={() => setPairOpen(false)}>
        <form
          className="field"
          onSubmit={(e) => {
            e.preventDefault();
            handlePairSubmit();
          }}
        >
          <label className="pdf-link-field">
            <span className="field-label">Link</span>
            <input
              type="text"
              value={linkInput}
              onChange={(e) => {
                setLinkInput(e.target.value);
                if (linkError) setLinkError(null);
              }}
            />
          </label>
          {linkError && (
            <p className="pdf-alert" role="alert">
              {linkError}
            </p>
          )}
          <button type="submit" className="pdf-sheet-primary">
            Pair video
          </button>
        </form>
      </Sheet>
    </main>
  );
}
