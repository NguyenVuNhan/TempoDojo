import { useMemo, useRef, useState } from 'react';
import { WebAudioMetronome } from '@tempodojo/audio-web';
import { nextAccent, pulsesPerBar, type AccentLevel, type MetronomeSettings } from '@tempodojo/core-metronome';
import { createDexiePresetRepository } from '@tempodojo/storage';
import { useKeyboardTransport } from '../platform/useKeyboardTransport';
import { useWakeLock } from '../platform/useWakeLock';
import { PresetsSheet } from './PresetsSheet';
import { SettingsSheet } from './SettingsSheet';
import { TrainerSheet } from './TrainerSheet';
import { useMetronome, type MetronomeDeps } from './useMetronome';
import { usePracticeTimer } from './usePracticeTimer';
import './metronome.css';

const SUBDIVISION_NAMES: Record<number, string> = {
  1: 'quarters',
  2: 'eighths',
  3: 'triplets',
  4: 'sixteenths',
  5: 'quintuplets',
  6: 'sextuplets',
};

const DRAG_PX_PER_BPM = 8;

let defaultDeps: MetronomeDeps | null = null;
function getDefaultDeps(): MetronomeDeps {
  defaultDeps ??= { engine: new WebAudioMetronome(), repo: createDexiePresetRepository() };
  return defaultDeps;
}

export interface MetronomeScreenProps {
  deps?: MetronomeDeps;
}

type SheetName = 'settings' | 'trainer' | 'presets';

const clock = (totalSec: number) => {
  const mm = Math.floor(totalSec / 60);
  const ss = totalSec % 60;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
};

function trainerSummary(s: MetronomeSettings): string {
  const parts: string[] = [];
  const up = s.automator.speedUp;
  if (up) parts.push(`speed-up ${up.startBpm} → ${up.targetBpm}`);
  const gap = s.automator.gap;
  if (gap) parts.push(`gap ${gap.barsOn} on / ${gap.barsOff} off`);
  return parts.length ? parts.join(' · ') : 'off';
}

export function MetronomeScreen({ deps }: MetronomeScreenProps) {
  const resolved = useMemo(() => deps ?? getDefaultDeps(), [deps]);
  const m = useMetronome(resolved);
  const { settings, position, playing } = m;
  const [sheet, setSheet] = useState<SheetName | null>(null);
  const [presetName, setPresetName] = useState<string | null>(null);
  const [countdownSec, setCountdownSec] = useState<number | null>(null);
  const timer = usePracticeTimer({ playing, countdownSec, onCountdownEnd: m.stop });
  useWakeLock(playing);
  useKeyboardTransport({ toggle: m.toggle, nudge: m.nudge });
  const pulses = pulsesPerBar(settings.meter);
  const shownBpm = Math.round(playing && position && !position.countIn ? position.bpm : settings.bpm);

  const drag = useRef<{ y: number; bpm: number; id: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    drag.current = { y: e.clientY, bpm: Math.round(settings.bpm), id: e.pointerId };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const steps = Math.round((d.y - e.clientY) / DRAG_PX_PER_BPM);
    if (d.bpm + steps !== Math.round(settings.bpm)) m.setSettings({ bpm: d.bpm + steps });
  };
  const endDrag = () => {
    drag.current = null;
  };
  const onWheel = (e: React.WheelEvent) => m.nudge(e.deltaY < 0 ? 1 : -1);

  const cycleAccent = (index: number) =>
    m.setSettings((s) => ({ accents: s.accents.map((a, i) => (i === index ? nextAccent(a) : a)) }));

  const where = !playing || !position ? 'Ready' : position.countIn ? 'Count-in' : `Bar ${position.bar + 1}`;
  const timeLabel = timer.remainingSec !== null ? 'Time left' : 'Time played';
  const time = timer.remainingSec !== null ? `${clock(timer.remainingSec)} left` : clock(timer.elapsedSec);

  return (
    <main className="page" data-playing={playing}>
      <header className="running-head">
        <span className="head-title">{presetName ?? 'Metronome'}</span>
        <button type="button" className="head-button" onClick={() => setSheet('presets')}>
          Presets
        </button>
      </header>

      <section className="heading" aria-label="Tempo">
        <div
          className="bpm"
          data-testid="bpm-readout"
          role="slider"
          aria-label="Tempo, drag up or down"
          aria-valuemin={20}
          aria-valuemax={400}
          aria-valuenow={shownBpm}
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onWheel={onWheel}
        >
          <span className="bpm-value">{shownBpm}</span>
          <span className="bpm-unit">BPM</span>
        </div>
        <button type="button" className="tempo-line" onClick={() => setSheet('settings')}>
          <span className="visually-hidden">Edit meter: </span>
          <MetronomeMark unit={settings.meter.beatUnit} /> = {shownBpm} · {settings.meter.beatsPerBar}/
          {settings.meter.denominator} · {SUBDIVISION_NAMES[settings.subdivision]}
        </button>
        <button type="button" className="tempo-line trainer-line" onClick={() => setSheet('trainer')}>
          Trainer: {trainerSummary(settings)}
        </button>
      </section>

      <section className="sticking" aria-label="Beats in the bar" data-muted={position?.muted ?? false}>
        <ol className="line" data-wrap={pulses > 4} style={{ ['--pulses' as string]: pulses }}>
          {settings.accents.map((level, i) => {
            const active = playing && position?.pulse === i;
            return (
              <li key={i}>
                <button
                  type="button"
                  className="note"
                  data-level={level}
                  data-active={active}
                  aria-label={`Beat ${i + 1}: ${level}`}
                  onClick={() => cycleAccent(i)}
                >
                  <NoteGlyph level={level} />
                  {active && <PencilRing downbeat={i === 0} />}
                </button>
                <span className="count" aria-hidden>
                  {i + 1}
                </span>
              </li>
            );
          })}
        </ol>
        <p className="bar-count" aria-live="off">
          <span>{where}</span>
          <span>
            <span className="visually-hidden">{timeLabel} </span>
            {time}
          </span>
        </p>
      </section>

      <section className="transport" aria-label="Transport">
        <div className="nudges">
          <button type="button" onClick={() => m.nudge(-5)} aria-label="Decrease tempo by 5">
            −5
          </button>
          <button type="button" onClick={() => m.nudge(-1)} aria-label="Decrease tempo by 1">
            −1
          </button>
          <button type="button" className="tap" onClick={m.tap} aria-label="Tap tempo">
            Tap
          </button>
          <button type="button" onClick={() => m.nudge(1)} aria-label="Increase tempo by 1">
            +1
          </button>
          <button type="button" onClick={() => m.nudge(5)} aria-label="Increase tempo by 5">
            +5
          </button>
        </div>
        <button type="button" className="play" onClick={m.toggle} aria-pressed={playing}>
          {playing ? 'Stop' : 'Play'}
        </button>
      </section>

      <SettingsSheet open={sheet === 'settings'} settings={settings} onChange={m.setSettings} onClose={() => setSheet(null)} />
      <TrainerSheet
        open={sheet === 'trainer'}
        settings={settings}
        onChange={m.setSettings}
        countdownSec={countdownSec}
        onCountdownChange={(sec) => {
          setCountdownSec(sec);
          timer.reset();
        }}
        onClose={() => setSheet(null)}
      />
      <PresetsSheet
        open={sheet === 'presets'}
        repo={resolved.repo}
        current={settings}
        onLoad={(preset) => {
          m.setSettings(preset.settings);
          setPresetName(preset.name);
          setSheet(null);
        }}
        onClose={() => setSheet(null)}
      />
    </main>
  );
}

/**
 * Engraved drum notation, filled shapes only (no round-capped strokes):
 * accent as a hairline wedge, tapered stem, notehead, ghost as filled crescent parentheses, mute as a quarter rest.
 */
function NoteGlyph({ level }: { level: AccentLevel }) {
  return (
    <svg className="glyph" data-level={level} viewBox="0 0 60 100" aria-hidden focusable="false">
      {level === 'mute' ? (
        <path d="M26 22 L36 36 C31 41 30 46 36 54 C30 52 26 56 30 66 C22 60 22 52 29 50 L22 39 C27 35 28 30 26 22 Z" />
      ) : (
        <>
          {level === 'accent' && <path d="M14 7 L48 15.5 L14 24 L14 19.6 L35.5 15.5 L14 11.4 Z" />}
          <path d="M40.2 76 L40.6 29 L42.6 29 L43 76 Z" />
          <ellipse cx="31" cy="79" rx="11.5" ry="8" transform="rotate(-22 31 79)" />
          {level === 'ghost' && (
            <>
              <path d="M15 65 C7.5 73 7.5 87 15 95 C11.8 87 11.8 73 15 65 Z" />
              <path d="M48 65 C55.5 73 55.5 87 48 95 C51.2 87 51.2 73 48 65 Z" />
            </>
          )}
        </>
      )}
    </svg>
  );
}

/** The metronome mark's note, drawn in the same hand as the notation line, sized to the text. */
function MetronomeMark({ unit }: { unit: MetronomeSettings['meter']['beatUnit'] }) {
  const hollow = unit === 'half';
  return (
    <svg className="mark" viewBox="0 0 34 60" aria-hidden focusable="false">
      <path d="M23.4 47 L23.6 6 L25.6 6 L25.8 47 Z" />
      <ellipse
        cx="16"
        cy="49"
        rx="9.5"
        ry="6.6"
        transform="rotate(-22 16 49)"
        fill={hollow ? 'none' : undefined}
        stroke={hollow ? 'currentColor' : undefined}
        strokeWidth={hollow ? 2.6 : undefined}
      />
      {unit === 'eighth' && <path d="M25.6 6 C27 16 36 18 33 32 C32 22 28 20 25.6 18 Z" />}
      {unit === 'dotted-quarter' && <circle cx="31" cy="48" r="2.8" />}
    </svg>
  );
}

function PencilRing({ downbeat }: { downbeat: boolean }) {
  return (
    <svg className="pencil-ring" data-downbeat={downbeat} viewBox="0 0 100 100" aria-hidden focusable="false">
      <path d="M50 7 C77 6 95 25 93 51 C91 78 71 94 46 92 C20 90 5 71 8 46 C10 24 27 9 55 9" />
    </svg>
  );
}
