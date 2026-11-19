import type { LoopTrainer } from '@tempodojo/core-songlab';
import './sections.css';

export const DEFAULT_TRAINER: LoopTrainer = {
  startPercent: 60,
  targetPercent: 100,
  stepPercent: 5,
  everyPasses: 2,
};

export interface TrainerControlsProps {
  trainer: LoopTrainer | null;
  onChange: (t: LoopTrainer | null) => void;
}

function clampInt(raw: string, min: number, max: number): number | null {
  if (raw.trim() === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, Math.round(n)));
}

/** Toggle and 2×2 numeric controls for the progressive-tempo loop trainer. */
export function TrainerControls({ trainer, onChange }: TrainerControlsProps) {
  const updateField = (
    field: keyof LoopTrainer,
    raw: string,
    min: number,
    max: number,
  ) => {
    if (!trainer) return;
    const value = clampInt(raw, min, max);
    if (value === null) return;
    onChange({ ...trainer, [field]: value });
  };

  const summary = trainer
    ? (() => {
        const down = trainer.targetPercent < trainer.startPercent;
        const sign = down ? '\u2212' : '+';
        const dir = down ? 'down to' : 'up to';
        const freq =
          trainer.everyPasses === 1
            ? 'every pass'
            : `every ${trainer.everyPasses} passes`;
        return `Starts at ${trainer.startPercent} %, ${sign}${trainer.stepPercent} % ${freq}, ${dir} ${trainer.targetPercent} %.`;
      })()
    : null;

  return (
    <div className="trainer-controls">
      <label className="check">
        <input
          type="checkbox"
          checked={trainer !== null}
          onChange={(e) => onChange(e.target.checked ? DEFAULT_TRAINER : null)}
        />
        <span>Loop trainer</span>
      </label>

      {trainer !== null && (
        <>
          <div className="num-row">
            <label className="num">
              <span>Start %</span>
              <input
                type="number"
                min={25}
                max={200}
                value={trainer.startPercent}
                onChange={(e) =>
                  updateField('startPercent', e.target.value, 25, 200)
                }
              />
            </label>
            <label className="num">
              <span>Target %</span>
              <input
                type="number"
                min={25}
                max={200}
                value={trainer.targetPercent}
                onChange={(e) =>
                  updateField('targetPercent', e.target.value, 25, 200)
                }
              />
            </label>
            <label className="num">
              <span>Step %</span>
              <input
                type="number"
                min={1}
                max={50}
                value={trainer.stepPercent}
                onChange={(e) =>
                  updateField('stepPercent', e.target.value, 1, 50)
                }
              />
            </label>
            <label className="num">
              <span>Every N passes</span>
              <input
                type="number"
                min={1}
                max={32}
                value={trainer.everyPasses}
                onChange={(e) =>
                  updateField('everyPasses', e.target.value, 1, 32)
                }
              />
            </label>
          </div>
          <p className="trainer-summary">{summary}</p>
        </>
      )}
    </div>
  );
}
