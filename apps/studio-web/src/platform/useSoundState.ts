import { useCallback, useEffect, useRef, useState } from 'react';
import type { MetronomeEngineLike } from '../metronome/useMetronome';

export function useSoundState(
  engine: MetronomeEngineLike,
  playing: boolean,
): { blocked: boolean; resume(): Promise<void> } {
  const [state, setState] = useState<string>('running');
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    setState('running');
    return engine.onAudioState?.((s) => setState(s));
  }, [engine]);

  const resume = useCallback(async () => {
    const ok = await engine.resumeAudio?.();
    if (ok) {
      setState('running');
    }
  }, [engine]);

  useEffect(() => {
    if (!playing || typeof document === 'undefined') return;
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && stateRef.current !== 'running') {
        void resume();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [playing, resume]);

  return {
    blocked: playing && state !== 'running',
    resume,
  };
}
