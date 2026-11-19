import { render, screen } from '@testing-library/react';
import { StorageLine, formatBytes } from './StorageLine';

describe('StorageLine', () => {
  it('formats sizes for people', () => {
    expect(formatBytes(512)).toBe('512 bytes');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(1.5 * 1024 * 1024)).toBe('1.5 MB');
    expect(formatBytes(48.4 * 1024 * 1024)).toBe('48 MB');
    expect(formatBytes(2.14 * 1024 ** 3)).toBe('2.1 GB');
  });

  it('shows use and quota once known', async () => {
    render(<StorageLine usage={async () => ({ usedBytes: 48 * 1024 * 1024, quotaBytes: 2.1 * 1024 ** 3 })} />);
    expect(await screen.findByText('Using 48 MB of 2.1 GB on this device.')).toBeTruthy();
  });

  it('renders nothing when the browser cannot tell', async () => {
    const { container } = render(<StorageLine usage={async () => null} />);
    await new Promise((r) => setTimeout(r, 10));
    expect(container.textContent).toBe('');
  });
});
