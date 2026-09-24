import { createContext, ReactNode, useCallback, useContext, useRef, useState } from 'react';
import { Lock, UploadCloud, ShieldCheck, Eye, EyeOff, Sparkles, AlertTriangle, Crown } from 'lucide-react';
import { useModalFocus } from '../hooks/useModalFocus';
import { useSupporter } from './SupporterContext';
import { openPaywallGate, shouldShowSponsorContent } from '../services/supporterVisibility';
import i18n from '../i18n';

export type UploadChoice = 'store' | 'protect';

interface UploadChoiceContextValue {
    chooseUploadProtection: (count: number) => Promise<UploadChoice | null>;
}

const UploadChoiceContext = createContext<UploadChoiceContextValue | null>(null);

export function UploadChoiceProvider({ children }: { children: ReactNode }) {
    const [request, setRequest] = useState<{ count: number; resolve: (choice: UploadChoice | null) => void } | null>(null);
    const { status: supporterStatus } = useSupporter();
    const isFreeUser = shouldShowSponsorContent(supporterStatus);
    const panelRef = useRef<HTMLDivElement>(null);
    const finish = useCallback((choice: UploadChoice | null) => {
        request?.resolve(choice);
        setRequest(null);
    }, [request]);
    useModalFocus(panelRef, () => finish(null), !request);

    const chooseUploadProtection = useCallback((count: number) => new Promise<UploadChoice | null>((resolve) => {
        setRequest({ count, resolve });
    }), []);

    const handleProtectClick = () => {
        if (isFreeUser) {
            finish(null);
            openPaywallGate('encryption');
            return;
        }
        finish('protect');
    };

    return (
        <UploadChoiceContext.Provider value={{ chooseUploadProtection }}>
            {children}
            {request && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md animate-in fade-in duration-200">
                    <div
                        ref={panelRef}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="upload-choice-title"
                        tabIndex={-1}
                        className="w-[min(540px,calc(100vw-2rem))] rounded-3xl bg-telegram-surface border border-telegram-border/60 p-6 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200 text-telegram-text"
                    >
                        {/* Top Accent Gradient */}
                        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-sky-500 via-telegram-primary to-emerald-500 opacity-80" />

                        <div className="text-center sm:text-left">
                            <h2 id="upload-choice-title" className="text-lg font-bold text-telegram-text tracking-tight">
                                How to store {request.count === 1 ? 'this file' : `these ${request.count} files`}?
                            </h2>
                            <p className="mt-1 text-xs text-telegram-subtext leading-relaxed">
                                Choose standard storage for instant media previews, or encrypted vault for zero-knowledge privacy.
                            </p>
                        </div>

                        <div className="mt-5 grid gap-3.5 sm:grid-cols-2">
                            {/* Option 1: Standard Storage (Recommended for Photos & Videos) */}
                            <button
                                type="button"
                                onClick={() => finish('store')}
                                className="group relative p-4 rounded-2xl bg-telegram-hover/30 hover:bg-telegram-hover/60 border border-telegram-border/40 hover:border-sky-500/50 transition-all text-start flex flex-col justify-between active:scale-[0.98] cursor-pointer"
                            >
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/25 flex items-center justify-center text-sky-400 group-hover:scale-105 transition-transform">
                                            <UploadCloud className="w-5 h-5" />
                                        </div>
                                        <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/25">
                                            Recommended
                                        </span>
                                    </div>
                                    <span className="block text-sm font-bold text-telegram-text group-hover:text-telegram-primary transition-colors">
                                        Standard Storage
                                    </span>
                                    <p className="mt-1 text-xs text-telegram-subtext leading-relaxed">
                                        Direct cloud storage on Telegram.
                                    </p>
                                </div>

                                <ul className="mt-3.5 pt-3 border-t border-telegram-border/30 space-y-1.5 text-[11px] text-telegram-subtext">
                                    <li className="flex items-center gap-1.5 text-sky-500">
                                        <Eye className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                                        <span>Instant photo & video preview</span>
                                    </li>
                                    <li className="flex items-center gap-1.5 text-sky-500">
                                        <Sparkles className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                                        <span>Fast gallery streaming</span>
                                    </li>
                                </ul>
                            </button>

                            {/* Option 2: Encrypted Vault (Zero-Knowledge) */}
                            <button
                                type="button"
                                onClick={handleProtectClick}
                                className="group relative p-4 rounded-2xl bg-telegram-hover/30 hover:bg-telegram-hover/60 border border-telegram-border/40 hover:border-amber-500/50 transition-all text-start flex flex-col justify-between active:scale-[0.98] cursor-pointer"
                            >
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                                            {isFreeUser ? <Crown className="w-5 h-5 text-amber-400" /> : <Lock className="w-5 h-5" />}
                                        </div>
                                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                            isFreeUser
                                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-black'
                                                : 'bg-amber-500/15 text-amber-400 border-amber-500/25 font-semibold'
                                        }`}>
                                            {isFreeUser ? '👑 TG Drive Pro' : 'Encrypted'}
                                        </span>
                                    </div>
                                    <span className="block text-sm font-bold text-telegram-text group-hover:text-amber-500 transition-colors">
                                        Encrypted Vault
                                    </span>
                                    <p className="mt-1 text-xs text-telegram-subtext leading-relaxed">
                                        {isFreeUser
                                            ? 'Client-side zero-knowledge encryption (TG Drive Pro feature).'
                                            : 'Client-side zero-knowledge encryption.'}
                                    </p>
                                </div>

                                <ul className="mt-3.5 pt-3 border-t border-telegram-border/30 space-y-1.5 text-[11px] text-telegram-subtext">
                                    <li className="flex items-center gap-1.5 text-amber-500">
                                        <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                        <span>Secured with master passphrase</span>
                                    </li>
                                    <li className="flex items-center gap-1.5 text-amber-500/90">
                                        <EyeOff className="w-3.5 h-3.5 text-amber-400/80 shrink-0" />
                                        <span>No cloud preview (download to view)</span>
                                    </li>
                                    <li className="flex items-center gap-1.5 text-amber-500 font-medium">
                                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                        <span>Irrecoverable if passphrase is lost</span>
                                    </li>
                                </ul>
                            </button>
                        </div>

                        <div className="mt-5 flex items-center justify-end pt-1">
                            <button
                                type="button"
                                onClick={() => finish(null)}
                                className="px-4 py-2 rounded-xl text-xs font-semibold text-telegram-subtext hover:text-telegram-text hover:bg-telegram-hover/40 transition"
                            >
                                {i18n.t("common.cancel")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </UploadChoiceContext.Provider>
    );
}

export function useUploadChoice() {
    const value = useContext(UploadChoiceContext);
    if (!value) throw new Error('useUploadChoice must be used within UploadChoiceProvider');
    return value;
}
