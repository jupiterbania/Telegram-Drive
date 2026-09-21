import { useState, useEffect, useCallback } from 'react';
import { openExternalUrl } from '../utils/url';
import { toast } from 'sonner';

export interface ReferralProfile {
  id: string;
  referral_code: string;
  user_email: string;
  user_name: string | null;
  total_clicks: number;
  total_referrals: number;
  total_pro_sales: number;
  total_earned: number;
  wallet_balance: number;
  pending_payout: number;
  total_paid: number;
  default_payout_method: string | null;
  default_upi_id: string | null;
  default_bank_name: string | null;
  default_bank_account: string | null;
  default_bank_ifsc: string | null;
  default_bank_holder: string | null;
}

export interface PayoutRequest {
  id: string;
  referral_code: string;
  user_email: string;
  amount: number;
  payout_method: 'upi' | 'bank';
  upi_id: string | null;
  bank_name: string | null;
  bank_account: string | null;
  bank_ifsc: string | null;
  bank_holder_name: string | null;
  status: 'pending' | 'completed' | 'rejected';
  admin_notes: string | null;
  utr_number: string | null;
  created_at: number;
  processed_at: number | null;
}

export interface ReferralSettings {
  min_payout: number;
  reward_type: string;
  reward_value: number;
  friend_discount_type: string;
  friend_discount_value: number;
}

export interface RequestPayoutParams {
  amount: number;
  payoutMethod: 'upi' | 'bank';
  upiId?: string;
  bankAccount?: string;
  bankIfsc?: string;
  bankHolder?: string;
  bankName?: string;
}

const API_BASE = 'https://tg-drive-license-service.jupiterbania472.workers.dev';

export function useReferralProgram(initialEmail?: string, initialName?: string) {
  const [userEmail, setUserEmailState] = useState<string>(() => {
    return initialEmail || localStorage.getItem('tg_drive_checkout_email') || '';
  });
  const [userName, setUserNameState] = useState<string>(() => {
    return initialName || localStorage.getItem('tg_drive_checkout_name') || '';
  });

  const [profile, setProfile] = useState<ReferralProfile | null>(null);
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [settings, setSettings] = useState<ReferralSettings>({
    min_payout: 200,
    reward_type: 'fixed',
    reward_value: 50,
    friend_discount_type: 'percent',
    friend_discount_value: 10,
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [submittingPayout, setSubmittingPayout] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const setUserEmail = useCallback((email: string) => {
    const trimmed = email.trim();
    setUserEmailState(trimmed);
    if (trimmed) {
      localStorage.setItem('tg_drive_checkout_email', trimmed);
    }
  }, []);

  const setUserName = useCallback((name: string) => {
    const trimmed = name.trim();
    setUserNameState(trimmed);
    if (trimmed) {
      localStorage.setItem('tg_drive_checkout_name', trimmed);
    }
  }, []);

  const fetchProfile = useCallback(async (emailToFetch?: string, nameToFetch?: string) => {
    const targetEmail = (emailToFetch || userEmail || '').trim();
    const targetName = (nameToFetch || userName || '').trim();
    if (!targetEmail || !targetEmail.includes('@')) return;

    setLoading(true);
    try {
      const url = `${API_BASE}/api/referral/profile?email=${encodeURIComponent(targetEmail)}&name=${encodeURIComponent(targetName)}&_t=${Date.now()}`;
      const res = await fetch(url);
      const data = (await res.json()) as {
        success?: boolean;
        profile?: ReferralProfile;
        payouts?: PayoutRequest[];
        settings?: ReferralSettings;
        error?: string;
      };

      if (res.ok && data.success && data.profile) {
        setProfile(data.profile);
        setPayouts(data.payouts || []);
        if (data.settings) setSettings(data.settings);
      }
    } catch (err) {
      console.error('[Referral] Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  }, [userEmail, userName]);

  // Initial fetch when email is valid
  useEffect(() => {
    if (userEmail && userEmail.includes('@')) {
      void fetchProfile(userEmail, userName);
    }
  }, [userEmail, userName, fetchProfile]);

  const referralCode = profile?.referral_code || 'TG-DRIVE';
  const shareLink = `https://t.me/tg_drive_bot?start=ref_${referralCode}`;
  const viralMessage = `⚡ Hey! Upgrade to TG Drive Lifetime Pro (Unlimited Cloud Storage backed by Telegram)!\n\nUse my Referral Code "${referralCode}" during purchase checkout to get an instant ${settings.friend_discount_value}% discount!\n\nGet Pro here: ${shareLink}`;

  const copyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopiedCode(true);
      toast.success('Referral code copied to clipboard!');
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      toast.error('Could not copy code. Please copy manually.');
    }
  }, [referralCode]);

  const copyShareLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopiedLink(true);
      toast.success('Share link copied to clipboard!');
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast.error('Could not copy link. Please copy manually.');
    }
  }, [shareLink]);

  const copyPitchMessage = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(viralMessage);
      toast.success('Promotion pitch copied with your referral code!');
    } catch {
      toast.error('Could not copy message.');
    }
  }, [viralMessage]);

  const shareWhatsApp = useCallback(() => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(viralMessage)}`;
    void openExternalUrl(url);
  }, [viralMessage]);

  const shareTelegram = useCallback(() => {
    const text = `⚡ Get ${settings.friend_discount_value}% OFF on TG Drive Lifetime Pro!\nApply Referral Code "${referralCode}" at checkout: ${shareLink}`;
    const url = `https://t.me/share/url?url=${encodeURIComponent(shareLink)}&text=${encodeURIComponent(text)}`;
    void openExternalUrl(url);
  }, [shareLink, settings.friend_discount_value, referralCode]);

  const shareTwitter = useCallback(() => {
    const tweet = `Get ${settings.friend_discount_value}% OFF TG Drive Unlimited Cloud! Enter referral code "${referralCode}" at checkout: ${shareLink}`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}`;
    void openExternalUrl(url);
  }, [referralCode, settings.friend_discount_value, shareLink]);

  const submitPayoutRequest = useCallback(async (params: RequestPayoutParams): Promise<{ success: boolean; message?: string; error?: string }> => {
    if (!userEmail || !userEmail.includes('@')) {
      return { success: false, error: 'Please enter a valid wallet email address.' };
    }

    if (params.amount < settings.min_payout) {
      return { success: false, error: `Minimum withdrawal amount is ₹${settings.min_payout}.` };
    }

    if (profile && params.amount > profile.wallet_balance) {
      return { success: false, error: `Insufficient balance. Available: ₹${profile.wallet_balance.toFixed(2)}` };
    }

    if (params.payoutMethod === 'upi') {
      if (!params.upiId || !params.upiId.includes('@')) {
        return { success: false, error: 'Please enter a valid UPI ID (e.g. name@okaxis).' };
      }
    } else {
      if (!params.bankAccount || !params.bankIfsc || !params.bankHolder) {
        return { success: false, error: 'Please enter Bank Account Number, IFSC code, and Account Holder Name.' };
      }
    }

    setSubmittingPayout(true);
    try {
      const res = await fetch(`${API_BASE}/api/referral/request-payout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          name: userName || undefined,
          amount: params.amount,
          payout_method: params.payoutMethod,
          upi_id: params.payoutMethod === 'upi' ? params.upiId?.trim() : undefined,
          bank_account: params.payoutMethod === 'bank' ? params.bankAccount?.trim() : undefined,
          bank_ifsc: params.payoutMethod === 'bank' ? params.bankIfsc?.trim().toUpperCase() : undefined,
          bank_holder_name: params.payoutMethod === 'bank' ? params.bankHolder?.trim() : undefined,
          bank_name: params.payoutMethod === 'bank' ? params.bankName?.trim() : undefined,
        }),
      });

      const data = (await res.json()) as { success?: boolean; error?: string; message?: string };
      if (res.ok && data.success) {
        toast.success(data.message || 'Withdrawal request submitted successfully!');
        void fetchProfile(userEmail, userName);
        return { success: true, message: data.message || 'Withdrawal requested successfully.' };
      } else {
        const errMsg = data.error || 'Failed to submit withdrawal request.';
        toast.error(errMsg);
        return { success: false, error: errMsg };
      }
    } catch {
      const errNet = 'Connection error. Please check your internet connection.';
      toast.error(errNet);
      return { success: false, error: errNet };
    } finally {
      setSubmittingPayout(false);
    }
  }, [userEmail, userName, settings.min_payout, profile, fetchProfile]);

  return {
    userEmail,
    userName,
    setUserEmail,
    setUserName,
    profile,
    payouts,
    settings,
    loading,
    submittingPayout,
    copiedCode,
    copiedLink,
    referralCode,
    shareLink,
    viralMessage,
    fetchProfile,
    copyCode,
    copyShareLink,
    copyPitchMessage,
    shareWhatsApp,
    shareTelegram,
    shareTwitter,
    submitPayoutRequest,
  };
}
