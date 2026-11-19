import { fireEvent, render, screen } from '@testing-library/react';
import { DEFAULT_SETTINGS, type MetronomeSettings } from '@tempodojo/core-metronome';
import { SettingsSheet } from './SettingsSheet';

const setup = (patch: Partial<MetronomeSettings> = {}) => {
  const onChange = vi.fn();
  const onClose = vi.fn();
  const settings = { ...DEFAULT_SETTINGS, ...patch };
  render(<SettingsSheet open settings={settings} onChange={onChange} onClose={onClose} />);
  return { onChange, onClose, settings };
};

describe('SettingsSheet', () => {
  it('renders nothing when closed', () => {
    render(<SettingsSheet open={false} settings={DEFAULT_SETTINGS} onChange={vi.fn()} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('is a labelled dialog that closes from its button and Escape', () => {
    const { onClose } = setup();
    const dialog = screen.getByRole('dialog', { name: 'Meter and sound' });
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('adds a beat, keeping existing accents', () => {
    const { onChange } = setup({ accents: ['accent', 'ghost', 'mute', 'normal'] });
    fireEvent.click(screen.getByRole('button', { name: 'More beats' }));
    expect(onChange).toHaveBeenCalledWith({
      meter: { beatsPerBar: 5, denominator: 4, beatUnit: 'quarter' },
      accents: ['accent', 'ghost', 'mute', 'normal', 'normal'],
    });
  });

  it('switches note value and resets the beat unit', () => {
    const { onChange } = setup({ meter: { beatsPerBar: 7, denominator: 4, beatUnit: 'quarter' }, accents: Array(7).fill('normal') });
    fireEvent.click(screen.getByRole('radio', { name: '8' }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ meter: { beatsPerBar: 7, denominator: 8, beatUnit: 'eighth' } }),
    );
  });

  it('offers a dotted-quarter pulse only for compound meters', () => {
    setup();
    expect(screen.queryByRole('checkbox', { name: 'Dotted-quarter pulse' })).toBeNull();
  });

  it('turns on the dotted-quarter pulse in 6/8', () => {
    const { onChange } = setup({ meter: { beatsPerBar: 6, denominator: 8, beatUnit: 'eighth' }, accents: Array(6).fill('normal') });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Dotted-quarter pulse' }));
    expect(onChange).toHaveBeenCalledWith({
      meter: { beatsPerBar: 6, denominator: 8, beatUnit: 'dotted-quarter' },
      accents: ['normal', 'normal'],
    });
  });

  it('sets subdivision, subdivision clicks, sound and count-in', () => {
    const { onChange } = setup();
    fireEvent.click(screen.getByRole('radio', { name: 'Triplets' }));
    expect(onChange).toHaveBeenLastCalledWith({ subdivision: 3 });
    fireEvent.click(screen.getByRole('radio', { name: 'Mute' }));
    expect(onChange).toHaveBeenLastCalledWith({ subdivisionLevel: 'mute' });
    fireEvent.click(screen.getByRole('radio', { name: 'Rim' }));
    expect(onChange).toHaveBeenLastCalledWith({ soundId: 'rim' });
    fireEvent.click(screen.getByRole('radio', { name: '2 bars' }));
    expect(onChange).toHaveBeenLastCalledWith({ countInBars: 2 });
  });

  it('marks the current values as checked', () => {
    setup({ subdivision: 4, countInBars: 1 });
    expect((screen.getByRole('radio', { name: 'Sixteenths' }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole('radio', { name: '1 bar' }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole('radio', { name: '4' }) as HTMLInputElement).checked).toBe(true);
  });

  it('applies the click-on-2-and-4 preset', () => {
    const { onChange } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Click on 2 and 4' }));
    expect(onChange).toHaveBeenCalledWith({ accents: ['mute', 'accent', 'mute', 'accent'] });
  });

  it('cannot go below 1 or above 16 beats', () => {
    setup({ meter: { beatsPerBar: 1, denominator: 4, beatUnit: 'quarter' }, accents: ['accent'] });
    expect((screen.getByRole('button', { name: 'Fewer beats' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
