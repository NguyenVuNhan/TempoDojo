import { ClickTimeline, DEFAULT_SETTINGS } from '@tempodojo/core-metronome';
import { exerciseById } from './catalogue';
import { RANK_TEST_BARS, rankTestSettings } from './rules';

describe('rank test timing', () => {
  it('counts bars, not beats: bar 8 begins after one count-in bar and 8 full bars', () => {
    const ex = exerciseById('pas-16')!; // 2/4, 16ths
    const s = rankTestSettings(ex, 125, DEFAULT_SETTINGS);
    const beat = 60 / 125;
    const events = new ClickTimeline(s, 0).take(20).filter((e) => e.sub === 0);
    const firstBar8 = events.find((e) => !e.countIn && e.bar >= RANK_TEST_BARS)!;
    expect(firstBar8.time).toBeCloseTo((1 + RANK_TEST_BARS) * 2 * beat, 5);
    expect(events.filter((e) => e.countIn)).toHaveLength(2);
    expect(events.filter((e) => !e.countIn && e.bar === 2).every((e) => e.level === 'mute')).toBe(true);
  });
});
