import { useEffect, useState } from 'react';

type Usage = () => Promise<{ usedBytes: number; quotaBytes: number } | null>;

/** "48 MB", "1.5 MB", "2.1 GB": one decimal below 10, none above. */
export function formatBytes(n: number): string {
  if (n < 1024) return `${Math.round(n)} bytes`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  const shown = v >= 10 ? Math.round(v) : Math.round(v * 10) / 10;
  return `${shown} ${units[i]}`;
}

/** Storage used by songs and progress, so imports never surprise (spec §7.1). */
export function StorageLine({ usage }: { usage: Usage }) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    usage()
      .then((u) => {
        if (live && u) setText(`Using ${formatBytes(u.usedBytes)} of ${formatBytes(u.quotaBytes)} on this device.`);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [usage]);
  return text ? <p className="storage-line">{text}</p> : null;
}
