import { useEffect, useState } from 'react';
import { TRACKS, type Exercise } from '@tempodojo/core-ladder';
import {
  newSection,
  normalizeRange,
  rangeLabel,
  recordSectionClean,
  type LoopRange,
  type Section,
  type Song,
} from '@tempodojo/core-songlab';
import { Sheet } from '@tempodojo/ui-kit';
import { TRACK_LABEL } from '../ladder/labels';
import './sections.css';

export interface SectionsSheetProps {
  open: boolean;
  song: Song;
  currentRange: LoopRange | null;
  currentPercent: number;
  exercises: Exercise[];
  onChange: (sections: Section[]) => void;
  onLoop: (s: Section) => void;
  onOpenExercise: (ex: Exercise) => void;
  onClose: () => void;
  confirm?: (m: string) => boolean;
  makeId?: () => string;
}

const defaultConfirm = (m: string) => window.confirm(m);
const defaultMakeId = () => crypto.randomUUID();

/** Sheet for saving the current loop as a section and managing saved sections. */
export function SectionsSheet({
  open,
  song,
  currentRange,
  currentPercent,
  exercises,
  onChange,
  onLoop,
  onOpenExercise,
  onClose,
  confirm = defaultConfirm,
  makeId = defaultMakeId,
}: SectionsSheetProps) {
  const defaultName = `Section ${song.sections.length + 1}`;
  const [newName, setNewName] = useState(defaultName);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  useEffect(() => {
    if (open) {
      setNewName(`Section ${song.sections.length + 1}`);
    }
  }, [open, song.sections.length]);

  const handleSave = () => {
    if (!currentRange) return;
    const trimmed = newName.trim() || defaultName;
    const section = newSection(
      trimmed,
      normalizeRange(currentRange, {}),
      makeId(),
    );
    onChange([...song.sections, section]);
  };

  const commitRename = (section: Section) => {
    if (renamingId !== section.id) return;
    const trimmed = renameValue.trim();
    setRenamingId(null);
    if (trimmed && trimmed !== section.name) {
      onChange(
        song.sections.map((s) =>
          s.id === section.id ? { ...s, name: trimmed } : s,
        ),
      );
    }
  };

  return (
    <Sheet open={open} title="Sections" onClose={onClose}>
      <section className="field">
        <h3 className="field-label">Save this loop</h3>
        {currentRange ? (
          <>
            <label className="section-input-field">
              <span className="field-label">Section name</span>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </label>
            <button
              type="button"
              className="section-save"
              onClick={handleSave}
            >
              Save loop as section
            </button>
          </>
        ) : (
          <p className="empty-note">
            Set a loop first, then save it here as a section.
          </p>
        )}
      </section>

      <section className="field">
        <ul className="section-list">
          {song.sections.map((section) => {
            const linked = section.exerciseId
              ? exercises.find((ex) => ex.id === section.exerciseId) ?? null
              : null;
            const isRenaming = renamingId === section.id;

            return (
              <li key={section.id} className="section-row">
                <div className="section-header">
                  <h3>{section.name}</h3>
                  <div className="section-meta">
                    <span>{rangeLabel(section.range)}</span>
                    <span>
                      {section.bestCleanPercent !== null
                        ? `Best ${section.bestCleanPercent} %`
                        : 'No clean pass yet'}
                    </span>
                    {section.fromFile && <span>From the file</span>}
                  </div>
                </div>

                {isRenaming && (
                  <label className="section-input-field">
                    <span className="field-label">New name</span>
                    <input
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => commitRename(section)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          commitRename(section);
                        } else if (e.key === 'Escape') {
                          e.stopPropagation();
                          setRenamingId(null);
                        }
                      }}
                    />
                  </label>
                )}

                {linked && (
                  <button
                    type="button"
                    className="section-exercise-link"
                    onClick={() => onOpenExercise(linked)}
                  >
                    Practise {linked.name}
                  </button>
                )}

                <label className="section-select-field">
                  <span className="field-label">Linked exercise</span>
                  <select
                    value={section.exerciseId ?? ''}
                    onChange={(e) => {
                      const exerciseId = e.target.value || null;
                      onChange(
                        song.sections.map((s) =>
                          s.id === section.id ? { ...s, exerciseId } : s,
                        ),
                      );
                    }}
                  >
                    <option value="">None</option>
                    {TRACKS.map((track) => {
                      const items = exercises.filter(
                        (ex) => ex.track === track,
                      );
                      if (items.length === 0) return null;
                      return (
                        <optgroup key={track} label={TRACK_LABEL[track]}>
                          {items.map((ex) => (
                            <option key={ex.id} value={ex.id}>
                              {ex.name}
                            </option>
                          ))}
                        </optgroup>
                      );
                    })}
                  </select>
                </label>

                <div className="section-actions">
                  <button
                    type="button"
                    className="text-button section-action-practice"
                    onClick={() => onLoop(section)}
                  >
                    Loop
                  </button>
                  <button
                    type="button"
                    className="text-button section-action-practice"
                    onClick={() =>
                      onChange(
                        song.sections.map((s) =>
                          s.id === section.id
                            ? recordSectionClean(s, currentPercent)
                            : s,
                        ),
                      )
                    }
                  >
                    Clean at {currentPercent} %
                  </button>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => {
                      setRenamingId(section.id);
                      setRenameValue(section.name);
                    }}
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => {
                      if (confirm(`Delete the section "${section.name}"?`)) {
                        onChange(
                          song.sections.filter((s) => s.id !== section.id),
                        );
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </Sheet>
  );
}
