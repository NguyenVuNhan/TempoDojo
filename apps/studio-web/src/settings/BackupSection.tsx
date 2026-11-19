import { useState, type ChangeEvent } from 'react';
import { BackupError, type BackupData } from '@tempodojo/storage';
import './backup.css';

export interface BackupSectionProps {
  exportBackup: () => Promise<Uint8Array>;
  readBackup: (zip: Uint8Array) => Promise<BackupData>;
  importBackup: (data: BackupData) => Promise<void>;
  onImported: () => void;
  confirm?: (message: string) => boolean;
  download?: (bytes: Uint8Array, filename: string) => void;
  now?: () => number;
}

type Feedback =
  | { kind: 'alert'; message: string }
  | { kind: 'status'; message: string };

const ERROR_MESSAGES: Record<BackupError['code'], string> = {
  'not-a-backup': 'That file is not a TempoDojo backup. Nothing was changed.',
  'newer-version':
    'That backup comes from a newer version of TempoDojo. Update the app, then try again. Nothing was changed.',
  corrupt: 'That backup file is damaged and cannot be read. Nothing was changed.',
};

function defaultConfirm(message: string): boolean {
  return window.confirm(message);
}

function defaultDownload(bytes: Uint8Array, filename: string): void {
  const blob = new Blob([new Uint8Array(bytes)], { type: 'application/zip' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function formatLocalDate(timestamp: number): string {
  const d = new Date(timestamp);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function errorMessage(err: unknown): string {
  if (err instanceof BackupError) {
    return ERROR_MESSAGES[err.code] ?? ERROR_MESSAGES.corrupt;
  }
  return ERROR_MESSAGES.corrupt;
}

/** Export and import controls for TempoDojo backup archives. */
/** File.arrayBuffer where available (all target browsers), FileReader otherwise. */
function readBytes(file: Blob): Promise<Uint8Array> {
  if (typeof file.arrayBuffer === 'function') return file.arrayBuffer().then((b) => new Uint8Array(b));
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

export function BackupSection({
  exportBackup,
  readBackup,
  importBackup,
  onImported,
  confirm = defaultConfirm,
  download = defaultDownload,
  now = Date.now,
}: BackupSectionProps) {
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const handleExport = async () => {
    setFeedback(null);
    const bytes = await exportBackup();
    download(bytes, `tempodojo-backup-${formatLocalDate(now())}.zip`);
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setFeedback(null);
    const bytes = await readBytes(file);

    let data: BackupData;
    try {
      data = await readBackup(bytes);
    } catch (err) {
      setFeedback({ kind: 'alert', message: errorMessage(err) });
      return;
    }

    const date = new Date(data.exportedAt).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    if (!confirm(`Replace everything on this device with the backup from ${date}?`)) {
      return;
    }

    await importBackup(data);
    onImported();
    setFeedback({ kind: 'status', message: 'Backup restored.' });
  };

  return (
    <div className="backup">
      <h3 className="field-label">Backup</h3>
      <p className="backup-note">
        Progress, practice log, presets and settings, in one file. Song files are not included.
      </p>
      <div className="backup-actions">
        <button type="button" className="text-button" onClick={handleExport}>
          Export backup
        </button>
        <label className="text-button backup-import">
          Import backup
          <input
            type="file"
            accept=".zip,application/zip"
            className="visually-hidden-input"
            onChange={handleImport}
          />
        </label>
      </div>
      {feedback?.kind === 'alert' && (
        <p role="alert" className="backup-message backup-alert">
          {feedback.message}
        </p>
      )}
      {feedback?.kind === 'status' && (
        <p role="status" className="backup-message backup-status">
          {feedback.message}
        </p>
      )}
    </div>
  );
}
