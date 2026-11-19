import { useEffect, useState } from 'react';
import type { KvRepository } from '@tempodojo/storage';
import './sound.css';

export function detectApple(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

export function AppleSoundTip({
  kv,
  isApple = detectApple(),
}: {
  kv: KvRepository;
  isApple?: boolean;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isApple) {
      setVisible(false);
      return;
    }
    let cancelled = false;
    void kv.get('soundTipSeen').then((seen) => {
      if (!cancelled && seen !== true) {
        setVisible(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [kv, isApple]);

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    void kv.set('soundTipSeen', true);
  };

  return (
    <aside className="sound-tip">
      <p>No sound? Turn up the volume. TempoDojo plays even with the silent switch on.</p>
      <button type="button" onClick={dismiss}>
        Got it
      </button>
    </aside>
  );
}
