import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import type { KvRepository } from '@tempodojo/storage';
import { FakeEngine } from '../metronome/test-utils';
import { AppleSoundTip } from './AppleSoundTip';
import { SoundBanner } from './SoundBanner';
import { useSoundState } from './useSoundState';

const BANNER = 'The iPad paused the sound. Tap to resume.';

describe('useSoundState', () => {
  it('banner shows when audio is interrupted while playing', async () => {
    const engine = new FakeEngine();
    const { result, rerender } = renderHook(({ playing }) => useSoundState(engine, playing), { initialProps: { playing: true } });
    expect(result.current.blocked).toBe(false);
    act(() => engine.emitAudio('interrupted'));
    expect(result.current.blocked).toBe(true);
    await act(() => result.current.resume());
    expect(engine.resumeAudio).toHaveBeenCalled();
    expect(result.current.blocked).toBe(false);
    act(() => engine.emitAudio('suspended'));
    rerender({ playing: false });
    expect(result.current.blocked).toBe(false);
  });

  it('a stopped transport never shows the banner', () => {
    const engine = new FakeEngine();
    const { result } = renderHook(() => useSoundState(engine, false));
    act(() => engine.emitAudio('interrupted'));
    expect(result.current.blocked).toBe(false);
  });

  it('tries to resume when the page becomes visible', async () => {
    const engine = new FakeEngine();
    engine.resumeTo = 'suspended';
    const { result } = renderHook(() => useSoundState(engine, true));
    act(() => engine.emitAudio('suspended'));
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await waitFor(() => expect(engine.resumeAudio).toHaveBeenCalledTimes(1));
    expect(result.current.blocked).toBe(true);
  });

  it('engines without audio state are always fine', () => {
    const engine = { start: vi.fn(), update: vi.fn(), stop: vi.fn(), onEvent: () => () => undefined };
    const { result } = renderHook(() => useSoundState(engine, true));
    expect(result.current.blocked).toBe(false);
  });
});

describe('SoundBanner', () => {
  it('renders only when blocked and resumes on tap', () => {
    const onResume = vi.fn();
    const { rerender } = render(<SoundBanner blocked={false} onResume={onResume} />);
    expect(screen.queryByRole('alert')).toBeNull();
    rerender(<SoundBanner blocked onResume={onResume} />);
    const alert = screen.getByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: BANNER }));
    expect(onResume).toHaveBeenCalled();
    expect(alert.textContent).toBe(BANNER);
  });
});

class MemoryKv implements KvRepository {
  rows = new Map<string, unknown>();
  set = vi.fn(async (k: string, v: unknown) => void this.rows.set(k, v));
  async get<T = unknown>(k: string) {
    return this.rows.get(k) as T | undefined;
  }
}

describe('AppleSoundTip', () => {
  const TIP = 'No sound? Turn up the volume. TempoDojo plays even with the silent switch on.';

  it('shows once on Apple devices', async () => {
    const kv = new MemoryKv();
    const { unmount } = render(<AppleSoundTip kv={kv} isApple />);
    expect(await screen.findByText(TIP)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Got it' }));
    expect(screen.queryByText(TIP)).toBeNull();
    expect(kv.set).toHaveBeenCalledWith('soundTipSeen', true);
    unmount();
    render(<AppleSoundTip kv={kv} isApple />);
    await new Promise((r) => setTimeout(r, 10));
    expect(screen.queryByText(TIP)).toBeNull();
  });

  it('never shows elsewhere', async () => {
    render(<AppleSoundTip kv={new MemoryKv()} isApple={false} />);
    await new Promise((r) => setTimeout(r, 10));
    expect(screen.queryByText(TIP)).toBeNull();
  });
});
