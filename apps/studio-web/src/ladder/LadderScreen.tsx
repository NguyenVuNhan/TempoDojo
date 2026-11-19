import { useState } from 'react';
import { TRACKS, nextTarget, visibleExercises, type Exercise, type Track } from '@tempodojo/core-ladder';
import '@tempodojo/ui-kit';
import { NOTE_VALUE, RANK_LABEL, TRACK_LABEL } from './labels';
import type { LadderState } from './types';
import './ladder.css';

export function LadderScreen({ ladder, onOpen }: { ladder: LadderState; onOpen: (ex: Exercise) => void }) {
  const [track, setTrack] = useState<Track>('hands');

  const visible = visibleExercises(ladder.catalogue, ladder.prefs.hasDoublePedal);
  const trackExercises = visible.filter((ex) => ex.track === track);
  const rankedCount = trackExercises.filter((ex) => ladder.progressOf(ex.id).rank !== 'unranked').length;

  const tiersMap = new Map<number, Exercise[]>();
  for (const ex of trackExercises) {
    const list = tiersMap.get(ex.tier);
    if (list) list.push(ex);
    else tiersMap.set(ex.tier, [ex]);
  }
  const tiers = [...tiersMap.entries()].sort((a, b) => a[0] - b[0]);

  return (
    <main className="ladder">
      <header className="running-head">
        <span>Ladder</span>
        <span>
          {rankedCount} of {trackExercises.length} ranked
        </span>
      </header>

      <div className="segmented ladder-tracks" role="radiogroup" aria-label="Track">
        {TRACKS.map((t) => (
          <label key={t}>
            <input type="radio" name="track" value={t} checked={track === t} onChange={() => setTrack(t)} />
            <span>{TRACK_LABEL[t]}</span>
          </label>
        ))}
      </div>

      {track === 'feet' && (
        <label className="check ladder-double-pedal">
          <input
            type="checkbox"
            checked={ladder.prefs.hasDoublePedal}
            onChange={(e) => ladder.setPrefs({ ...ladder.prefs, hasDoublePedal: e.target.checked })}
          />
          <span>I have a double pedal</span>
        </label>
      )}

      {tiers.map(([tier, exercises]) => {
        const tierLocked = !ladder.unlocked(exercises[0]);
        return (
          <section className="tier" key={tier}>
            <h2>Tier {tier}</h2>
            {tierLocked && <p className="tier-lock">Locked — reach Bronze on every tier {tier - 1} exercise</p>}
            <ul className="ladder-rows">
              {exercises.map((ex) => {
                const progress = ladder.progressOf(ex.id);
                const locked = !ladder.unlocked(ex);
                const next = nextTarget(progress.rank, ex.targets);
                const notStarted = progress.rank === 'unranked' && progress.bestCleanBpm === null;
                const statusText = notStarted
                  ? 'Not started'
                  : `${RANK_LABEL[progress.rank]}${progress.bestCleanBpm !== null ? `, best ${Math.round(progress.bestCleanBpm)} ${NOTE_VALUE[ex.subdivision]}` : ''}`;
                const nextText = locked ? 'locked' : next ? `next ${RANK_LABEL[next.rank]} ${next.bpm}` : 'mastered';

                return (
                  <li key={ex.id}>
                    <button
                      type="button"
                      className="ladder-row"
                      aria-disabled={locked}
                      aria-label={`${ex.name}, ${statusText}, ${nextText}`}
                      onClick={() => !locked && onOpen(ex)}
                    >
                      <span className="rank-mark" data-rank={progress.rank} aria-hidden />
                      <span className="row-name">{ex.name}</span>
                      <span className="row-status">
                        {notStarted ? (
                          'Not started'
                        ) : (
                          <>
                            <span className="row-rank" data-ranked={progress.rank !== 'unranked'}>
                              {RANK_LABEL[progress.rank]}
                            </span>
                            {progress.bestCleanBpm !== null && (
                              <span>{` · Best ${Math.round(progress.bestCleanBpm)} · ${NOTE_VALUE[ex.subdivision]}`}</span>
                            )}
                          </>
                        )}
                      </span>
                      {!locked && (
                        <span className="row-next">
                          {next ? `Next: ${RANK_LABEL[next.rank]} ${next.bpm}` : 'Mastered'}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </main>
  );
}
