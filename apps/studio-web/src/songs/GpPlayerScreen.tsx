import { useEffect, useRef, useState } from 'react';
import type { Exercise } from '@tempodojo/core-ladder';
import type { PracticeSource } from '@tempodojo/core-practice';
import {
  clampGpPercent,
  normalizeRange,
  type LoopRange,
  type ScoreInfo,
  type Section,
  type Song,
} from '@tempodojo/core-songlab';
import { NotationError, type NotationPlayer, type TrackInfo } from '@tempodojo/notation';
import { useKeyboardTransport } from '../platform/useKeyboardTransport';
import { useWakeLock } from '../platform/useWakeLock';
import { SectionsSheet } from './SectionsSheet';
import { TracksSheet } from './TracksSheet';
import { TrainerControls } from './TrainerControls';
import type { PlayerFactories, SongLibrary } from './types';
import { useLoopTrainer } from './useLoopTrainer';
import './gp-player.css';

export interface GpPlayerScreenProps {
  song: Song;
  library: SongLibrary;
  players: PlayerFactories;
  exercises: Exercise[];
  onBack: () => void;
  onOpenExercise: (ex: Exercise) => void;
  onTransport?: (type: 'play' | 'stop', source: PracticeSource) => void;
}

const LOAD_ERROR_MESSAGE = 'This file could not be opened as a Guitar Pro or MusicXML score.';

/** Guitar Pro / MusicXML player screen with score cursor, bar loop, loop trainer, tracks, and sections. */
export function GpPlayerScreen({
  song,
  library,
  players,
  exercises,
  onBack,
  onOpenExercise,
  onTransport,
}: GpPlayerScreenProps) {
  const [current, setCurrent] = useState<Song>(song);
  const [info, setInfo] = useState<ScoreInfo | null>(null);
  const [tracks, setTracks] = useState<TrackInfo[]>([]);
  const [loadError, setLoadError] = useState(false);

  const [bar, setBar] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [countIn, setCountIn] = useState(true);
  const [click, setClick] = useState(false);

  const [basePercent, setBasePercent] = useState(() => clampGpPercent(song.lastPercent));
  const [fromInput, setFromInput] = useState('1');
  const [toInput, setToInput] = useState('4');
  const [loopEnabled, setLoopEnabled] = useState(false);

  const [tracksOpen, setTracksOpen] = useState(false);
  const [sectionsOpen, setSectionsOpen] = useState(false);

  useWakeLock(playing);

  const trainer = useLoopTrainer(current.trainer, basePercent);
  const effective = trainer.percent;

  const scrollRef = useRef<HTMLDivElement>(null);
  const scoreRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<NotationPlayer | null>(null);

  const currentRef = useRef(current);
  currentRef.current = current;
  const libraryRef = useRef(library);
  libraryRef.current = library;
  const playersRef = useRef(players);
  playersRef.current = players;
  const onTransportRef = useRef(onTransport);
  onTransportRef.current = onTransport;
  const playingRef = useRef(playing);
  playingRef.current = playing;
  const basePercentRef = useRef(basePercent);
  basePercentRef.current = basePercent;
  const countInRef = useRef(countIn);
  countInRef.current = countIn;
  const clickRef = useRef(click);
  clickRef.current = click;
  const effectiveRef = useRef(effective);
  effectiveRef.current = effective;
  const onPassRef = useRef(trainer.onPass);
  onPassRef.current = trainer.onPass;
  const resetTrainerRef = useRef(trainer.reset);
  resetTrainerRef.current = trainer.reset;

  const persist = (patch: Partial<Song>) => {
    const next = { ...currentRef.current, ...patch };
    currentRef.current = next;
    setCurrent(next);
    void libraryRef.current.update(next);
  };

  useEffect(() => {
    let cancelled = false;
    let player: NotationPlayer | null = null;
    let unsubBar: (() => void) | undefined;
    let unsubPlaying: (() => void) | undefined;
    let unsubPass: (() => void) | undefined;
    let unsubRange: (() => void) | undefined;

    void libraryRef.current.touch(song.id);

    const mount = async () => {
      if (!song.fileId) {
        if (!cancelled) setLoadError(true);
        return;
      }
      const stored = await libraryRef.current.file(song.fileId);
      if (cancelled) return;
      if (!stored) {
        setLoadError(true);
        return;
      }

      const el = scoreRef.current;
      const scrollEl = scrollRef.current ?? el;
      if (!el) return;

      const width = scrollEl.clientWidth || el.clientWidth;
      player = playersRef.current.notation(el, {
        barsPerRow: width < 600 ? 3 : 4,
        scale: width < 600 ? 0.75 : 0.85,
        scrollElement: scrollEl,
      });
      playerRef.current = player;

      try {
        const loaded = await player.load(stored.bytes);
        if (cancelled) {
          player.destroy();
          playerRef.current = null;
          return;
        }
        setInfo(loaded);
        setTracks(player.tracks());
        setFromInput('1');
        setToInput(String(Math.min(4, loaded.barCount)));
        player.setCountIn(countInRef.current);
        player.setMetronome(clickRef.current);
        player.setPercent(effectiveRef.current);
        unsubBar = player.onBar((b) => setBar(b));
        unsubPlaying = player.onPlaying((p) => setPlaying(p));
        unsubPass = player.onLoopPass(() => onPassRef.current());
        unsubRange = player.onRangeChange?.((r) => {
          if (r) {
            setFromInput(String(r.startBar));
            setToInput(String(r.endBar));
            setLoopEnabled(true);
            resetTrainerRef.current();
          } else {
            setLoopEnabled(false);
            resetTrainerRef.current();
          }
        });
      } catch (err) {
        if (!cancelled && err instanceof NotationError) {
          setLoadError(true);
        } else if (!cancelled) {
          setLoadError(true);
        }
      }
    };

    void mount();

    return () => {
      cancelled = true;
      const source: PracticeSource = { kind: 'song', songId: song.id };
      if (player) {
        if (playingRef.current) {
          player.stop();
          onTransportRef.current?.('stop', source);
        }
        unsubBar?.();
        unsubPlaying?.();
        unsubPass?.();
        unsubRange?.();
        player.destroy();
        playerRef.current = null;
      }
      void libraryRef.current.update({
        ...currentRef.current,
        lastPercent: basePercentRef.current,
      });
    };
  }, [song.id, song.fileId]);

  useEffect(() => {
    if (playerRef.current && info) {
      playerRef.current.setPercent(effective);
    }
  }, [effective, info]);

  const applyLoop = (fromStr: string, toStr: string) => {
    if (!playerRef.current || !info) return;
    const startBar = Number(fromStr) || 1;
    const endBar = Number(toStr) || 1;
    const norm = normalizeRange({ kind: 'bars', startBar, endBar }, { barCount: info.barCount });
    if (norm.kind === 'bars') {
      playerRef.current.setLoop({ startBar: norm.startBar, endBar: norm.endBar });
    }
  };

  const handleFromChange = (value: string) => {
    setFromInput(value);
    if (loopEnabled) applyLoop(value, toInput);
  };

  const handleToChange = (value: string) => {
    setToInput(value);
    if (loopEnabled) applyLoop(fromInput, value);
  };

  const handleLoopToggle = (checked: boolean) => {
    setLoopEnabled(checked);
    if (checked) {
      applyLoop(fromInput, toInput);
    } else {
      playerRef.current?.setLoop(null);
      trainer.reset();
    }
  };

  const nudge = (delta: number) => {
    setBasePercent((prev) => clampGpPercent(prev + delta));
  };

  const toggleCountIn = (checked: boolean) => {
    setCountIn(checked);
    playerRef.current?.setCountIn(checked);
  };

  const toggleClick = (checked: boolean) => {
    setClick(checked);
    playerRef.current?.setMetronome(checked);
  };

  const togglePlay = () => {
    const p = playerRef.current;
    if (!p || !info || loadError) return;
    const source: PracticeSource = { kind: 'song', songId: current.id };
    if (playing) {
      p.stop();
      onTransport?.('stop', source);
    } else {
      p.play();
      onTransport?.('play', source);
    }
  };

  useKeyboardTransport({
    toggle: togglePlay,
    nudge: (d) => nudge(d),
    nudgeBig: (d) => nudge(d * 5),
  });

  const handleLoopSection = (section: Section) => {
    if (section.range.kind !== 'bars') return;
    const fromStr = String(section.range.startBar);
    const toStr = String(section.range.endBar);
    setFromInput(fromStr);
    setToInput(toStr);
    setLoopEnabled(true);
    if (playerRef.current && info) {
      const norm = normalizeRange(section.range, { barCount: info.barCount });
      if (norm.kind === 'bars') {
        playerRef.current.setLoop({ startBar: norm.startBar, endBar: norm.endBar });
      }
    }
    setSectionsOpen(false);
  };

  const currentRange: LoopRange | null =
    loopEnabled && info
      ? normalizeRange(
          { kind: 'bars', startBar: Number(fromInput) || 1, endBar: Number(toInput) || 1 },
          { barCount: info.barCount },
        )
      : null;

  return (
    <main className="gp-page" data-playing={playing}>
      <header className="running-head">
        <button type="button" className="head-button" onClick={onBack}>
          Back
        </button>
        <span>Guitar Pro</span>
      </header>

      <div className="gp-head-block">
        <h1 className="gp-title" title={current.title}>{current.title}</h1>
        {info && <p className="gp-file-tempo">{`${info.tempo} BPM in the file`}</p>}
      </div>

      <section className="gp-controls" aria-label="Loop and tracks">
        <span className="visually-hidden">
          <label>
            <span>From bar</span>
            <input
              type="number"
              min={1}
              max={info?.barCount}
              value={fromInput}
              onChange={(e) => handleFromChange(e.target.value)}
            />
          </label>
          <label>
            <span>To bar</span>
            <input
              type="number"
              min={1}
              max={info?.barCount}
              value={toInput}
              onChange={(e) => handleToChange(e.target.value)}
            />
          </label>
        </span>

        <div className="gp-toggles-row">
          <label className="check">
            <input
              type="checkbox"
              checked={countIn}
              onChange={(e) => toggleCountIn(e.target.checked)}
            />
            <span>Count-in</span>
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={click}
              onChange={(e) => toggleClick(e.target.checked)}
            />
            <span>Click</span>
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={loopEnabled}
              onChange={(e) => handleLoopToggle(e.target.checked)}
            />
            <span>Loop</span>
          </label>

          <div className="gp-drawer-actions">
            <button
              type="button"
              className="text-button"
              onClick={() => setTracksOpen(true)}
            >
              Tracks
            </button>
            <button
              type="button"
              className="text-button"
              onClick={() => setSectionsOpen(true)}
            >
              Sections
            </button>
          </div>
        </div>

        <div className="gp-loop-disclosure" data-loop={loopEnabled || current.trainer !== null}>
          {loopEnabled && (
            <span className="gp-loop-range">{`Bars ${fromInput}–${toInput}`}</span>
          )}
          <TrainerControls
            trainer={current.trainer}
            onChange={(t) => persist({ trainer: t })}
          />
        </div>
      </section>

      <div className="gp-content">
        {loadError && (
          <p role="alert" className="gp-error">
            {LOAD_ERROR_MESSAGE}
          </p>
        )}

        <div className="gp-score" ref={scrollRef} hidden={loadError}>
          <div className="gp-score-surface" ref={scoreRef} />
        </div>
      </div>

      <section className="gp-transport" aria-label="Transport">
        <div className="gp-percent-row">
          <span className="gp-percent-value" data-testid="song-percent">
            {`${effective} %`}
          </span>
          {info && !loadError && (
            <span className="gp-position">
              <span>{`Bar ${bar} of ${info.barCount}`}</span>
              {current.trainer && <span className="gp-pass">{`Pass ${trainer.pass + 1}`}</span>}
            </span>
          )}
        </div>

        <div className="gp-nudges">
          <button type="button" onClick={() => nudge(-5)} aria-label="Slower by 5 %">
            −5
          </button>
          <button type="button" onClick={() => nudge(-1)} aria-label="Slower by 1 %">
            −1
          </button>
          <button type="button" onClick={() => nudge(1)} aria-label="Faster by 1 %">
            +1
          </button>
          <button type="button" onClick={() => nudge(5)} aria-label="Faster by 5 %">
            +5
          </button>
        </div>

        <button
          type="button"
          className="gp-play"
          onClick={togglePlay}
          aria-pressed={playing}
          disabled={!info || loadError}
        >
          {playing ? 'Stop' : 'Play'}
        </button>
      </section>

      <TracksSheet
        open={tracksOpen}
        tracks={tracks}
        onMute={(index, muted) => playerRef.current?.setTrackMute(index, muted)}
        onSolo={(index, solo) => playerRef.current?.setTrackSolo(index, solo)}
        onClose={() => setTracksOpen(false)}
      />

      <SectionsSheet
        open={sectionsOpen}
        song={current}
        currentRange={currentRange}
        currentPercent={effective}
        exercises={exercises}
        onChange={(sections) => persist({ sections })}
        onLoop={handleLoopSection}
        onOpenExercise={onOpenExercise}
        onClose={() => setSectionsOpen(false)}
      />
    </main>
  );
}
