import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ArrowLeft,
  Users,
  Wallet,
  RefreshCw,
  Gift,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { ReferralScreen } from './referral/ReferralScreen';
import { EarningsWithdrawalScreen } from './referral/EarningsWithdrawalScreen';
import { useReferralProgram } from '../../hooks/useReferralProgram';

export interface ReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEmail?: string;
  defaultName?: string;
  initialTab?: 'referral' | 'earnings';
}

export const ReferralModal: React.FC<ReferralModalProps> = ({
  isOpen,
  onClose,
  defaultEmail,
  defaultName,
  initialTab = 'referral',
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [activeTab, setActiveTab] = useState<'referral' | 'earnings'>(initialTab);
  const openedWithTabRef = useRef<'referral' | 'earnings'>(initialTab);
  const historyPushedRef = useRef(false);

  const referralData = useReferralProgram(defaultEmail, defaultName);
  const { profile, settings, loading, fetchProfile, userEmail, userName } = referralData;

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      openedWithTabRef.current = initialTab;
    }
  }, [isOpen, initialTab]);

  // Handle systematic back navigation
  const handleBack = useCallback((): boolean => {
    if (activeTab === 'earnings' && openedWithTabRef.current === 'referral') {
      setActiveTab('referral');
      return true;
    }
    onClose();
    return true;
  }, [activeTab, onClose]);

  // Keyboard Escape, Android hardware back, and Browser Popstate handling
  useEffect(() => {
    if (!isOpen) return;

    // 1. Register global priority close handler for MobileDashboard and native bridge
    const androidWindow = window as typeof window & {
      __telegramDriveHandleAndroidBack?: () => boolean;
      __tgReferralModalClose?: () => boolean;
    };

    const prevNativeHandler = androidWindow.__telegramDriveHandleAndroidBack;
    androidWindow.__tgReferralModalClose = handleBack;
    androidWindow.__telegramDriveHandleAndroidBack = () => {
      return handleBack();
    };

    // 2. Browser History state push for hardware back gestures
    try {
      window.history.pushState({ tgModal: 'referral_program' }, '');
      historyPushedRef.current = true;
    } catch {
      // Ignore if history navigation is restricted
    }

    const handlePopState = () => {
      historyPushedRef.current = false;
      handleBack();
    };
    window.addEventListener('popstate', handlePopState);

    // 3. Escape key listener
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        handleBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown);

      delete androidWindow.__tgReferralModalClose;
      if (prevNativeHandler) {
        androidWindow.__telegramDriveHandleAndroidBack = prevNativeHandler;
      } else {
        delete androidWindow.__telegramDriveHandleAndroidBack;
      }
    };
  }, [isOpen, handleBack]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={activeTab === 'referral' ? 'Refer & Earn Program' : 'Earnings & Withdrawals'}
      className="fixed inset-0 z-[150] flex items-center justify-center p-0 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in"
    >
      <div
        className={`w-full max-w-5xl h-[100dvh] sm:h-[92vh] max-h-[100dvh] flex flex-col rounded-none sm:rounded-3xl border-0 sm:border shadow-2xl overflow-hidden transition-all ${
          isLight
            ? 'bg-white text-slate-900 border-slate-200 shadow-slate-300/50'
            : 'bg-slate-950 text-slate-100 border-slate-800/80 shadow-black/80'
        }`}
      >
        {/* ── Top Header Bar (With Back Button, Clean Title, NO Cross 'X' Button) ── */}
        <header
          className={`px-3.5 sm:px-6 py-3 border-b flex items-center justify-between shrink-0 transition-colors ${
            isLight ? 'bg-white/95 border-slate-200' : 'bg-slate-900/95 border-slate-800'
          } backdrop-blur-md sticky top-0 z-20 pt-[calc(0.75rem+env(safe-area-inset-top,0px))]`}
        >
          {/* Left: Back Button & Title */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={handleBack}
              className={`p-2.5 rounded-xl border transition-all shrink-0 cursor-pointer flex items-center justify-center min-w-[42px] min-h-[42px] ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700 active:scale-95'
                  : 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-200 active:scale-95'
              }`}
              title="Go Back"
              aria-label="Go Back"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-app-text truncate">
                  Refer &amp; Earn Program
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 shrink-0 hidden xs:inline-block">
                  ₹{settings.reward_value}/Sale
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                {activeTab === 'referral'
                  ? 'Share your invite link & earn ₹' + settings.reward_value + ' cash per sale'
                  : 'Manage wallet balance & request instant UPI/Bank payouts'}
              </p>
            </div>
          </div>

          {/* Right: Quick Action / Status indicator */}
          <div className="flex items-center gap-2 shrink-0">
            {activeTab === 'earnings' ? (
              <button
                type="button"
                onClick={() => void fetchProfile(userEmail, userName)}
                disabled={loading}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                  isLight
                    ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                    : 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-200'
                }`}
                title="Refresh Wallet Balance"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                <Gift className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">10% Friend Discount</span>
                <span className="sm:hidden">10% OFF</span>
              </div>
            )}
          </div>
        </header>

        {/* ── Segmented Tab Switcher DIRECTLY BELOW HEADER ── */}
        <div
          className={`px-3.5 sm:px-6 py-2.5 border-b shrink-0 transition-colors ${
            isLight ? 'bg-slate-50/90 border-slate-200' : 'bg-slate-950/90 border-slate-800/90'
          }`}
        >
          <div
            className={`grid grid-cols-2 p-1 rounded-2xl border ${
              isLight ? 'bg-slate-200/70 border-slate-300/80' : 'bg-slate-900 border-slate-800'
            }`}
          >
            {/* Tab 1: Refer & Earn */}
            <button
              type="button"
              onClick={() => setActiveTab('referral')}
              className={`py-2 px-3 sm:px-4 rounded-xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'referral'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 scale-[1.01]'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span className="truncate">Refer &amp; Earn</span>
              <span
                className={`px-1.5 py-0.2 text-[9px] font-black uppercase rounded-full shrink-0 ${
                  activeTab === 'referral'
                    ? 'bg-slate-950/20 text-slate-950'
                    : 'bg-emerald-500/20 text-emerald-400'
                }`}
              >
                ₹{settings.reward_value}
              </span>
            </button>

            {/* Tab 2: Earnings & Payouts */}
            <button
              type="button"
              onClick={() => setActiveTab('earnings')}
              className={`py-2 px-3 sm:px-4 rounded-xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'earnings'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 scale-[1.01]'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Wallet className="w-4 h-4 shrink-0" />
              <span className="truncate">Earnings &amp; Payouts</span>
              <span
                className={`px-1.5 py-0.2 text-[9px] font-black font-mono rounded-full shrink-0 ${
                  activeTab === 'earnings'
                    ? 'bg-slate-950/20 text-slate-950'
                    : 'bg-cyan-500/20 text-cyan-400'
                }`}
              >
                ₹{profile?.wallet_balance ? Math.round(profile.wallet_balance) : 0}
              </span>
            </button>
          </div>
        </div>

        {/* ── Scrollable Body with safe-area padding ── */}
        <div className="flex-1 overflow-y-auto px-3.5 sm:px-6 py-4 pb-[calc(4rem+env(safe-area-inset-bottom,20px))]">
          {activeTab === 'referral' ? (
            <ReferralScreen
              onNavigateToEarnings={() => setActiveTab('earnings')}
              userEmail={referralData.userEmail}
              userName={referralData.userName}
              setUserEmail={referralData.setUserEmail}
              setUserName={referralData.setUserName}
              profile={referralData.profile}
              settings={referralData.settings}
              copiedCode={referralData.copiedCode}
              copiedLink={referralData.copiedLink}
              referralCode={referralData.referralCode}
              shareLink={referralData.shareLink}
              copyCode={referralData.copyCode}
              copyShareLink={referralData.copyShareLink}
              copyPitchMessage={referralData.copyPitchMessage}
              shareWhatsApp={referralData.shareWhatsApp}
              shareTelegram={referralData.shareTelegram}
              shareTwitter={referralData.shareTwitter}
              fetchProfile={referralData.fetchProfile}
            />
          ) : (
            <EarningsWithdrawalScreen
              onNavigateToReferral={() => setActiveTab('referral')}
              userEmail={referralData.userEmail}
              userName={referralData.userName}
              setUserEmail={referralData.setUserEmail}
              setUserName={referralData.setUserName}
              profile={referralData.profile}
              payouts={referralData.payouts}
              settings={referralData.settings}
              loading={referralData.loading}
              submittingPayout={referralData.submittingPayout}
              fetchProfile={referralData.fetchProfile}
              submitPayoutRequest={referralData.submitPayoutRequest}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export { ReferralScreen } from './referral/ReferralScreen';
export { EarningsWithdrawalScreen } from './referral/EarningsWithdrawalScreen';
