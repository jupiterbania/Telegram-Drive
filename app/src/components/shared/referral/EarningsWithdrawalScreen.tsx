import React, { useState, useEffect } from 'react';
import {
  Wallet,
  CreditCard,
  Building2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  ArrowUpRight,
  RefreshCw,
  Copy,
  Check,
  Receipt,
  ShieldCheck,
  Smartphone,
  ArrowLeft,
} from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { toast } from 'sonner';
import type {
  ReferralProfile,
  PayoutRequest,
  ReferralSettings,
  RequestPayoutParams,
} from '../../../hooks/useReferralProgram';

const defaultReferralSettings: ReferralSettings = {
  min_payout: 100,
  reward_type: 'flat',
  reward_value: 50,
  friend_discount_type: 'percent',
  friend_discount_value: 10,
};

export interface EarningsWithdrawalScreenProps {
  onClose?: () => void;
  onNavigateToReferral?: () => void;
  userEmail?: string;
  defaultEmail?: string;
  userName?: string;
  defaultName?: string;
  setUserEmail?: (email: string) => void;
  setUserName?: (name: string) => void;
  profile?: ReferralProfile | null;
  payouts?: PayoutRequest[];
  settings?: ReferralSettings;
  loading?: boolean;
  submittingPayout?: boolean;
  fetchProfile?: (email?: string, name?: string) => Promise<void>;
  submitPayoutRequest?: (params: RequestPayoutParams) => Promise<{ success: boolean; message?: string; error?: string }>;
}

export const EarningsWithdrawalScreen: React.FC<EarningsWithdrawalScreenProps> = ({
  onNavigateToReferral,
  userEmail,
  defaultEmail,
  userName,
  defaultName,
  setUserEmail,
  setUserName,
  profile,
  payouts = [],
  settings = defaultReferralSettings,
  loading = false,
  submittingPayout = false,
  fetchProfile = async () => {},
  submitPayoutRequest = async () => ({ success: false, error: 'Payout failed' }),
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const activeEmail = userEmail || defaultEmail || '';
  const activeName = userName || defaultName || '';

  // Email form state if not loaded
  const [isEditingEmail, setIsEditingEmail] = useState(!activeEmail);
  const [emailInput, setEmailInput] = useState(activeEmail);
  const [nameInput, setNameInput] = useState(activeName);

  // Withdrawal form state
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [payoutMethod, setPayoutMethod] = useState<'upi' | 'bank'>('upi');
  const [upiId, setUpiId] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [confirmBankAccount, setConfirmBankAccount] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [bankHolder, setBankHolder] = useState('');
  const [bankName, setBankName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [copiedUtr, setCopiedUtr] = useState<string | null>(null);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'completed' | 'pending' | 'rejected'>('all');

  // Pre-fill defaults from profile if available
  useEffect(() => {
    if (profile) {
      if (profile.default_payout_method === 'bank') {
        setPayoutMethod('bank');
      }
      if (profile.default_upi_id && !upiId) setUpiId(profile.default_upi_id);
      if (profile.default_bank_account && !bankAccount) {
        setBankAccount(profile.default_bank_account);
        setConfirmBankAccount(profile.default_bank_account);
      }
      if (profile.default_bank_ifsc && !bankIfsc) setBankIfsc(profile.default_bank_ifsc);
      if (profile.default_bank_holder && !bankHolder) setBankHolder(profile.default_bank_holder);
      if (profile.default_bank_name && !bankName) setBankName(profile.default_bank_name);

      if (profile.wallet_balance > 0 && !withdrawAmount) {
        setWithdrawAmount(String(Math.floor(profile.wallet_balance)));
      }
    }
  }, [profile]);

  const handleSaveEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (emailInput && emailInput.includes('@')) {
      setUserEmail?.(emailInput);
      setUserName?.(nameInput);
      setIsEditingEmail(false);
      void fetchProfile(emailInput, nameInput);
    }
  };

  const handleWithdrawalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const amount = parseFloat(withdrawAmount);
    if (!amount || isNaN(amount) || amount <= 0) {
      setFormError('Please enter a valid withdrawal amount.');
      return;
    }

    if (amount < settings.min_payout) {
      setFormError(`Minimum withdrawal amount is ₹${settings.min_payout}.`);
      return;
    }

    if (profile && amount > profile.wallet_balance) {
      setFormError(`Insufficient balance. Available to withdraw: ₹${profile.wallet_balance.toFixed(2)}`);
      return;
    }

    if (payoutMethod === 'upi') {
      if (!upiId.trim() || !upiId.includes('@')) {
        setFormError('Please enter a valid UPI ID (e.g. name@okhdfcbank or 9876543210@paytm).');
        return;
      }
    } else {
      if (!bankAccount.trim() || !confirmBankAccount.trim() || !bankIfsc.trim() || !bankHolder.trim()) {
        setFormError('Please fill in Account Number, Confirm Account Number, IFSC code, and Account Holder Name.');
        return;
      }
      if (bankAccount.trim() !== confirmBankAccount.trim()) {
        setFormError('Bank Account Numbers do not match. Please re-check.');
        return;
      }
    }

    const res = await submitPayoutRequest({
      amount,
      payoutMethod,
      upiId: payoutMethod === 'upi' ? upiId : undefined,
      bankAccount: payoutMethod === 'bank' ? bankAccount : undefined,
      bankIfsc: payoutMethod === 'bank' ? bankIfsc : undefined,
      bankHolder: payoutMethod === 'bank' ? bankHolder : undefined,
      bankName: payoutMethod === 'bank' ? bankName : undefined,
    });

    if (res.success) {
      setFormSuccess(res.message || 'Withdrawal request submitted successfully!');
    } else {
      setFormError(res.error || 'Failed to submit request.');
    }
  };

  const handleCopyUtr = async (utr: string) => {
    try {
      await navigator.clipboard.writeText(utr);
      setCopiedUtr(utr);
      toast.success('UTR copied to clipboard');
      setTimeout(() => setCopiedUtr(null), 2000);
    } catch {
      toast.error('Could not copy UTR');
    }
  };

  const safePayouts = payouts || [];
  const safeSettings = settings || {
    reward_value: 50,
    friend_discount_percent: 10,
    min_payout: 100,
    enabled: true,
  };

  const filteredPayouts = safePayouts.filter((p) => {
    if (historyFilter === 'all') return true;
    return p.status === historyFilter;
  });

  const walletBalance = profile?.wallet_balance || 0;
  const isBalanceEligible = walletBalance >= safeSettings.min_payout;

  return (
    <div className="space-y-4 sm:space-y-5">
      {onNavigateToReferral && (
        <button
          type="button"
          onClick={onNavigateToReferral}
          title="Go to Refer & Earn"
          aria-label="Go to Refer & Earn"
          className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer py-1"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Go to Refer & Earn</span>
        </button>
      )}

      {/* ── Account Identity Strip ── */}
      {!activeEmail || isEditingEmail ? (
        <form
          onSubmit={handleSaveEmail}
          className={`p-3.5 sm:p-4 rounded-2xl border space-y-2.5 transition-all shadow-xs ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400">
            <Wallet className="w-4 h-4" />
            <span>Load Payout Account</span>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-400">
            Enter your email to load your wallet balance, bank details, and payout history.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              required
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="your.email@example.com"
              className={`flex-1 px-3.5 py-2.5 rounded-xl border text-xs font-medium focus:outline-hidden ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-900 focus:border-cyan-500'
                  : 'bg-slate-950 border-slate-700 text-white focus:border-cyan-400'
              }`}
            />
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all shrink-0 cursor-pointer shadow-xs active:scale-95"
            >
              Load Wallet
            </button>
          </div>
        </form>
      ) : (
        <div
          className={`flex items-center justify-between px-3.5 sm:px-4 py-2.5 rounded-2xl border text-xs ${
            isLight
              ? 'bg-cyan-500/5 border-cyan-500/20 text-cyan-900'
              : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-300'
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="truncate">
              Wallet Account: <strong className="font-semibold">{activeEmail}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => void fetchProfile(activeEmail, activeName)}
              disabled={loading}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-400 hover:underline cursor-pointer disabled:opacity-50"
              title="Refresh Balance"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden xs:inline">Refresh</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setEmailInput(activeEmail);
                setNameInput(activeName);
                setIsEditingEmail(true);
              }}
              className="text-[11px] font-bold text-cyan-400 hover:underline cursor-pointer"
            >
              Change
            </button>
          </div>
        </div>
      )}

      {/* ── Financial Metric Cards Grid (Fintech / Wallet Style) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        {/* 1. Available Wallet Balance (Hero Metric) */}
        <div
          className={`p-3.5 sm:p-4 rounded-3xl border relative overflow-hidden transition-all shadow-md ${
            isLight
              ? 'bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-white border-emerald-300'
              : 'bg-gradient-to-br from-emerald-500/20 via-teal-500/10 to-slate-950 border-emerald-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              Available Balance
            </span>
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
              Ready
            </span>
          </div>
          <div className="mt-1.5">
            <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-400 tracking-tight">
              ₹{walletBalance.toFixed(2)}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Ready to withdraw
            </span>
          </div>
        </div>

        {/* 2. Total Earned */}
        <div
          className={`p-3.5 sm:p-4 rounded-3xl border transition-all ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/50 border-slate-800'
          }`}
        >
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
            Total Earned
          </span>
          <div className="mt-1.5">
            <span className="text-xl sm:text-2xl font-black font-mono text-cyan-400 block">
              ₹{profile?.total_earned ? profile.total_earned.toFixed(2) : '0.00'}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              Lifetime income
            </span>
          </div>
        </div>

        {/* 3. Pending Payout */}
        <div
          className={`p-3.5 sm:p-4 rounded-3xl border transition-all ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/50 border-slate-800'
          }`}
        >
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
            In Review / Pending
          </span>
          <div className="mt-1.5">
            <span className="text-xl sm:text-2xl font-black font-mono text-amber-400 block">
              ₹{profile?.pending_payout ? profile.pending_payout.toFixed(2) : '0.00'}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              Processing in review
            </span>
          </div>
        </div>

        {/* 4. Total Paid Out */}
        <div
          className={`p-3.5 sm:p-4 rounded-3xl border transition-all ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/50 border-slate-800'
          }`}
        >
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
            Total Paid Out
          </span>
          <div className="mt-1.5">
            <span className="text-xl sm:text-2xl font-black font-mono text-indigo-400 block">
              ₹{profile?.total_paid ? profile.total_paid.toFixed(2) : '0.00'}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              Sent to Bank / UPI
            </span>
          </div>
        </div>
      </div>

      {/* ── Request Withdrawal Section ── */}
      <div
        className={`p-4 sm:p-6 rounded-3xl border space-y-4 shadow-xs ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/50 border-slate-800'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center shrink-0">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-app-text">Request Payout</h2>
              <p className="text-[11px] text-slate-400">
                Transfer your earnings directly to your UPI ID or Indian Bank Account
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-400">
              Min. Withdrawal: ₹{settings.min_payout}
            </span>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
              0% Fee (Free)
            </span>
          </div>
        </div>

        {formError && (
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {formSuccess && (
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{formSuccess}</span>
          </div>
        )}

        <form onSubmit={handleWithdrawalSubmit} className="space-y-4">
          {/* Amount Input with Quick Selection Chips */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 block">
              Withdrawal Amount (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-bold text-slate-400">
                ₹
              </span>
              <input
                type="number"
                min={settings.min_payout}
                max={walletBalance}
                step="1"
                required
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder={`Min ₹${settings.min_payout}`}
                className={`w-full pl-8 pr-4 py-2.5 rounded-xl border text-sm font-mono font-bold focus:outline-hidden ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-900 focus:border-cyan-500'
                    : 'bg-slate-950 border-slate-700 text-white focus:border-cyan-400'
                }`}
              />
            </div>

            {/* Quick Amount Chips */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 mr-1">Quick:</span>
              <button
                type="button"
                onClick={() => setWithdrawAmount(String(Math.floor(walletBalance)))}
                disabled={walletBalance < settings.min_payout}
                className="px-2.5 py-1 rounded-lg border text-[11px] font-bold bg-emerald-500/10 border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-40 cursor-pointer"
              >
                All Balance (₹{Math.floor(walletBalance)})
              </button>
              {[50, 100, 200, 500].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setWithdrawAmount(String(amt))}
                  disabled={walletBalance < amt}
                  className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all cursor-pointer ${
                    withdrawAmount === String(amt)
                      ? 'bg-cyan-500 text-slate-950 border-cyan-500'
                      : isLight
                      ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-40'
                      : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-40'
                  }`}
                >
                  ₹{amt}
                </button>
              ))}
            </div>
          </div>

          {/* Payment Method Switcher (UPI vs Bank) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 block">
              Transfer Destination
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPayoutMethod('upi')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                  payoutMethod === 'upi'
                    ? 'bg-cyan-500/15 border-cyan-500 text-cyan-300 shadow-xs'
                    : isLight
                    ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                    : 'bg-slate-950 border-slate-700 text-slate-300 hover:bg-slate-900'
                }`}
              >
                <Smartphone className={`w-4 h-4 ${payoutMethod === 'upi' ? 'text-cyan-400' : 'text-slate-400'}`} />
                <div>
                  <div className="text-xs font-bold">UPI ID (Instant)</div>
                  <div className="text-[10px] text-slate-400">GPay, PhonePe, Paytm, BHIM</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPayoutMethod('bank')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                  payoutMethod === 'bank'
                    ? 'bg-cyan-500/15 border-cyan-500 text-cyan-300 shadow-xs'
                    : isLight
                    ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                    : 'bg-slate-950 border-slate-700 text-slate-300 hover:bg-slate-900'
                }`}
              >
                <Building2 className={`w-4 h-4 ${payoutMethod === 'bank' ? 'text-cyan-400' : 'text-slate-400'}`} />
                <div>
                  <div className="text-xs font-bold">Direct Bank Account</div>
                  <div className="text-[10px] text-slate-400">NEFT / IMPS / RTGS</div>
                </div>
              </button>
            </div>
          </div>

          {/* Conditional Form Inputs */}
          {payoutMethod === 'upi' ? (
            <div className="space-y-1.5 animate-fade-in">
              <label className="text-xs font-bold text-slate-300 block">
                Your UPI ID (VPA)
              </label>
              <input
                type="text"
                required
                value={upiId}
                onChange={(e) => setUpiId(e.target.value.trim())}
                placeholder="e.g. yourname@okhdfcbank or 9876543210@paytm"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono font-medium focus:outline-hidden ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-900 focus:border-cyan-500'
                    : 'bg-slate-950 border-slate-700 text-white focus:border-cyan-400'
                }`}
              />
              <p className="text-[10px] text-slate-400">
                Pmt will be transferred directly to this UPI ID within 12-24 hours.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 block">
                    Account Holder Name
                  </label>
                  <input
                    type="text"
                    required
                    value={bankHolder}
                    onChange={(e) => setBankHolder(e.target.value)}
                    placeholder="Name as in Bank Passbook"
                    className={`w-full px-3.5 py-2 rounded-xl border text-xs font-medium focus:outline-hidden ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-900 focus:border-cyan-500'
                        : 'bg-slate-950 border-slate-700 text-white focus:border-cyan-400'
                    }`}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 block">
                    IFSC Code
                  </label>
                  <input
                    type="text"
                    required
                    value={bankIfsc}
                    onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
                    placeholder="e.g. HDFC0001234"
                    className={`w-full px-3.5 py-2 rounded-xl border text-xs font-mono font-medium focus:outline-hidden ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-900 focus:border-cyan-500'
                        : 'bg-slate-950 border-slate-700 text-white focus:border-cyan-400'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 block">
                    Bank Account Number
                  </label>
                  <input
                    type="text"
                    required
                    value={bankAccount}
                    onChange={(e) => setBankAccount(e.target.value.trim())}
                    placeholder="Account Number"
                    className={`w-full px-3.5 py-2 rounded-xl border text-xs font-mono font-medium focus:outline-hidden ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-900 focus:border-cyan-500'
                        : 'bg-slate-950 border-slate-700 text-white focus:border-cyan-400'
                    }`}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 block">
                    Confirm Account Number
                  </label>
                  <input
                    type="text"
                    required
                    value={confirmBankAccount}
                    onChange={(e) => setConfirmBankAccount(e.target.value.trim())}
                    placeholder="Re-enter Account Number"
                    className={`w-full px-3.5 py-2 rounded-xl border text-xs font-mono font-medium focus:outline-hidden ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-900 focus:border-cyan-500'
                        : 'bg-slate-950 border-slate-700 text-white focus:border-cyan-400'
                    }`}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 block">
                  Bank Name (Optional)
                </label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g. HDFC Bank, SBI, ICICI"
                  className={`w-full px-3.5 py-2 rounded-xl border text-xs font-medium focus:outline-hidden ${
                    isLight
                      ? 'bg-white border-slate-300 text-slate-900 focus:border-cyan-500'
                      : 'bg-slate-950 border-slate-700 text-white focus:border-cyan-400'
                  }`}
                />
              </div>
            </div>
          )}

          {/* Submit Withdrawal Button */}
          <button
            type="submit"
            disabled={submittingPayout || !isBalanceEligible}
            className={`w-full py-3 px-4 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-md ${
              isBalanceEligible
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 cursor-pointer active:scale-[0.99] shadow-emerald-500/20'
                : 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
            }`}
          >
            {submittingPayout ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing Request...</span>
              </>
            ) : isBalanceEligible ? (
              <>
                <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                <span>Request Payout of ₹{withdrawAmount || settings.min_payout}</span>
              </>
            ) : (
              <span>Balance Below Minimum ₹{settings.min_payout}</span>
            )}
          </button>
        </form>
      </div>

      {/* ── Payout History & Transaction Logs ── */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <Receipt className="w-4 h-4 text-cyan-400" />
            <span>Payout History &amp; Status</span>
          </div>

          {/* Status Filter Tabs */}
          <div
            className={`flex p-0.5 rounded-xl border text-[10px] font-bold ${
              isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-900 border-slate-800'
            }`}
          >
            {(['all', 'completed', 'pending', 'rejected'] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setHistoryFilter(filter)}
                className={`px-2.5 py-1 rounded-lg uppercase tracking-wider transition-all cursor-pointer ${
                  historyFilter === filter
                    ? 'bg-cyan-500 text-slate-950 font-black shadow-xs'
                    : isLight
                    ? 'text-slate-600 hover:text-slate-900'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {filteredPayouts.length === 0 ? (
          <div
            className={`p-8 rounded-3xl border text-center space-y-2 ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/40 border-slate-800'
            }`}
          >
            <Clock className="w-8 h-8 text-slate-500 mx-auto" />
            <h3 className="text-xs font-bold text-slate-400">No Payout Requests Yet</h3>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              Once you request a withdrawal, its processing status and UTR bank reference will be tracked here.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredPayouts.map((payout) => (
              <div
                key={payout.id}
                className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
                  isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-900/60 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                        payout.status === 'completed'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                          : payout.status === 'pending'
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25'
                          : 'bg-rose-500/15 text-rose-400 border border-rose-500/25'
                      }`}
                    >
                      {payout.status === 'completed' ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : payout.status === 'pending' ? (
                        <Clock className="w-4 h-4" />
                      ) : (
                        <AlertCircle className="w-4 h-4" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono font-black text-app-text">
                          ₹{payout.amount.toFixed(2)}
                        </span>
                        <span
                          className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                            payout.status === 'completed'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : payout.status === 'pending'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {payout.status}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <span>{payout.payout_method === 'upi' ? `UPI: ${payout.upi_id}` : `Bank: ${payout.bank_account}`}</span>
                        <span>•</span>
                        <span>{new Date(payout.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* UTR Copy button if available */}
                  {payout.utr_number && (
                    <button
                      type="button"
                      onClick={() => handleCopyUtr(payout.utr_number!)}
                      className="px-2.5 py-1 rounded-xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Copy UTR Reference"
                    >
                      {copiedUtr === payout.utr_number ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>UTR: {payout.utr_number.slice(-6)}</span>
                    </button>
                  )}
                </div>

                {payout.admin_notes && (
                  <div className="mt-2.5 p-2 rounded-xl bg-slate-800/40 border border-slate-700/50 text-[11px] text-slate-300">
                    <span className="font-bold text-slate-400 mr-1">Admin Remark:</span>
                    {payout.admin_notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
