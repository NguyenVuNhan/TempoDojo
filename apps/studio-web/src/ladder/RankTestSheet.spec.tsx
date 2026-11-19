import { fireEvent, render, screen } from '@testing-library/react';
import { emptyProgress, exerciseById, type Progress } from '@tempodojo/core-ladder';
import type { LivePosition } from '../metronome/useMetronome';
import { RankTestSheet, type RankTestSheetProps } from './RankTestSheet';
import { progressRow } from './test-utils';

const pos = (bar: number, countIn = false): LivePosition => ({ bar, pulse: 0, bpm: 65, countIn, muted: false });

const setup = (patch: Partial<RankTestSheetProps> = {}, id = 'pas-16') => {
  const props: RankTestSheetProps = {
    open: true,
    exercise: exerciseById(id)!,
    progress: emptyProgress(id),
    position: null,
    onStart: vi.fn(),
    onStop: vi.fn(),
    onClaim: vi.fn(),
    onClose: vi.fn(),
    ...patch,
  };
  const r = render(<RankTestSheet {...props} />);
  return { props, rerender: (p: Partial<RankTestSheetProps>) => r.rerender(<RankTestSheet {...props} {...p} />) };
};

const runToEnd = (rerender: (p: Partial<RankTestSheetProps>) => void) => {
  fireEvent.click(screen.getByRole('button', { name: 'Start test' }));
  rerender({ position: pos(-1, true) });
  rerender({ position: pos(7) });
  rerender({ position: pos(8) });
};

describe('RankTestSheet', () => {
  it('defaults to the next rank and offers every rank above the current one', () => {
    setup({ progress: progressRow('pas-16', { rank: 'bronze', bestCleanBpm: 70 }) });
    expect(screen.getByRole('dialog', { name: 'Rank test' })).toBeTruthy();
    expect(screen.getAllByRole('radio').map((r) => r.closest('label')?.textContent)).toEqual(['Silver', 'Gold', 'Master']);
    expect(screen.getByRole('radio', { name: 'Silver' })).toHaveProperty('checked', true);
    expect(screen.getByText('Silver · 95 BPM · 16ths')).toBeTruthy();
  });

  it('starts at the chosen target tempo', () => {
    const { props } = setup();
    fireEvent.click(screen.getByRole('radio', { name: 'Silver' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start test' }));
    expect(props.onStart).toHaveBeenCalledWith(95);
  });

  it('counts the bars, then stops itself after bar 8 and shows the checklist', () => {
    const { props, rerender } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Start test' }));
    rerender({ position: pos(-1, true) });
    expect(screen.getByText('Count-in')).toBeTruthy();
    rerender({ position: pos(2) });
    expect(screen.getByText('Bar 3 of 8')).toBeTruthy();
    expect(props.onStop).not.toHaveBeenCalled();
    rerender({ position: pos(8) });
    expect(props.onStop).toHaveBeenCalledTimes(1);
    expect(screen.getAllByRole('checkbox')).toHaveLength(3);
    expect(screen.getByRole('checkbox', { name: 'Came back in on beat 1 after every silent bar' })).toBeTruthy();
  });

  it('claim is enabled only when every item is ticked', () => {
    const { props, rerender } = setup();
    runToEnd(rerender);
    const claim = screen.getByRole('button', { name: 'Claim Bronze' });
    expect(claim).toHaveProperty('disabled', true);
    screen.getAllByRole('checkbox').forEach((c) => fireEvent.click(c));
    expect(claim).toHaveProperty('disabled', false);
    fireEvent.click(claim);
    expect(props.onClaim).toHaveBeenCalledWith(65);
  });

  it('"Not yet" closes without claiming', () => {
    const { props, rerender } = setup();
    runToEnd(rerender);
    fireEvent.click(screen.getByRole('button', { name: 'Not yet' }));
    expect(props.onClose).toHaveBeenCalled();
    expect(props.onClaim).not.toHaveBeenCalled();
  });

  it('stopping mid-test goes back to the start without a checklist', () => {
    const { props, rerender } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Start test' }));
    rerender({ position: pos(3) });
    fireEvent.click(screen.getByRole('button', { name: 'Stop test' }));
    expect(props.onStop).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Start test' })).toBeTruthy();
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
  });

  it('coordination adds the feet check', () => {
    const { rerender } = setup({}, 'coord-1-1');
    runToEnd(rerender);
    expect(screen.getAllByRole('checkbox')).toHaveLength(4);
    expect(screen.getByRole('checkbox', { name: 'Feet never flinched or sped up' })).toBeTruthy();
  });

  it('at master there is nothing left to test', () => {
    const p: Progress = progressRow('pas-16', { rank: 'master', bestCleanBpm: 160 });
    setup({ progress: p });
    expect(screen.getByText('Master reached. Nothing left to test here.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Start test' })).toBeNull();
  });
});
