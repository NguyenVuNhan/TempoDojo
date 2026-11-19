import { useMemo } from 'react';
import {
  averageSessionMinutes,
  practiceDays,
  sessionsPerWeek,
  timeBySource,
  weekStart,
  type Interval,
  type Session,
} from '@tempodojo/core-practice';

const MS_PER_MINUTE = 60_000;
const WEEKS_IN_CHART = 8;
const WEEKS_IN_CALENDAR = 12;
const DAYS_IN_WEEK = 7;

function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function dayLevel(minutes: number): 0 | 1 | 2 | 3 | 4 {
  if (minutes <= 0) return 0;
  if (minutes < 15) return 1;
  if (minutes < 30) return 2;
  if (minutes < 60) return 3;
  return 4;
}

export function StatsBlock({ sessions, intervals, now }: { sessions: Session[]; intervals: Interval[]; now: number }) {
  const avgMinutes = averageSessionMinutes(sessions);
  const weeklyCounts = useMemo(() => sessionsPerWeek(sessions, WEEKS_IN_CHART, now), [sessions, now]);
  const maxWeekCount = Math.max(1, ...weeklyCounts);

  const thisWeekRows = useMemo(() => {
    const start = weekStart(now);
    const bySource = timeBySource(intervals.filter((iv) => iv.start >= start));
    const entries: Array<{ label: string; ms: number }> = [
      { label: 'Hands', ms: bySource.hands },
      { label: 'Coordination', ms: bySource.coordination },
      { label: 'Feet', ms: bySource.feet },
      { label: 'Metronome', ms: bySource.metronome },
    ];
    return entries.filter((e) => e.ms > 0);
  }, [intervals, now]);

  const calendarDays = useMemo(() => {
    const currentWeekStart = weekStart(now);
    const startDate = new Date(currentWeekStart);
    startDate.setDate(startDate.getDate() - (WEEKS_IN_CALENDAR - 1) * DAYS_IN_WEEK);

    const endDate = new Date(currentWeekStart);
    endDate.setDate(endDate.getDate() + DAYS_IN_WEEK);

    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const todayStart = today.getTime();

    const minutesMap = practiceDays(sessions, startDate.getTime(), endDate.getTime());
    const totalDays = WEEKS_IN_CALENDAR * DAYS_IN_WEEK;
    const days: Array<{ key: string; level: 0 | 1 | 2 | 3 | 4; future: boolean }> = [];

    for (let i = 0; i < totalDays; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const key = localDateKey(d);
      const future = d.getTime() > todayStart;
      const mins = future ? 0 : (minutesMap.get(key) ?? 0);
      days.push({
        key,
        level: future ? 0 : dayLevel(mins),
        future,
      });
    }
    return days;
  }, [sessions, now]);

  return (
    <div className="stats-block">
      <div className="stat-group">
        <h3 className="stat-label">Average session</h3>
        <p className="stat-value">{avgMinutes} min</p>
      </div>

      <div className="stat-group">
        <h3 className="stat-label">Sessions per week</h3>
        <div className="week-bars">
          {weeklyCounts.map((n, i) => (
            <div className="week-bar" data-count={n} key={i}>
              <span className="week-count">{n}</span>
              <div className="week-track">
                <div
                  className="week-fill"
                  data-zero={n === 0}
                  style={{ height: n === 0 ? '2px' : `${(n / maxWeekCount) * 100}%` }}
                />
              </div>
            </div>
          ))}
          <span className="week-caption">8 weeks ago</span>
          <span className="week-caption week-caption-now">This week</span>
        </div>
      </div>

      {thisWeekRows.length > 0 && (
        <div className="stat-group">
          <h3 className="stat-label">Time this week</h3>
          <ul className="time-list" aria-label="Time this week">
            {thisWeekRows.map((row) => (
              <li key={row.label}>
                <span>{row.label}</span>
                <span>{Math.round(row.ms / MS_PER_MINUTE)} min</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="stat-group">
        <h3 className="stat-label">Practice days</h3>
        <div role="img" aria-label="Practice days, last 12 weeks" className="calendar">
          {calendarDays.map((d) => (
            <span
              key={d.key}
              className="day"
              data-level={d.level}
              data-future={d.future ? '' : undefined}
            />
          ))}
        </div>
        <div className="calendar-legend" aria-hidden="true">
          <span>Less</span>
          {[0, 1, 2, 3, 4].map((lvl) => (
            <span key={lvl} className="day" data-level={lvl} />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
