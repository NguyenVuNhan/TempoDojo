import { VOICES } from '@tempodojo/audio-web';
import {
  clickPreset2and4,
  defaultBeatUnit,
  pulsesPerBar,
  resizeAccents,
  type Meter,
  type MetronomeSettings,
  type Subdivision,
  type SubdivisionLevel,
} from '@tempodojo/core-metronome';
import { Sheet } from '@tempodojo/ui-kit';

const MIN_BEATS = 1;
const MAX_BEATS = 16;
const DENOMINATORS = [2, 4, 8] as const;

const SUBDIVISIONS: readonly { value: Subdivision; label: string }[] = [
  { value: 1, label: 'Quarters' },
  { value: 2, label: 'Eighths' },
  { value: 3, label: 'Triplets' },
  { value: 4, label: 'Sixteenths' },
  { value: 5, label: 'Quintuplets' },
  { value: 6, label: 'Sextuplets' },
];

const SUBDIVISION_LEVELS: readonly { value: SubdivisionLevel; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'ghost', label: 'Ghost' },
  { value: 'mute', label: 'Mute' },
];

const COUNT_IN_OPTIONS: readonly { value: 0 | 1 | 2; label: string }[] = [
  { value: 0, label: 'None' },
  { value: 1, label: '1 bar' },
  { value: 2, label: '2 bars' },
];

export interface SettingsSheetProps {
  open: boolean;
  settings: MetronomeSettings;
  onChange: (patch: Partial<MetronomeSettings>) => void;
  onClose: () => void;
}

/** Modal sheet for configuring meter, subdivision, click sound, count-in, and accents. */
export function SettingsSheet({ open, settings, onChange, onClose }: SettingsSheetProps) {
  const { beatsPerBar, denominator, beatUnit } = settings.meter;

  const updateMeter = (newMeter: Meter) => {
    onChange({
      meter: newMeter,
      accents: resizeAccents(settings.accents, pulsesPerBar(newMeter)),
    });
  };

  const handleBeatsChange = (n: number) => {
    const nextBeatUnit =
      beatUnit === 'dotted-quarter' && denominator === 8 && n % 3 === 0
        ? 'dotted-quarter'
        : defaultBeatUnit(denominator);
    updateMeter({ beatsPerBar: n, denominator, beatUnit: nextBeatUnit });
  };

  const handleDenominatorChange = (d: 2 | 4 | 8) => {
    updateMeter({ beatsPerBar, denominator: d, beatUnit: defaultBeatUnit(d) });
  };

  const showDottedQuarter = denominator === 8 && beatsPerBar % 3 === 0;

  return (
    <Sheet open={open} title="Meter and sound" onClose={onClose}>
      <section className="field">
        <h3 className="field-label">Beats per bar</h3>
        <div className="stepper">
          <button
            type="button"
            aria-label="Fewer beats"
            disabled={beatsPerBar <= MIN_BEATS}
            onClick={() => handleBeatsChange(beatsPerBar - 1)}
          >
            −
          </button>
          <output className="stepper-value">{beatsPerBar}</output>
          <button
            type="button"
            aria-label="More beats"
            disabled={beatsPerBar >= MAX_BEATS}
            onClick={() => handleBeatsChange(beatsPerBar + 1)}
          >
            +
          </button>
        </div>
      </section>

      <section className="field">
        <h3 className="field-label">Note value</h3>
        <div className="segmented" role="radiogroup" aria-label="Note value">
          {DENOMINATORS.map((d) => (
            <label key={d}>
              <input
                type="radio"
                name="denominator"
                value={d}
                checked={denominator === d}
                onChange={() => handleDenominatorChange(d)}
              />
              <span>{d}</span>
            </label>
          ))}
        </div>
        {showDottedQuarter && (
          <label className="check">
            <input
              type="checkbox"
              checked={beatUnit === 'dotted-quarter'}
              onChange={(e) =>
                updateMeter({
                  beatsPerBar,
                  denominator,
                  beatUnit: e.target.checked ? 'dotted-quarter' : 'eighth',
                })
              }
            />
            <span>Dotted-quarter pulse</span>
          </label>
        )}
      </section>

      <section className="field">
        <h3 className="field-label">Subdivision</h3>
        <div className="segmented" role="radiogroup" aria-label="Subdivision">
          {SUBDIVISIONS.map((sub) => (
            <label key={sub.value}>
              <input
                type="radio"
                name="subdivision"
                value={sub.value}
                checked={settings.subdivision === sub.value}
                onChange={() => onChange({ subdivision: sub.value })}
              />
              <span>{sub.label}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="field">
        <h3 className="field-label">Subdivision clicks</h3>
        <div className="segmented" role="radiogroup" aria-label="Subdivision clicks">
          {SUBDIVISION_LEVELS.map((level) => (
            <label key={level.value}>
              <input
                type="radio"
                name="subdivisionLevel"
                value={level.value}
                checked={settings.subdivisionLevel === level.value}
                onChange={() => onChange({ subdivisionLevel: level.value })}
              />
              <span>{level.label}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="field">
        <h3 className="field-label">Sound</h3>
        <div className="segmented" role="radiogroup" aria-label="Sound">
          {VOICES.map((voice) => (
            <label key={voice.id}>
              <input
                type="radio"
                name="soundId"
                value={voice.id}
                checked={settings.soundId === voice.id}
                onChange={() => onChange({ soundId: voice.id })}
              />
              <span>{voice.label}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="field">
        <h3 className="field-label">Count-in</h3>
        <div className="segmented" role="radiogroup" aria-label="Count-in">
          {COUNT_IN_OPTIONS.map((opt) => (
            <label key={opt.value}>
              <input
                type="radio"
                name="countInBars"
                value={opt.value}
                checked={settings.countInBars === opt.value}
                onChange={() => onChange({ countInBars: opt.value })}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="field">
        <h3 className="field-label">Accents</h3>
        <button
          type="button"
          className="text-button"
          onClick={() => onChange({ accents: clickPreset2and4(settings.meter) })}
        >
          Click on 2 and 4
        </button>
      </section>
    </Sheet>
  );
}
