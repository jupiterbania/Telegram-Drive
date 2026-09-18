import { Home, Folder, ArrowUpDown, Settings, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';

export type MobileTab = 'home' | 'files' | 'downloads' | 'settings' | 'profile';

interface BottomNavBarProps {
  activeTab: MobileTab;
  setActiveTab: (tab: MobileTab) => void;
  isAndroid?: boolean;
  isTelevision?: boolean;
  activeTransferCount?: number;
}

export function BottomNavBar({ activeTab, setActiveTab, isAndroid, isTelevision, activeTransferCount = 0 }: BottomNavBarProps) {
  const { t } = useTranslation();

  const tabs = [
    { id: 'home', labelKey: 'common.home', icon: Home },
    { id: 'files', labelKey: 'common.files', icon: Folder },
    { id: 'downloads', labelKey: 'common.transfers', icon: ArrowUpDown },
    { id: 'settings', labelKey: 'common.settings', icon: Settings },
    { id: 'profile', labelKey: 'common.profile', icon: User },
  ] as const;

  return (
    <nav
      aria-label={i18n.t("settings.color_primary")}
      className={`fixed left-1/2 -translate-x-1/2 bg-telegram-surface/95 backdrop-blur-2xl border border-telegram-border/50 rounded-full p-2 shadow-2xl shadow-black/25 flex items-center gap-1.5 z-50 transition-all duration-300 ${
        isTelevision
          ? 'tv-primary-nav'
          : isAndroid
          ? 'bottom-[calc(0.85rem+env(safe-area-inset-bottom,10px))]'
          : 'bottom-5'
      }`}
    >
      {tabs.map(({ id, labelKey, icon: Icon }) => {
        const isActive = activeTab === id;
        const hasLiveTransfers = id === 'downloads' && activeTransferCount > 0;
        return (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            aria-current={isActive ? 'page' : undefined}
            aria-label={t(labelKey)}
            className={`relative flex items-center justify-center rounded-full transition-all duration-300 select-none ${
              isActive
                ? 'bg-telegram-primary text-black font-bold text-xs px-4 py-2 gap-2 shadow-md shadow-telegram-primary/25 active:scale-95'
                : 'text-telegram-subtext hover:text-telegram-text hover:bg-telegram-hover/30 p-3 active:scale-90'
            }`}
          >
            <div className="relative">
              <Icon className="w-5 h-5 transition-transform duration-200 shrink-0" aria-hidden="true" />
              {hasLiveTransfers && !isActive && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-telegram-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-telegram-primary" />
                </span>
              )}
            </div>
            {isActive && (
              <span className="text-xs font-bold tracking-tight whitespace-nowrap animate-in fade-in zoom-in-95 duration-200">
                {t(labelKey)}
                {hasLiveTransfers && (
                  <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-black/20 text-black text-[10px] font-extrabold">
                    {activeTransferCount}
                  </span>
                )}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
