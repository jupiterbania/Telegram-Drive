import React, { useState } from 'react';
import {
  Copy,
  Check,
  Share2,
  Wallet,
  ArrowRight,
  Send,
  Sparkles,
  QrCode,
  HelpCircle,
  TrendingUp,
  Coins,
  ChevronDown,
  Gift,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useTheme } from '../../../context/ThemeContext';
import type { ReferralProfile, ReferralSettings } from '../../../hooks/useReferralProgram';

export interface ReferralScreenProps {
  onNavigateToEarnings: () => void;
  userEmail: string;
  userName: string;
  setUserEmail: (email: string) => void;
  setUserName: (name: string) => void;
  profile: ReferralProfile | null;
  settings: ReferralSettings;
  copiedCode: boolean;
  copiedLink: boolean;
  referralCode: string;
  shareLink: string;
  copyCode: () => Promise<void>;
  copyShareLink: () => Promise<void>;
  copyPitchMessage: () => Promise<void>;
  shareWhatsApp: () => void;
  shareTelegram: () => void;
  shareTwitter: () => void;
  fetchProfile: (email?: string, name?: string) => Promise<void>;
}

export const ReferralScreen: React.FC<ReferralScreenProps> = ({
  onNavigateToEarnings,
  userEmail,
  userName,
  setUserEmail,
  setUserName,
  profile,
  settings,
  copiedCode,
  copiedLink,
  referralCode,
  shareLink,
  copyCode,
  copyShareLink,
  copyPitchMessage,
  shareWhatsApp,
  shareTelegram,
  shareTwitter,
  fetchProfile,
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [isEditingEmail, setIsEditingEmail] = useState(!userEmail);
  const [emailInput, setEmailInput] = useState(userEmail);
  const [nameInput, setNameInput] = useState(userName);
  const [showQrCode, setShowQrCode] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const handleSaveEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (emailInput && emailInput.includes('@')) {
      setUserEmail(emailInput);
      setUserName(nameInput);
      setIsEditingEmail(false);
      void fetchProfile(emailInput, nameInput);
    }
  };

  const conversionRate =
    profile?.total_referrals && profile.total_referrals > 0
      ? ((profile.total_pro_sales / profile.total_referrals) * 100).toFixed(1)
      : '0.0';

  const faqs = [
    {
      q: 'How does my friend use my Referral Code?',
      a: 'During checkout for TG Drive Lifetime Pro in the app or website, your friend taps "Have a Referral Code or Coupon? Apply here", enters your code, and gets an instant 10% discount!',
    },
    {
      q: 'How much money do I earn per referral?',
      a: `You earn a flat ₹${settings.reward_value} real cash every time someone purchases TG Drive Lifetime Pro using your referral code. There are no limits or caps!`,
    },
    {
      q: 'When does the money reflect in my wallet?',
      a: `Instantly! As soon as your friend completes checkout with your code, ₹${settings.reward_value} is automatically credited to your referral wallet balance.`,
    },
    {
      q: 'How and when can I withdraw my earnings?',
      a: `You can request a withdrawal once your balance reaches ₹${settings.min_payout}. Payouts are transferred directly to your UPI ID (GPay / PhonePe / Paytm / BHIM) or Bank Account within 12-24 hours.`,
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* ── Account Identity Strip ── */}
      {!userEmail || isEditingEmail ? (
        <form
          onSubmit={handleSaveEmail}
          className={`p-3.5 sm:p-4 rounded-2xl border space-y-2.5 transition-all shadow-xs ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400">
            <Wallet className="w-4 h-4" />
            <span>Connect Wallet Account</span>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-400">
            Enter your email address to link your unique referral code, sales tracking, and payouts.
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
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Your Name (Optional)"
              className={`sm:w-44 px-3.5 py-2.5 rounded-xl border text-xs font-medium focus:outline-hidden ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-900 focus:border-cyan-500'
                  : 'bg-slate-950 border-slate-700 text-white focus:border-cyan-400'
              }`}
            />
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all shrink-0 cursor-pointer shadow-xs active:scale-95"
            >
              Save &amp; Load Wallet
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
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="truncate">
              Wallet Account: <strong className="font-semibold">{userEmail}</strong>
              {userName ? ` (${userName})` : ''}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setEmailInput(userEmail);
              setNameInput(userName);
              setIsEditingEmail(true);
            }}
            className="text-[11px] font-bold text-cyan-400 hover:underline shrink-0 ml-3 cursor-pointer"
          >
            Switch
          </button>
        </div>
      )}

      {/* ── Hero Promotional Card ── */}
      <div
        className={`relative overflow-hidden rounded-3xl border p-4 sm:p-6 shadow-md transition-all ${
          isLight
            ? 'bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-white border-emerald-200'
            : 'bg-gradient-to-br from-emerald-500/20 via-teal-500/10 to-slate-950 border-emerald-500/30'
        }`}
      >
        <div className="pointer-events-none absolute -right-12 -bottom-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6">
          <div className="space-y-2 sm:space-y-3 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Affiliate Partner Program</span>
            </div>
            <h2 className="text-lg sm:text-2xl font-black text-app-text tracking-tight leading-snug">
              Give <span className="text-emerald-400">{settings.friend_discount_value}% OFF</span> · Earn{' '}
              <span className="text-cyan-400">₹{settings.reward_value} Cash</span> Per Sale
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-400 leading-relaxed">
              Recommend TG Drive Lifetime Pro. When your friends buy Pro and apply your Referral Code at checkout, they save {settings.friend_discount_value}% and you earn ₹{settings.reward_value} real cash credited directly to your wallet!
            </p>
          </div>

          {/* Quick Balance Preview Card & Jump to Earnings */}
          <div
            className={`w-full md:w-auto p-3.5 sm:p-4 rounded-2xl border space-y-2.5 text-center md:text-left shrink-0 backdrop-blur-md ${
              isLight ? 'bg-white/90 border-slate-200 shadow-xs' : 'bg-slate-900/80 border-slate-700/80'
            }`}
          >
            <div className="flex items-center justify-around md:justify-start gap-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Available Balance</span>
                <span className="text-xl sm:text-2xl font-black font-mono text-emerald-400 block">
                  ₹{profile?.wallet_balance ? Math.round(profile.wallet_balance) : 0}
                </span>
              </div>
              <div className="text-right md:text-left border-l border-slate-700/50 pl-4">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Earned</span>
                <span className="text-base sm:text-lg font-bold font-mono text-cyan-400 block">
                  ₹{profile?.total_earned ? Math.round(profile.total_earned) : 0}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onNavigateToEarnings}
              className="w-full py-2 px-3 sm:px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
            >
              <span>View Earnings &amp; Withdraw</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Referral Code & Instant Sharing Section ── */}
      <div
        className={`p-4 sm:p-5 rounded-3xl border space-y-3.5 sm:space-y-4 shadow-xs ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/50 border-slate-800'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Gift className="w-4 h-4" />
              <span>Your Referral Code (Applied at Purchase)</span>
            </span>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Your friend applies this code at checkout to get {settings.friend_discount_value}% OFF, and ₹{settings.reward_value} cash is credited to you.
            </p>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 self-start sm:self-auto">
            10% Discount at Checkout
          </span>
        </div>

        {/* Referral Code & Direct Link Boxes */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
          <div
            className={`sm:col-span-2 flex items-center justify-between p-3 sm:p-3.5 rounded-2xl border font-mono font-black text-base sm:text-xl tracking-wider shadow-inner ${
              isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-emerald-400'
            }`}
          >
            <div className="truncate pr-2">
              <span className="text-[10px] font-sans font-bold text-slate-400 block tracking-normal uppercase">
                Referral Code:
              </span>
              <span className="truncate">{referralCode}</span>
            </div>
            <button
              type="button"
              onClick={() => void copyCode()}
              className="px-3.5 sm:px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 text-xs font-black transition-all flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0"
            >
              {copiedCode ? <Check className="w-4 h-4 stroke-[3]" /> : <Copy className="w-4 h-4" />}
              <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => void copyShareLink()}
            className={`p-3 rounded-2xl border flex flex-col justify-center items-center gap-1 font-bold text-xs transition-all cursor-pointer ${
              isLight
                ? 'bg-white border-slate-300 hover:border-cyan-500 text-slate-800'
                : 'bg-slate-950 border-slate-700 hover:border-cyan-400 text-slate-200'
            }`}
          >
            <div className="flex items-center gap-1.5 text-cyan-400">
              {copiedLink ? <Check className="w-4 h-4 stroke-[3]" /> : <Copy className="w-4 h-4" />}
              <span>{copiedLink ? 'Link Copied!' : 'Copy Invite Link'}</span>
            </div>
            <span className="text-[10px] text-slate-400 truncate max-w-full font-mono">
              {shareLink.replace('https://', '')}
            </span>
          </button>
        </div>

        {/* 1-Click Viral Sharing Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          <button
            type="button"
            onClick={shareWhatsApp}
            className="py-2.5 sm:py-3 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Send className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={shareTelegram}
            className="py-2.5 sm:py-3 px-3 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-md shadow-cyan-600/20 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Telegram</span>
          </button>

          <button
            type="button"
            onClick={shareTwitter}
            className="py-2.5 sm:py-3 px-3 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all shadow-md shadow-sky-600/20 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Twitter / X</span>
          </button>

          <button
            type="button"
            onClick={() => void copyPitchMessage()}
            className={`py-2.5 sm:py-3 px-3 rounded-2xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
              isLight
                ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                : 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-700'
            }`}
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copy Viral Pitch</span>
          </button>
        </div>

        {/* QR Code Collapsible */}
        <div className="pt-0.5">
          <button
            type="button"
            onClick={() => setShowQrCode(!showQrCode)}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>{showQrCode ? 'Hide QR Code' : 'Show In-Person QR Code'}</span>
          </button>

          {showQrCode && (
            <div
              className={`mt-2.5 p-4 rounded-2xl border inline-flex flex-col items-center gap-2 animate-fade-in ${
                isLight ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-800'
              }`}
            >
              <div className="p-3 bg-white rounded-xl shadow-xs">
                <QRCodeSVG value={shareLink} size={140} level="M" />
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                Scan to open referral link
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Referral Performance Analytics Cards ── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
          <TrendingUp className="w-4 h-4 text-cyan-400" />
          <span>Referral Performance &amp; Funnel</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div
            className={`p-3.5 rounded-2xl border text-center transition-all ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/50 border-slate-800'
            }`}
          >
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Link Clicks
            </span>
            <span className="text-xl sm:text-2xl font-black font-mono text-app-text mt-0.5 block">
              {profile?.total_clicks || 0}
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Unique visitors</span>
          </div>

          <div
            className={`p-3.5 rounded-2xl border text-center transition-all ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/50 border-slate-800'
            }`}
          >
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Total Referrals
            </span>
            <span className="text-xl sm:text-2xl font-black font-mono text-cyan-400 mt-0.5 block">
              {profile?.total_referrals || 0}
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Registered users</span>
          </div>

          <div
            className={`p-3.5 rounded-2xl border text-center transition-all ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/50 border-slate-800'
            }`}
          >
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Pro Sales
            </span>
            <span className="text-xl sm:text-2xl font-black font-mono text-emerald-400 mt-0.5 block">
              {profile?.total_pro_sales || 0}
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Commission earned</span>
          </div>

          <div
            className={`p-3.5 rounded-2xl border text-center transition-all ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/50 border-slate-800'
            }`}
          >
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Conversion Rate
            </span>
            <span className="text-xl sm:text-2xl font-black font-mono text-indigo-400 mt-0.5 block">
              {conversionRate}%
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Referral to Pro</span>
          </div>
        </div>
      </div>

      {/* ── Visual 3-Step "How It Works" ── */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
          <Coins className="w-4 h-4 text-amber-400" />
          <span>How It Works In 3 Simple Steps</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
          <div
            className={`p-3.5 rounded-2xl border relative overflow-hidden space-y-1.5 ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/50 border-slate-800'
            }`}
          >
            <div className="w-7 h-7 rounded-xl bg-cyan-500/15 text-cyan-400 font-black text-xs flex items-center justify-center border border-cyan-500/25">
              1
            </div>
            <h3 className="text-xs font-bold text-app-text">Share Your Referral Code</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Give your unique referral code or promo link to friends on WhatsApp, Telegram, or social media.
            </p>
          </div>

          <div
            className={`p-3.5 rounded-2xl border relative overflow-hidden space-y-1.5 ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/50 border-slate-800'
            }`}
          >
            <div className="w-7 h-7 rounded-xl bg-amber-500/15 text-amber-400 font-black text-xs flex items-center justify-center border border-amber-500/25">
              2
            </div>
            <h3 className="text-xs font-bold text-app-text">Friend Enters Code at Checkout</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              During Lifetime Pro purchase, your friend applies your Referral Code and gets an instant 10% discount.
            </p>
          </div>

          <div
            className={`p-3.5 rounded-2xl border relative overflow-hidden space-y-1.5 ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/50 border-slate-800'
            }`}
          >
            <div className="w-7 h-7 rounded-xl bg-emerald-500/15 text-emerald-400 font-black text-xs flex items-center justify-center border border-emerald-500/25">
              3
            </div>
            <h3 className="text-xs font-bold text-app-text">Earn ₹50 Instant Cash</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              As soon as purchase is complete, ₹50 cash is added directly to your wallet balance. Withdraw anytime to UPI or Bank!
            </p>
          </div>
        </div>
      </div>

      {/* ── FAQ & Rules Accordion ── */}
      <div className="space-y-2.5 pt-1">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
          <HelpCircle className="w-4 h-4 text-purple-400" />
          <span>Frequently Asked Questions</span>
        </div>

        <div className="space-y-2">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className={`rounded-2xl border overflow-hidden transition-all ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/50 border-slate-800'
              }`}
            >
              <button
                type="button"
                onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                className="w-full p-3.5 flex items-center justify-between text-left text-xs font-bold text-app-text cursor-pointer hover:bg-slate-500/5"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform ${
                    expandedFaq === idx ? 'rotate-180 text-cyan-400' : ''
                  }`}
                />
              </button>
              {expandedFaq === idx && (
                <div className="px-3.5 pb-3.5 pt-1 text-[11px] text-slate-400 border-t border-slate-800/40 leading-relaxed animate-fade-in">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
