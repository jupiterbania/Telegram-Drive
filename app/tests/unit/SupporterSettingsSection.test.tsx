import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SupporterSettingsSection } from '../../src/components/desktop/dashboard/settings/SettingsTabs';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue({
    id: 12345678,
    firstName: 'Alex',
    phone: '+1234567890',
  }),
}));

vi.mock('../../src/services/licenseManager', () => ({
  licenseManager: {
    loadLicense: vi.fn().mockResolvedValue({
      isLicensed: true,
      licenseKey: 'PRO-12345678-ABCD-9999',
      planType: 'lifetime',
      hardwareId: 'hw-mock-identifier-1234567890',
    }),
    checkTelegramAccount: vi.fn().mockResolvedValue({
      isLicensed: true,
      license: {
        isLicensed: true,
        licenseKey: 'PRO-12345678-ABCD-9999',
        planType: 'lifetime',
      },
    }),
    deactivateLicense: vi.fn().mockResolvedValue(true),
    getExpiryDetails: vi.fn().mockReturnValue({
      isLifetime: true,
      isExpired: false,
      formattedDate: 'Never (Lifetime Access)',
      remainingDays: 99999,
      remainingHours: 99999,
      remainingMinutes: 99999,
      countdownText: 'Lifetime Access',
    }),
  },
}));

afterEach(() => {
  cleanup();
});

describe('SupporterSettingsSection', () => {
  it('renders Telegram Account Pro Membership status', async () => {
    render(<SupporterSettingsSection />);

    expect(await screen.findByText('✓ PRO ACTIVE')).toBeTruthy();
    expect(await screen.findByText(/Lifetime Pro/i)).toBeTruthy();
    expect(await screen.findByText(/Telegram ID: 12345678/i)).toBeTruthy();
  });
});
