import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SupporterSettingsSection } from '../../src/components/desktop/dashboard/settings/SettingsTabs';

vi.mock('../../src/services/licenseManager', () => ({
  licenseManager: {
    loadLicense: vi.fn().mockResolvedValue({
      isLicensed: true,
      licenseKey: 'PRO-12345678-ABCD-9999',
      planType: 'lifetime',
      hardwareId: 'hw-mock-identifier-1234567890',
    }),
    deactivateLicense: vi.fn().mockResolvedValue(true),
  },
}));

afterEach(() => {
  cleanup();
});

describe('SupporterSettingsSection', () => {
  it('renders Commercial Pro License status and action buttons', async () => {
    render(<SupporterSettingsSection />);

    expect(screen.getByText('TG Drive: Commercial Pro License')).toBeTruthy();
    expect(screen.getByText('✓ PRO ACTIVE')).toBeTruthy();
    expect(await screen.findByText('PRO-12••••-••••-9999')).toBeTruthy();
    expect(screen.getByText('Self-Service Portal →')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Deactivate This Device' })).toBeTruthy();
  });
});
