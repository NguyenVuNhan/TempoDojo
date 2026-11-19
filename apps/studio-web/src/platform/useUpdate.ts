import { useRegisterSW } from 'virtual:pwa-register/react';

export type RegisterSW = () => {
  needRefresh: [boolean, (v: boolean) => void];
  updateServiceWorker: (reloadPage?: boolean) => Promise<void>;
};

const useDefaultRegister: RegisterSW = () => useRegisterSW({ immediate: true });

export function useUpdate(register: RegisterSW = useDefaultRegister): {
  ready: boolean;
  update(): void;
  later(): void;
} {
  const { needRefresh, updateServiceWorker } = register();
  const [ready, setNeedRefresh] = needRefresh;

  return {
    ready,
    update() {
      void updateServiceWorker(true);
    },
    later() {
      setNeedRefresh(false);
    },
  };
}
