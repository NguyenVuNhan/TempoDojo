import { newSection, recordSectionClean } from './progress';
import { normalizeRange, rangeLabel, sectionsFromMarkers } from './ranges';
import { GP_MAX_PERCENT, GP_MIN_PERCENT, YOUTUBE_RATES, clampGpPercent, snapYoutubeRate, trainerPercent } from './trainer';
import { parseYoutubeId } from './youtube-id';

describe('normalizeRange', () => {
  it('normalizeRange orders and clamps bars', () => {
    expect(normalizeRange({ kind: 'bars', startBar: 12, endBar: 4 }, { barCount: 10 })).toEqual({ kind: 'bars', startBar: 4, endBar: 10 });
    expect(normalizeRange({ kind: 'bars', startBar: 0, endBar: 0 }, { barCount: 10 })).toEqual({ kind: 'bars', startBar: 1, endBar: 1 });
    expect(normalizeRange({ kind: 'bars', startBar: 2.6, endBar: 5.2 }, {})).toEqual({ kind: 'bars', startBar: 3, endBar: 5 });
  });

  it('normalizeRange orders and clamps times, at least one second long', () => {
    expect(normalizeRange({ kind: 'time', startSec: 90, endSec: 30 }, { durationSec: 60 })).toEqual({ kind: 'time', startSec: 30, endSec: 60 });
    expect(normalizeRange({ kind: 'time', startSec: 5, endSec: 5.2 }, { durationSec: 60 })).toEqual({ kind: 'time', startSec: 5, endSec: 6 });
    expect(normalizeRange({ kind: 'time', startSec: 59.8, endSec: 60 }, { durationSec: 60 })).toEqual({ kind: 'time', startSec: 59, endSec: 60 });
    expect(normalizeRange({ kind: 'time', startSec: -3, endSec: 4 }, {})).toEqual({ kind: 'time', startSec: 0, endSec: 4 });
  });
});

describe('rangeLabel', () => {
  it('labels bars and times', () => {
    expect(rangeLabel({ kind: 'bars', startBar: 9, endBar: 16 })).toBe('Bars 9–16');
    expect(rangeLabel({ kind: 'bars', startBar: 3, endBar: 3 })).toBe('Bar 3');
    expect(rangeLabel({ kind: 'time', startSec: 65, endSec: 92.7 })).toBe('1:05–1:32');
    expect(rangeLabel({ kind: 'time', startSec: 5, endSec: 3605 })).toBe('0:05–60:05');
  });
});

describe('sectionsFromMarkers', () => {
  it('turns score markers into back-to-back sections ending at the last bar', () => {
    let n = 0;
    const s = sectionsFromMarkers(
      { title: 'Song', barCount: 20, tempo: 120, markers: [{ bar: 1, name: 'Intro' }, { bar: 5, name: 'Verse' }, { bar: 13, name: 'Chorus' }] },
      () => `s${++n}`,
    );
    expect(s.map((x) => [x.id, x.name, x.range])).toEqual([
      ['s1', 'Intro', { kind: 'bars', startBar: 1, endBar: 4 }],
      ['s2', 'Verse', { kind: 'bars', startBar: 5, endBar: 12 }],
      ['s3', 'Chorus', { kind: 'bars', startBar: 13, endBar: 20 }],
    ]);
    expect(s.every((x) => x.fromFile && x.bestCleanPercent === null && x.exerciseId === null)).toBe(true);
  });

  it('sorts markers, drops blank names and empty ranges', () => {
    const s = sectionsFromMarkers(
      { title: 'Song', barCount: 8, tempo: 100, markers: [{ bar: 5, name: 'B' }, { bar: 1, name: 'A' }, { bar: 5, name: 'B again' }, { bar: 7, name: '  ' }] },
      () => 'x',
    );
    expect(s.map((x) => [x.name, x.range])).toEqual([
      ['A', { kind: 'bars', startBar: 1, endBar: 4 }],
      ['B again', { kind: 'bars', startBar: 5, endBar: 8 }],
    ]);
  });
});

describe('loop trainer', () => {
  it('steps every N passes and holds at the target', () => {
    const t = { startPercent: 60, targetPercent: 100, stepPercent: 10, everyPasses: 2 };
    expect(Array.from({ length: 10 }, (_, i) => trainerPercent(t, i))).toEqual([60, 60, 70, 70, 80, 80, 90, 90, 100, 100]);
    expect(trainerPercent(t, 20)).toBe(100);
  });

  it('can step down', () => {
    const t = { startPercent: 100, targetPercent: 80, stepPercent: 5, everyPasses: 1 };
    expect(Array.from({ length: 6 }, (_, i) => trainerPercent(t, i))).toEqual([100, 95, 90, 85, 80, 80]);
  });

  it('a step that overshoots stops at the target', () => {
    expect(trainerPercent({ startPercent: 60, targetPercent: 75, stepPercent: 10, everyPasses: 1 }, 2)).toBe(75);
  });
});

describe('tempo limits', () => {
  it('clampGpPercent rounds into 25–150', () => {
    expect([GP_MIN_PERCENT, GP_MAX_PERCENT]).toEqual([25, 150]);
    expect(clampGpPercent(10)).toBe(25);
    expect(clampGpPercent(151)).toBe(150);
    expect(clampGpPercent(87.4)).toBe(87);
  });

  it('snapYoutubeRate picks the nearest supported rate, ties down', () => {
    expect(YOUTUBE_RATES).toEqual([0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]);
    expect(snapYoutubeRate(60)).toBe(0.5);
    expect(snapYoutubeRate(63)).toBe(0.75);
    expect(snapYoutubeRate(62.5)).toBe(0.5);
    expect(snapYoutubeRate(300)).toBe(2);
    expect(snapYoutubeRate(10)).toBe(0.25);
  });
});

describe('parseYoutubeId', () => {
  it('reads the id from every common link shape', () => {
    const id = 'dQw4w9WgXcQ';
    for (const url of [
      `https://www.youtube.com/watch?v=${id}&t=42s`,
      `https://youtu.be/${id}?si=abc`,
      `https://m.youtube.com/watch?list=x&v=${id}`,
      `https://www.youtube.com/shorts/${id}`,
      `https://www.youtube.com/embed/${id}`,
      `youtube.com/watch?v=${id}`,
      `  https://music.youtube.com/watch?v=${id}  `,
    ]) {
      expect(parseYoutubeId(url)).toBe(id);
    }
  });

  it('refuses anything else', () => {
    for (const url of ['https://vimeo.com/123', 'not a url', 'https://youtube.com/watch?v=short', 'https://evil.com/watch?v=dQw4w9WgXcQ', '']) {
      expect(parseYoutubeId(url)).toBeNull();
    }
  });
});

describe('section progress', () => {
  it('newSection starts blank', () => {
    expect(newSection('Fill', { kind: 'bars', startBar: 8, endBar: 8 }, 'id1')).toEqual({
      id: 'id1',
      name: 'Fill',
      range: { kind: 'bars', startBar: 8, endBar: 8 },
      bestCleanPercent: null,
      exerciseId: null,
      fromFile: false,
    });
  });

  it('recordSectionClean never lowers', () => {
    const s = newSection('Fill', { kind: 'bars', startBar: 1, endBar: 2 }, 'a');
    const a = recordSectionClean(s, 80);
    expect(a.bestCleanPercent).toBe(80);
    expect(recordSectionClean(a, 70).bestCleanPercent).toBe(80);
    expect(recordSectionClean(a, 95).bestCleanPercent).toBe(95);
    expect(s.bestCleanPercent).toBeNull();
  });
});
