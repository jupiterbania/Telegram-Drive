import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { ReferralScreen } from './referral/ReferralScreen';
import { EarningsWithdrawalScreen } from './referral/EarningsWithdrawalScreen';

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

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Keyboard Escape and Android hardware back listener
  useEffect(() => {
    if (!isOpen) return;

    const androidWindow = window as typeof window & { __telegramDriveHandleAndroidBack?: () => boolean };
    const prevHandler = androidWindow.__telegramDriveHandleAndroidBack;
    androidWindow.__telegramDriveHandleAndroidBack = () => {
      onClose();
      return true;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (prevHandler) {
        androidWindow.__telegramDriveHandleAndroidBack = prevHandler;
      } else {
        delete androidWindow.__telegramDriveHandleAndroidBack;
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={activeTab === 'referral' ? 'Refer & Earn' : 'Earnings & Withdrawals'}
      className="fixed inset-0 z-[150] flex items-center justify-center p-0 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in"
    >
      <div
        className={`w-full max-w-5xl h-[100dvh] sm:h-[92vh] max-h-[100dvh] flex flex-col rounded-none sm:rounded-3xl border-0 sm:border shadow-2xl overflow-hidden transition-all ${
          isLight
            ? 'bg-white text-slate-900 border-slate-200 shadow-slate-300/50'
            : 'bg-slate-950 text-slate-100 border-slate-800/80 shadow-black/80'
        }`}
      >
        {activeTab === 'referral' ? (
          <ReferralScreen
            onClose={onClose}
            onNavigateToEarnings={() => setActiveTab('earnings')}
            defaultEmail={defaultEmail}
            defaultName={defaultName}
          />
        ) : (
          <EarningsWithdrawalScreen
            onClose={onClose}
            onNavigateToReferral={() => setActiveTab('referral')}
            defaultEmail={defaultEmail}
            defaultName={defaultName}
          />
        )}
      </div>
    </div>
  );
};

export { ReferralScreen } from './referral/ReferralScreen';
export { EarningsWithdrawalScreen } from './referral/EarningsWithdrawalScreen';
