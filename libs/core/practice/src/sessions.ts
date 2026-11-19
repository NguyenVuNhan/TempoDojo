import { MAX_OPEN_PLAY_MS, SESSION_GAP_MS, type Interval, type PracticeEvent, type Session } from './types';

export function playIntervals(events: PracticeEvent[], now: number): Interval[] {
  const sorted = [...events].sort((a, b) => a.at - b.at);
  const intervals: Interval[] = [];
  let open: PracticeEvent | null = null;

  for (const ev of sorted) {
    if (ev.type === 'play') {
      if (open !== null) {
        intervals.push({
          start: open.at,
          end: Math.min(ev.at, open.at + MAX_OPEN_PLAY_MS, now),
          source: open.source,
        });
      }
      open = ev;
    } else if (open !== null) {
      intervals.push({
        start: open.at,
        end: ev.at,
        source: open.source,
      });
      open = null;
    }
  }

  if (open !== null) {
    intervals.push({
      start: open.at,
      end: Math.min(open.at + MAX_OPEN_PLAY_MS, now),
      source: open.source,
    });
  }

  return intervals;
}

export function toSessions(intervals: Interval[]): Session[] {
  if (intervals.length === 0) return [];

  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const sessions: Session[] = [];

  let current: Session = {
    start: sorted[0].start,
    end: sorted[0].end,
    playedMs: sorted[0].end - sorted[0].start,
    intervals: [sorted[0]],
  };

  for (let i = 1; i < sorted.length; i++) {
    const iv = sorted[i];
    if (iv.start - current.end > SESSION_GAP_MS) {
      sessions.push(current);
      current = {
        start: iv.start,
        end: iv.end,
        playedMs: iv.end - iv.start,
        intervals: [iv],
      };
    } else {
      current.end = Math.max(current.end, iv.end);
      current.playedMs += iv.end - iv.start;
      current.intervals.push(iv);
    }
  }

  sessions.push(current);
  return sessions;
}
