import { useCallback, useState } from 'react';
import { trainerPercent, type LoopTrainer } from '@tempodojo/core-songlab';

export interface UseLoopTrainerResult {
  percent: number;
  pass: number;
  onPass: () => void;
  reset: () => void;
}

/** Tracks loop passes and computes the current tempo percent from a LoopTrainer. */
export function useLoopTrainer(
  trainer: LoopTrainer | null,
  basePercent: number,
): UseLoopTrainerResult {
  const key = trainer
    ? `${trainer.startPercent}:${trainer.targetPercent}:${trainer.stepPercent}:${trainer.everyPasses}`
    : '';

  const [pass, setPass] = useState(0);
  const [prevKey, setPrevKey] = useState(key);

  if (key !== prevKey) {
    setPrevKey(key);
    setPass(0);
  }

  const onPass = useCallback(() => {
    setPass((p) => p + 1);
  }, []);

  const reset = useCallback(() => {
    setPass(0);
  }, []);

  const percent = trainer ? trainerPercent(trainer, pass) : basePercent;

  return { percent, pass, onPass, reset };
}
