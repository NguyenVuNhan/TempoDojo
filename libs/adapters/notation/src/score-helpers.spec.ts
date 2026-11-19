import { barRangeToTicks, pickDrumTrack, scoreInfoFrom } from './score-helpers';

const track = (isPercussion: boolean) => ({ staves: [{ isPercussion }] });
const bar = (start: number, section: { text: string } | null = null) => ({ start, section, calculateDuration: () => 3840 });

describe('score helpers', () => {
  it('pickDrumTrack finds the first percussion track', () => {
    expect(pickDrumTrack([track(false), track(false), track(true), track(true)])).toBe(2);
  });

  it('pickDrumTrack falls back to the first track', () => {
    expect(pickDrumTrack([track(false), track(false)])).toBe(0);
    expect(pickDrumTrack([])).toBe(0);
  });

  it('barRangeToTicks covers whole bars, 1-based and inclusive', () => {
    const bars = [bar(0), bar(3840), bar(7680)];
    expect(barRangeToTicks(bars, 2, 3)).toEqual({ startTick: 3840, endTick: 11520 });
    expect(barRangeToTicks(bars, 1, 1)).toEqual({ startTick: 0, endTick: 3840 });
  });

  it('barRangeToTicks clamps to the score', () => {
    const bars = [bar(0), bar(3840)];
    expect(barRangeToTicks(bars, 0, 9)).toEqual({ startTick: 0, endTick: 7680 });
  });

  it('scoreInfoFrom maps sections to 1-based markers', () => {
    const info = scoreInfoFrom({
      title: 'Back in Black',
      tempo: 94,
      masterBars: [bar(0, { text: 'Intro' }), bar(3840), bar(7680), bar(11520), bar(15360, { text: 'Verse' })],
    });
    expect(info).toEqual({
      title: 'Back in Black',
      tempo: 94,
      barCount: 5,
      markers: [
        { bar: 1, name: 'Intro' },
        { bar: 5, name: 'Verse' },
      ],
    });
  });

  it('scoreInfoFrom trims titles and skips unnamed sections', () => {
    const info = scoreInfoFrom({ title: '  ', tempo: 120, masterBars: [bar(0, { text: '' }), bar(3840, { text: ' Chorus ' })] });
    expect(info.title).toBe('');
    expect(info.markers).toEqual([{ bar: 2, name: 'Chorus' }]);
  });

  it('scoreInfoFrom falls back to the section marker when the text is empty', () => {
    const info = scoreInfoFrom({ title: 'X', tempo: 100, masterBars: [{ section: { text: '', marker: 'Verse' } }] });
    expect(info.markers).toEqual([{ bar: 1, name: 'Verse' }]);
  });

  it('scoreInfoFrom turns non-breaking spaces into normal ones', () => {
    const info = scoreInfoFrom({ title: 'Demo Groove  (x)', tempo: 100, masterBars: [{ section: { text: 'Pre Chorus' } }] });
    expect(info.title).toBe('Demo Groove (x)');
    expect(info.markers[0].name).toBe('Pre Chorus');
  });
});
