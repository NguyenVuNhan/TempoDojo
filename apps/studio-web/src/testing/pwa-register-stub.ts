/** Test stand-in for `virtual:pwa-register/react`, which only exists inside the Vite PWA build. */
export function useRegisterSW() {
  return {
    needRefresh: [false, () => undefined] as [boolean, (v: boolean) => void],
    offlineReady: [false, () => undefined] as [boolean, (v: boolean) => void],
    updateServiceWorker: async () => undefined,
  };
}
