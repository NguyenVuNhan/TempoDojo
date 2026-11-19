import { useId } from 'react';
import { MAX_BPM, type Gap, type MetronomeSettings, type SpeedUp } from '@tempodojo/core-metronome';
import { Sheet } from '@tempodojo/ui-kit';

type SpeedUpNumericField = 'startBpm' | 'targetBpm' | 'stepBpm' | 'everyBars';

const SPEED_UP_FIELDS: ReadonlyArray<{ key: SpeedUpNumericField; label: string }> = [
  { key: 'startBpm', label: 'Start BPM' },
  { key: 'targetBpm', label: 'Target BPM' },
  { key: 'stepBpm', label: 'Step BPM' },
  { key: 'everyBars', label: 'Every bars' },
];

const GAP_FIELDS: ReadonlyArray<{ key: keyof Gap; label: string }> = [
  { key: 'barsOn', label: 'Bars on' },
  { key: 'barsOff', label: 'Bars off' },
];

const GAP_PRESETS: ReadonlyArray<{ label: string; gap: Gap }> = [
  { label: '4 on / 1 off', gap: { barsOn: 4, barsOff: 1 } },
  { label: '2 on / 2 off', gap: { barsOn: 2, barsOff: 2 } },
  { label: '4 on / 4 off', gap: { barsOn: 4, barsOff: 4 } },
];

const TIMER_OPTIONS: ReadonlyArray<{ label: string; value: number | null }> = [
  { label: 'Off', value: null },
  { label: '5 min', value: 300 },
  { label: '10 min', value: 600 },
  { label: '20 min', value: 1200 },
];

export interface TrainerSheetProps {
  open: boolean;
  settings: MetronomeSettings;
  onChange: (patch: Partial<MetronomeSettings>) => void;
  countdownSec: number | null;
  onCountdownChange: (sec: number | null) => void;
  onClose: () => void;
}

/** Sheet for configuring speed-up trainer, gap click, and practice timer. */
export function TrainerSheet({
  open,
  settings,
  onChange,
  countdownSec,
  onCountdownChange,
  onClose,
}: TrainerSheetProps) {
  const timerGroupName = useId();
  const { speedUp, gap } = settings.automator;

  const updateAutomator = (patch: Partial<MetronomeSettings['automator']>) => {
    onChange({ automator: { speedUp, gap, ...patch } });
  };

  const toggleSpeedUp = (enabled: boolean) => {
    if (!enabled) {
      updateAutomator({ speedUp: null });
      return;
    }
    const startBpm = Math.round(settings.bpm);
    const next: SpeedUp = {
      startBpm,
      targetBpm: Math.min(MAX_BPM, startBpm + 20),
      stepBpm: 5,
      everyBars: 4,
      pyramid: false,
    };
    updateAutomator({ speedUp: next });
  };

  const updateSpeedUpField = (field: SpeedUpNumericField, raw: string) => {
    if (!speedUp) return;
    const value = Number(raw);
    if (Number.isNaN(value)) return;
    updateAutomator({ speedUp: { ...speedUp, [field]: value } });
  };

  const updateGapField = (field: keyof Gap, raw: string) => {
    if (!gap) return;
    const value = Number(raw);
    if (Number.isNaN(value)) return;
    updateAutomator({ gap: { ...gap, [field]: value } });
  };

  return (
    <Sheet open={open} title="Trainer" onClose={onClose}>
      <section className="field">
        <label className="check">
          <input
            type="checkbox"
            checked={speedUp !== null}
            onChange={(e) => toggleSpeedUp(e.target.checked)}
          />
          <span>Speed-up trainer</span>
        </label>
        {speedUp !== null && (
          <>
            <div className="num-row">
              {SPEED_UP_FIELDS.map(({ key, label }) => (
                <label className="num" key={key}>
                  <span>{label}</span>
                  <input
                    type="number"
                    value={speedUp[key]}
                    onChange={(e) => updateSpeedUpField(key, e.target.value)}
                  />
                </label>
              ))}
            </div>
            <label className="check">
              <input
                type="checkbox"
                checked={speedUp.pyramid}
                onChange={(e) =>
                  updateAutomator({ speedUp: { ...speedUp, pyramid: e.target.checked } })
                }
              />
              <span>Come back down (pyramid)</span>
            </label>
          </>
        )}
      </section>

      <section className="field">
        <label className="check">
          <input
            type="checkbox"
            checked={gap !== null}
            onChange={(e) =>
              updateAutomator({ gap: e.target.checked ? { barsOn: 3, barsOff: 1 } : null })
            }
          />
          <span>Gap click</span>
        </label>
        {gap !== null && (
          <>
            <div className="num-row">
              {GAP_FIELDS.map(({ key, label }) => (
                <label className="num" key={key}>
                  <span>{label}</span>
                  <input
                    type="number"
                    value={gap[key]}
                    onChange={(e) => updateGapField(key, e.target.value)}
                  />
                </label>
              ))}
            </div>
            <div className="segmented">
              {GAP_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  className="text-button"
                  onClick={() => updateAutomator({ gap: preset.gap })}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="field">
        <h3 className="field-label">Timer</h3>
        <div className="segmented" role="radiogroup" aria-label="Timer">
          {TIMER_OPTIONS.map((option) => (
            <label key={option.label}>
              <input
                type="radio"
                name={timerGroupName}
                checked={countdownSec === option.value}
                onChange={() => onCountdownChange(option.value)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </section>
    </Sheet>
  );
}
