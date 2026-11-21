import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { exerciseById, type Exercise, type Progress } from '@tempodojo/core-ladder';
import { FakeEngine, MemoryRepo } from '../metronome/test-utils';
import { ExerciseScreen } from './ExerciseScreen';
import { memoryLadderRepos, progressRow } from './test-utils';
import { useLadder } from './useLadder';
import type { LadderRepos } from './types';

interface HarnessProps {
  repos: LadderRepos;
  exercise: Exercise;
  engine: FakeEngine;
  presets: MemoryRepo;
  onBack: () => void;
  onTransport: () => void;
  now: () => number;
}

function Harness({ repos, exercise, engine, presets, onBack, onTransport, now }: HarnessProps) {
  const ladder = useLadder(repos);
  if (!ladder.loaded) return null;
  return (
    <ExerciseScreen
      exercise={exercise}
      ladder={ladder}
      deps={{ engine, repo: presets }}
      onBack={onBack}
      onTransport={onTransport}
      now={now}
    />
  );
}

const setup = async (id = 'pas-16', rows: Progress[] = []) => {
  const m = memoryLadderRepos(rows);
  const engine = new FakeEngine();
  const presets = new MemoryRepo();
  const onBack = vi.fn();
  const onTransport = vi.fn();
  let t = 0;
  const clock = { set: (ms: number) => (t = ms) };
  const r = render(
    <Harness
      repos={m.repos}
      exercise={exerciseById(id)!}
      engine={engine}
      presets={presets}
      onBack={onBack}
      onTransport={onTransport}
      now={() => t}
    />,
  );
  await screen.findByTestId('exercise-bpm');
  return { ...m, engine, presets, onBack, onTransport, clock, unmount: r.unmount };
};

const bpm = () => screen.getByTestId('exercise-bpm').textContent?.replace(/\D/g, '');
const checklist = () => screen.getAllByRole('checkbox', { name: /beat 1|Stick heights|relaxed/ });

describe('ExerciseScreen', () => {
  it('opens a fresh paradiddle 10 below bronze with its pattern and targets', async () => {
    await setup();
    expect(screen.getByRole('heading', { level: 1, name: 'Single Paradiddle' })).toBeTruthy();
    expect(bpm()).toBe('55');
    expect(screen.getByText('16ths')).toBeTruthy();
    expect(document.querySelectorAll('[data-slot]')).toHaveLength(8);
    const targets = screen.getByRole('list', { name: 'Targets' });
    expect([...targets.querySelectorAll('li')].map((li) => li.textContent)).toEqual(['Bronze65', 'Silver95', 'Gold125', 'Master155']);
  });

  it('plays the exercise at a steady tempo without touching the metronome last settings', async () => {
    const { engine, presets, onTransport } = await setup();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Play' })));
    const s = engine.start.mock.calls[0][0];
    expect(s).toMatchObject({ bpm: 55, subdivision: 4, meter: { beatsPerBar: 2 } });
    expect(s.automator.speedUp).toBeNull();
    expect(onTransport).toHaveBeenCalledWith('play', { kind: 'exercise', exerciseId: 'pas-16', track: 'hands' });
    await new Promise((r) => setTimeout(r, 650));
    expect(presets.saveLast).not.toHaveBeenCalled();
  });

  it('climb mode speeds up toward the next target', async () => {
    const { engine } = await setup();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Climb to Bronze 65' }));
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Play' })));
    expect(engine.start.mock.calls[0][0].automator.speedUp).toMatchObject({ startBpm: 55, targetBpm: 65 });
  });

  it('leaving saves the working tempo and the played time', async () => {
    const { progress, clock, unmount, onBack } = await setup();
    fireEvent.click(screen.getByRole('button', { name: 'Increase tempo by 5' }));
    expect(bpm()).toBe('60');
    clock.set(1_000);
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Play' })));
    clock.set(91_000);
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalled();
    unmount();
    await waitFor(() => expect(progress.rows.get('pas-16')).toMatchObject({ workingBpm: 60, totalSeconds: 90 }));
  });

  it('logging a clean tempo ranks up and reveals the transfer tip', async () => {
    await setup();
    const tip = exerciseById('pas-16')!.transferTip!;
    expect(screen.queryByText(tip)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Log clean tempo' }));
    const input = screen.getByRole('spinbutton', { name: 'Clean tempo' });
    expect((input as HTMLInputElement).value).toBe('55');
    fireEvent.change(input, { target: { value: '70' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(screen.getByRole('list', { name: 'Targets' }).querySelector('[aria-current="true"]')?.textContent).toBe('Bronze65'),
    );
    expect(screen.getByText(tip)).toBeTruthy();
    expect(screen.getByText('Best 70 · 16ths')).toBeTruthy();
  });

  it('rank test runs 8 gap bars at the target, then claims the rank and restores practice', async () => {
    const { engine, progress } = await setup();
    fireEvent.click(screen.getByRole('button', { name: 'Rank test' }));
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Start test' })));
    const s = engine.start.mock.calls[0][0];
    expect(s).toMatchObject({ bpm: 65, countInBars: 1, automator: { gap: { barsOn: 2, barsOff: 2 }, speedUp: null } });
    act(() => engine.emit({ bar: 8, pulse: 0, sub: 0, bpm: 65 }));
    await waitFor(() => expect(checklist()).toHaveLength(3));
    expect(engine.stop).toHaveBeenCalled();
    checklist().forEach((c) => fireEvent.click(c));
    fireEvent.click(screen.getByRole('button', { name: 'Claim Bronze' }));
    await waitFor(() => expect(progress.rows.get('pas-16')).toMatchObject({ rank: 'bronze', bestCleanBpm: 65 }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(bpm()).toBe('55');
  });

  it('coordination grooves remind you to start with the feet', async () => {
    await setup('coord-1-1');
    expect(screen.getByText('Feet first: play the feet line alone for a minute.')).toBeTruthy();
  });

  it('resumes from the working tempo and climbs toward the next rank', async () => {
    await setup('pas-16', [progressRow('pas-16', { rank: 'silver', bestCleanBpm: 96, workingBpm: 90 })]);
    expect(bpm()).toBe('90');
    expect(screen.getByText('Hands · Tier 1')).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: 'Climb to Gold 125' })).toBeTruthy();
  });
  it('the counts switch shows the count row and remembers it', async () => {
    const { prefs } = await setup();
    expect(document.querySelectorAll('[data-count]')).toHaveLength(0);
    const sw = screen.getByRole('switch', { name: 'Show counts' });
    expect(sw.getAttribute('aria-checked') ?? String((sw as HTMLInputElement).checked)).toBe('false');
    await act(async () => fireEvent.click(sw));
    await waitFor(() => expect(document.querySelectorAll('[data-count]')).toHaveLength(8));
    expect(prefs.save).toHaveBeenCalledWith(expect.objectContaining({ showCounts: true }));
    expect((screen.getByRole('switch', { name: 'Show counts' }) as HTMLInputElement).checked).toBe(true);
  });

  it('opens with counts showing when the pref is on', async () => {
    const m = memoryLadderRepos([], { showCounts: true });
    render(
      <Harness
        repos={m.repos}
        exercise={exerciseById('pas-16')!}
        engine={new FakeEngine()}
        presets={new MemoryRepo()}
        onBack={vi.fn()}
        onTransport={vi.fn()}
        now={() => 0}
      />,
    );
    await screen.findByTestId('exercise-bpm');
    expect(document.querySelectorAll('[data-count]')).toHaveLength(8);
  });
});
