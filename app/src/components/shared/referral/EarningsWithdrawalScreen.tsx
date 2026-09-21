import React, { useState } from 'react';
import {
  Wallet,
  ArrowLeft,
  X,
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
  Users,
  Info,
  ShieldCheck,
} from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { useReferralProgram } from '../../../hooks/useReferralProgram';
import { toast } from 'sonner';

interface EarningsWithdrawalScreenProps {
  onClose: () => void;
  onNavigateToReferral: () => void;
  defaultEmail?: string;
  defaultName?: string;
}

export const EarningsWithdrawalScreen: React.FC<EarningsWithdrawalScreenProps> = ({
  onClose,
  onNavigateToReferral,
  defaultEmail,
  defaultName,
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const {
    userEmail,
    userName,
    setUserEmail,
    setUserName,
    profile,
    payouts,
    settings,
    loading,
    submittingPayout,
    fetchProfile,
    submitPayoutRequest,
  } = useReferralProgram(defaultEmail, defaultName);

  // Email form state if not loaded
  const [isEditingEmail, setIsEditingEmail] = useState(!userEmail);
  const [emailInput, setEmailInput] = useState(userEmail);
  const [nameInput, setNameInput] = useState(userName);

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
  React.useEffect(() => {
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
      setUserEmail(emailInput);
      setUserName(nameInput);
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

  const filteredPayouts = payouts.filter((p) => {
    if (historyFilter === 'all') return true;
    return p.status === historyFilter;
  });

  const walletBalance = profile?.wallet_balance || 0;
  const isBalanceEligible = walletBalance >= settings.min_payout;

  return (
    <div className="flex flex-col h-full w-full max-w-5xl mx-auto overflow-hidden">
      {/* ── Top Header Bar ── */}
      <header
        className={`px-3.5 sm:px-6 py-3 border-b flex items-center justify-between shrink-0 transition-colors ${
          isLight ? 'bg-white/90 border-slate-200' : 'bg-slate-900/90 border-slate-800'
        } backdrop-blur-md sticky top-0 z-20 pt-[calc(0.75rem+env(safe-area-inset-top,0px))]`}
      >
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={onNavigateToReferral}
            className={`p-2 rounded-xl border transition-all shrink-0 cursor-pointer ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700 active:scale-95'
                : 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-200 active:scale-95'
            }`}
            title="Go to Refer & Earn"
            aria-label="Go to Refer & Earn"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-sm sm:text-lg font-black tracking-tight text-app-text truncate">
                Earnings &amp; Payouts
              </h1>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/25 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                Wallet Active
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-400 truncate hidden xs:block">
              Manage balance &amp; request payouts
            </p>
          </div>
        </div>

        {/* Navigation Switcher Tabs */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div
            className={`flex p-1 rounded-xl border text-[11px] sm:text-xs font-bold ${
              isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950 border-slate-800'
            }`}
          >
            <button
              type="button"
              onClick={onNavigateToReferral}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5 shrink-0" />
              <span className="whitespace-nowrap">Refer &amp; Earn</span>
            </button>
            <button
              type="button"
              className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-black shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Wallet className="w-3.5 h-3.5 shrink-0" />
              <span className="whitespace-nowrap">Earnings</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors cursor-pointer shrink-0 ${
              isLight ? 'hover:bg-slate-200 text-slate-500' : 'hover:bg-slate-800 text-slate-400'
            }`}
            title="Close"
            aria-label="Close"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </header>

      {/* ── Scrollable Body with safe-area padding ── */}
      <div className="flex-1 overflow-y-auto px-3.5 sm:px-6 py-4 space-y-4 sm:space-y-5 pb-[calc(6rem+env(safe-area-inset-bottom,24px))]">

        {/* Account Identity Strip */}
        {!userEmail || isEditingEmail ? (
          <form
            onSubmit={handleSaveEmail}
            className={`p-3.5 sm:p-4 rounded-2xl border space-y-2.5 transition-all shadow-sm ${
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
                className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all shrink-0 cursor-pointer shadow-sm active:scale-95"
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
                Wallet Account: <strong className="font-semibold">{userEmail}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => void fetchProfile(userEmail, userName)}
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
                  setEmailInput(userEmail);
                  setNameInput(userName);
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
          className={`p-4 sm:p-6 rounded-3xl border space-y-4 shadow-sm ${
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

          {/* Low Balance Warning Banner */}
          {!isBalanceEligible && (
            <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Minimum Payout Threshold</span>
                <p className="text-[11px] text-amber-400/80 mt-0.5">
                  You need at least <strong>₹{settings.min_payout}</strong> to request a withdrawal. You currently have ₹{walletBalance.toFixed(2)}. Share your referral link to earn more!
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleWithdrawalSubmit} className="space-y-3.5">
            {/* Payment Method Selector Tab */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Select Payout Method
              </label>
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-slate-950 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setPayoutMethod('upi')}
                  className={`py-2 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    payoutMethod === 'upi'
                      ? 'bg-cyan-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Wallet className="w-3.5 h-3.5" />
                  <span>UPI ID (Instant)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPayoutMethod('bank')}
                  className={`py-2 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    payoutMethod === 'bank'
                      ? 'bg-cyan-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Bank (IMPS/NEFT)</span>
                </button>
              </div>
            </div>

            {/* UPI Details */}
            {payoutMethod === 'upi' ? (
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-400">
                  Your UPI ID <span className="text-[10px] font-normal">(GPay / PhonePe / Paytm / BHIM)</span>
                </label>
                <input
                  type="text"
                  required
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="name@okhdfcbank or 9876543210@paytm"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono font-medium focus:outline-hidden ${
                    isLight
                      ? 'bg-white border-slate-300 text-slate-900 focus:border-cyan-500'
                      : 'bg-slate-950 border-slate-700 text-white focus:border-cyan-400'
                  }`}
                />
                {/* Quick handle helpers */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[10px] text-slate-500">Quick suffixes:</span>
                  {['@okhdfcbank', '@okaxis', '@okicici', '@paytm', '@ybl', '@upi'].map((handle) => (
                    <button
                      key={handle}
                      type="button"
                      onClick={() => {
                        const prefix = upiId.includes('@') ? upiId.split('@')[0] : upiId;
                        setUpiId(prefix + handle);
                      }}
                      className="text-[10px] px-2 py-0.5 rounded-lg border border-slate-700 bg-slate-900/60 hover:border-cyan-500/50 text-slate-400 hover:text-cyan-400 font-mono transition-colors cursor-pointer"
                    >
                      {handle}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Bank Account Details */
              <div className="space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Account Holder Name
                    </label>
                    <input
                      type="text"
                      required
                      value={bankHolder}
                      onChange={(e) => setBankHolder(e.target.value)}
                      placeholder="Full Name as registered in bank"
                      className={`w-full px-3.5 py-2 rounded-xl border text-xs font-medium focus:outline-hidden ${
                        isLight
                          ? 'bg-white border-slate-300 text-slate-900 focus:border-cyan-500'
                          : 'bg-slate-950 border-slate-700 text-white focus:border-cyan-400'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Bank Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="e.g. HDFC Bank, SBI"
                      className={`w-full px-3.5 py-2 rounded-xl border text-xs font-medium focus:outline-hidden ${
                        isLight
                          ? 'bg-white border-slate-300 text-slate-900 focus:border-cyan-500'
                          : 'bg-slate-950 border-slate-700 text-white focus:border-cyan-400'
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Bank Account Number
                    </label>
                    <input
                      type="password"
                      required
                      value={bankAccount}
                      onChange={(e) => setBankAccount(e.target.value)}
                      placeholder="Enter account number"
                      className={`w-full px-3.5 py-2 rounded-xl border text-xs font-mono font-medium focus:outline-hidden ${
                        isLight
                          ? 'bg-white border-slate-300 text-slate-900 focus:border-cyan-500'
                          : 'bg-slate-950 border-slate-700 text-white focus:border-cyan-400'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Confirm Account Number
                    </label>
                    <input
                      type="text"
                      required
                      value={confirmBankAccount}
                      onChange={(e) => setConfirmBankAccount(e.target.value)}
                      placeholder="Re-enter account number"
                      className={`w-full px-3.5 py-2 rounded-xl border text-xs font-mono font-medium focus:outline-hidden ${
                        isLight
                          ? 'bg-white border-slate-300 text-slate-900 focus:border-cyan-500'
                          : 'bg-slate-950 border-slate-700 text-white focus:border-cyan-400'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    IFSC Code
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={11}
                    value={bankIfsc}
                    onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
                    placeholder="e.g. HDFC0001234"
                    className={`w-full sm:w-1/2 px-3.5 py-2 rounded-xl border text-xs font-mono uppercase font-bold focus:outline-hidden ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-900 focus:border-cyan-500'
                        : 'bg-slate-950 border-slate-700 text-white focus:border-cyan-400'
                    }`}
                  />
                </div>
              </div>
            )}

            {/* Withdrawal Amount & Preset Chips */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Withdrawal Amount (₹)
                </label>
                {walletBalance > 0 && (
                  <button
                    type="button"
                    onClick={() => setWithdrawAmount(String(Math.floor(walletBalance)))}
                    className="text-[10px] font-bold text-cyan-400 hover:underline cursor-pointer"
                  >
                    Withdraw All (₹{walletBalance.toFixed(2)})
                  </button>
                )}
              </div>

              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-sm font-black text-slate-500">₹</span>
                <input
                  type="number"
                  min={settings.min_payout}
                  max={walletBalance || 100000}
                  step="1"
                  required
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder={String(settings.min_payout)}
                  className={`w-full pl-8 pr-4 py-2 rounded-xl border text-sm font-mono font-black focus:outline-hidden ${
                    isLight
                      ? 'bg-white border-slate-300 text-slate-900 focus:border-cyan-500'
                      : 'bg-slate-950 border-slate-700 text-white focus:border-cyan-400'
                  }`}
                />
              </div>

              {/* Quick Amount Chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                {[
                  { label: `₹${settings.min_payout} (Min)`, val: settings.min_payout },
                  { label: '₹500', val: 500 },
                  { label: '₹1,000', val: 1000 },
                  { label: '₹2,500', val: 2500 },
                ].map((chip) => (
                  <button
                    key={chip.val}
                    type="button"
                    onClick={() => setWithdrawAmount(String(chip.val))}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-xl border transition-all cursor-pointer ${
                      withdrawAmount === String(chip.val)
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                        : isLight
                        ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Error / Success Alerts */}
            {formError && (
              <div className="flex items-center gap-2 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="flex items-center gap-2 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs animate-fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{formSuccess}</span>
              </div>
            )}

            {/* Submit Payout Button */}
            <button
              type="submit"
              disabled={submittingPayout || !isBalanceEligible}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-cyan-400 via-cyan-500 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-black text-xs shadow-lg shadow-cyan-500/25 transition-all cursor-pointer active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submittingPayout ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting Withdrawal Request...</span>
                </>
              ) : (
                <>
                  <ArrowUpRight className="w-4 h-4 stroke-[3]" />
                  <span>
                    Request Payout ({withdrawAmount ? `₹${withdrawAmount}` : 'Enter Amount'})
                  </span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* ── Withdrawal History & Transaction Log ── */}
        <div className="space-y-2.5 pt-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <Receipt className="w-4 h-4 text-cyan-400" />
              <span>Withdrawal History &amp; Status</span>
            </div>

            {/* Status Filter Tabs */}
            <div
              className={`flex items-center gap-1 p-1 rounded-xl border text-[10px] font-bold ${
                isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-900 border-slate-800'
              }`}
            >
              {(['all', 'completed', 'pending', 'rejected'] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setHistoryFilter(filter)}
                  className={`px-2.5 py-1 rounded-lg capitalize transition-all cursor-pointer ${
                    historyFilter === filter
                      ? 'bg-cyan-500 text-slate-950 font-black shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {filter === 'completed' ? 'Paid' : filter}
                </button>
              ))}
            </div>
          </div>

          {filteredPayouts.length > 0 ? (
            <div className="space-y-2">
              {filteredPayouts.map((p) => {
                const date = new Date(p.created_at * 1000).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={p.id}
                    className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs transition-all ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
                    }`}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black font-mono text-emerald-400">
                          ₹{p.amount.toFixed(2)}
                        </span>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                          via {p.payout_method}
                        </span>
                        <span className="text-[10px] text-slate-500">• {date}</span>
                      </div>

                      <div className="text-[11px] text-slate-400 truncate">
                        {p.payout_method === 'upi' ? (
                          <span>
                            UPI ID: <strong className="text-slate-200 font-mono">{p.upi_id}</strong>
                          </span>
                        ) : (
                          <span>
                            Bank: <strong className="text-slate-200">{p.bank_name || 'Account'}</strong> (••••
                            {p.bank_account?.slice(-4)})
                          </span>
                        )}
                      </div>

                      {p.utr_number && (
                        <div className="flex items-center gap-1.5 text-[10px] font-mono text-cyan-400 pt-0.5">
                          <span>UTR: {p.utr_number}</span>
                          <button
                            type="button"
                            onClick={() => void handleCopyUtr(p.utr_number!)}
                            className="p-1 hover:bg-cyan-500/20 rounded-md transition-colors cursor-pointer"
                            title="Copy UTR Reference"
                          >
                            {copiedUtr === p.utr_number ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3 text-cyan-400" />
                            )}
                          </button>
                        </div>
                      )}

                      {p.status === 'rejected' && p.admin_notes && (
                        <span className="text-[10px] text-rose-400 block pt-0.5">
                          Refund Reason: {p.admin_notes} (Balance restored to wallet)
                        </span>
                      )}
                    </div>

                    <div className="self-start sm:self-center shrink-0">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
                          p.status === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : p.status === 'rejected'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        }`}
                      >
                        {p.status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                        {p.status === 'pending' && <Clock className="w-3 h-3" />}
                        {p.status === 'rejected' && <AlertCircle className="w-3 h-3" />}
                        <span>{p.status === 'completed' ? 'PAID' : p.status.toUpperCase()}</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              className={`p-6 sm:p-8 rounded-3xl border text-center space-y-2 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/30 border-slate-800'
              }`}
            >
              <Receipt className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs font-bold text-slate-400">No payout records found</p>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                Once you submit a payout request, its real-time status, UTR reference number, and payment receipts will appear here.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
