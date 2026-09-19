import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Copy,
  Check,
  Share2,
  Wallet,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Send,
  Building2,
  CreditCard,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { openExternalUrl } from '../../utils/url';

interface ReferralProfile {
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

interface PayoutRequest {
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

interface ReferralSettings {
  min_payout: number;
  reward_type: string;
  reward_value: number;
  friend_discount_type: string;
  friend_discount_value: number;
}

interface ReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEmail?: string;
  defaultName?: string;
}

const API_BASE = 'https://tg-drive-license-service.jupiterbania472.workers.dev';

export const ReferralModal: React.FC<ReferralModalProps> = ({
  isOpen,
  onClose,
  defaultEmail,
  defaultName,
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [isEditingEmail, setIsEditingEmail] = useState(false);

  const [, setLoading] = useState(false);
  const [profile, setProfile] = useState<ReferralProfile | null>(null);
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [settings, setSettings] = useState<ReferralSettings>({
    min_payout: 200,
    reward_type: 'fixed',
    reward_value: 50,
    friend_discount_type: 'percent',
    friend_discount_value: 10,
  });

  const [copiedCode, setCopiedCode] = useState(false);

  // Withdrawal state
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [payoutMethod, setPayoutMethod] = useState<'upi' | 'bank'>('upi');
  const [upiId, setUpiId] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [bankHolder, setBankHolder] = useState('');
  const [bankName, setBankName] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawSuccess, setWithdrawSuccess] = useState<string | null>(null);

  // Initialize email & name from props or storage
  useEffect(() => {
    if (!isOpen) return;
    const storedEmail = defaultEmail || localStorage.getItem('tg_drive_checkout_email') || '';
    const storedName = defaultName || localStorage.getItem('tg_drive_checkout_name') || '';
    setUserEmail(storedEmail);
    setUserName(storedName);
  }, [isOpen, defaultEmail, defaultName]);

  // Fetch Referral Profile
  const fetchProfile = useCallback(async (emailToFetch: string, nameToFetch?: string) => {
    if (!emailToFetch || !emailToFetch.includes('@')) return;
    setLoading(true);
    try {
      const url = `${API_BASE}/api/referral/profile?email=${encodeURIComponent(emailToFetch)}&name=${encodeURIComponent(nameToFetch || '')}&_t=${Date.now()}`;
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

        // Pre-fill withdrawal details if saved
        if (data.profile.default_payout_method === 'bank') {
          setPayoutMethod('bank');
        } else {
          setPayoutMethod('upi');
        }
        if (data.profile.default_upi_id) setUpiId(data.profile.default_upi_id);
        if (data.profile.default_bank_account) setBankAccount(data.profile.default_bank_account);
        if (data.profile.default_bank_ifsc) setBankIfsc(data.profile.default_bank_ifsc);
        if (data.profile.default_bank_holder) setBankHolder(data.profile.default_bank_holder);
        if (data.profile.default_bank_name) setBankName(data.profile.default_bank_name);

        // Pre-fill default withdrawal amount with available balance
        if (data.profile.wallet_balance > 0) {
          setWithdrawAmount(String(data.profile.wallet_balance));
        }
      }
    } catch (err) {
      console.error('Error fetching referral profile:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && userEmail && userEmail.includes('@')) {
      void fetchProfile(userEmail, userName);
    }
  }, [isOpen, userEmail, userName, fetchProfile]);

  if (!isOpen) return null;

  const referralCode = profile?.referral_code || 'TG-DRIVE';
  const shareLink = `https://t.me/tg_drive_bot?start=ref_${referralCode}`;
  const viralMessage = `⚡ Hey! Check out TG Drive — Unlimited Cloud Storage backed by Telegram for all your videos, photos, and files!\n\nUse my referral code "${referralCode}" to get an instant ${settings.friend_discount_value}% discount on Lifetime Pro!\n\nDownload & join here: ${shareLink}`;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // Clipboard fallback
    }
  };

  const handleShareWhatsApp = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(viralMessage)}`;
    void openExternalUrl(url);
  };

  const handleShareTelegram = () => {
    const url = `https://t.me/share/url?url=${encodeURIComponent(shareLink)}&text=${encodeURIComponent(`Get ${settings.friend_discount_value}% OFF TG Drive Pro with code "${referralCode}"`)}`;
    void openExternalUrl(url);
  };

  const handleWithdrawalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError(null);
    setWithdrawSuccess(null);

    const amount = parseFloat(withdrawAmount);
    if (!amount || isNaN(amount) || amount <= 0) {
      setWithdrawError('Please enter a valid withdrawal amount.');
      return;
    }

    if (amount < settings.min_payout) {
      setWithdrawError(`Minimum withdrawal amount is ₹${settings.min_payout}.`);
      return;
    }

    if (profile && amount > profile.wallet_balance) {
      setWithdrawError(`Insufficient balance. You have ₹${profile.wallet_balance.toFixed(2)} available.`);
      return;
    }

    if (payoutMethod === 'upi') {
      if (!upiId.trim() || !upiId.includes('@')) {
        setWithdrawError('Please enter a valid UPI ID (e.g. name@okhdfcbank).');
        return;
      }
    } else {
      if (!bankAccount.trim() || !bankIfsc.trim() || !bankHolder.trim()) {
        setWithdrawError('Please enter complete Bank Account number, IFSC Code, and Account Holder Name.');
        return;
      }
    }

    setWithdrawing(true);
    try {
      const res = await fetch(`${API_BASE}/api/referral/request-payout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          name: userName,
          amount,
          payout_method: payoutMethod,
          upi_id: payoutMethod === 'upi' ? upiId.trim() : undefined,
          bank_account: payoutMethod === 'bank' ? bankAccount.trim() : undefined,
          bank_ifsc: payoutMethod === 'bank' ? bankIfsc.trim().toUpperCase() : undefined,
          bank_holder_name: payoutMethod === 'bank' ? bankHolder.trim() : undefined,
          bank_name: payoutMethod === 'bank' ? bankName.trim() : undefined,
        }),
      });

      const data = (await res.json()) as { success?: boolean; error?: string; message?: string };
      if (res.ok && data.success) {
        setWithdrawSuccess(data.message || 'Withdrawal request submitted successfully!');
        void fetchProfile(userEmail, userName);
      } else {
        setWithdrawError(data.error || 'Failed to submit withdrawal request.');
      }
    } catch {
      setWithdrawError('Connection error. Please check your network and try again.');
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div
        className={`w-full max-w-xl max-h-[92vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden transition-all ${
          isLight
            ? 'bg-white/95 border-slate-200 text-slate-900'
            : 'bg-slate-950/95 border-slate-800 text-slate-100'
        }`}
      >
        {/* Modal Header */}
        <div
          className={`flex items-center justify-between px-5 py-4 border-b ${
            isLight ? 'border-slate-100 bg-slate-50/80' : 'border-slate-800/80 bg-slate-900/50'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-emerald-400 to-teal-500 flex items-center justify-center text-slate-950 shadow-md shadow-emerald-500/20">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold tracking-tight">Refer & Earn Real Cash</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/15 text-emerald-500 border border-emerald-500/25">
                  ₹{settings.reward_value} / Sale
                </span>
              </div>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Invite friends & earn ₹{settings.reward_value} direct to UPI / Bank
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors ${
              isLight ? 'hover:bg-slate-200 text-slate-500' : 'hover:bg-slate-800 text-slate-400'
            }`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          
          {/* Email Identity Check */}
          {(!userEmail || isEditingEmail) ? (
            <div
              className={`p-4 rounded-2xl border space-y-3 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
              }`}
            >
              <div className="text-xs font-bold text-cyan-500 uppercase tracking-wider flex items-center gap-1.5">
                <Wallet className="h-3.5 w-3.5" />
                <span>Enter Email to Load Your Referral Wallet</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={userEmail}
                  onChange={e => setUserEmail(e.target.value)}
                  placeholder="name@example.com"
                  className={`flex-1 px-3 py-2 rounded-xl border text-xs font-medium focus:outline-none ${
                    isLight
                      ? 'bg-white border-slate-300 text-slate-900'
                      : 'bg-slate-950 border-slate-700 text-white'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (userEmail && userEmail.includes('@')) {
                      setIsEditingEmail(false);
                      void fetchProfile(userEmail, userName);
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all shrink-0"
                >
                  Load Wallet
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between text-xs px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <span className="truncate">Wallet Account: <strong>{userEmail}</strong></span>
              <button
                type="button"
                onClick={() => setIsEditingEmail(true)}
                className="text-[10px] underline ml-2 hover:text-cyan-300 shrink-0"
              >
                Change
              </button>
            </div>
          )}

          {/* 1. Referral Code & Share Buttons Card */}
          <div
            className={`p-4 rounded-2xl border space-y-3.5 shadow-sm ${
              isLight
                ? 'bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-transparent border-emerald-200'
                : 'bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-slate-950 border-emerald-500/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-500 flex items-center gap-1.5">
                <Share2 className="h-3.5 w-3.5" />
                <span>Your Referral Code</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                Friend gets {settings.friend_discount_value}% OFF
              </span>
            </div>

            {/* Code Box with Copy */}
            <div
              className={`flex items-center justify-between p-3 rounded-2xl border font-mono font-black text-lg tracking-wider shadow-inner ${
                isLight
                  ? 'bg-white border-emerald-300 text-emerald-700'
                  : 'bg-slate-950 border-emerald-500/40 text-emerald-400'
              }`}
            >
              <span className="truncate">{referralCode}</span>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  {copiedCode ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedCode ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* 1-Click WhatsApp & Telegram Share Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Share WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={handleShareTelegram}
                className="py-2.5 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-md shadow-cyan-600/20 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span>Share Telegram</span>
              </button>
            </div>
          </div>

          {/* 2. Wallet & Earnings Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div
              className={`p-3 rounded-2xl border text-center ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
              }`}
            >
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Total Earned
              </span>
              <span className="text-xl font-black font-mono text-emerald-400 mt-1 block">
                ₹{profile?.total_earned ? Math.round(profile.total_earned) : 0}
              </span>
            </div>

            <div
              className={`p-3 rounded-2xl border text-center ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
              }`}
            >
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Wallet Balance
              </span>
              <span className="text-xl font-black font-mono text-cyan-400 mt-1 block">
                ₹{profile?.wallet_balance ? Math.round(profile.wallet_balance) : 0}
              </span>
            </div>

            <div
              className={`p-3 rounded-2xl border text-center ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
              }`}
            >
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Pro Sales
              </span>
              <span className="text-xl font-black font-mono text-indigo-400 mt-1 block">
                {profile?.total_pro_sales || 0}
              </span>
            </div>

            <div
              className={`p-3 rounded-2xl border text-center ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
              }`}
            >
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Pending Payout
              </span>
              <span className="text-xl font-black font-mono text-amber-400 mt-1 block">
                ₹{profile?.pending_payout ? Math.round(profile.pending_payout) : 0}
              </span>
            </div>
          </div>

          {/* 3. Withdrawal Request Section */}
          <div
            className={`p-4 rounded-2xl border space-y-3 ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
              <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-cyan-400">
                <CreditCard className="h-3.5 w-3.5" />
                <span>Withdraw Your Earnings</span>
              </span>
              <span className="text-[10px] text-slate-400">
                Min. Withdrawal: <strong>₹{settings.min_payout}</strong>
              </span>
            </div>

            <form onSubmit={handleWithdrawalSubmit} className="space-y-3">
              {/* Payment Method Switcher */}
              <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setPayoutMethod('upi')}
                  className={`flex-1 py-1.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
                    payoutMethod === 'upi'
                      ? 'bg-cyan-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Wallet className="h-3.5 w-3.5" />
                  <span>UPI ID (GPay / PhonePe / Paytm)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPayoutMethod('bank')}
                  className={`flex-1 py-1.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
                    payoutMethod === 'bank'
                      ? 'bg-cyan-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Building2 className="h-3.5 w-3.5" />
                  <span>Bank Account</span>
                </button>
              </div>

              {/* UPI Fields */}
              {payoutMethod === 'upi' ? (
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Your UPI ID <span className="text-[10px] font-normal">(e.g. yourname@okhdfcbank / yourname@paytm)</span>
                  </label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={e => setUpiId(e.target.value)}
                    placeholder="name@okaxis"
                    required
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-mono font-medium focus:outline-none ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-900 focus:border-cyan-500'
                        : 'bg-slate-950 border-slate-700 text-white focus:border-cyan-400'
                    }`}
                  />
                </div>
              ) : (
                /* Bank Account Fields */
                <div className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        Bank Account Number
                      </label>
                      <input
                        type="text"
                        value={bankAccount}
                        onChange={e => setBankAccount(e.target.value)}
                        placeholder="123456789012"
                        required
                        className={`w-full px-3 py-2 rounded-xl border text-xs font-mono font-medium focus:outline-none ${
                          isLight
                            ? 'bg-white border-slate-300 text-slate-900 focus:border-cyan-500'
                            : 'bg-slate-950 border-slate-700 text-white focus:border-cyan-400'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        IFSC Code
                      </label>
                      <input
                        type="text"
                        value={bankIfsc}
                        onChange={e => setBankIfsc(e.target.value.toUpperCase())}
                        placeholder="HDFC0001234"
                        required
                        className={`w-full px-3 py-2 rounded-xl border text-xs font-mono font-medium uppercase focus:outline-none ${
                          isLight
                            ? 'bg-white border-slate-300 text-slate-900 focus:border-cyan-500'
                            : 'bg-slate-950 border-slate-700 text-white focus:border-cyan-400'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        Account Holder Name
                      </label>
                      <input
                        type="text"
                        value={bankHolder}
                        onChange={e => setBankHolder(e.target.value)}
                        placeholder="Name as per Bank"
                        required
                        className={`w-full px-3 py-2 rounded-xl border text-xs font-medium focus:outline-none ${
                          isLight
                            ? 'bg-white border-slate-300 text-slate-900 focus:border-cyan-500'
                            : 'bg-slate-950 border-slate-700 text-white focus:border-cyan-400'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        Bank Name (Optional)
                      </label>
                      <input
                        type="text"
                        value={bankName}
                        onChange={e => setBankName(e.target.value)}
                        placeholder="e.g. HDFC Bank"
                        className={`w-full px-3 py-2 rounded-xl border text-xs font-medium focus:outline-none ${
                          isLight
                            ? 'bg-white border-slate-300 text-slate-900 focus:border-cyan-500'
                            : 'bg-slate-950 border-slate-700 text-white focus:border-cyan-400'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Amount Input */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] font-medium text-slate-400">
                    Withdrawal Amount (₹)
                  </label>
                  {profile && profile.wallet_balance > 0 && (
                    <button
                      type="button"
                      onClick={() => setWithdrawAmount(String(profile.wallet_balance))}
                      className="text-[10px] text-cyan-400 font-bold hover:underline cursor-pointer"
                    >
                      Withdraw All (₹{profile.wallet_balance.toFixed(2)})
                    </button>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-slate-500">₹</span>
                  <input
                    type="number"
                    min={settings.min_payout}
                    max={profile?.wallet_balance || 100000}
                    step="1"
                    value={withdrawAmount}
                    onChange={e => setWithdrawAmount(e.target.value)}
                    placeholder={String(settings.min_payout)}
                    required
                    className={`w-full pl-7 pr-3 py-2 rounded-xl border text-xs font-bold font-mono focus:outline-none ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-900 focus:border-cyan-500'
                        : 'bg-slate-950 border-slate-700 text-white focus:border-cyan-400'
                    }`}
                  />
                </div>
              </div>

              {withdrawError && (
                <div className="flex items-center gap-1.5 p-2 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{withdrawError}</span>
                </div>
              )}

              {withdrawSuccess && (
                <div className="flex items-center gap-1.5 p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span>{withdrawSuccess}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={withdrawing || !profile || profile.wallet_balance < settings.min_payout}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 via-cyan-500 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 text-xs font-black shadow-md shadow-cyan-500/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {withdrawing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Submitting Request...</span>
                  </>
                ) : (
                  <>
                    <ArrowUpRight className="h-3.5 w-3.5 stroke-[3]" />
                    <span>Request Payout ({withdrawAmount ? `₹${withdrawAmount}` : 'Enter Amount'})</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* 4. Previous Payout History */}
          {payouts.length > 0 && (
            <div className="space-y-2 pt-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Withdrawal History
              </span>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {payouts.map(p => {
                  const date = new Date(p.created_at * 1000).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  });

                  return (
                    <div
                      key={p.id}
                      className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                        isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/70 border-slate-800'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold font-mono text-emerald-400">₹{p.amount.toFixed(2)}</span>
                          <span className="text-[10px] uppercase font-bold text-slate-400">via {p.payout_method}</span>
                          <span className="text-[10px] text-slate-500">• {date}</span>
                        </div>
                        {p.utr_number && (
                          <span className="text-[10px] font-mono text-cyan-400 block mt-0.5">
                            UTR: {p.utr_number}
                          </span>
                        )}
                        {p.status === 'rejected' && p.admin_notes && (
                          <span className="text-[10px] text-rose-400 block mt-0.5">
                            Refunded: {p.admin_notes}
                          </span>
                        )}
                      </div>

                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                          p.status === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : p.status === 'rejected'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        }`}
                      >
                        {p.status === 'completed' ? 'PAID' : p.status.toUpperCase()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
