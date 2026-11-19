import { act, fireEvent, render, renderHook } from '@testing-library/react';
import { useKeyboardTransport } from './useKeyboardTransport';
import { useWakeLock } from './useWakeLock';

describe('useWakeLock', () => {
  let release: ReturnType<typeof vi.fn>;
  let request: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    release = vi.fn(async () => undefined);
    request = vi.fn(async () => ({ release, released: false }));
    Object.defineProperty(navigator, 'wakeLock', { value: { request }, configurable: true });
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'wakeLock', { value: undefined, configurable: true });
  });

  it('requests a screen lock when active and releases it when inactive', async () => {
    const { rerender } = renderHook((p: { active: boolean }) => useWakeLock(p.active), { initialProps: { active: false } });
    expect(request).not.toHaveBeenCalled();
    await act(async () => rerender({ active: true }));
    expect(request).toHaveBeenCalledWith('screen');
    await act(async () => rerender({ active: false }));
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('re-requests when the page becomes visible again', async () => {
    renderHook(() => useWakeLock(true));
    await act(async () => undefined);
    expect(request).toHaveBeenCalledTimes(1);
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('does nothing when the API is missing', async () => {
    Object.defineProperty(navigator, 'wakeLock', { value: undefined, configurable: true });
    expect(() => renderHook(() => useWakeLock(true))).not.toThrow();
  });
});

describe('useKeyboardTransport', () => {
  const setup = () => {
    const toggle = vi.fn();
    const nudge = vi.fn();
    renderHook(() => useKeyboardTransport({ toggle, nudge }));
    return { toggle, nudge };
  };

  it('toggles on Space, PageDown and PageUp', () => {
    const { toggle } = setup();
    fireEvent.keyDown(window, { key: ' ' });
    fireEvent.keyDown(window, { key: 'PageDown' });
    fireEvent.keyDown(window, { key: 'PageUp' });
    expect(toggle).toHaveBeenCalledTimes(3);
  });

  it('nudges with the arrow keys', () => {
    const { nudge } = setup();
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(nudge.mock.calls).toEqual([[1], [-1]]);
  });

  it('ignores keys typed into inputs', () => {
    const { toggle } = setup();
    const { getByRole } = render(<input aria-label="name" />);
    fireEvent.keyDown(getByRole('textbox'), { key: ' ' });
    expect(toggle).not.toHaveBeenCalled();
  });

  it('ignores repeats from a held key', () => {
    const { toggle } = setup();
    fireEvent.keyDown(window, { key: ' ', repeat: true });
    expect(toggle).not.toHaveBeenCalled();
  });
});
