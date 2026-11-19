import { useCallback } from 'react';
import type { PracticeEvent, PracticeSource } from '@tempodojo/core-practice';

export interface EventSink {
  add(e: PracticeEvent): Promise<void>;
}

/** Records raw play/stop events; stats are always derived from these (spec §6). */
export function usePracticeLog(
  sink: EventSink,
  now: () => number = Date.now,
  makeId: () => string = () => crypto.randomUUID(),
) {
  const record = useCallback(
    (type: 'play' | 'stop', source: PracticeSource) => {
      void sink.add({ id: makeId(), type, at: now(), source });
    },
    [sink, now, makeId],
  );
  return { record };
}
