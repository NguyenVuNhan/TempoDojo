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

const NOTE_FOR_UNIT: Record<MetronomeSettings['meter']['beatUnit'], string> = {
  half: '𝅗𝅥',
  quarter: '♩',
  eighth: '♪',
  'dotted-quarter': '♩.',
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
  const time = timer.remainingSec !== null ? `${clock(timer.remainingSec)} left` : clock(timer.elapsedSec);

  return (
    <main className="page" data-playing={playing}>
      <header className="running-head">
        <button type="button" className="head-button" onClick={() => setSheet('presets')} aria-label="Presets">
          {presetName ?? 'Metronome'}
        </button>
        <span aria-live="off">
          {where} · {time}
        </span>
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
        <button type="button" className="tempo-line" onClick={() => setSheet('settings')} aria-label="Meter and subdivision settings">
          {NOTE_FOR_UNIT[settings.meter.beatUnit]} = {shownBpm} · {settings.meter.beatsPerBar}/{settings.meter.denominator} ·{' '}
          {SUBDIVISION_NAMES[settings.subdivision]}
        </button>
        <button type="button" className="tempo-line trainer-line" onClick={() => setSheet('trainer')} aria-label="Trainer settings">
          Trainer: {trainerSummary(settings)}
        </button>
      </section>

      <section className="sticking" aria-label="Beats in the bar" data-muted={position?.muted ?? false}>
        <ol className="line" style={{ ['--pulses' as string]: pulses }}>
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

/** Engraved drum notation: accent ">" over a notehead, ghost in parentheses, mute as a quarter rest. */
function NoteGlyph({ level }: { level: AccentLevel }) {
  return (
    <svg className="glyph" data-level={level} viewBox="0 0 60 100" aria-hidden focusable="false">
      {level === 'mute' ? (
        <path className="ink" d="M26 22 L36 36 C31 41 30 46 36 54 C30 52 26 56 30 66 C22 60 22 52 29 50 L22 39 C27 35 28 30 26 22 Z" />
      ) : (
        <>
          {level === 'accent' && <path className="stroke" d="M20 10 L42 15.5 L20 21" />}
          <path className="stroke stem" d="M41 78 L41 30" />
          <ellipse className="ink" cx="31" cy="79" rx="11.5" ry="8" transform="rotate(-22 31 79)" />
          {level === 'ghost' && (
            <>
              <path className="stroke paren" d="M14 66 C8 74 8 86 14 94" />
              <path className="stroke paren" d="M49 66 C55 74 55 86 49 94" />
            </>
          )}
        </>
      )}
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
