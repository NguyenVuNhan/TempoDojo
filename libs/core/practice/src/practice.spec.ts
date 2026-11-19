import { playIntervals, toSessions } from './sessions';
import {
  averageSessionMinutes,
  practiceDays,
  sessionsPerWeek,
  timeBySource,
  weekStart,
  weeklyProgress,
} from './stats';
import { DEFAULT_WEEKLY_TARGET, type PracticeEvent, type PracticeSource } from './types';

const MIN = 60_000;
const metro: PracticeSource = { kind: 'metronome' };
const para: PracticeSource = { kind: 'exercise', exerciseId: 'pas-16', track: 'hands' };
const groove: PracticeSource = { kind: 'exercise', exerciseId: 'coord-1-1', track: 'coordination' };

// Monday 2026-11-16 10:00 local
const MON = new Date(2026, 10, 16, 10, 0, 0).getTime();

let n = 0;
const ev = (type: 'play' | 'stop', at: number, source: PracticeSource = metro): PracticeEvent => ({ id: `e${++n}`, type, at, source });

describe('playIntervals', () => {
  it('pairs play and stop, sorted by time', () => {
    const events = [ev('stop', MON + 5 * MIN), ev('play', MON)];
    expect(playIntervals(events, MON + 60 * MIN)).toEqual([{ start: MON, end: MON + 5 * MIN, source: metro }]);
  });

  it('unmatched play is capped at 30 minutes, the next event, or now', () => {
    expect(playIntervals([ev('play', MON)], MON + 120 * MIN)[0].end).toBe(MON + 30 * MIN);
    const twoPlays = playIntervals([ev('play', MON), ev('play', MON + 10 * MIN), ev('stop', MON + 12 * MIN)], MON + 60 * MIN);
    expect(twoPlays.map((i) => [i.start, i.end])).toEqual([
      [MON, MON + 10 * MIN],
      [MON + 10 * MIN, MON + 12 * MIN],
    ]);
    expect(playIntervals([ev('play', MON)], MON + 3 * MIN)[0].end).toBe(MON + 3 * MIN);
  });

  it('ignores a stop with no play', () => {
    expect(playIntervals([ev('stop', MON)], MON + MIN)).toEqual([]);
  });
});

describe('toSessions', () => {
  it('merges plays within 10 minutes and splits beyond', () => {
    const intervals = playIntervals(
      [
        ev('play', MON),
        ev('stop', MON + 5 * MIN),
        ev('play', MON + 10 * MIN, para),
        ev('stop', MON + 20 * MIN, para),
        ev('play', MON + 31 * MIN),
        ev('stop', MON + 33 * MIN),
      ],
      MON + 60 * MIN,
    );
    const sessions = toSessions(intervals);
    expect(sessions).toHaveLength(2);
    expect(sessions[0]).toMatchObject({ start: MON, end: MON + 20 * MIN, playedMs: 15 * MIN });
    expect(sessions[0].intervals).toHaveLength(2);
    expect(sessions[1]).toMatchObject({ start: MON + 31 * MIN, end: MON + 33 * MIN, playedMs: 2 * MIN });
  });

  it('returns nothing for no intervals', () => {
    expect(toSessions([])).toEqual([]);
  });
});

describe('stats', () => {
  const sessionAt = (start: number, minutes: number, source = metro) =>
    toSessions(playIntervals([ev('play', start, source), ev('stop', start + minutes * MIN, source)], start + 999 * MIN))[0];

  it('weekStart is local Monday midnight', () => {
    const wed = new Date(2026, 10, 18, 15, 30).getTime();
    expect(weekStart(wed)).toBe(new Date(2026, 10, 16, 0, 0, 0, 0).getTime());
    const sun = new Date(2026, 10, 22, 23, 0).getTime();
    expect(weekStart(sun)).toBe(new Date(2026, 10, 16).getTime());
  });

  it('weekly progress counts this week only and is met by sessions or minutes', () => {
    const lastWeek = sessionAt(MON - 3 * 24 * 60 * MIN, 50);
    const thisWeek = [sessionAt(MON, 20), sessionAt(MON + 24 * 60 * MIN, 30)];
    const now = MON + 2 * 24 * 60 * MIN;
    expect(weeklyProgress([lastWeek, ...thisWeek], DEFAULT_WEEKLY_TARGET, now)).toEqual({ sessions: 2, minutes: 50, met: false });
    expect(weeklyProgress(thisWeek, { sessions: 2, minutes: 999 }, now).met).toBe(true);
    expect(weeklyProgress(thisWeek, { sessions: 99, minutes: 50 }, now).met).toBe(true);
  });

  it('average session length in minutes, 1 decimal', () => {
    expect(averageSessionMinutes([])).toBe(0);
    expect(averageSessionMinutes([sessionAt(MON, 10), sessionAt(MON + 600 * MIN, 25)])).toBe(17.5);
  });

  it('sessions per week, oldest to newest', () => {
    const now = MON + 60 * MIN;
    const s = [sessionAt(MON - 7 * 24 * 60 * MIN, 5), sessionAt(MON, 5), sessionAt(MON + 30 * MIN + 11 * MIN, 5)];
    expect(sessionsPerWeek(s, 3, now)).toEqual([0, 1, 2]);
  });

  it('time by source attributes exercises to their track and id', () => {
    const intervals = playIntervals(
      [ev('play', MON, para), ev('stop', MON + 4 * MIN, para), ev('play', MON + 5 * MIN, groove), ev('stop', MON + 8 * MIN, groove), ev('play', MON + 9 * MIN), ev('stop', MON + 10 * MIN)],
      MON + 60 * MIN,
    );
    const t = timeBySource(intervals);
    expect(t).toMatchObject({ hands: 4 * MIN, coordination: 3 * MIN, metronome: MIN, feet: 0, song: 0 });
    expect(t.byExercise).toEqual({ 'pas-16': 4 * MIN, 'coord-1-1': 3 * MIN });
  });

  it('practice days keyed by local date with played minutes', () => {
    const days = practiceDays([sessionAt(MON, 20), sessionAt(MON + 120 * MIN, 10)], MON - 24 * 60 * MIN, MON + 7 * 24 * 60 * MIN);
    expect(days.get('2026-11-16')).toBe(30);
    expect(days.size).toBe(1);
  });
});
