import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BackupError, DEFAULT_PREFS, type BackupData } from '@tempodojo/storage';
import { BackupSection, type BackupSectionProps } from './BackupSection';

const data: BackupData = {
  version: 1,
  exportedAt: new Date(2026, 10, 2, 9, 30).getTime(),
  presets: [],
  lastSettings: null,
  progress: [],
  events: [],
  prefs: DEFAULT_PREFS,
};

const setup = (patch: Partial<BackupSectionProps> = {}) => {
  const props: BackupSectionProps = {
    exportBackup: vi.fn(async () => new Uint8Array([1, 2, 3])),
    readBackup: vi.fn(async () => data),
    importBackup: vi.fn(async () => undefined),
    onImported: vi.fn(),
    confirm: vi.fn(() => true),
    download: vi.fn(),
    now: () => new Date(2026, 10, 19, 20, 0).getTime(),
    ...patch,
  };
  render(<BackupSection {...props} />);
  return props;
};

const pick = (bytes = new Uint8Array([9])) => {
  const file = new File([bytes], 'tempodojo-backup.zip', { type: 'application/zip' });
  fireEvent.change(screen.getByLabelText('Import backup'), { target: { files: [file] } });
};

describe('BackupSection', () => {
  it('exports a dated zip', async () => {
    const p = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Export backup' }));
    await waitFor(() => expect(p.download).toHaveBeenCalledWith(new Uint8Array([1, 2, 3]), 'tempodojo-backup-2026-11-19.zip'));
  });

  it('imports after confirming, naming the backup date', async () => {
    const p = setup();
    pick();
    await waitFor(() => expect(p.importBackup).toHaveBeenCalledWith(data));
    expect(p.confirm).toHaveBeenCalledWith('Replace everything on this device with the backup from 2 Nov 2026?');
    expect(p.onImported).toHaveBeenCalled();
    expect(await screen.findByRole('status')).toHaveProperty('textContent', 'Backup restored.');
  });

  it('does nothing when the confirm is declined', async () => {
    const p = setup({ confirm: vi.fn(() => false) });
    pick();
    await waitFor(() => expect(p.confirm).toHaveBeenCalled());
    expect(p.importBackup).not.toHaveBeenCalled();
    expect(p.onImported).not.toHaveBeenCalled();
  });

  it.each([
    ['not-a-backup', 'That file is not a TempoDojo backup. Nothing was changed.'],
    ['newer-version', 'That backup comes from a newer version of TempoDojo. Update the app, then try again. Nothing was changed.'],
    ['corrupt', 'That backup file is damaged and cannot be read. Nothing was changed.'],
  ] as const)('explains a %s file without importing', async (code, message) => {
    const p = setup({ readBackup: vi.fn(async () => Promise.reject(new BackupError(code))) });
    pick();
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', message);
    expect(p.confirm).not.toHaveBeenCalled();
    expect(p.importBackup).not.toHaveBeenCalled();
  });
});
