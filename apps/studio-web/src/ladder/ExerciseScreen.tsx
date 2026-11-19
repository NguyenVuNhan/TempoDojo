import { useEffect, useRef, useState } from 'react';
import {
  RANKS,
  exerciseSettings,
  nextTarget,
  rankTestSettings,
  type Exercise,
  type Rank,
} from '@tempodojo/core-ladder';
import { DEFAULT_SETTINGS, MAX_BPM, MIN_BPM, type MetronomeSettings } from '@tempodojo/core-metronome';
import { Sheet } from '@tempodojo/ui-kit';
import { useMetronome, type MetronomeDeps, type MetronomeOptions } from '../metronome/useMetronome';
import { useWakeLock } from '../platform/useWakeLock';
import { PatternView } from './PatternView';
import { RankTestSheet } from './RankTestSheet';
import { NOTE_VALUE, RANK_LABEL, TRACK_LABEL } from './labels';
import type { LadderState } from './types';
import './exercise.css';

export interface ExerciseScreenProps {
  exercise: Exercise;
  ladder: LadderState;
  deps: MetronomeDeps;
  onBack: () => void;
  onTransport?: MetronomeOptions['onTransport'];
  now?: () => number;
}

const TARGET_RANKS = RANKS.filter((r): r is Exclude<Rank, 'unranked'> => r !== 'unranked');

/** Practice screen for a single ladder exercise: pattern, targets, transport, clean log, and rank test. */
export function ExerciseScreen({
  exercise,
  ladder,
  deps,
  onBack,
  onTransport,
  now = Date.now,
}: ExerciseScreenProps) {
  const progress = ladder.progressOf(exercise.id);
  const [practice] = useState<MetronomeSettings>(() => ({
    ...exerciseSettings(exercise, progress, DEFAULT_SETTINGS),
    automator: { speedUp: null, gap: null },
  }));

  const m = useMetronome(deps, {
    persist: false,
    initial: practice,
    source: { kind: 'exercise', exerciseId: exercise.id, track: exercise.track },
    onTransport,
  });
  const { settings, position, playing } = m;
  useWakeLock(playing);

  const [logOpen, setLogOpen] = useState(false);
  const [cleanInput, setCleanInput] = useState('');
  const [rankTestOpen, setRankTestOpen] = useState(false);

  const nowRef = useRef(now);
  nowRef.current = now;
  const ladderRef = useRef(ladder);
  ladderRef.current = ladder;
  const exerciseRef = useRef(exercise);
  exerciseRef.current = exercise;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const playingRef = useRef(playing);
  playingRef.current = playing;
  const mountWorkingBpmRef = useRef(progress.workingBpm);
  const practiceBeforeTestRef = useRef<MetronomeSettings | null>(null);
  const playStartRef = useRef<number | null>(null);
  const accumulatedMsRef = useRef(0);
  const wasPlayingRef = useRef(false);

  useEffect(() => {
    if (playing && !wasPlayingRef.current) {
      playStartRef.current = nowRef.current();
    } else if (!playing && wasPlayingRef.current) {
      if (playStartRef.current !== null) {
        accumulatedMsRef.current += Math.max(0, nowRef.current() - playStartRef.current);
        playStartRef.current = null;
      }
    }
    wasPlayingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    return () => {
      if (playingRef.current && playStartRef.current !== null) {
        accumulatedMsRef.current += Math.max(0, nowRef.current() - playStartRef.current);
        playStartRef.current = null;
      }
      const activeSettings = practiceBeforeTestRef.current ?? settingsRef.current;
      const latestBpm = Math.round(activeSettings.bpm);
      if (latestBpm !== mountWorkingBpmRef.current) {
        void ladderRef.current.setWorking(exerciseRef.current, latestBpm);
      }
      void ladderRef.current.addTime(exerciseRef.current, accumulatedMsRef.current / 1000);
    };
  }, []);

  const shownBpm = Math.round(playing && position && !position.countIn ? position.bpm : settings.bpm);
  const next = nextTarget(progress.rank, exercise.targets);
  const showClimb = next !== null && next.bpm > settings.bpm;
  const climbing = settings.automator.speedUp !== null;
  const nextRankIdx = next ? RANKS.indexOf(next.rank) : RANKS.length;

  const nudge = (delta: number) => {
    m.setSettings((s) => {
      const nextBpm = Math.max(MIN_BPM, Math.min(MAX_BPM, Math.round(s.bpm) + delta));
      if (!s.automator.speedUp) {
        return { bpm: nextBpm };
      }
      return {
        bpm: nextBpm,
        automator: {
          ...s.automator,
          speedUp: {
            ...s.automator.speedUp,
            startBpm: nextBpm,
          },
        },
      };
    });
  };

  const toggleClimb = (checked: boolean) => {
    if (!checked || !next) {
      m.setSettings((s) => ({
        automator: { ...s.automator, speedUp: null },
      }));
      return;
    }
    const bpm = Math.round(settings.bpm);
    m.setSettings((s) => ({
      automator: {
        ...s.automator,
        speedUp: {
          startBpm: bpm,
          targetBpm: next.bpm,
          stepBpm: next.bpm - bpm <= 10 ? 2 : 5,
          everyBars: 4,
          pyramid: false,
        },
      },
    }));
  };

  const openLogSheet = () => {
    setCleanInput(String(Math.round(settings.bpm)));
    setLogOpen(true);
  };

  const saveClean = () => {
    if (cleanInput.trim() === '') return;
    const value = Number(cleanInput);
    if (!Number.isFinite(value)) return;
    void ladder.logClean(exercise, value);
    setLogOpen(false);
  };

  const restoreAfterTest = () => {
    if (practiceBeforeTestRef.current) {
      m.setSettings(practiceBeforeTestRef.current);
      practiceBeforeTestRef.current = null;
    }
  };

  const handleTestStart = (bpm: number) => {
    practiceBeforeTestRef.current ??= m.settings;
    m.setSettings(rankTestSettings(exercise, bpm, m.settings));
    void m.start();
  };

  const handleTestStop = () => {
    m.stop();
    restoreAfterTest();
  };

  const handleTestClaim = (bpm: number) => {
    void ladder.logClean(exercise, bpm);
    if (m.playing) m.stop();
    restoreAfterTest();
    setRankTestOpen(false);
  };

  const handleTestClose = () => {
    if (m.playing) m.stop();
    restoreAfterTest();
    setRankTestOpen(false);
  };

  return (
    <main className="ex-page" data-playing={playing}>
      <header className="running-head">
        <button type="button" className="head-button" onClick={onBack}>
          Back
        </button>
        <span>
          {TRACK_LABEL[exercise.track]} · Tier {exercise.tier}
        </span>
      </header>

      <div className="ex-content">
        <h1 className="ex-title">{exercise.name}</h1>
        <PatternView exercise={exercise} live={playing && position && !position.countIn ? position : null} />

        <div className="ex-actions">
          <button type="button" className="text-button" onClick={openLogSheet}>
            Log clean tempo
          </button>
          <button type="button" className="text-button" onClick={() => setRankTestOpen(true)}>
            Rank test
          </button>
        </div>

        <ol className="targets" aria-label="Targets">
          {TARGET_RANKS.map((rank) => {
            const isCurrent = progress.rank === rank;
            const isFuture = RANKS.indexOf(rank) > nextRankIdx;
            return (
              <li
                key={rank}
                aria-current={isCurrent ? 'true' : undefined}
                data-future={isFuture || undefined}
              >
                <span className="target-rank">{RANK_LABEL[rank]}</span>
                <span className="target-bpm">{exercise.targets[rank]}</span>
              </li>
            );
          })}
        </ol>

        <p className="ex-focus">{exercise.focus}</p>
        {exercise.track === 'coordination' && (
          <p className="ex-coord-note">Feet first: play the feet line alone for a minute.</p>
        )}

        {progress.bestCleanBpm != null && (
          <p className="ex-best">
            {`Best ${Math.round(progress.bestCleanBpm)} · ${NOTE_VALUE[exercise.subdivision]}`}
          </p>
        )}

        {progress.rank !== 'unranked' && exercise.transferTip && (
          <section className="ex-tip">
            <h2 className="field-label">On the kit</h2>
            <p className="ex-tip-body">{exercise.transferTip}</p>
          </section>
        )}
      </div>

      <section className="ex-transport" aria-label="Transport">
        <div className="ex-bpm-row">
          <div className="ex-bpm" data-testid="exercise-bpm">
            <span className="ex-bpm-value">{shownBpm}</span>
            <span className="ex-bpm-unit">BPM</span>
          </div>
          <span className="ex-note-value">{NOTE_VALUE[exercise.subdivision]}</span>
        </div>

        {showClimb && (
          <label className="check">
            <input
              type="checkbox"
              checked={climbing}
              onChange={(e) => toggleClimb(e.target.checked)}
            />
            <span>
              Climb to {RANK_LABEL[next.rank]} {next.bpm}
            </span>
          </label>
        )}

        <div className="ex-nudges">
          <button type="button" onClick={() => nudge(-5)} aria-label="Decrease tempo by 5">
            −5
          </button>
          <button type="button" onClick={() => nudge(-1)} aria-label="Decrease tempo by 1">
            −1
          </button>
          <button type="button" onClick={() => nudge(1)} aria-label="Increase tempo by 1">
            +1
          </button>
          <button type="button" onClick={() => nudge(5)} aria-label="Increase tempo by 5">
            +5
          </button>
        </div>

        <button type="button" className="ex-play" onClick={m.toggle} aria-pressed={playing}>
          {playing ? 'Stop' : 'Play'}
        </button>
      </section>

      <Sheet open={logOpen} title="Log clean tempo" onClose={() => setLogOpen(false)}>
        <div className="field">
          <p className="ex-sheet-note">The fastest tempo you played the whole exercise cleanly.</p>
          <label className="num">
            <span>Clean tempo</span>
            <input
              type="number"
              min={MIN_BPM}
              max={MAX_BPM}
              value={cleanInput}
              onChange={(e) => setCleanInput(e.target.value)}
            />
          </label>
          <button type="button" className="ex-save" onClick={saveClean}>
            Save
          </button>
        </div>
      </Sheet>

      <RankTestSheet
        open={rankTestOpen}
        exercise={exercise}
        progress={progress}
        position={position}
        onStart={handleTestStart}
        onStop={handleTestStop}
        onClaim={handleTestClaim}
        onClose={handleTestClose}
      />
    </main>
  );
}
