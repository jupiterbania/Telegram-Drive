import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReferralModal } from '../../src/components/shared/ReferralModal';
import { ReferralScreen } from '../../src/components/shared/referral/ReferralScreen';
import { EarningsWithdrawalScreen } from '../../src/components/shared/referral/EarningsWithdrawalScreen';

vi.mock('../../src/context/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark', isDark: true }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../src/utils/url', () => ({
  openExternalUrl: vi.fn(),
}));

// Mock fetch for referral API
const mockProfileData = {
  success: true,
  profile: {
    id: 'prof-123',
    referral_code: 'TG-TESTER',
    user_email: 'test@example.com',
    user_name: 'Test User',
    total_clicks: 25,
    total_referrals: 10,
    total_pro_sales: 4,
    total_earned: 200,
    wallet_balance: 150,
    pending_payout: 50,
    total_paid: 0,
    default_payout_method: 'upi',
    default_upi_id: 'test@upi',
    default_bank_name: null,
    default_bank_account: null,
    default_bank_ifsc: null,
    default_bank_holder: null,
  },
  payouts: [
    {
      id: 'pay-1',
      referral_code: 'TG-TESTER',
      user_email: 'test@example.com',
      amount: 200,
      payout_method: 'upi',
      upi_id: 'test@upi',
      bank_name: null,
      bank_account: null,
      bank_ifsc: null,
      bank_holder_name: null,
      status: 'completed',
      admin_notes: null,
      utr_number: 'UTR12345678',
      created_at: 1726000000,
      processed_at: 1726003600,
    },
  ],
  settings: {
    min_payout: 200,
    reward_type: 'fixed',
    reward_value: 50,
    friend_discount_type: 'percent',
    friend_discount_value: 10,
  },
};

describe('Referral & Earnings Screens', () => {
  beforeEach(() => {
    localStorage.clear();
    globalThis.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockProfileData),
      })
    ) as any;
  });

  describe('ReferralScreen', () => {
    it('renders the Refer & Earn title and reward badge', () => {
      render(
        <ReferralScreen
          onClose={vi.fn()}
          onNavigateToEarnings={vi.fn()}
          defaultEmail="test@example.com"
        />
      );

      expect(screen.getByText('Affiliate Partner Program')).toBeTruthy();
      expect(screen.getAllByText(/₹50/i).length).toBeGreaterThan(0);
      expect(screen.getByText('Your Referral Code (Applied at Purchase)')).toBeTruthy();
    });

    it('triggers onNavigateToEarnings when clicking View Earnings & Withdraw', () => {
      const onNavigateToEarnings = vi.fn();
      render(
        <ReferralScreen
          onClose={vi.fn()}
          onNavigateToEarnings={onNavigateToEarnings}
          defaultEmail="test@example.com"
        />
      );

      const earnBtn = screen.getByRole('button', { name: /View Earnings & Withdraw/i });
      fireEvent.click(earnBtn);
      expect(onNavigateToEarnings).toHaveBeenCalledTimes(1);
    });
  });

  describe('EarningsWithdrawalScreen', () => {
    it('renders balance cards and payout form', () => {
      render(
        <EarningsWithdrawalScreen
          onClose={vi.fn()}
          onNavigateToReferral={vi.fn()}
          defaultEmail="test@example.com"
        />
      );

      expect(screen.getByText('Available Balance')).toBeTruthy();
      expect(screen.getByText('Total Earned')).toBeTruthy();
      expect(screen.getByText('Request Payout')).toBeTruthy();
      expect(screen.getByText('UPI ID (Instant)')).toBeTruthy();
      expect(screen.getAllByText(/Bank Account/i).length).toBeGreaterThan(0);
    });

    it('allows switching to Bank Account mode', () => {
      render(
        <EarningsWithdrawalScreen
          onClose={vi.fn()}
          onNavigateToReferral={vi.fn()}
          defaultEmail="test@example.com"
        />
      );

      const bankBtn = screen.getByRole('button', { name: /Bank Account/i });
      fireEvent.click(bankBtn);

      expect(screen.getByText('Account Holder Name')).toBeTruthy();
      expect(screen.getByText('Bank Account Number')).toBeTruthy();
      expect(screen.getByText('Confirm Account Number')).toBeTruthy();
      expect(screen.getByText('IFSC Code')).toBeTruthy();
    });

    it('triggers onNavigateToReferral when back arrow is clicked', () => {
      const onNavigateToReferral = vi.fn();
      render(
        <EarningsWithdrawalScreen
          onClose={vi.fn()}
          onNavigateToReferral={onNavigateToReferral}
          defaultEmail="test@example.com"
        />
      );

      const backBtn = screen.getByTitle('Go to Refer & Earn');
      fireEvent.click(backBtn);
      expect(onNavigateToReferral).toHaveBeenCalledTimes(1);
    });
  });

  describe('ReferralModal adaptive container', () => {
    it('does not render when isOpen is false', () => {
      const { container } = render(
        <ReferralModal isOpen={false} onClose={vi.fn()} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('renders on initialTab="referral" and allows switching to earnings', () => {
      render(
        <ReferralModal
          isOpen={true}
          onClose={vi.fn()}
          initialTab="referral"
          defaultEmail="test@example.com"
        />
      );

      expect(screen.getAllByText('Refer & Earn').length).toBeGreaterThan(0);

      // Click on Earnings tab
      const earningsTab = screen.getByText('Earnings & Payouts');
      fireEvent.click(earningsTab);

      expect(screen.getAllByText('Earnings & Payouts').length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Payout/i).length).toBeGreaterThan(0);
    });

    it('renders on initialTab="earnings" directly', () => {
      render(
        <ReferralModal
          isOpen={true}
          onClose={vi.fn()}
          initialTab="earnings"
          defaultEmail="test@example.com"
        />
      );

      expect(screen.getAllByText('Earnings & Payouts').length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Payout/i).length).toBeGreaterThan(0);
    });
  });
});
