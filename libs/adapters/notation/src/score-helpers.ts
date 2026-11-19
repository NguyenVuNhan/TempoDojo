import type { ScoreInfo } from '@tempodojo/core-songlab';

export function pickDrumTrack(tracks: { staves: { isPercussion: boolean }[] }[]): number {
  const index = tracks.findIndex((track) => track.staves.some((staff) => staff.isPercussion));
  return index === -1 ? 0 : index;
}

export function barRangeToTicks(
  masterBars: { start: number; calculateDuration(): number }[],
  startBar: number,
  endBar: number,
): { startTick: number; endTick: number } {
  if (masterBars.length === 0) {
    return { startTick: 0, endTick: 0 };
  }
  const maxBar = masterBars.length;
  const clampedStart = Math.max(1, Math.min(maxBar, startBar));
  const clampedEnd = Math.max(clampedStart, Math.min(maxBar, endBar));
  const first = masterBars[clampedStart - 1];
  const last = masterBars[clampedEnd - 1];
  return {
    startTick: first.start,
    endTick: last.start + last.calculateDuration(),
  };
}

/** Collapses whitespace, including the non-breaking spaces some imports produce, so titles can wrap. */
function clean(text: string): string {
  return text.replace(/\s+/gu, ' ').trim();
}

export function scoreInfoFrom(score: {
  title: string;
  tempo: number;
  masterBars: { section: { text: string; marker?: string } | null }[];
}): ScoreInfo {
  const markers: { bar: number; name: string }[] = [];
  score.masterBars.forEach((bar, index) => {
    // GP sections carry a name in text; MusicXML rehearsal marks can arrive with only the marker.
    const name = bar.section ? clean(bar.section.text) || clean(bar.section.marker ?? '') : '';
    if (name.length > 0) {
      markers.push({ bar: index + 1, name });
    }
  });
  return {
    title: clean(score.title),
    barCount: score.masterBars.length,
    tempo: score.tempo,
    markers,
  };
}
