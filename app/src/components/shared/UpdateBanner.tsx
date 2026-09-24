import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, RefreshCw, Sparkles } from 'lucide-react';
import type { UpdateInstallPhase } from '../../services/updateReliability';
import { useTranslation } from 'react-i18next';

interface UpdateBannerProps {
    available: boolean;
    version: string | null;
    downloading: boolean;
    progress: number;
    phase: UpdateInstallPhase | null;
    managedByPackageManager: boolean;
    onUpdate: () => void;
    onDismiss: () => void;
}

export function UpdateBanner({
    available,
    version,
    downloading,
    progress,
    phase,
    managedByPackageManager,
    onUpdate,
    onDismiss
}: UpdateBannerProps) {
    const { t } = useTranslation();
    return (
        <AnimatePresence>
            {available && (
                <motion.div
                    initial={{ opacity: 0, y: -60 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -60 }}
                    className="fixed top-0 left-0 right-0 z-[9999] px-4 pt-[calc(0.6rem+env(safe-area-inset-top,0px))] pb-2.5 bg-gradient-to-r from-telegram-primary/95 via-blue-600/95 to-indigo-600/95 backdrop-blur-xl border-b border-white/20 shadow-2xl"
                >
                    <div className="flex flex-wrap items-center justify-between gap-3 max-w-screen-lg mx-auto">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0 shadow-inner">
                                <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-white text-xs sm:text-sm font-bold truncate">
                                    {downloading ? (
                                        <>{phase === 'verifying' ? 'Verifying signed update…' : phase === 'installing' ? 'Installing update…' : `Downloading update… ${progress}%`}</>
                                    ) : (
                                        <>New Version Available: <span className="font-mono underline decoration-yellow-300">v{version}</span></>
                                    )}
                                </p>
                                <p className="text-[10px] text-white/80 leading-none mt-0.5 truncate">
                                    {downloading ? 'Please do not close the app during update' : 'Get the latest speed improvements, security & features.'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 ml-auto">
                            {downloading ? (
                                <div className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-full border border-white/10">
                                    <RefreshCw className="w-3.5 h-3.5 text-white animate-spin" />
                                    <div className="w-20 sm:w-28 h-1.5 bg-white/30 rounded-full overflow-hidden">
                                        <motion.div
                                            className="h-full bg-white rounded-full"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${progress}%` }}
                                        />
                                    </div>
                                    <span className="text-[10px] font-mono font-bold text-white">{progress}%</span>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={onUpdate}
                                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white text-telegram-primary font-bold text-xs rounded-full hover:bg-white/90 active:scale-95 transition-all shadow-md"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    {managedByPackageManager ? t('common.open') : t('settings.update_restart')}
                                </button>
                            )}

                            {!downloading && (
                                <button
                                    type="button"
                                    onClick={onDismiss}
                                    className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                                    title={t('common.close')}
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
