import { fireEvent, render, screen } from '@testing-library/react';
import { Sheet } from './Sheet';

describe('Sheet', () => {
  it('renders nothing when closed', () => {
    render(
      <Sheet open={false} title="Presets" onClose={vi.fn()}>
        body
      </Sheet>,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('is a modal dialog named by its title, focused on open', () => {
    render(
      <Sheet open title="Presets" onClose={vi.fn()}>
        body
      </Sheet>,
    );
    const dialog = screen.getByRole('dialog', { name: 'Presets' });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(document.activeElement).toBe(dialog);
  });

  it('closes on Done, Escape and the backdrop, but not on clicks inside', () => {
    const onClose = vi.fn();
    const { container } = render(
      <Sheet open title="Presets" onClose={onClose}>
        <p>inside</p>
      </Sheet>,
    );
    fireEvent.click(screen.getByText('inside'));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    fireEvent.click(container.querySelector('.sheet-backdrop') as Element);
    expect(onClose).toHaveBeenCalledTimes(3);
  });
});
