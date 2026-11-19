import { useCallback, useEffect, useState } from 'react';
import type { MetronomeSettings, Preset, PresetRepository } from '@tempodojo/core-metronome';
import { Sheet } from '@tempodojo/ui-kit';

export interface PresetsSheetProps {
  open: boolean;
  repo: PresetRepository;
  current: MetronomeSettings;
  onLoad: (preset: Preset) => void;
  onClose: () => void;
  now?: () => number;
  makeId?: () => string;
}

export function PresetsSheet({
  open,
  repo,
  current,
  onLoad,
  onClose,
  now = Date.now,
  makeId = () => crypto.randomUUID(),
}: PresetsSheetProps) {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [name, setName] = useState('');

  const reload = useCallback(async () => {
    const list = await repo.list();
    setPresets(list);
  }, [repo]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    repo.list().then((list) => {
      if (!cancelled) {
        setPresets(list);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, repo]);

  const trimmedName = name.trim();

  const handleSave = async () => {
    if (!trimmedName) return;
    await repo.save({
      id: makeId(),
      name: trimmedName,
      settings: current,
      updatedAt: now(),
    });
    setName('');
    await reload();
  };

  const handleDelete = async (id: string) => {
    await repo.remove(id);
    await reload();
  };

  return (
    <Sheet open={open} title="Presets" onClose={onClose}>
      <section className="field">
        <label className="num">
          <span>Preset name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <button
          type="button"
          className="text-button"
          disabled={trimmedName.length === 0}
          onClick={handleSave}
        >
          Save preset
        </button>
      </section>

      <section className="field">
        <h3 className="field-label">Saved</h3>
        {presets.length === 0 ? (
          <p>No presets yet. Save the current setup to reuse it.</p>
        ) : (
          <ul>
            {presets.map((preset) => {
              const { bpm, meter } = preset.settings;
              return (
                <li key={preset.id}>
                  <span>{preset.name}</span>{' '}
                  <span>{`${Math.round(bpm)} BPM · ${meter.beatsPerBar}/${meter.denominator}`}</span>{' '}
                  <button
                    type="button"
                    className="text-button"
                    aria-label={`Load ${preset.name}`}
                    onClick={() => onLoad(preset)}
                  >
                    Load
                  </button>{' '}
                  <button
                    type="button"
                    className="text-button"
                    aria-label={`Delete ${preset.name}`}
                    onClick={() => handleDelete(preset.id)}
                  >
                    Delete
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </Sheet>
  );
}
