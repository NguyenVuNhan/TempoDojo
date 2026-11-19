import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { nextTarget, nextUp, type Exercise } from '@tempodojo/core-ladder';
import { playIntervals, toSessions, weeklyProgress, type PracticeEvent } from '@tempodojo/core-practice';
import { Sheet } from '@tempodojo/ui-kit';
import { NOTE_VALUE, RANK_LABEL, TRACK_LABEL } from '../ladder/labels';
import type { LadderState } from '../ladder/types';
import { StatsBlock } from './StatsBlock';
import '../ladder/ladder.css';
import './today.css';

export interface TodayScreenProps {
  ladder: LadderState;
  events: { all(): Promise<PracticeEvent[]> };
  now?: () => number;
  onOpen: (ex: Exercise) => void;
  onOpenMetro: () => void;
  /** Extra settings (the backup section) shown at the bottom of the Settings sheet. */
  settingsExtra?: ReactNode;
}

function clampInt(raw: string, min: number, max: number, fallback: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function TodayScreen({ ladder, events, now = Date.now, onOpen, onOpenMetro, settingsExtra }: TodayScreenProps) {
  const [loadedEvents, setLoadedEvents] = useState<PracticeEvent[] | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draftSessions, setDraftSessions] = useState(String(ladder.prefs.weeklyTarget.sessions));
  const [draftMinutes, setDraftMinutes] = useState(String(ladder.prefs.weeklyTarget.minutes));

  useEffect(() => {
    let cancelled = false;
    events.all().then((list) => {
      if (!cancelled) setLoadedEvents(list);
    });
    return () => {
      cancelled = true;
    };
  }, [events]);

  const t = now();
  const dateLabel = new Date(t)
    .toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
    .replace(/,/g, '');

  const intervals = useMemo(() => playIntervals(loadedEvents ?? [], t), [loadedEvents, t]);
  const sessions = useMemo(() => toSessions(intervals), [intervals]);

  const target = ladder.prefs.weeklyTarget;
  const progress = weeklyProgress(sessions, target, t);

  const upNext = useMemo(
    () => nextUp(ladder.catalogue, ladder.progress, ladder.prefs.hasDoublePedal),
    [ladder.catalogue, ladder.progress, ladder.prefs.hasDoublePedal],
  );

  const openSettings = () => {
    setDraftSessions(String(ladder.prefs.weeklyTarget.sessions));
    setDraftMinutes(String(ladder.prefs.weeklyTarget.minutes));
    setSettingsOpen(true);
  };

  const saveTarget = async () => {
    const nextTargetValue = {
      sessions: clampInt(draftSessions, 1, 14, ladder.prefs.weeklyTarget.sessions),
      minutes: clampInt(draftMinutes, 15, 1200, ladder.prefs.weeklyTarget.minutes),
    };
    await ladder.setPrefs({ ...ladder.prefs, weeklyTarget: nextTargetValue });
    setSettingsOpen(false);
  };

  return (
    <main className="today-page">
      <header className="running-head">
        <span>Today</span>
        <span>{dateLabel}</span>
      </header>

      <section className="today-section">
        <h1>This week</h1>
        <p className="week-progress">
          {progress.sessions} of {target.sessions} sessions · {Math.round(progress.minutes)} of {target.minutes} min
        </p>
        {progress.met && <p className="target-met">Target met</p>}
        <button type="button" className="target-link" onClick={openSettings}>
          Weekly target
        </button>
      </section>

      <section className="today-section">
        <h2>Next up</h2>
        <ul className="ladder-rows" aria-label="Next up">
          {upNext.map((ex) => {
            const p = ladder.progressOf(ex.id);
            const rankPart =
              p.rank === 'unranked' && p.bestCleanBpm == null
                ? 'Not started'
                : `${RANK_LABEL[p.rank]}${p.bestCleanBpm != null ? ` · Best ${p.bestCleanBpm} · ${NOTE_VALUE[ex.subdivision]}` : ''}`;
            const status = `${TRACK_LABEL[ex.track]} · ${rankPart}`;
            const nt = nextTarget(p.rank, ex.targets);
            const next = nt ? `Next: ${RANK_LABEL[nt.rank]} ${nt.bpm}` : 'Mastered';

            return (
              <li key={ex.id}>
                <button
                  type="button"
                  className="ladder-row"
                  aria-label={`${ex.name}, ${status.replaceAll(' · ', ', ')}, ${next}`}
                  onClick={() => onOpen(ex)}
                >
                  <span className="rank-mark" data-rank={p.rank} aria-hidden="true" />
                  <span className="row-name">{ex.name}</span>
                  <span className="row-status">{status}</span>
                  <span className="row-next">{next}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <button type="button" className="text-button today-metro-btn" onClick={onOpenMetro}>
          Plain metronome
        </button>
      </section>

      <section className="today-section">
        <h2>Your practice</h2>
        {sessions.length === 0 ? (
          <p className="empty-note">No sessions yet. Press Play on anything and it counts.</p>
        ) : (
          <StatsBlock sessions={sessions} intervals={intervals} now={t} />
        )}
      </section>

      <Sheet open={settingsOpen} title="Settings" onClose={() => setSettingsOpen(false)}>
        <section className="field">
          <h3 className="field-label">Weekly target</h3>
          <div className="num-row">
            <label className="num">
              <span>Sessions per week</span>
              <input
                type="number"
                min={1}
                max={14}
                value={draftSessions}
                onChange={(e) => setDraftSessions(e.target.value)}
              />
            </label>
            <label className="num">
              <span>Minutes per week</span>
              <input
                type="number"
                min={15}
                max={1200}
                value={draftMinutes}
                onChange={(e) => setDraftMinutes(e.target.value)}
              />
            </label>
          </div>
          <p className="target-note">The week counts as done when either number is reached.</p>
          <button type="button" className="today-primary" onClick={saveTarget}>
            Save target
          </button>
        </section>
        {settingsExtra && <section className="field">{settingsExtra}</section>}
      </Sheet>
    </main>
  );
}
