import { act, fireEvent, render, renderHook, screen, within } from '@testing-library/react';
import { exerciseById, type Exercise } from '@tempodojo/core-ladder';
import type { LoopRange, LoopTrainer, Section, Song } from '@tempodojo/core-songlab';
import { SectionsSheet, type SectionsSheetProps } from './SectionsSheet';
import { songRow } from './test-utils';
import { TrainerControls } from './TrainerControls';
import { useLoopTrainer } from './useLoopTrainer';

describe('useLoopTrainer', () => {
  it('without a trainer the percent is the base', () => {
    const { result } = renderHook(() => useLoopTrainer(null, 85));
    expect(result.current.percent).toBe(85);
    act(() => result.current.onPass());
    expect(result.current.percent).toBe(85);
  });

  it('steps every N passes, holds at the target, and resets', () => {
    const t: LoopTrainer = { startPercent: 60, targetPercent: 80, stepPercent: 10, everyPasses: 2 };
    const { result } = renderHook(() => useLoopTrainer(t, 100));
    const seen = [result.current.percent];
    for (let i = 0; i < 6; i++) {
      act(() => result.current.onPass());
      seen.push(result.current.percent);
    }
    expect(seen).toEqual([60, 60, 70, 70, 80, 80, 80]);
    expect(result.current.pass).toBe(6);
    act(() => result.current.reset());
    expect(result.current).toMatchObject({ percent: 60, pass: 0 });
  });

  it('restarts when the trainer settings change', () => {
    let t: LoopTrainer = { startPercent: 60, targetPercent: 80, stepPercent: 10, everyPasses: 1 };
    const { result, rerender } = renderHook(() => useLoopTrainer(t, 100));
    act(() => result.current.onPass());
    expect(result.current.percent).toBe(70);
    t = { ...t, startPercent: 50 };
    rerender();
    expect(result.current).toMatchObject({ percent: 50, pass: 0 });
  });
});

describe('TrainerControls', () => {
  it('switches on with defaults and edits the fields', () => {
    const onChange = vi.fn();
    const { rerender } = render(<TrainerControls trainer={null} onChange={onChange} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Loop trainer' }));
    expect(onChange).toHaveBeenLastCalledWith({ startPercent: 60, targetPercent: 100, stepPercent: 5, everyPasses: 2 });
    const t = { startPercent: 60, targetPercent: 100, stepPercent: 5, everyPasses: 2 };
    rerender(<TrainerControls trainer={t} onChange={onChange} />);
    expect(screen.getByText('Starts at 60 %, +5 % every 2 passes, up to 100 %.')).toBeTruthy();
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Start %' }), { target: { value: '70' } });
    expect(onChange).toHaveBeenLastCalledWith({ ...t, startPercent: 70 });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Every N passes' }), { target: { value: '0' } });
    expect(onChange).toHaveBeenLastCalledWith({ ...t, everyPasses: 1 });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Loop trainer' }));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });
});

const fill: Section = { id: 's1', name: 'Fill into chorus', range: { kind: 'bars', startBar: 16, endBar: 16 }, bestCleanPercent: null, exerciseId: null, fromFile: false };
const intro: Section = { id: 's0', name: 'Intro', range: { kind: 'bars', startBar: 1, endBar: 4 }, bestCleanPercent: 90, exerciseId: null, fromFile: true };

const setup = (patch: Partial<SectionsSheetProps> = {}, sections: Section[] = [intro, fill]) => {
  const song: Song = songRow('a', { sections });
  const exercises: Exercise[] = [exerciseById('pas-16')!, exerciseById('feet-2-1')!];
  const props: SectionsSheetProps = {
    open: true,
    song,
    currentRange: { kind: 'bars', startBar: 9, endBar: 12 } as LoopRange,
    currentPercent: 85,
    exercises,
    onChange: vi.fn(),
    onLoop: vi.fn(),
    onOpenExercise: vi.fn(),
    onClose: vi.fn(),
    confirm: vi.fn(() => true),
    makeId: () => 'new-id',
    ...patch,
  };
  render(<SectionsSheet {...props} />);
  return props;
};

const rowOf = (name: string) => screen.getByRole('heading', { level: 3, name }).closest('li')!;

describe('SectionsSheet', () => {
  it('lists sections with range, best tempo and origin', () => {
    setup();
    expect(screen.getByRole('dialog', { name: 'Sections' })).toBeTruthy();
    expect(within(rowOf('Intro')).getByText('Bars 1–4')).toBeTruthy();
    expect(within(rowOf('Intro')).getByText('Best 90 %')).toBeTruthy();
    expect(within(rowOf('Intro')).getByText('From the file')).toBeTruthy();
    expect(within(rowOf('Fill into chorus')).getByText('No clean pass yet')).toBeTruthy();
  });

  it('saves the current loop as a named section', () => {
    const p = setup();
    expect((screen.getByRole('textbox', { name: 'Section name' }) as HTMLInputElement).value).toBe('Section 3');
    fireEvent.change(screen.getByRole('textbox', { name: 'Section name' }), { target: { value: 'Verse groove' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save loop as section' }));
    expect(p.onChange).toHaveBeenCalledWith([
      intro,
      fill,
      { id: 'new-id', name: 'Verse groove', range: { kind: 'bars', startBar: 9, endBar: 12 }, bestCleanPercent: null, exerciseId: null, fromFile: false },
    ]);
  });

  it('cannot save without a loop', () => {
    setup({ currentRange: null });
    expect(screen.queryByRole('button', { name: 'Save loop as section' })).toBeNull();
    expect(screen.getByText('Set a loop first, then save it here as a section.')).toBeTruthy();
  });

  it('loops a section', () => {
    const p = setup();
    fireEvent.click(within(rowOf('Fill into chorus')).getByRole('button', { name: 'Loop' }));
    expect(p.onLoop).toHaveBeenCalledWith(fill);
  });

  it('records a clean pass at the current tempo and never lowers it', () => {
    const p = setup();
    fireEvent.click(within(rowOf('Fill into chorus')).getByRole('button', { name: 'Clean at 85 %' }));
    expect(p.onChange).toHaveBeenLastCalledWith([intro, { ...fill, bestCleanPercent: 85 }]);
    fireEvent.click(within(rowOf('Intro')).getByRole('button', { name: 'Clean at 85 %' }));
    expect(p.onChange).toHaveBeenLastCalledWith([intro, fill]);
  });

  it('links an exercise and opens it from the row', () => {
    const p = setup({}, [{ ...fill, exerciseId: 'feet-2-1' }]);
    const row = rowOf('Fill into chorus');
    const link = within(row).getByRole('button', { name: `Practise ${exerciseById('feet-2-1')!.name}` });
    fireEvent.click(link);
    expect(p.onOpenExercise).toHaveBeenCalledWith(exerciseById('feet-2-1'));
  });

  it('chooses an exercise to link', () => {
    const p = setup();
    fireEvent.change(within(rowOf('Fill into chorus')).getByRole('combobox', { name: 'Linked exercise' }), { target: { value: 'pas-16' } });
    expect(p.onChange).toHaveBeenLastCalledWith([intro, { ...fill, exerciseId: 'pas-16' }]);
  });

  it('renames and deletes (after asking)', () => {
    const p = setup();
    fireEvent.click(within(rowOf('Intro')).getByRole('button', { name: 'Rename' }));
    const input = within(rowOf('Intro')).getByRole('textbox', { name: 'New name' });
    fireEvent.change(input, { target: { value: 'Opening' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(p.onChange).toHaveBeenLastCalledWith([{ ...intro, name: 'Opening' }, fill]);
    fireEvent.click(within(rowOf('Fill into chorus')).getByRole('button', { name: 'Delete' }));
    expect(p.confirm).toHaveBeenCalledWith('Delete the section "Fill into chorus"?');
    expect(p.onChange).toHaveBeenLastCalledWith([intro]);
  });
});
