import React from 'react';
import { Zap, Crown, ArrowRight, ShieldCheck, FolderPlus, Sparkles } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import type { PaywallTriggerFeature } from './PaywallGateModal';

interface SmartAdBannerProps {
  onUpgrade: (feature?: PaywallTriggerFeature) => void;
  variant?: 'compact' | 'card' | 'inline' | 'floating';
  className?: string;
}

export const SmartAdBanner: React.FC<SmartAdBannerProps> = ({
  onUpgrade,
  variant = 'compact',
  className = '',
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  if (variant === 'compact') {
    return (
      <div
        onClick={() => onUpgrade('general')}
        className={`group relative overflow-hidden rounded-2xl border p-3 transition-all duration-300 cursor-pointer ${
          isLight
            ? 'bg-gradient-to-r from-cyan-50 via-blue-50 to-indigo-50 border-cyan-200/80 shadow-xs hover:border-cyan-400 hover:shadow-md'
            : 'bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-slate-900 border-cyan-500/30 shadow-xs hover:border-cyan-400/60 hover:shadow-cyan-500/10'
        } ${className}`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-sm shadow-cyan-500/30">
              <Crown className="h-4 w-4 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className={`text-xs font-bold truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  TG Drive Pro
                </span>
                <span className="px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-md bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950">
                  LIFETIME
                </span>
              </div>
              <p className={`text-[10px] truncate ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                10x Turbo Speed · Unlimited Folders · Zero Ads
              </p>
            </div>
          </div>

          <button
            type="button"
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-extrabold bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm shadow-cyan-500/20 group-hover:scale-105 transition-transform shrink-0 cursor-pointer"
          >
            <span>Upgrade</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div
        onClick={() => onUpgrade('general')}
        className={`relative overflow-hidden rounded-xl border px-3 py-2 text-xs flex items-center justify-between gap-2 cursor-pointer transition-all ${
          isLight
            ? 'bg-cyan-50/70 border-cyan-200 text-cyan-900 hover:bg-cyan-100/70'
            : 'bg-cyan-950/30 border-cyan-500/30 text-cyan-200 hover:bg-cyan-900/40'
        } ${className}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
          <span className="text-[11px] font-medium truncate">
            Free Plan: Standard Speed & 1 Custom Folder. Upgrade to Pro for unlimited power.
          </span>
        </div>
        <span className="text-[10px] font-bold text-cyan-400 flex items-center gap-0.5 shrink-0 underline">
          Unlock Pro →
        </span>
      </div>
    );
  }

  // Large Card variant
  return (
    <div
      onClick={() => onUpgrade('general')}
      className={`relative overflow-hidden rounded-3xl border p-4 transition-all duration-300 cursor-pointer ${
        isLight
          ? 'bg-gradient-to-br from-white via-cyan-50/50 to-blue-50/60 border-cyan-200 shadow-md hover:border-cyan-300 hover:shadow-lg'
          : 'bg-gradient-to-br from-slate-900 via-slate-950 to-cyan-950/40 border-cyan-500/30 shadow-md hover:border-cyan-400/50 hover:shadow-cyan-500/10'
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/30">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <h4 className={`text-sm font-extrabold ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Supercharge TG Drive
            </h4>
            <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              One-time purchase · Lifetime access
            </p>
          </div>
        </div>
        <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
          PRO PERKS
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3 text-[11px]">
        <div className="flex items-center gap-1.5 opacity-90">
          <Zap className="h-3.5 w-3.5 text-amber-400 shrink-0" />
          <span className={isLight ? 'text-slate-700' : 'text-slate-300'}>10x Turbo Speed</span>
        </div>
        <div className="flex items-center gap-1.5 opacity-90">
          <FolderPlus className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
          <span className={isLight ? 'text-slate-700' : 'text-slate-300'}>Unlimited Folders</span>
        </div>
        <div className="flex items-center gap-1.5 opacity-90">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
          <span className={isLight ? 'text-slate-700' : 'text-slate-300'}>Auto Cloud Backup</span>
        </div>
        <div className="flex items-center gap-1.5 opacity-90">
          <Crown className="h-3.5 w-3.5 text-purple-400 shrink-0" />
          <span className={isLight ? 'text-slate-700' : 'text-slate-300'}>100% Ad-Free</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-cyan-500/15">
        <span className={`text-[11px] font-bold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
          Instant Lifetime Activation
        </span>
        <span className="flex items-center gap-1 text-xs font-black text-cyan-400">
          Get TG Drive Pro <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </div>
  );
};
