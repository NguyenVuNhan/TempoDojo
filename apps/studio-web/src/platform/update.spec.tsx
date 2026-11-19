import { useState as useStateShim } from 'react';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { UpdateBar } from './UpdateBar';
import { useUpdate, type RegisterSW } from './useUpdate';

const COPY = 'A new version of TempoDojo is ready.';

/** Mimics useRegisterSW from virtual:pwa-register/react. */
function fakeRegister() {
  let setNeed: (v: boolean) => void = () => undefined;
  const updateServiceWorker = vi.fn(async (_reload?: boolean) => undefined);
  const register: RegisterSW = () => {
    const [needRefresh, setNeedRefresh] = useStateShim(false);
    setNeed = setNeedRefresh;
    return { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker };
  };
  return { register, updateServiceWorker, arrive: () => act(() => setNeed(true)) };
}

describe('useUpdate', () => {
  it('reports a waiting update, applies it, or hides it until the next one', () => {
    const f = fakeRegister();
    const { result } = renderHook(() => useUpdate(f.register));
    expect(result.current.ready).toBe(false);
    f.arrive();
    expect(result.current.ready).toBe(true);
    act(() => result.current.later());
    expect(result.current.ready).toBe(false);
    f.arrive();
    expect(result.current.ready).toBe(true);
    act(() => result.current.update());
    expect(f.updateServiceWorker).toHaveBeenCalledWith(true);
  });
});

describe('UpdateBar', () => {
  it('update bar waits for stop', () => {
    const onUpdate = vi.fn();
    const onLater = vi.fn();
    const { rerender } = render(<UpdateBar ready playing onUpdate={onUpdate} onLater={onLater} />);
    expect(screen.queryByText(COPY)).toBeNull();
    rerender(<UpdateBar ready playing={false} onUpdate={onUpdate} onLater={onLater} />);
    expect(screen.getByRole('status').textContent).toContain(COPY);
    fireEvent.click(screen.getByRole('button', { name: 'Update' }));
    expect(onUpdate).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Later' }));
    expect(onLater).toHaveBeenCalled();
  });

  it('nothing to show without an update', () => {
    render(<UpdateBar ready={false} playing={false} onUpdate={vi.fn()} onLater={vi.fn()} />);
    expect(screen.queryByText(COPY)).toBeNull();
  });
});
