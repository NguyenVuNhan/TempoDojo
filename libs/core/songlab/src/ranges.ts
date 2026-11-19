import type { LoopRange, ScoreInfo, Section } from './types';

function formatTime(sec: number): string {
  const total = Math.max(0, Math.floor(sec));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/** Orders and clamps a bar or time loop range to optional song limits. */
export function normalizeRange(
  r: LoopRange,
  limits: { barCount?: number; durationSec?: number },
): LoopRange {
  if (r.kind === 'bars') {
    const a = Math.round(r.startBar);
    const b = Math.round(r.endBar);
    let startBar = Math.max(1, Math.min(a, b));
    let endBar = Math.max(1, Math.max(a, b));
    if (limits.barCount !== undefined) {
      startBar = Math.min(limits.barCount, startBar);
      endBar = Math.min(limits.barCount, endBar);
    }
    return { kind: 'bars', startBar, endBar };
  }

  let startSec = Math.max(0, Math.min(r.startSec, r.endSec));
  let endSec = Math.max(0, Math.max(r.startSec, r.endSec));
  if (limits.durationSec !== undefined) {
    startSec = Math.min(limits.durationSec, startSec);
    endSec = Math.min(limits.durationSec, endSec);
  }
  if (endSec - startSec < 1) {
    endSec = startSec + 1;
    if (limits.durationSec !== undefined && endSec > limits.durationSec) {
      endSec = limits.durationSec;
      startSec = Math.max(0, endSec - 1);
    }
  }
  return { kind: 'time', startSec, endSec };
}

/** Formats a human-readable label for a bar or time loop range. */
export function rangeLabel(r: LoopRange): string {
  if (r.kind === 'bars') {
    return r.startBar === r.endBar
      ? `Bar ${r.startBar}`
      : `Bars ${r.startBar}\u2013${r.endBar}`;
  }
  return `${formatTime(r.startSec)}\u2013${formatTime(r.endSec)}`;
}

/** Builds back-to-back sections from score markers, ending at the score's last bar. */
export function sectionsFromMarkers(
  info: ScoreInfo,
  makeId: () => string,
): Section[] {
  const byBar = new Map<number, string>();
  for (const marker of info.markers) {
    const name = marker.name.trim();
    if (name.length === 0) {
      continue;
    }
    byBar.set(marker.bar, name);
  }

  const sorted = Array.from(byBar.entries()).sort((a, b) => a[0] - b[0]);
  const sections: Section[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const [startBar, name] = sorted[i];
    const endBar = i + 1 < sorted.length ? sorted[i + 1][0] - 1 : info.barCount;
    if (endBar < startBar) {
      continue;
    }
    sections.push({
      id: makeId(),
      name,
      range: { kind: 'bars', startBar, endBar },
      bestCleanPercent: null,
      exerciseId: null,
      fromFile: true,
    });
  }

  return sections;
}
