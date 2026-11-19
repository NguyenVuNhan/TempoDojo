import { useEffect, useRef, useState } from 'react';
import type { Exercise } from '@tempodojo/core-ladder';
import { DEFAULT_SETTINGS, MAX_BPM, MIN_BPM } from '@tempodojo/core-metronome';
import type { PracticeSource } from '@tempodojo/core-practice';
import { YOUTUBE_RATES, snapYoutubeRate, type LoopRange, type LoopTrainer, type Section, type Song } from '@tempodojo/core-songlab';
import type { VideoPlayer } from '@tempodojo/youtube';
import type { MetronomeEngineLike } from '../metronome/useMetronome';
import { useWakeLock } from '../platform/useWakeLock';
import { SectionsSheet } from './SectionsSheet';
import { TrainerControls } from './TrainerControls';
import type { PlayerFactories, SongLibrary } from './types';
import { useLoopTrainer } from './useLoopTrainer';
import './youtube-player.css';

export interface YoutubePlayerScreenProps {
  song: Song;
  library: SongLibrary;
  players: PlayerFactories;
  engine: MetronomeEngineLike;
  exercises: Exercise[];
  onBack: () => void;
  onOpenExercise: (ex: Exercise) => void;
  onTransport?: (type: 'play' | 'stop', source: PracticeSource) => void;
  pollMs?: number;
}

function formatTime(sec: number): string {
  const total = Math.max(0, Math.floor(sec));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function roundTenth(sec: number): number {
  return Math.round(sec * 10) / 10;
}

function pickAllowedRate(percent: number, allowed: number[]): number {
  const snapped = snapYoutubeRate(percent);
  if (allowed.length === 0 || allowed.includes(snapped)) return snapped;
  let best = allowed[0];
  let bestDiff = Math.abs(snapped - best);
  for (let i = 1; i < allowed.length; i++) {
    const diff = Math.abs(snapped - allowed[i]);
    if (diff < bestDiff) {
      best = allowed[i];
      bestDiff = diff;
    }
  }
  return best;
}

/** YouTube player screen: 16:9 video, A/B loop, allowed speeds, BPM count-in, loop trainer, and sections. */
export function YoutubePlayerScreen({
  song,
  library,
  players,
  engine,
  exercises,
  onBack,
  onOpenExercise,
  onTransport,
  pollMs = 250,
}: YoutubePlayerScreenProps) {
  const [current, setCurrent] = useState<Song>(song);
  const currentRef = useRef(current);
  currentRef.current = current;

  const [allowedRates, setAllowedRates] = useState<number[] | null>(null);
  const [playing, setPlaying] = useState(false);
  const [pointA, setPointA] = useState<number | null>(null);
  const [pointB, setPointB] = useState<number | null>(null);
  const [loopOn, setLoopOn] = useState(false);
  const [countInOn, setCountInOn] = useState(false);
  const [bpmInput, setBpmInput] = useState(() => (song.bpm !== null ? String(song.bpm) : ''));
  const [sectionsOpen, setSectionsOpen] = useState(false);

  const videoSlotRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<VideoPlayer | null>(null);
  const playingRef = useRef(false);
  const countInRunningRef = useRef(false);
  const countInUnsubRef = useRef<(() => void) | null>(null);

  const onTransportRef = useRef(onTransport);
  onTransportRef.current = onTransport;
  const engineRef = useRef(engine);
  engineRef.current = engine;
  const libraryRef = useRef(library);
  libraryRef.current = library;
  const playersRef = useRef(players);
  playersRef.current = players;

  const trainer = useLoopTrainer(current.trainer, current.lastPercent);
  const effectiveRate = allowedRates ? pickAllowedRate(trainer.percent, allowedRates) : snapYoutubeRate(trainer.percent);
  const effectiveRateRef = useRef(effectiveRate);
  effectiveRateRef.current = effectiveRate;

  useWakeLock(playing);

  const persist = (patch: Partial<Song>) => {
    const next = { ...currentRef.current, ...patch };
    currentRef.current = next;
    setCurrent(next);
    void libraryRef.current.update(next);
  };

  const stopCountIn = () => {
    if (!countInRunningRef.current) return;
    countInRunningRef.current = false;
    countInUnsubRef.current?.();
    countInUnsubRef.current = null;
    engineRef.current.stop();
  };

  useEffect(() => {
    let cancelled = false;
    void libraryRef.current.touch(currentRef.current.id);

    const el = videoSlotRef.current;
    if (!el) return;

    const video = playersRef.current.video(el, currentRef.current.youtubeId ?? '');
    videoRef.current = video;

    const offPlaying = video.onPlaying((p) => {
      playingRef.current = p;
      setPlaying(p);
    });

    void video.ready.then(() => {
      if (cancelled) return;
      const rates = video.rates();
      const allowed = YOUTUBE_RATES.filter((r) => rates.includes(r));
      setAllowedRates(allowed);
    });

    return () => {
      cancelled = true;
      offPlaying();
      stopCountIn();
      if (playingRef.current) {
        playingRef.current = false;
        video.pause();
        onTransportRef.current?.('stop', { kind: 'song', songId: currentRef.current.id });
      }
      video.destroy();
      videoRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!allowedRates || !videoRef.current) return;
    videoRef.current.setRate(effectiveRate);
  }, [allowedRates, effectiveRate]);

  const loopStateRef = useRef({
    loopOn,
    pointA,
    pointB,
    countInOn,
    onPass: trainer.onPass,
  });
  loopStateRef.current = {
    loopOn,
    pointA,
    pointB,
    countInOn,
    onPass: trainer.onPass,
  };

  useEffect(() => {
    const id = setInterval(() => {
      const { loopOn: active, pointA: a, pointB: b, countInOn: countIn, onPass } = loopStateRef.current;
      const video = videoRef.current;
      if (!active || a === null || b === null || !video || countInRunningRef.current) return;
      if (video.time() < b) return;

      onPass();
      if (countIn && currentRef.current.bpm !== null) {
        video.pause();
        video.seek(a);
        stopCountIn();
        countInRunningRef.current = true;
        const unsub = engineRef.current.onEvent((e) => {
          if (e.bar >= 1) {
            countInRunningRef.current = false;
            countInUnsubRef.current = null;
            unsub();
            engineRef.current.stop();
            playingRef.current = true;
            setPlaying(true);
            videoRef.current?.play();
          }
        });
        countInUnsubRef.current = unsub;
        void engineRef.current.start({
          ...DEFAULT_SETTINGS,
          bpm: Math.round(currentRef.current.bpm * effectiveRateRef.current),
          meter: { beatsPerBar: 4, denominator: 4, beatUnit: 'quarter' },
          subdivision: 1,
          countInBars: 0,
          automator: { speedUp: null, gap: null },
        });
      } else {
        video.seek(a);
      }
    }, pollMs);

    return () => clearInterval(id);
  }, [pollMs]);

  const handleSetA = () => {
    const t = roundTenth(videoRef.current?.time() ?? 0);
    if (pointB !== null && t > pointB) {
      setPointA(pointB);
      setPointB(t);
    } else {
      setPointA(t);
    }
  };

  const handleSetB = () => {
    const t = roundTenth(videoRef.current?.time() ?? 0);
    if (pointA !== null && pointA > t) {
      setPointB(pointA);
      setPointA(t);
    } else {
      setPointB(t);
    }
  };

  const commitBpm = () => {
    const trimmed = bpmInput.trim();
    if (trimmed === '') return;
    const n = Number(trimmed);
    if (!Number.isFinite(n)) return;
    const rounded = Math.round(n);
    if (rounded < MIN_BPM || rounded > MAX_BPM) return;
    setBpmInput(String(rounded));
    if (rounded !== currentRef.current.bpm) {
      persist({ bpm: rounded });
    }
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    const source: PracticeSource = { kind: 'song', songId: currentRef.current.id };
    if (playingRef.current) {
      stopCountIn();
      playingRef.current = false;
      setPlaying(false);
      video.pause();
      onTransportRef.current?.('stop', source);
    } else {
      playingRef.current = true;
      setPlaying(true);
      video.play();
      onTransportRef.current?.('play', source);
    }
  };

  const handleLoopSection = (section: Section) => {
    if (section.range.kind !== 'time') return;
    const a = roundTenth(section.range.startSec);
    const b = roundTenth(section.range.endSec);
    const start = Math.min(a, b);
    const end = Math.max(a, b);
    setPointA(start);
    setPointB(end);
    setLoopOn(true);
    videoRef.current?.seek(start);
    setSectionsOpen(false);
  };

  const abReady = pointA !== null && pointB !== null;
  const currentRange: LoopRange | null = loopOn && abReady ? { kind: 'time', startSec: pointA, endSec: pointB } : null;

  return (
    <main className="yt-page" data-playing={playing}>
      <header className="running-head">
        <button type="button" className="head-button" onClick={onBack}>
          Back
        </button>
        <span>YouTube</span>
      </header>

      <div className="yt-main">
        <h1 className="yt-title">{current.title}</h1>

        <div className="yt-video-box">
          <div ref={videoSlotRef} className="yt-video-slot" />
        </div>

        <section className="yt-ab" aria-label="A/B loop">
          <div className="yt-ab-buttons">
            <button type="button" onClick={handleSetA}>
              Set A
            </button>
            <button type="button" onClick={handleSetB}>
              Set B
            </button>
          </div>
          <p className="yt-ab-readout">
            {`A ${pointA !== null ? formatTime(pointA) : '–'} · B ${pointB !== null ? formatTime(pointB) : '–'}`}
          </p>
          <label className="check">
            <input
              type="checkbox"
              disabled={!abReady}
              checked={loopOn}
              onChange={(e) => setLoopOn(e.target.checked)}
            />
            <span>Loop A to B</span>
          </label>
        </section>
      </div>

      <div className="yt-side">
        <div className="yt-controls">
          {allowedRates && (
            <section className="yt-section">
              <h2 className="field-label">Speed</h2>
              <div className="segmented" role="radiogroup" aria-label="Speed">
                {allowedRates.map((rate) => (
                  <label key={rate}>
                    <input
                      type="radio"
                      name="yt-speed"
                      value={rate}
                      checked={effectiveRate === rate}
                      onChange={() => {
                        persist({ lastPercent: rate * 100 });
                        videoRef.current?.setRate(rate);
                      }}
                    />
                    <span>{`${rate}×`}</span>
                  </label>
                ))}
              </div>
            </section>
          )}

          <section className="yt-countin-row">
            <div className="yt-countin-inputs">
              <label className="check">
                <input
                  type="checkbox"
                  disabled={current.bpm === null}
                  checked={countInOn}
                  onChange={(e) => setCountInOn(e.target.checked)}
                />
                <span>Count-in</span>
              </label>

              <label className="num yt-bpm-field">
                <span>Song BPM</span>
                <input
                  type="number"
                  min={MIN_BPM}
                  max={MAX_BPM}
                  value={bpmInput}
                  onChange={(e) => setBpmInput(e.target.value)}
                  onBlur={commitBpm}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitBpm();
                  }}
                />
              </label>
            </div>

            {current.bpm === null && <p className="yt-bpm-hint">Add the song&apos;s BPM to count in.</p>}
          </section>

          <TrainerControls trainer={current.trainer} onChange={(t: LoopTrainer | null) => persist({ trainer: t })} />

          <button type="button" className="text-button" onClick={() => setSectionsOpen(true)}>
            Sections
          </button>
        </div>

        <section className="yt-transport" aria-label="Transport">
          {loopOn && <p className="yt-pass">{`Pass ${trainer.pass + 1}`}</p>}
          <button type="button" className="yt-play" onClick={togglePlay} aria-pressed={playing}>
            {playing ? 'Stop' : 'Play'}
          </button>
        </section>
      </div>

      <SectionsSheet
        open={sectionsOpen}
        song={current}
        currentRange={currentRange}
        currentPercent={Math.round(effectiveRate * 100)}
        exercises={exercises}
        onChange={(sections: Section[]) => persist({ sections })}
        onLoop={handleLoopSection}
        onOpenExercise={onOpenExercise}
        onClose={() => setSectionsOpen(false)}
      />
    </main>
  );
}
