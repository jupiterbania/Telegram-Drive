import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { openExternalUrl } from '../../src/utils/url';

const openUrlMock = vi.fn();
const openShellMock = vi.fn();

vi.mock('@tauri-apps/plugin-opener', () => ({
  openUrl: (...args: unknown[]) => openUrlMock(...args),
}));

vi.mock('@tauri-apps/plugin-shell', () => ({
  open: (...args: unknown[]) => openShellMock(...args),
}));

describe('openExternalUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('successfully opens URL via @tauri-apps/plugin-opener', async () => {
    openUrlMock.mockResolvedValueOnce(undefined);

    const result = await openExternalUrl('https://my.telegram.org');
    expect(result).toBe(true);
    expect(openUrlMock).toHaveBeenCalledWith('https://my.telegram.org');
    expect(openShellMock).not.toHaveBeenCalled();
  });

  it('falls back to @tauri-apps/plugin-shell when plugin-opener fails', async () => {
    openUrlMock.mockRejectedValueOnce(new Error('plugin-opener unsupported'));
    openShellMock.mockResolvedValueOnce(undefined);

    const result = await openExternalUrl('https://my.telegram.org');
    expect(result).toBe(true);
    expect(openUrlMock).toHaveBeenCalledWith('https://my.telegram.org');
    expect(openShellMock).toHaveBeenCalledWith('https://my.telegram.org');
  });

  it('falls back to window.open when both tauri plugins fail', async () => {
    openUrlMock.mockRejectedValueOnce(new Error('plugin-opener failed'));
    openShellMock.mockRejectedValueOnce(new Error('plugin-shell failed'));

    const windowOpenSpy = vi.spyOn(window, 'open').mockReturnValue({} as Window);

    const result = await openExternalUrl('https://my.telegram.org');
    expect(result).toBe(true);
    expect(windowOpenSpy).toHaveBeenCalledWith('https://my.telegram.org', '_blank', 'noopener,noreferrer');
  });

  it('returns false for empty URL', async () => {
    const result = await openExternalUrl('');
    expect(result).toBe(false);
    expect(openUrlMock).not.toHaveBeenCalled();
  });

  it('handles URL instances properly', async () => {
    openUrlMock.mockResolvedValueOnce(undefined);

    const result = await openExternalUrl(new URL('https://my.telegram.org'));
    expect(result).toBe(true);
    expect(openUrlMock).toHaveBeenCalledWith('https://my.telegram.org/');
  });
});
