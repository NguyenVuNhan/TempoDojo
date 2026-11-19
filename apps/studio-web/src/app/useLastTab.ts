import { useCallback, useEffect, useState } from 'react';
import type { KvRepository } from '@tempodojo/storage';

export type Tab = 'today' | 'ladder' | 'songs' | 'metro';

const TABS: readonly Tab[] = ['today', 'ladder', 'songs', 'metro'];
const LAST_TAB_KEY = 'lastTab';

function isTab(value: unknown): value is Tab {
  return typeof value === 'string' && (TABS as readonly string[]).includes(value);
}

/** Persists the active shell tab in kv storage, defaulting to 'today'. */
export function useLastTab(kv: KvRepository): readonly [Tab, (next: Tab) => void] {
  const [tab, setTabState] = useState<Tab>('today');

  useEffect(() => {
    let cancelled = false;
    void kv.get<string>(LAST_TAB_KEY).then((stored) => {
      if (!cancelled && isTab(stored)) {
        setTabState(stored);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [kv]);

  const setTab = useCallback(
    (next: Tab) => {
      setTabState(next);
      void kv.set(LAST_TAB_KEY, next);
    },
    [kv],
  );

  return [tab, setTab] as const;
}
