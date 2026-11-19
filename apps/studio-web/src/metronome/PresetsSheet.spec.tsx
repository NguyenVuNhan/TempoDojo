import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DEFAULT_SETTINGS } from '@tempodojo/core-metronome';
import { PresetsSheet } from './PresetsSheet';
import { MemoryRepo } from './test-utils';

const setup = async (repo = new MemoryRepo()) => {
  const onLoad = vi.fn();
  const onClose = vi.fn();
  let id = 0;
  render(
    <PresetsSheet
      open
      repo={repo}
      current={{ ...DEFAULT_SETTINGS, bpm: 90 }}
      onLoad={onLoad}
      onClose={onClose}
      now={() => 1000 + id}
      makeId={() => `p${++id}`}
    />,
  );
  await waitFor(() => expect(screen.getByRole('dialog', { name: 'Presets' })).toBeTruthy());
  return { repo, onLoad, onClose };
};

describe('PresetsSheet', () => {
  it('shows an empty state', async () => {
    await setup();
    expect(await screen.findByText('No presets yet. Save the current setup to reuse it.')).toBeTruthy();
  });

  it('saves the current settings under a name', async () => {
    const { repo } = await setup();
    fireEvent.change(screen.getByRole('textbox', { name: 'Preset name' }), { target: { value: 'Paradiddle 90' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save preset' }));
    expect(await screen.findByRole('button', { name: 'Load Paradiddle 90' })).toBeTruthy();
    expect(repo.presets).toHaveLength(1);
    expect(repo.presets[0]).toMatchObject({ id: 'p1', name: 'Paradiddle 90' });
    expect(repo.presets[0].settings.bpm).toBe(90);
    expect((screen.getByRole('textbox', { name: 'Preset name' }) as HTMLInputElement).value).toBe('');
  });

  it('does not save without a name', async () => {
    const { repo } = await setup();
    expect((screen.getByRole('button', { name: 'Save preset' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByRole('textbox', { name: 'Preset name' }), { target: { value: '   ' } });
    expect((screen.getByRole('button', { name: 'Save preset' }) as HTMLButtonElement).disabled).toBe(true);
    expect(repo.presets).toHaveLength(0);
  });

  it('lists presets with their tempo and meter, and loads one', async () => {
    const repo = new MemoryRepo();
    repo.presets = [{ id: 'x', name: 'Swing', updatedAt: 1, settings: { ...DEFAULT_SETTINGS, bpm: 140 } }];
    const { onLoad } = await setup(repo);
    expect(await screen.findByText('140 BPM · 4/4')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Load Swing' }));
    expect(onLoad).toHaveBeenCalledWith(expect.objectContaining({ id: 'x', name: 'Swing' }));
  });

  it('deletes a preset', async () => {
    const repo = new MemoryRepo();
    repo.presets = [{ id: 'x', name: 'Swing', updatedAt: 1, settings: DEFAULT_SETTINGS }];
    await setup(repo);
    fireEvent.click(await screen.findByRole('button', { name: 'Delete Swing' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Load Swing' })).toBeNull());
    expect(repo.presets).toHaveLength(0);
  });
});
