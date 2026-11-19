import { useMemo, useState } from 'react';
import type { TrackInfo } from '@tempodojo/notation';
import { Sheet } from '@tempodojo/ui-kit';

export interface TracksSheetProps {
  open: boolean;
  tracks: TrackInfo[];
  onMute(index: number, muted: boolean): void;
  onSolo(index: number, solo: boolean): void;
  onClose(): void;
}

/** Modal sheet listing score tracks (drums first) with per-track Mute and Solo toggles. */
export function TracksSheet({ open, tracks, onMute, onSolo, onClose }: TracksSheetProps) {
  const [muted, setMuted] = useState<Record<number, boolean>>({});
  const [soloed, setSoloed] = useState<Record<number, boolean>>({});

  const ordered = useMemo(
    () =>
      [...tracks].sort((a, b) =>
        a.isDrums === b.isDrums ? a.index - b.index : a.isDrums ? -1 : 1,
      ),
    [tracks],
  );

  const toggleMute = (index: number, next: boolean) => {
    setMuted((prev) => ({ ...prev, [index]: next }));
    onMute(index, next);
  };

  const toggleSolo = (index: number, next: boolean) => {
    setSoloed((prev) => ({ ...prev, [index]: next }));
    onSolo(index, next);
  };

  return (
    <Sheet open={open} title="Tracks" onClose={onClose}>
      <section className="field">
        {ordered.length === 0 ? (
          <p className="empty-note">No tracks in this score.</p>
        ) : (
          <ul className="gp-tracks">
            {ordered.map((track) => (
              <li key={track.index} className="gp-track-row">
                <h3 className="row-title">{track.name}</h3>
                <div className="gp-track-actions">
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={Boolean(muted[track.index])}
                      onChange={(e) => toggleMute(track.index, e.target.checked)}
                    />
                    <span>
                      Mute <span className="visually-hidden">{track.name}</span>
                    </span>
                  </label>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={Boolean(soloed[track.index])}
                      onChange={(e) => toggleSolo(track.index, e.target.checked)}
                    />
                    <span>
                      Solo <span className="visually-hidden">{track.name}</span>
                    </span>
                  </label>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Sheet>
  );
}
