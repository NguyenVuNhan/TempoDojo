import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { DEFAULT_SETTINGS, type MetronomeSettings } from '@tempodojo/core-metronome';
import { TrainerSheet } from './TrainerSheet';
import { usePracticeTimer } from './usePracticeTimer';

const setup = (patch: Partial<MetronomeSettings> = {}, countdownSec: number | null = null) => {
  const onChange = vi.fn();
  const onCountdownChange = vi.fn();
  render(
    <TrainerSheet
      open
      settings={{ ...DEFAULT_SETTINGS, ...patch }}
      onChange={onChange}
      countdownSec={countdownSec}
      onCountdownChange={onCountdownChange}
      onClose={vi.fn()}
    />,
  );
  return { onChange, onCountdownChange };
};

describe('TrainerSheet', () => {
  it('is a labelled dialog', () => {
    setup();
    expect(screen.getByRole('dialog', { name: 'Trainer' })).toBeTruthy();
  });

  it('enables the speed-up trainer with defaults from the current tempo', () => {
    const { onChange } = setup({ bpm: 100 });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Speed-up trainer' }));
    expect(onChange).toHaveBeenCalledWith({
      automator: { speedUp: { startBpm: 100, targetBpm: 120, stepBpm: 5, everyBars: 4, pyramid: false }, gap: null },
    });
  });

  it('caps the default target at 400', () => {
    const { onChange } = setup({ bpm: 395 });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Speed-up trainer' }));
    expect(onChange.mock.calls[0][0].automator.speedUp.targetBpm).toBe(400);
  });

  it('edits speed-up fields', () => {
    const speedUp = { startBpm: 80, targetBpm: 100, stepBpm: 5, everyBars: 4, pyramid: false };
    const { onChange } = setup({ automator: { speedUp, gap: null } });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Target BPM' }), { target: { value: '110' } });
    expect(onChange).toHaveBeenLastCalledWith({ automator: { speedUp: { ...speedUp, targetBpm: 110 }, gap: null } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Come back down (pyramid)' }));
    expect(onChange).toHaveBeenLastCalledWith({ automator: { speedUp: { ...speedUp, pyramid: true }, gap: null } });
  });

  it('turns the speed-up off', () => {
    const speedUp = { startBpm: 80, targetBpm: 100, stepBpm: 5, everyBars: 4, pyramid: false };
    const { onChange } = setup({ automator: { speedUp, gap: null } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Speed-up trainer' }));
    expect(onChange).toHaveBeenCalledWith({ automator: { speedUp: null, gap: null } });
  });

  it('enables gap click at 3 on / 1 off and offers quick picks', () => {
    const { onChange } = setup();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Gap click' }));
    expect(onChange).toHaveBeenLastCalledWith({ automator: { speedUp: null, gap: { barsOn: 3, barsOff: 1 } } });
  });

  it('applies a gap quick pick', () => {
    const { onChange } = setup({ automator: { speedUp: null, gap: { barsOn: 3, barsOff: 1 } } });
    fireEvent.click(screen.getByRole('button', { name: '2 on / 2 off' }));
    expect(onChange).toHaveBeenLastCalledWith({ automator: { speedUp: null, gap: { barsOn: 2, barsOff: 2 } } });
  });

  it('sets a countdown', () => {
    const { onCountdownChange } = setup();
    fireEvent.click(screen.getByRole('radio', { name: '10 min' }));
    expect(onCountdownChange).toHaveBeenCalledWith(600);
    fireEvent.click(screen.getByRole('radio', { name: 'Off' }));
    expect(onCountdownChange).toHaveBeenLastCalledWith(null);
  });
});

describe('usePracticeTimer', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('counts only while playing', () => {
    const { result, rerender } = renderHook((p: { playing: boolean }) => usePracticeTimer({ ...p, countdownSec: null, onCountdownEnd: vi.fn() }), {
      initialProps: { playing: true },
    });
    act(() => vi.advanceTimersByTime(3000));
    expect(result.current.elapsedSec).toBe(3);
    rerender({ playing: false });
    act(() => vi.advanceTimersByTime(5000));
    expect(result.current.elapsedSec).toBe(3);
    rerender({ playing: true });
    act(() => vi.advanceTimersByTime(2000));
    expect(result.current.elapsedSec).toBe(5);
  });

  it('counts down and fires once at zero', () => {
    const onEnd = vi.fn();
    const { result } = renderHook(() => usePracticeTimer({ playing: true, countdownSec: 5, onCountdownEnd: onEnd }));
    act(() => vi.advanceTimersByTime(2000));
    expect(result.current.remainingSec).toBe(3);
    act(() => vi.advanceTimersByTime(4000));
    expect(result.current.remainingSec).toBe(0);
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('reports null remaining without a countdown, and reset() zeroes elapsed', () => {
    const { result } = renderHook(() => usePracticeTimer({ playing: true, countdownSec: null, onCountdownEnd: vi.fn() }));
    act(() => vi.advanceTimersByTime(2000));
    expect(result.current.remainingSec).toBeNull();
    act(() => result.current.reset());
    expect(result.current.elapsedSec).toBe(0);
  });
});
