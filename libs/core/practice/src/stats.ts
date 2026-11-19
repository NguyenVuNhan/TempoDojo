import type { Interval, Session, WeeklyTarget } from './types';

const MS_PER_MINUTE = 60_000;
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

export function weekStart(at: number): number {
  const d = new Date(at);
  const day = d.getDay();
  const diffToMonday = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diffToMonday);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function weeklyProgress(
  sessions: Session[],
  target: WeeklyTarget,
  now: number,
): { sessions: number; minutes: number; met: boolean } {
  const start = weekStart(now);
  const end = start + MS_PER_WEEK;
  const inWeek = sessions.filter((s) => s.start >= start && s.start < end);
  const totalMs = inWeek.reduce((sum, s) => sum + (s.end - s.start), 0);
  const minutes = Math.round(totalMs / MS_PER_MINUTE);
  const count = inWeek.length;

  return {
    sessions: count,
    minutes,
    met: count >= target.sessions || minutes >= target.minutes,
  };
}

export function averageSessionMinutes(sessions: Session[]): number {
  if (sessions.length === 0) return 0;
  const totalMs = sessions.reduce((sum, s) => sum + (s.end - s.start), 0);
  return Math.round((totalMs / sessions.length / MS_PER_MINUTE) * 10) / 10;
}

export function sessionsPerWeek(sessions: Session[], weeks: number, now: number): number[] {
  if (weeks <= 0) return [];
  const currentStart = weekStart(now);
  const counts = new Array<number>(weeks).fill(0);

  for (const s of sessions) {
    const idx = weeks - 1 + Math.floor((s.start - currentStart) / MS_PER_WEEK);
    if (idx >= 0 && idx < weeks) {
      counts[idx]++;
    }
  }

  return counts;
}

export function timeBySource(intervals: Interval[]): {
  metronome: number;
  hands: number;
  coordination: number;
  feet: number;
  song: number;
  byExercise: Record<string, number>;
} {
  const result = {
    metronome: 0,
    hands: 0,
    coordination: 0,
    feet: 0,
    song: 0,
    byExercise: {} as Record<string, number>,
  };

  for (const iv of intervals) {
    const ms = iv.end - iv.start;
    switch (iv.source.kind) {
      case 'metronome':
        result.metronome += ms;
        break;
      case 'song':
        result.song += ms;
        break;
      case 'exercise':
        result[iv.source.track] += ms;
        result.byExercise[iv.source.exerciseId] = (result.byExercise[iv.source.exerciseId] ?? 0) + ms;
        break;
    }
  }

  return result;
}

function localDateKey(at: number): string {
  const d = new Date(at);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function practiceDays(sessions: Session[], from: number, to: number): Map<string, number> {
  const msByDay = new Map<string, number>();

  for (const s of sessions) {
    if (s.start >= from && s.start < to) {
      const key = localDateKey(s.start);
      msByDay.set(key, (msByDay.get(key) ?? 0) + (s.end - s.start));
    }
  }

  const minutesByDay = new Map<string, number>();
  for (const [key, ms] of msByDay) {
    minutesByDay.set(key, Math.round(ms / MS_PER_MINUTE));
  }
  return minutesByDay;
}
