import { act, renderHook, waitFor } from '@testing-library/react';
import { DEFAULT_SETTINGS, type PresetRepository } from '@tempodojo/core-metronome';
import type { PracticeEvent, PracticeSource } from '@tempodojo/core-practice';
import { FakeEngine, MemoryRepo } from '../metronome/test-utils';
import { useMetronome } from '../metronome/useMetronome';
import { usePracticeLog } from './usePracticeLog';

const para: PracticeSource = { kind: 'exercise', exerciseId: 'pas-16', track: 'hands' };

describe('useMetronome options', () => {
  it('exercise session does not persist last settings', async () => {
    const repo = new MemoryRepo();
    const loadLast = vi.spyOn(repo, 'loadLast');
    const engine = new FakeEngine();
    const { result } = renderHook(() =>
      useMetronome({ engine, repo: repo as PresetRepository }, { persist: false, initial: { ...DEFAULT_SETTINGS, bpm: 55 } }),
    );
    expect(result.current.settings.bpm).toBe(55);
    act(() => result.current.nudge(5));
    await new Promise((r) => setTimeout(r, 700));
    expect(loadLast).not.toHaveBeenCalled();
    expect(repo.saveLast).not.toHaveBeenCalled();
  });

  it('reports play and stop with its source', async () => {
    const onTransport = vi.fn();
    const { result } = renderHook(() =>
      useMetronome({ engine: new FakeEngine(), repo: new MemoryRepo() }, { source: para, onTransport }),
    );
    await act(async () => result.current.start());
    act(() => result.current.stop());
    expect(onTransport.mock.calls).toEqual([
      ['play', para],
      ['stop', para],
    ]);
  });

  it('defaults the source to the plain metronome', async () => {
    const onTransport = vi.fn();
    const { result } = renderHook(() => useMetronome({ engine: new FakeEngine(), repo: new MemoryRepo() }, { onTransport }));
    await act(async () => result.current.start());
    expect(onTransport).toHaveBeenCalledWith('play', { kind: 'metronome' });
  });
});

describe('usePracticeLog', () => {
  it('writes an event with id, type, time and source', async () => {
    const added: PracticeEvent[] = [];
    const sink = { add: vi.fn(async (e: PracticeEvent) => void added.push(e)) };
    const { result } = renderHook(() => usePracticeLog(sink, () => 1234, () => 'id-1'));
    act(() => result.current.record('play', para));
    await waitFor(() => expect(added).toEqual([{ id: 'id-1', type: 'play', at: 1234, source: para }]));
  });
});
