import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { Exercise } from '@tempodojo/core-ladder';
import type { PracticeEvent, PracticeSource } from '@tempodojo/core-practice';
import type { Prefs } from '@tempodojo/storage';
import { memoryLadderRepos } from '../ladder/test-utils';
import { useLadder } from '../ladder/useLadder';
import type { LadderRepos } from '../ladder/types';
import { TodayScreen } from './TodayScreen';

const MIN = 60_000;
// Wednesday 2026-11-18 12:00 local
const NOW = new Date(2026, 10, 18, 12, 0).getTime();
const MON = new Date(2026, 10, 16, 10, 0).getTime();
const TUE = new Date(2026, 10, 17, 10, 0).getTime();
const metro: PracticeSource = { kind: 'metronome' };
const para: PracticeSource = { kind: 'exercise', exerciseId: 'pas-16', track: 'hands' };

let n = 0;
const ev = (type: 'play' | 'stop', at: number, source: PracticeSource = metro): PracticeEvent => ({ id: `e${++n}`, type, at, source });
const twoSessions = [ev('play', MON), ev('stop', MON + 20 * MIN), ev('play', TUE, para), ev('stop', TUE + 15 * MIN, para)];

function Harness(props: { repos: LadderRepos; events: PracticeEvent[]; onOpen: (e: Exercise) => void; onOpenMetro: () => void }) {
  const ladder = useLadder(props.repos);
  if (!ladder.loaded) return null;
  return (
    <TodayScreen
      ladder={ladder}
      events={{ all: async () => props.events }}
      now={() => NOW}
      onOpen={props.onOpen}
      onOpenMetro={props.onOpenMetro}
      settingsExtra={<p>Backup goes here</p>}
    />
  );
}

const setup = async (events: PracticeEvent[] = [], prefs: Partial<Prefs> = {}) => {
  const m = memoryLadderRepos([], prefs);
  const onOpen = vi.fn();
  const onOpenMetro = vi.fn();
  render(<Harness repos={m.repos} events={events} onOpen={onOpen} onOpenMetro={onOpenMetro} />);
  await screen.findByRole('heading', { level: 1, name: 'This week' });
  return { ...m, onOpen, onOpenMetro };
};

describe('TodayScreen', () => {
  it('fresh data: next up picks two hands, one coordination, one feet; no sessions yet', async () => {
    const { onOpen } = await setup();
    const next = screen.getByRole('list', { name: 'Next up' });
    const rows = within(next).getAllByRole('button');
    expect(rows.map((r) => r.querySelector('.row-name')?.textContent)).toEqual([
      'Single Stroke Roll',
      'Double Stroke Open Roll',
      '8th-Note Rock Foundation',
      'Quarter-Note Heel-Down Pulse',
    ]);
    fireEvent.click(rows[2]);
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 'coord-1-1' }));
    await waitFor(() => expect(screen.getByText('0 of 4 sessions · 0 of 120 min')).toBeTruthy());
    expect(screen.getByText('No sessions yet. Press Play on anything and it counts.')).toBeTruthy();
  });

  it('shows weekly progress, average length and time by track', async () => {
    await setup(twoSessions);
    await waitFor(() => expect(screen.getByText('2 of 4 sessions · 35 of 120 min')).toBeTruthy());
    expect(screen.getByText('17.5 min')).toBeTruthy();
    const byTrack = screen.getByRole('list', { name: 'Time this week' });
    expect(within(byTrack).getByText('Hands').closest('li')?.textContent).toBe('Hands15 min');
    expect(within(byTrack).getByText('Metronome').closest('li')?.textContent).toBe('Metronome20 min');
  });

  it('says when the weekly target is met', async () => {
    await setup(twoSessions, { weeklyTarget: { sessions: 2, minutes: 500 } });
    await waitFor(() => expect(screen.getByText('Target met')).toBeTruthy());
  });

  it('draws 8 weeks of sessions and an 84-day practice calendar', async () => {
    await setup(twoSessions);
    await waitFor(() => expect(document.querySelectorAll('.week-bar')).toHaveLength(8));
    const weeks = [...document.querySelectorAll('.week-bar')].map((b) => b.getAttribute('data-count'));
    expect(weeks.at(-1)).toBe('2');
    const cal = screen.getByRole('img', { name: 'Practice days, last 12 weeks' });
    expect(cal.querySelectorAll('.day')).toHaveLength(84);
    expect(cal.querySelectorAll('.day[data-level]:not([data-level="0"])')).toHaveLength(2);
  });

  it('edits the weekly target in the settings sheet, clamped to range', async () => {
    const { prefs } = await setup();
    fireEvent.click(screen.getByRole('button', { name: 'Weekly target' }));
    const dialog = await screen.findByRole('dialog', { name: 'Settings' });
    expect(within(dialog).getByText('Backup goes here')).toBeTruthy();
    fireEvent.change(within(dialog).getByRole('spinbutton', { name: 'Sessions per week' }), { target: { value: '30' } });
    fireEvent.change(within(dialog).getByRole('spinbutton', { name: 'Minutes per week' }), { target: { value: '150' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save target' }));
    await waitFor(() => expect(prefs.save).toHaveBeenCalledWith(expect.objectContaining({ weeklyTarget: { sessions: 14, minutes: 150 } })));
  });

  it('opens the plain metronome', async () => {
    const { onOpenMetro } = await setup();
    fireEvent.click(screen.getByRole('button', { name: 'Plain metronome' }));
    expect(onOpenMetro).toHaveBeenCalled();
  });

  it('never mentions streaks', async () => {
    await setup(twoSessions);
    await waitFor(() => expect(screen.getByText('17.5 min')).toBeTruthy());
    expect(document.body.textContent?.toLowerCase()).not.toContain('streak');
  });
});
