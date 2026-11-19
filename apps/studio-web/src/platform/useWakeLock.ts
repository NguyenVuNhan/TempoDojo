import { useEffect } from 'react';

/**
 * Keeps the screen awake while `active` is true using the Screen Wake Lock API,
 * re-acquiring on visibility return and releasing on deactivation or unmount.
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || typeof navigator === 'undefined' || !navigator.wakeLock) {
      return;
    }

    let cancelled = false;
    let sentinel: WakeLockSentinel | null = null;

    const acquire = async () => {
      if (cancelled || !navigator.wakeLock) {
        return;
      }
      try {
        const next = await navigator.wakeLock.request('screen');
        if (cancelled) {
          await next.release().catch(() => undefined);
          return;
        }
        sentinel = next;
      } catch {
        // Ignore wake lock acquisition errors (e.g. unsupported, low battery, hidden tab).
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void acquire();
      }
    };

    void acquire();
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (sentinel) {
        const toRelease = sentinel;
        sentinel = null;
        void toRelease.release().catch(() => undefined);
      }
    };
  }, [active]);
}
