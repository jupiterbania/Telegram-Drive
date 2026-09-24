import { lazy, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Folder, Download, LogOut, RefreshCw, UploadCloud, MoreVertical, Trash2, Pencil, Globe, Shield, Lock, ChevronDown, ChevronLeft, ChevronRight, Share2, Link, X, Wifi, Activity, Zap, Eye, EyeOff, HelpCircle, Pause, Play, RotateCcw, Sliders, Film, Settings as SettingsIcon, FolderPlus, Bookmark, Search, Sparkles, LayoutGrid, List, HardDrive, KeyRound, ShieldCheck, ShieldAlert, Fingerprint, Clock, Cloud, Image as ImageIcon, FileText, FileCode, Layers, Sun, Moon, CheckSquare, Check, ArrowUpDown, ArrowUp, ArrowDown, CheckCircle2, AlertCircle, Music, WifiOff, User, Copy, Smartphone, Gift, Wallet } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { onOpenUrl } from '@tauri-apps/plugin-deep-link';
import { listen } from '@tauri-apps/api/event';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { openExternalUrl } from '../../utils/url';
import { BottomNavBar, type MobileTab } from './BottomNavBar';
import { TouchFileList } from './TouchFileList';
import AdsterraBanner from '../shared/AdsterraBanner';
import { DriveConceptTour } from '../desktop/dashboard/DriveConceptTour';
import { ActionPopover, ActionItem } from './ActionPopover';
import { ShareDialog } from '../desktop/dashboard/ShareDialog';
import { RenameFolderSheet } from './RenameFolderSheet';
import { RenameFileSheet } from './RenameFileSheet';
import { CreateFolderSheet } from './CreateFolderSheet';
import { MakePublicChannelSheet } from './MakePublicChannelSheet';
import { AppLockScreen } from './AppLockScreen';
import { hashAppPin } from '../../utils/security';
const LazyAutoBackupSheet = lazy(() => import('./AutoBackupSheet').then((module) => ({ default: module.AutoBackupSheet })));
import { useSync } from '../../context/SyncContext';
import { useEncryption } from '../../hooks/useEncryption';
const LazyVaultPassphraseModal = lazy(() => import('./VaultPassphraseModal').then((module) => ({ default: module.VaultPassphraseModal })));
import { MobileSupporterCard } from './MobileSupporterCard';
import { SupporterOfferDialog } from '../shared/SupporterOfferDialog';
import { PaywallGateModal, type PaywallTriggerFeature } from '../shared/PaywallGateModal';
import { SmartAdBanner } from '../shared/SmartAdBanner';
import { licenseManager, type LicenseInfo } from '../../services/licenseManager';
import { usePlatform } from '../../hooks/usePlatform';
import { useTelegramConnection } from '../../hooks/useTelegramConnection';
import { useFileUpload } from '../../hooks/useFileUpload';
import { useFileDownload } from '../../hooks/useFileDownload';
import { useFileOperations } from '../../hooks/useFileOperations';
import {
  formatBytes,
  copyToClipboard,
  isMediaFile,
  isVideoFile,
  isPdfFile,
  isArchiveFile,
  isTextOrDocFile,
  isImageFile,
} from '../../utils';
import { LazyFeatureBoundary } from '../shared/LazyFeatureBoundary';
import { useTheme } from '../../context/ThemeContext';
import { TelegramFile, TelegramFolder, BandwidthStats } from '../../types';
import { useSettings } from '../../context/SettingsContext';
import { useSupporter } from '../../context/SupporterContext';
import { version as appVersion } from '../../../package.json';
import { useUpdateCheck } from '../../hooks/useUpdateCheck';
import { RELEASES_URL } from '../../services/installationInfo';
import { LANGUAGES } from '../../i18n/languages';
import { useTranslation } from 'react-i18next';
import { useConfirm } from '../../context/ConfirmContext';
import { BandwidthWidget } from '../desktop/dashboard/BandwidthWidget';
import type { OfflineCacheStatus } from '../../types';
import { evaluateAndroidTransferPolicy, type AndroidTransferEnvironment } from '../../services/androidTransferPolicy';
import { effectiveVideoUploadMode } from '../../services/videoUploadMode';
import { updateFileQueryData } from '../../services/fileListRefresh';
import {
  SUPPORTER_VALUE_MOMENT_EVENT,
  type SupporterPromptTrigger,
} from '../../services/supporterVisibility';
import { getCachedPreview, setCachedPreview, notifyThumbnailInvalidation } from '../../services/imagePreviewCache';
import { resetStreamInfoCache, clearAllThumbnailFailures } from '../../services/videoThumbnailService';
import { SORT_OPTIONS, getActiveSortDescriptor, sortTelegramFiles } from '../../utils/fileSorting';
import i18n from '../../i18n';

const LazyHelpCenterDialog = lazy(() => import('../desktop/dashboard/HelpCenterDialog').then((module) => ({ default: module.HelpCenterDialog })));
const LazyPreviewModal = lazy(() => import('../desktop/dashboard/PreviewModal').then((module) => ({ default: module.PreviewModal })));
const LazyMediaPlayer = lazy(() => import('../desktop/dashboard/MediaPlayer').then((module) => ({ default: module.MediaPlayer })));
const LazyPdfViewer = lazy(() => import('../desktop/dashboard/PdfViewer').then((module) => ({ default: module.PdfViewer })));
const LazyDocumentViewerModal = lazy(() => import('../desktop/dashboard/DocumentViewerModal').then((module) => ({ default: module.DocumentViewerModal })));
const LazyArchiveViewerModal = lazy(() => import('../desktop/dashboard/ArchiveViewerModal').then((module) => ({ default: module.ArchiveViewerModal })));

const sameFile = (left: TelegramFile, right: TelegramFile) =>
  left.id === right.id && (left.folder_id ?? null) === (right.folder_id ?? null);

interface AndroidPlaybackHistoryEntry {
  mediaId: string;
  title: string;
  positionMs: number;
  durationMs: number;
  completed: boolean;
  lastPlayedAt: number;
}

function MobileSettingToggle({ checked, label, description, onChange }: {
  checked: boolean;
  label: string;
  description: string;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-telegram-border/20 py-3 last:border-b-0">
      <div>
        <p className="text-xs font-medium text-telegram-text">{label}</p>
        <p className="mt-0.5 text-[10px] leading-4 text-telegram-subtext">{description}</p>
      </div>
      <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={onChange} className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-telegram-primary' : 'bg-telegram-border'}`}>
        <span className={`absolute start-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5 rtl:-translate-x-5' : ''}`} />
      </button>
    </div>
  );
}

type SettingsSubpage =
  | 'vault'
  | 'preferences'
  | 'autobackup'
  | 'security'
  | 'transfers'
  | 'storage'
  | 'diagnostics'
  | 'proxy'
  | 'media'
  | 'supporter'
  | 'updates'
  | 'account'
  | 'pro_plans';

function SettingsMenuCard({
  icon: Icon,
  iconColorClass,
  iconBgClass,
  iconBorderClass,
  title,
  subtitle,
  badge,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconColorClass: string;
  iconBgClass: string;
  iconBorderClass: string;
  title: string;
  subtitle: string;
  badge?: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-telegram-surface/80 border border-telegram-border/50 hover:border-telegram-primary/40 hover:bg-telegram-hover/30 active:scale-[0.98] transition-all duration-200 text-left group shadow-xs backdrop-blur-md"
    >
      <div className="flex items-center gap-3 min-w-0 pr-2">
        <div className={`w-10 h-10 rounded-xl ${iconBgClass} border ${iconBorderClass} flex items-center justify-center ${iconColorClass} shrink-0 group-hover:scale-105 transition-transform duration-200 shadow-xs`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h3 className="text-xs font-bold text-telegram-text tracking-tight group-hover:text-telegram-primary transition-colors">
            {title}
          </h3>
          <p className="text-[10px] text-telegram-subtext truncate mt-0.5">
            {subtitle}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {badge}
        <ChevronRight className="w-4 h-4 text-telegram-subtext/50 group-hover:text-telegram-primary group-hover:translate-x-0.5 transition-all" />
      </div>
    </button>
  );
}

function StructuredBrandCard({ appVersion }: { appVersion: string }) {
  return (
    <div className="rounded-2xl bg-telegram-surface border border-telegram-border/60 p-4 sm:p-5 shadow-sm backdrop-blur-md relative overflow-hidden text-center space-y-3.5">
      {/* Background soft glow accent */}
      <div className="pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-32 bg-telegram-primary/10 rounded-full blur-2xl" />

      {/* Top Header: Logo, Title & Version */}
      <div className="relative flex flex-col items-center gap-2">
        <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-telegram-primary/20 via-telegram-primary/5 to-transparent border border-telegram-primary/30 shadow-inner">
          <img src="/inapp_logo.png" className="w-8 h-8 object-contain drop-shadow-md" alt="Telegram Drive" />
        </div>
        <div>
          <h3 className="brand-header-title text-base justify-center">
            <span className="brand-title-telegram">Telegram</span>
            <span className="brand-title-drive">Drive</span>
            <span className="brand-title-dot" />
          </h3>
          <p className="text-[11px] font-medium text-telegram-subtext mt-0.5">
            Decentralized Cloud Storage &amp; Vault
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-telegram-primary/10 border border-telegram-primary/25 shadow-2xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-xs font-bold text-telegram-primary font-mono tracking-wide">v{appVersion}</span>
          <span className="w-1 h-1 rounded-full bg-telegram-border" />
          <span className="text-[10px] font-semibold text-telegram-subtext uppercase tracking-wider">Release</span>
        </div>
      </div>

      {/* Middle: 3-column micro-features grid */}
      <div className="grid grid-cols-3 gap-2 pt-1 text-left">
        <div className="rounded-xl bg-telegram-hover/40 border border-telegram-border/40 p-2 flex flex-col items-center text-center">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/15 flex items-center justify-center mb-1 text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
          </div>
          <span className="text-[10px] font-bold text-telegram-text leading-tight">Zero-Knowledge</span>
          <span className="text-[9px] text-telegram-subtext leading-none mt-0.5">E2E Vault</span>
        </div>

        <div className="rounded-xl bg-telegram-hover/40 border border-telegram-border/40 p-2 flex flex-col items-center text-center">
          <div className="w-6 h-6 rounded-lg bg-amber-500/15 flex items-center justify-center mb-1 text-amber-400">
            <Zap className="w-3.5 h-3.5" />
          </div>
          <span className="text-[10px] font-bold text-telegram-text leading-tight">Turbo Stream</span>
          <span className="text-[9px] text-telegram-subtext leading-none mt-0.5">MTProto 2.0</span>
        </div>

        <div className="rounded-xl bg-telegram-hover/40 border border-telegram-border/40 p-2 flex flex-col items-center text-center">
          <div className="w-6 h-6 rounded-lg bg-sky-500/15 flex items-center justify-center mb-1 text-sky-400">
            <Cloud className="w-3.5 h-3.5" />
          </div>
          <span className="text-[10px] font-bold text-telegram-text leading-tight">Cloud Storage</span>
          <span className="text-[9px] text-telegram-subtext leading-none mt-0.5">Unlimited</span>
        </div>
      </div>

      {/* Bottom specs strip */}
      <div className="pt-2.5 border-t border-telegram-border/40 flex items-center justify-between text-[10px] text-telegram-subtext font-mono">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          Engine: TDENC2 AEAD
        </span>
        <span className="text-[9px] uppercase tracking-wider text-telegram-subtext/80">Telegram MTProto</span>
      </div>
    </div>
  );
}

interface NavigationHistoryEntry {
  tab: MobileTab;
  settingsSubpage?: SettingsSubpage | null;
  filesSelectedFolderId?: number | 'saved' | null;
  activeFolderId?: number | null;
}

export default function MobileDashboard({ onLogout }: { onLogout?: () => void }) {
  const scrollRootRef = useRef<HTMLElement>(null);
  const { t } = useTranslation();
  const { confirm } = useConfirm();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<MobileTab>('home');
  const [navHistory, setNavHistory] = useState<NavigationHistoryEntry[]>([]);
  const lastBackPressRef = useRef<number>(0);
  const [settingsSubpage, setSettingsSubpage] = useState<SettingsSubpage | null>(null);
  const [filesSelectedFolderId, setFilesSelectedFolderId] = useState<number | 'saved' | null>(null);
  const [homeFolderFilter, setHomeFolderFilter] = useState<'all' | 'saved' | number>('all');
  const [homeMediaTypeFilter, setHomeMediaTypeFilter] = useState<'all' | 'images' | 'videos' | 'docs' | 'other'>('all');
  const [mobileSearchQuery, setMobileSearchQuery] = useState('');
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { isAndroid, isTelevision } = usePlatform();
  const { theme, themePreference, setThemePreference } = useTheme();
  const { settings, updateSetting, updateSettings, isLoaded: settingsLoaded } = useSettings();
  const { status: supporterStatus, refreshStatus } = useSupporter();
  const [showHelp, setShowHelp] = useState(false);
  const [supporterOfferTrigger, setSupporterOfferTrigger] = useState<SupporterPromptTrigger | null>(null);
  const [showProUpgradeModal, setShowProUpgradeModal] = useState(false);
  const [paywallTriggerFeature, setPaywallTriggerFeature] = useState<PaywallTriggerFeature>('general');
  const [mobileLicense, setMobileLicense] = useState<LicenseInfo | null>(null);
  const [isLicenseSyncing, setIsLicenseSyncing] = useState(false);
  const [showManualKeyModal, setShowManualKeyModal] = useState(false);
  const [manualLicenseKey, setManualLicenseKey] = useState('');
  const [isActivatingManualKey, setIsActivatingManualKey] = useState(false);
  const [expiredAlertText, setExpiredAlertText] = useState<string | null>(null);

  // ── Software Updates Hook ─────────────────────────────────────────────
  const {
    checking: updateChecking,
    available: updateAvailable,
    downloading: updateDownloading,
    progress: updateProgress,
    error: updateError,
    version: updateVersion,
    phase: updatePhase,
    managedByPackageManager: updateManagedByPkg,
    checkForUpdates,
    downloadAndInstall: downloadAndInstallUpdate,
  } = useUpdateCheck();

  // ── Proxy Setup Guide ────────────────────────────────────────────────
  const [showProxyGuide, setShowProxyGuide] = useState(false);

  // ── Custom App Password / PIN System ─────────────────────────────────
  const [showPinModal, setShowPinModal] = useState<'none' | 'set' | 'change' | 'disable'>('none');
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [showPinPassword, setShowPinPassword] = useState(false);
  const [pinModalError, setPinModalError] = useState<string | null>(null);
  const [isPinSubmitting, setIsPinSubmitting] = useState(false);

  // ── App Lock Screen State (Synchronous check from localStorage to prevent flash) ──
  const [isAppLocked, setIsAppLocked] = useState<boolean>(() => {
    try {
      return localStorage.getItem('tg_drive_app_locked') === 'true';
    } catch {
      return false;
    }
  });
  const lastBackgroundTimestampRef = useRef<number | null>(null);
  const initialLockCheckedRef = useRef(false);

  // ── Auto-Backup & Sync Sheet ──────────────────────────────────────────
  const [showAutoBackupSheet, setShowAutoBackupSheet] = useState(false);
  const { settings: syncSettings, pairs: syncPairs, setEnabled: setSyncEnabled } = useSync();

  // ── Cloud Vault & Passphrase State ─────────────────────────────────────
  const { vaultStatus, cloudVaultStatus, refreshCloudVaultStatus, lockVault } = useEncryption();
  const [vaultModalOpen, setVaultModalOpen] = useState(false);
  const [vaultModalMode, setVaultModalMode] = useState<'unlock' | 'create' | 'change' | 'restore'>('unlock');
  const [pendingOpenFile, setPendingOpenFile] = useState<TelegramFile | null>(null);

  useEffect(() => {
    void refreshCloudVaultStatus();
  }, [refreshCloudVaultStatus]);

  useEffect(() => {
    let unlistenLocked: (() => void) | undefined;
    let unlistenUnlocked: (() => void) | undefined;

    listen('vault-locked', () => {
      void queryClient.invalidateQueries({ queryKey: ['files'] });
    }).then((fn) => {
      unlistenLocked = fn;
    });

    listen('vault-unlocked', async () => {
      resetStreamInfoCache();
      clearAllThumbnailFailures();
      notifyThumbnailInvalidation();
      try {
        const target = currentQueryTargetRef.current;
        const allCached = await invoke<TelegramFile[]>('cmd_get_all_cached_files');
        if (allCached && allCached.length > 0) {
          const mappedAll = allCached.map((f: any) => ({
            ...f,
            sizeStr: formatBytes(f.size),
            type: f.icon_type || (f.name.endsWith('/') ? 'folder' : 'file')
          }));
          queryClient.setQueryData(['files', 'all'], mappedAll);
          if (target !== 'all') {
            const folderFiles = mappedAll.filter((f: any) => (f.folder_id ?? null) === target);
            queryClient.setQueryData(['files', target], folderFiles);
          }
        }
      } catch (e) {
        console.warn('[Vault] Failed to refresh files on vault-unlocked:', e);
      }
      void queryClient.invalidateQueries({ queryKey: ['files'], refetchType: 'all' });
      void queryClient.invalidateQueries({ queryKey: ['cached-files'], refetchType: 'all' });
      notifyThumbnailInvalidation();
    }).then((fn) => {
      unlistenUnlocked = fn;
    });

    return () => {
      unlistenLocked?.();
      unlistenUnlocked?.();
    };
  }, [queryClient]);

  // ── Android deep-link listener (https://t.me/ links) ──────────────────
  useEffect(() => {
    if (!isAndroid) return;
    let unlisten: (() => void) | undefined;
    (async () => {
      try {
        unlisten = await onOpenUrl((urls) => {
          if (urls.length > 0) {
            const url = urls[0];
            toast.success(`Telegram link received: ${url}`, { duration: 5000 });
          }
        });
      } catch (e) {
        console.warn('[DeepLink] Failed to register listener:', e);
      }
    })();
    return () => { unlisten?.(); };
  }, [isAndroid]);

  // ── Android share-received listener (warm start) ──────────────────────
  useEffect(() => {
    if (!isAndroid) return;
    let unlisten: (() => void) | undefined;
    (async () => {
      try {
        unlisten = await listen<{ count: number }>('share-received', (event) => {
          const count = event.payload?.count ?? 0;
          if (count > 0) {
            void queryClient.invalidateQueries({ queryKey: ['cached-files'] });
            const label = count === 1 ? '1 file' : `${count} files`;
            toast.success(`${label} received! Ready to upload.`, { duration: 4000 });
          }
        });
      } catch (e) {
        console.warn('[Share] Failed to register listener:', e);
      }
    })();
    return () => { unlisten?.(); };
  }, [isAndroid, queryClient]);

  // ── Android cold-start share check ────────────────────────────────────
  useEffect(() => {
    if (!isAndroid) return;
    (async () => {
      try {
        const count = await invoke<number>('cmd_get_pending_share_count');
        if (count > 0) {
          void queryClient.invalidateQueries({ queryKey: ['cached-files'] });
          const label = count === 1 ? '1 file' : `${count} files`;
          toast.success(`${label} received! Ready to upload.`, { duration: 4000 });
        }
      } catch (e) {
        // Best-effort; JNI cache may not be ready on very early mount
        console.warn('[Share] Cold-start check failed (may be expected):', e);
      }
    })();
  }, [isAndroid, queryClient]);

  // Sync proxy settings to backend whenever they change
  useEffect(() => {
    const applyProxy = async () => {
      try {
        await invoke('cmd_apply_proxy_settings', {
          enabled: settings.proxyEnabled,
          proxyType: settings.proxyType,
          host: settings.proxyHost,
          port: settings.proxyPort,
          username: settings.proxyUsername,
          password: settings.proxyPassword,
        });
      } catch {
        // best-effort sync
      }
    };
    applyProxy();
  }, [
    settings.proxyEnabled, settings.proxyType, settings.proxyHost,
    settings.proxyPort, settings.proxyUsername, settings.proxyPassword,
  ]);

  const logoutHandler = useMemo(() => onLogout || (() => {}), [onLogout]);

  const {
    store, folders, activeFolderId, setActiveFolderId, isSyncing, isConnected,
    userProfile,
    handleLogout, handleSyncFolders, handleCreateFolder, handleFolderDelete,
    handleFolderRename, handleFolderToggleVisibility, handleExportFolderInvite
  } = useTelegramConnection(logoutHandler);

  // Initial load and Telegram account license verification
  const loadAndVerifyLicense = useCallback(async () => {
    try {
      const local = await licenseManager.loadLicense();
      setMobileLicense(local);

      if (local.expiresAt && local.expiresAt < Math.floor(Date.now() / 1000)) {
        setExpiredAlertText('Your Free Trial / Subscription has expired. Please upgrade to TG Drive Pro to continue.');
      }

      if (userProfile) {
        const res = await licenseManager.checkTelegramAccount(userProfile.id, userProfile.phone);
        if (res.isLicensed && res.license) {
          setMobileLicense(res.license);
          setShowProUpgradeModal(false);
          setExpiredAlertText(null);
          void refreshStatus();
        }
      }
    } catch {
      // ignore
    }
  }, [userProfile, refreshStatus]);

  const isProUser = Boolean(mobileLicense?.isLicensed || supporterStatus.ad_free);

  const handleOpenCreateFolder = useCallback(() => {
    const customFolders = folders.filter(f => f.name.toLowerCase() !== 'saved messages' && f.name.toLowerCase() !== 'saved');
    if (!isProUser && customFolders.length >= 1) {
      setPaywallTriggerFeature('folders');
      setShowProUpgradeModal(true);
      return;
    }
    setShowCreateFolder(true);
  }, [folders, isProUser]);

  const handleOpenAutoBackup = useCallback(() => {
    if (!isProUser) {
      setPaywallTriggerFeature('autobackup');
      setShowProUpgradeModal(true);
      return;
    }
    setShowAutoBackupSheet(true);
  }, [isProUser]);

  const handleTriggerPro = useCallback((feature: PaywallTriggerFeature = 'general') => {
    setPaywallTriggerFeature(feature);
    setShowProUpgradeModal(true);
  }, []);

  useEffect(() => {
    void loadAndVerifyLicense();
  }, [loadAndVerifyLicense]);

  const handleSyncMobileLicense = async () => {
    setIsLicenseSyncing(true);
    try {
      if (userProfile) {
        const res = await licenseManager.checkTelegramAccount(userProfile.id, userProfile.phone);
        if (res.isLicensed && res.license) {
          setMobileLicense(res.license);
          setShowProUpgradeModal(false);
          setExpiredAlertText(null);
          await refreshStatus();
          toast.success('Pro License synced & active for your Telegram account!');
          return;
        }
      }
      const verified = await licenseManager.verifyLicense();
      const updated = await licenseManager.loadLicense();
      setMobileLicense(updated);
      if (verified && updated.isLicensed) {
        toast.success('Pro license is active on this device!');
      } else {
        toast.info('No active license found for this Telegram account.');
      }
    } catch {
      toast.error('Unable to connect to license server.');
    } finally {
      setIsLicenseSyncing(false);
    }
  };

  const handleActivateMobileKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualLicenseKey.trim()) return;
    setIsActivatingManualKey(true);
    try {
      const res = await licenseManager.activateLicense(
        manualLicenseKey.trim(),
        undefined,
        isAndroid ? 'android' : 'mobile',
        userProfile?.id,
        userProfile?.phone
      );
      if (res.success && res.license) {
        setMobileLicense(res.license);
        setShowManualKeyModal(false);
        setManualLicenseKey('');
        setShowProUpgradeModal(false);
        setExpiredAlertText(null);
        await refreshStatus();
        toast.success('License activated & synced with your Telegram account!');
      } else {
        toast.error(res.message || 'Invalid license key.');
      }
    } catch {
      toast.error('Activation failed.');
    } finally {
      setIsActivatingManualKey(false);
    }
  };

  const [showProfileDetailsModal, setShowProfileDetailsModal] = useState(false);

  const handleContactDeveloper = useCallback(async () => {
    try {
      const opened = await openExternalUrl('tg://resolve?domain=Theexposes');
      if (!opened) {
        await openExternalUrl('https://t.me/Theexposes');
      }
    } catch {
      await openExternalUrl('https://t.me/Theexposes');
    }
  }, []);

  const [folderSearch, setFolderSearch] = useState('');
  const filteredFolders = useMemo(() => {
    if (!folderSearch.trim()) return folders;
    const q = folderSearch.toLowerCase();
    return folders.filter(f => f.name.toLowerCase().includes(q) || (f.username && f.username.toLowerCase().includes(q)));
  }, [folders, folderSearch]);

  const [folderViewMode, setFolderViewMode] = useState<'grid' | 'list'>(() => {
    try {
      const saved = localStorage.getItem('tg_drive_folder_view_mode');
      if (saved === 'list' || saved === 'grid') return saved;
    } catch {}
    return 'grid';
  });

  const handleFolderViewModeChange = useCallback((mode: 'grid' | 'list') => {
    setFolderViewMode(mode);
    try {
      localStorage.setItem('tg_drive_folder_view_mode', mode);
    } catch {}
  }, []);

  const { data: androidTransferEnvironment } = useQuery({
    queryKey: ['android-transfer-environment'],
    queryFn: () => invoke<AndroidTransferEnvironment>('cmd_get_android_transfer_environment'),
    enabled: isAndroid,
    refetchInterval: isAndroid ? 60_000 : false,
    refetchOnWindowFocus: true,
  });
  useEffect(() => {
    if (!isAndroid) return;
    const handleEnvironmentChange = (event: Event) => {
      const environment = (event as CustomEvent<AndroidTransferEnvironment>).detail;
      if (environment && typeof environment.connected === 'boolean') {
        queryClient.setQueryData(['android-transfer-environment'], environment);
      } else {
        void queryClient.invalidateQueries({ queryKey: ['android-transfer-environment'] });
      }
    };
    window.addEventListener('android-environment-change', handleEnvironmentChange);
    return () => window.removeEventListener('android-environment-change', handleEnvironmentChange);
  }, [isAndroid, queryClient]);
  const androidTransferGate = useMemo(
    () => evaluateAndroidTransferPolicy(androidTransferEnvironment, settings),
    [androidTransferEnvironment, settings],
  );
  const transferAllowed = !isAndroid || (isConnected && androidTransferGate.allowed);
  const transferWaitingReason = !isConnected
    ? 'Waiting for the Telegram connection'
    : androidTransferGate.reason ?? 'Waiting for Android transfer conditions';

  useEffect(() => {
    if (!isAndroid || !settingsLoaded) return;
    void invoke('cmd_configure_android_transfer_recovery', {
      wifiOnly: settings.androidWifiOnlyTransfers,
      allowRoaming: settings.androidAllowRoaming,
      requireCharging: settings.androidRequireCharging,
      pauseOnLowBattery: settings.androidPauseOnLowBattery,
    }).catch(error => console.warn('[Transfer] Unable to configure Android recovery:', error));
  }, [
    isAndroid,
    settings.androidAllowRoaming,
    settings.androidPauseOnLowBattery,
    settings.androidRequireCharging,
    settings.androidWifiOnlyTransfers,
    settingsLoaded,
  ]);

  const {
    uploadQueue, setUploadQueue, handleManualUpload, clearFinished: clearUploads,
    cancelAll: cancelUploads, pauseAll: pauseUploads, resumeAll: resumeUploads,
    cancelItem: cancelUpload, retryItem: retryUpload,
  } = useFileUpload(activeFolderId, store, transferAllowed, transferWaitingReason);
  const {
    downloadQueue, queueDownload, queueBulkDownload, clearFinished: clearDownloads,
    cancelAll: cancelDownloads, pauseAll: pauseDownloads, resumeAll: resumeDownloads,
    cancelItem: cancelDownload, retryItem: retryDownload,
  } = useFileDownload(store, transferAllowed, transferWaitingReason);

  const [shareFile, setShareFile] = useState<TelegramFile | null>(null);
  const [shareFiles, setShareFiles] = useState<TelegramFile[] | null>(null);
  const [previewFile, setPreviewFile] = useState<TelegramFile | null>(null);
  const [previewInitialThumbnail, setPreviewInitialThumbnail] = useState<string | null>(null);
  const [playingFile, setPlayingFile] = useState<TelegramFile | null>(null);
  const [pdfFile, setPdfFile] = useState<TelegramFile | null>(null);
  const [docFile, setDocFile] = useState<TelegramFile | null>(null);
  const [archiveViewFile, setArchiveViewFile] = useState<TelegramFile | null>(null);
  const isAnyPreviewOpen = Boolean(previewFile || playingFile || pdfFile || archiveViewFile || docFile);
  const [previewContextFiles, setPreviewContextFiles] = useState<TelegramFile[]>([]);
  const [previewContextIndex, setPreviewContextIndex] = useState(-1);
  const [uploadingCacheFiles, setUploadingCacheFiles] = useState<Set<string>>(new Set());
  const transferIdCounter = useRef(0);
  const transferServiceRunningRef = useRef(false);
  const transferNotificationTimerRef = useRef<number | null>(null);
  const transferNotificationStateRef = useRef<{
    active: number;
    progress: number;
    speed: number;
    paused: boolean;
    fileName: string | null;
    transferType: 'download' | 'upload' | null;
    previewPath: string | null;
  }>({
    active: 0,
    progress: 0,
    speed: 0,
    paused: false,
    fileName: null,
    transferType: null,
    previewPath: null,
  });
  const lastCompletedItemRef = useRef<{
    fileName: string;
    transferType: 'download' | 'upload';
    previewPath: string | null;
    timestamp: number;
  } | null>(null);
  const prevDownloadStatusesRef = useRef<Record<string, string>>({});
  const prevUploadStatusesRef = useRef<Record<string, string>>({});
  const initialForegroundCleanupDoneRef = useRef(false);

  // ── Connection diagnostics state ──────────────────────────────────────
  const [checkingLatency, setCheckingLatency] = useState(false);
  const [copyingDiagnostics, setCopyingDiagnostics] = useState(false);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  const { data: bandwidth } = useQuery({
    queryKey: ['bandwidth'],
    queryFn: () => invoke<BandwidthStats>('cmd_get_bandwidth'),
    refetchInterval: activeTab === 'settings' ? 5000 : false,
  });

  const {
    data: offlineCache,
    isFetching: offlineCacheLoading,
    refetch: refetchOfflineCache,
  } = useQuery({
    queryKey: ['offline-cache-status'],
    queryFn: () => invoke<OfflineCacheStatus>('cmd_get_offline_cache_status'),
    enabled: activeTab === 'settings' || activeTab === 'profile',
  });

  const clearOfflineCache = useCallback(async () => {
    const accepted = await confirm({
      title: t('settings.clear_offline_cache_title'),
      message: t('settings.clear_offline_cache_desc'),
      confirmText: t('settings.clear'),
      variant: 'danger',
    });
    if (!accepted) return;
    try {
      await invoke('cmd_clean_preview_cache');
      await refetchOfflineCache();
      toast.success(t('settings.offline_cache_cleared'));
    } catch {
      toast.error(t('settings.cache_clear_failed'));
    }
  }, [confirm, refetchOfflineCache, t]);

  useEffect(() => {
    if (!isAndroid || !settingsLoaded) return;
    void invoke('cmd_set_preview_cache_limit', { maxGb: settings.androidMediaCacheMaxGb })
      .then(() => refetchOfflineCache())
      .catch(error => console.warn('[Media] Unable to configure offline cache:', error));
  }, [isAndroid, refetchOfflineCache, settings.androidMediaCacheMaxGb, settingsLoaded]);

  const handleCheckLatency = useCallback(async () => {
    setCheckingLatency(true);
    setLatencyMs(null);
    try {
      const ms = await invoke<number>('cmd_check_latency');
      setLatencyMs(ms);
      if (ms >= 0) {
        const emoji = ms < 100 ? '🟢' : ms < 250 ? '🟡' : '🔴';
        toast.success(`${emoji} Ping: ${ms}ms to Telegram DC`);
      } else {
        toast.error('Unable to reach Telegram servers');
      }
    } catch (e) {
      console.warn('Ping check failed:', e);
      toast.error('Unable to reach Telegram servers');
      setLatencyMs(-1);
    } finally {
      setCheckingLatency(false);
    }
  }, []);

  const handleCopyDiagnostics = useCallback(async () => {
    setCopyingDiagnostics(true);
    try {
      const diagnostics = await invoke<string>('cmd_get_system_diagnostics');
      await copyToClipboard(diagnostics);
      toast.success(t('settings.diagnostics_copied'));
    } catch (error) {
      toast.error(t('settings.diagnostics_copy_failed', { error: String(error) }));
    } finally {
      setCopyingDiagnostics(false);
    }
  }, [t]);

  const handleBiometricLockToggle = useCallback(async () => {
    if (settings.androidBiometricLock) {
      updateSetting('androidBiometricLock', false);
      if (!settings.androidCustomPinEnabled) {
        try { localStorage.setItem('tg_drive_app_locked', 'false'); } catch {}
      }
      return;
    }
    try {
      const available = await invoke<boolean>('cmd_get_android_authentication_available');
      if (!available) {
        toast.error('Set a device PIN, pattern, password, or supported biometric before enabling app lock.');
        return;
      }
      const authenticated = await invoke<boolean>('cmd_android_authenticate', { reason: 'Authenticate to enable Telegram Drive app lock' });
      if (authenticated) {
        updateSetting('androidBiometricLock', true);
        try { localStorage.setItem('tg_drive_app_locked', 'true'); } catch {}
      }
    } catch (error) {
      toast.error(`Could not enable Android app lock: ${error}`);
    }
  }, [settings.androidBiometricLock, settings.androidCustomPinEnabled, updateSetting]);

  useEffect(() => {
    if (!isAndroid || !settingsLoaded) return;
    void invoke<boolean>('cmd_configure_android_privacy', {
      biometricLock: settings.androidBiometricLock,
      privacyScreen: settings.androidPrivacyScreen,
      timeoutMinutes: settings.androidLockAfterBackgroundMinutes,
    }).then(available => {
      if (!available && settings.androidBiometricLock) updateSetting('androidBiometricLock', false);
    }).catch(error => console.warn('[Privacy] Unable to configure Android privacy:', error));
  }, [
    isAndroid,
    settings.androidBiometricLock,
    settings.androidLockAfterBackgroundMinutes,
    settings.androidPrivacyScreen,
    settingsLoaded,
    updateSetting,
  ]);

  // ── Custom Password / PIN Handlers ────────────────────────────────────
  const handleOpenSetPin = useCallback(() => {
    setCurrentPinInput('');
    setNewPinInput('');
    setConfirmPinInput('');
    setPinModalError(null);
    setShowPinPassword(false);
    setShowPinModal('set');
  }, []);

  const handleOpenChangePin = useCallback(() => {
    setCurrentPinInput('');
    setNewPinInput('');
    setConfirmPinInput('');
    setPinModalError(null);
    setShowPinPassword(false);
    setShowPinModal('change');
  }, []);

  const handleOpenDisablePin = useCallback(() => {
    setCurrentPinInput('');
    setNewPinInput('');
    setConfirmPinInput('');
    setPinModalError(null);
    setShowPinPassword(false);
    setShowPinModal('disable');
  }, []);

  const handlePinModalSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setPinModalError(null);
    setIsPinSubmitting(true);
    try {
      if (showPinModal === 'set') {
        if (newPinInput.length < 4) {
          setPinModalError('Password must be at least 4 characters');
          return;
        }
        if (newPinInput !== confirmPinInput) {
          setPinModalError('Passwords do not match');
          return;
        }
        const hashed = await hashAppPin(newPinInput);
        updateSetting('androidCustomPinHash', hashed);
        updateSetting('androidCustomPinEnabled', true);
        try { localStorage.setItem('tg_drive_app_locked', 'true'); } catch {}
        setShowPinModal('none');
        toast.success('Custom app password enabled');
      } else if (showPinModal === 'change') {
        const hashedOld = await hashAppPin(currentPinInput);
        if (hashedOld !== settings.androidCustomPinHash) {
          setPinModalError('Current password is incorrect');
          return;
        }
        if (newPinInput.length < 4) {
          setPinModalError('New password must be at least 4 characters');
          return;
        }
        if (newPinInput !== confirmPinInput) {
          setPinModalError('New passwords do not match');
          return;
        }
        const hashedNew = await hashAppPin(newPinInput);
        updateSetting('androidCustomPinHash', hashedNew);
        try { localStorage.setItem('tg_drive_app_locked', 'true'); } catch {}
        setShowPinModal('none');
        toast.success('App password updated successfully');
      } else if (showPinModal === 'disable') {
        const hashedCurrent = await hashAppPin(currentPinInput);
        if (hashedCurrent !== settings.androidCustomPinHash) {
          setPinModalError('Current password is incorrect');
          return;
        }
        updateSetting('androidCustomPinEnabled', false);
        if (!settings.androidBiometricLock) {
          try { localStorage.setItem('tg_drive_app_locked', 'false'); } catch {}
        }
        setShowPinModal('none');
        toast.success('Password protection removed');
      }
    } catch {
      setPinModalError('Failed to process password change');
    } finally {
      setIsPinSubmitting(false);
    }
  }, [showPinModal, currentPinInput, newPinInput, confirmPinInput, settings.androidCustomPinHash, updateSetting]);

  // Lock on initial cold start if Custom PIN or Biometric is enabled
  useEffect(() => {
    if (!settingsLoaded || initialLockCheckedRef.current) return;
    initialLockCheckedRef.current = true;
    const hasLock = (settings.androidCustomPinEnabled && !!settings.androidCustomPinHash) || settings.androidBiometricLock;
    if (hasLock) {
      setIsAppLocked(true);
      try { localStorage.setItem('tg_drive_app_locked', 'true'); } catch {}
    } else {
      setIsAppLocked(false);
      try { localStorage.setItem('tg_drive_app_locked', 'false'); } catch {}
    }
  }, [settingsLoaded, settings.androidCustomPinEnabled, settings.androidCustomPinHash, settings.androidBiometricLock]);

  // Lock when returning from background after timeout (or immediately if timeout is 0)
  useEffect(() => {
    const handleVisibility = () => {
      const hasLock = (settings.androidCustomPinEnabled && !!settings.androidCustomPinHash) || settings.androidBiometricLock;
      if (!hasLock) return;

      if (document.visibilityState === 'hidden') {
        lastBackgroundTimestampRef.current = Date.now();
        const lockDelayMs = (settings.androidLockAfterBackgroundMinutes ?? 0) * 60 * 1000;
        if (lockDelayMs === 0) {
          setIsAppLocked(true);
          try { localStorage.setItem('tg_drive_app_locked', 'true'); } catch {}
        }
      } else if (document.visibilityState === 'visible') {
        const lockDelayMs = (settings.androidLockAfterBackgroundMinutes ?? 0) * 60 * 1000;
        if (lockDelayMs > 0 && lastBackgroundTimestampRef.current) {
          const elapsedMs = Date.now() - lastBackgroundTimestampRef.current;
          if (elapsedMs >= lockDelayMs) {
            setIsAppLocked(true);
            try { localStorage.setItem('tg_drive_app_locked', 'true'); } catch {}
          }
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [settings.androidCustomPinEnabled, settings.androidCustomPinHash, settings.androidBiometricLock, settings.androidLockAfterBackgroundMinutes]);

  // Listen for native Android unlock event
  useEffect(() => {
    (window as any).__telegramDriveOnAppUnlocked = () => {
      setIsAppLocked(false);
      try {
        localStorage.setItem('tg_drive_app_locked', 'false');
      } catch {}
    };
    return () => {
      delete (window as any).__telegramDriveOnAppUnlocked;
    };
  }, []);

  // The in-app sponsor placement is TV-safe and remains available to free users.
  // Keep it suppressed during media, previews, dialogs, active transfers, and lock screen.
  const adVisible = !shareFile && !shareFiles
    && !previewFile && !playingFile && !pdfFile && !archiveViewFile && !docFile
    && !showHelp && !supporterOfferTrigger && settings.driveTourSeen && !isAppLocked
    && !uploadQueue.some(item => ['pending', 'uploading', 'downloading', 'encrypting', 'verifying'].includes(item.status))
    && !downloadQueue.some(item => ['pending', 'cooldown', 'downloading', 'decrypting', 'verifying'].includes(item.status));

  const activeUploadCount = uploadQueue.filter(item => ['pending', 'uploading', 'downloading', 'encrypting', 'verifying'].includes(item.status)).length;
  const activeDownloadCount = downloadQueue.filter(item => ['pending', 'cooldown', 'downloading', 'decrypting', 'verifying'].includes(item.status)).length;
  const pausedUploadCount = uploadQueue.filter(item => item.status === 'paused').length;
  const pausedDownloadCount = downloadQueue.filter(item => item.status === 'paused').length;
  const networkWaitingCount = [...uploadQueue, ...downloadQueue].filter(item => item.status === 'waiting_for_network').length;
  const aggregateTransferSpeed = [...uploadQueue, ...downloadQueue].reduce((sum, item) => sum + (item.speedBytesPerSec || 0), 0);
  const foregroundItems = [...uploadQueue, ...downloadQueue].filter(item =>
    ['uploading', 'downloading', 'encrypting', 'decrypting', 'verifying'].includes(item.status)
  );
  const aggregateTransferProgress = foregroundItems.length > 0
    ? Math.round(foregroundItems.reduce((sum, item) => sum + (item.progress || 0), 0) / foregroundItems.length)
    : 0;

  // Helper to extract a human-friendly filename without URI prefixes or query parameters
  const getCleanTransferName = useCallback((raw: string | null | undefined): string => {
    if (!raw) return 'File';
    try {
      const decoded = decodeURIComponent(raw);
      const base = decoded.split(/[\\/]/).pop() || decoded;
      return base.split('?')[0] || base;
    } catch {
      const base = raw.split(/[\\/]/).pop() || raw;
      return base.split('?')[0] || base;
    }
  }, []);

  // Track completed items to trigger rich completion notifications on Android
  useEffect(() => {
    downloadQueue.forEach(item => {
      const prev = prevDownloadStatusesRef.current[item.id];
      if (prev !== 'success' && item.status === 'success') {
        lastCompletedItemRef.current = {
          fileName: getCleanTransferName(item.filename),
          transferType: 'download',
          previewPath: item.savePath ?? null,
          timestamp: Date.now(),
        };
      }
      prevDownloadStatusesRef.current[item.id] = item.status;
    });
  }, [downloadQueue, getCleanTransferName]);

  useEffect(() => {
    uploadQueue.forEach(item => {
      const prev = prevUploadStatusesRef.current[item.id];
      if (prev !== 'success' && item.status === 'success') {
        const name = getCleanTransferName(item.url || item.path);
        lastCompletedItemRef.current = {
          fileName: name,
          transferType: 'upload',
          previewPath: item.path || null,
          timestamp: Date.now(),
        };
      }
      prevUploadStatusesRef.current[item.id] = item.status;
    });
  }, [getCleanTransferName, uploadQueue]);

  const activeDownloadingItem = downloadQueue.find(item =>
    ['downloading', 'decrypting', 'verifying'].includes(item.status)
  );
  const activeUploadingItem = uploadQueue.find(item =>
    ['uploading', 'encrypting', 'verifying'].includes(item.status)
  );

  let activeTransferType: 'download' | 'upload' | null = null;
  let activeFileName: string | null = null;
  let activePreviewPath: string | null = null;
  let activeItemProgress: number = aggregateTransferProgress;

  if (activeDownloadingItem) {
    activeTransferType = 'download';
    activeFileName = activeDownloadingItem.filename;
    activeItemProgress = activeDownloadingItem.progress ?? aggregateTransferProgress;
    activePreviewPath = activeDownloadingItem.savePath ?? null;
  } else if (activeUploadingItem) {
    activeTransferType = 'upload';
    activeFileName = (activeUploadingItem.url || activeUploadingItem.path).split(/[\\/]/).pop() || activeUploadingItem.path;
    activeItemProgress = activeUploadingItem.progress ?? aggregateTransferProgress;
    activePreviewPath = activeUploadingItem.path || null;
  }

  useEffect(() => {
    if (!isAndroid) return;
    const hasRunningTransfers = [...uploadQueue, ...downloadQueue]
      .some(item => ['uploading', 'downloading', 'encrypting', 'decrypting', 'verifying'].includes(item.status));
    if (hasRunningTransfers) {
      if (!transferServiceRunningRef.current) {
        transferServiceRunningRef.current = true;
        void invoke('cmd_start_foreground_service').catch(() => {
          transferServiceRunningRef.current = false;
        });
      }
    } else {
      if (transferServiceRunningRef.current) {
        transferServiceRunningRef.current = false;
        if (transferNotificationTimerRef.current !== null) {
          window.clearTimeout(transferNotificationTimerRef.current);
          transferNotificationTimerRef.current = null;
        }
        let last = lastCompletedItemRef.current;
        const justCompleted = last && Date.now() - last.timestamp < 15000;
        if (!justCompleted) {
          const completedDownload = downloadQueue.find(i => i.status === 'success');
          if (completedDownload) {
            last = {
              fileName: getCleanTransferName(completedDownload.filename),
              transferType: 'download',
              previewPath: completedDownload.savePath ?? null,
              timestamp: Date.now(),
            };
          } else {
            const completedUpload = uploadQueue.find(i => i.status === 'success');
            if (completedUpload) {
              last = {
                fileName: getCleanTransferName(completedUpload.url || completedUpload.path),
                transferType: 'upload',
                previewPath: completedUpload.path || null,
                timestamp: Date.now(),
              };
            }
          }
        }
        const completionPayload = last
          ? { fileName: last.fileName, transferType: last.transferType, previewPath: last.previewPath }
          : { fileName: null, transferType: null, previewPath: null };
        void invoke('cmd_stop_foreground_service', completionPayload).catch(() => undefined);
      } else if (settingsLoaded && !initialForegroundCleanupDoneRef.current) {
        // One-time cleanup of any leftover notifications from previous app sessions (no completion alert)
        initialForegroundCleanupDoneRef.current = true;
        void invoke('cmd_stop_foreground_service', { fileName: null, transferType: null, previewPath: null }).catch(() => undefined);
      }
    }
  }, [downloadQueue, getCleanTransferName, isAndroid, settingsLoaded, uploadQueue]);

  useEffect(() => {
    if (!isAndroid || !transferServiceRunningRef.current) return;
    const progressVal = foregroundItems.length === 1 ? activeItemProgress : aggregateTransferProgress;
    transferNotificationStateRef.current = {
      active: foregroundItems.length,
      progress: progressVal,
      speed: Math.round(aggregateTransferSpeed),
      paused: foregroundItems.length === 0 && pausedUploadCount + pausedDownloadCount > 0,
      fileName: activeFileName ? getCleanTransferName(activeFileName) : null,
      transferType: activeTransferType,
      previewPath: activePreviewPath,
    };

    // If progress reaches 100%, flush immediately without delaying for debounce
    if (progressVal >= 100) {
      if (transferNotificationTimerRef.current !== null) {
        window.clearTimeout(transferNotificationTimerRef.current);
        transferNotificationTimerRef.current = null;
      }
      void invoke('cmd_update_foreground_service', transferNotificationStateRef.current).catch(() => undefined);
      return;
    }

    if (transferNotificationTimerRef.current !== null) return;
    transferNotificationTimerRef.current = window.setTimeout(() => {
      transferNotificationTimerRef.current = null;
      if (!transferServiceRunningRef.current) return;
      void invoke('cmd_update_foreground_service', transferNotificationStateRef.current).catch(() => undefined);
    }, 400);
  }, [
    activeFileName,
    activeItemProgress,
    activePreviewPath,
    activeTransferType,
    aggregateTransferProgress,
    aggregateTransferSpeed,
    foregroundItems.length,
    getCleanTransferName,
    isAndroid,
    pausedDownloadCount,
    pausedUploadCount,
  ]);

  useEffect(() => () => {
    if (transferNotificationTimerRef.current !== null) {
      window.clearTimeout(transferNotificationTimerRef.current);
      transferNotificationTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isAndroid) return;
    const applyTransferAction = (action: string) => {
      if (action === 'pause' || action === 'timeout') {
        pauseUploads();
        pauseDownloads();
        if (action === 'timeout') toast.info('Android paused long-running transfers. Open Transfers to resume.');
      } else if (action === 'resume') {
        resumeUploads();
        resumeDownloads();
      } else if (action === 'cancel') {
        cancelUploads();
        cancelDownloads();
      }
    };
    const handleTransferAction = (event: Event) => applyTransferAction((event as CustomEvent<string>).detail);
    window.addEventListener('android-transfer-action', handleTransferAction);
    void invoke<string>('cmd_get_pending_android_transfer_action')
      .then(action => { if (action) applyTransferAction(action); })
      .catch(() => undefined);
    return () => window.removeEventListener('android-transfer-action', handleTransferAction);
  }, [cancelDownloads, cancelUploads, isAndroid, pauseDownloads, pauseUploads, resumeDownloads, resumeUploads]);

  useEffect(() => () => {
    if (isAndroid && transferServiceRunningRef.current) {
      transferServiceRunningRef.current = false;
      if (transferNotificationTimerRef.current !== null) {
        window.clearTimeout(transferNotificationTimerRef.current);
        transferNotificationTimerRef.current = null;
      }
      void invoke('cmd_stop_foreground_service', { fileName: null, transferType: null, previewPath: null }).catch(() => undefined);
    }
  }, [isAndroid]);

  // ── Android cached shared files ───────────────────────────────────────
  interface CachedFileEntry {
    uri: string;
    cached_path: string;
    file_name: string;
    file_size: number;
  }

  const { data: cachedFiles = [], refetch: refetchCachedFiles } = useQuery({
    queryKey: ['cached-files'],
    queryFn: () => invoke<CachedFileEntry[]>('cmd_list_cached_files'),
    enabled: isAndroid,
    refetchOnWindowFocus: true,
  });

  const handleUploadCachedFile = useCallback(async (entry: CachedFileEntry) => {
    const tid = `cache-upload-${++transferIdCounter.current}-${Date.now()}`;
    setUploadingCacheFiles(prev => new Set(prev).add(entry.cached_path));
    try {
      const stagedPath = await invoke<string>('cmd_stage_android_upload', { path: entry.cached_path });
      setUploadQueue(queue => [...queue, {
        id: tid,
        path: stagedPath,
        folderId: activeFolderId,
        status: 'pending',
        androidStaged: true,
        protection: { mode: 'standard' },
        videoUploadMode: effectiveVideoUploadMode(entry.file_name, { mode: 'standard' }, settings.videoUploadMode),
      }]);
      await invoke('cmd_remove_cached_path', { uri: entry.uri }).catch(() => undefined);
      await refetchCachedFiles();
      toast.success(`Queued: ${entry.file_name}`);
    } catch (e) {
      toast.error(`Could not preserve the shared file for upload: ${e}`);
    } finally {
      setUploadingCacheFiles(prev => {
        const next = new Set(prev);
        next.delete(entry.cached_path);
        return next;
      });
    }
  }, [activeFolderId, refetchCachedFiles, setUploadQueue, settings.videoUploadMode]);

  const handleClearCachedFiles = useCallback(async () => {
    try {
      await Promise.all(cachedFiles.map(entry =>
        invoke('cmd_remove_cached_path', { uri: entry.uri }).catch(() => {})
      ));
      refetchCachedFiles();
      toast.success('Shared files cleared');
    } catch (e) {
      toast.error(`Failed to clear: ${e}`);
    }
  }, [cachedFiles, refetchCachedFiles]);

  const currentQueryTarget = activeTab === 'home'
    ? (homeFolderFilter === 'all' ? 'all' : (homeFolderFilter === 'saved' ? null : homeFolderFilter))
    : activeFolderId;
  const currentQueryTargetRef = useRef(currentQueryTarget);
  useEffect(() => {
    currentQueryTargetRef.current = currentQueryTarget;
  }, [currentQueryTarget]);

  // Real files loader — only active when app is unlocked
  const { data: allFiles = [], isLoading, isFetching } = useQuery({
    queryKey: ['files', currentQueryTarget],
    queryFn: async () => {
      let accumulatedFiles: any[] = [];

      if (currentQueryTarget === 'all') {
        try {
          const cached = await invoke<TelegramFile[]>('cmd_get_all_cached_files');
          if (cached && cached.length > 0) {
            accumulatedFiles = cached.map((f: any) => ({
              ...f,
              sizeStr: formatBytes(f.size),
              type: f.icon_type || (f.name.endsWith('/') ? 'folder' : 'file')
            }));
            queryClient.setQueryData(['files', 'all'], accumulatedFiles);
          }
        } catch (e) {
          console.warn('[Files] cmd_get_all_cached_files error:', e);
        }

        const unlisten = await listen<any>('folder-load-chunk', (event) => {
          const payload = event.payload;
          const newChunk = payload.files.map((f: any) => ({
            ...f,
            sizeStr: formatBytes(f.size),
            type: f.icon_type || (f.name.endsWith('/') ? 'folder' : 'file')
          }));
          accumulatedFiles = [
            ...accumulatedFiles.filter((existing: any) => !newChunk.some((n: any) => n.id === existing.id && (n.folder_id ?? null) === (existing.folder_id ?? null))),
            ...newChunk
          ];
          queryClient.setQueryData(['files', 'all'], accumulatedFiles);
        });

        try {
          await invoke('cmd_get_files', { folderId: null });
          return accumulatedFiles;
        } finally {
          unlisten();
        }
      }

      const targetFolderId = currentQueryTarget;
      try {
        const cached = await invoke<TelegramFile[]>('cmd_get_cached_files', { folderId: targetFolderId });
        if (cached && cached.length > 0) {
          accumulatedFiles = cached.map((f: any) => ({
            ...f,
            sizeStr: formatBytes(f.size),
            type: f.icon_type || (f.name.endsWith('/') ? 'folder' : 'file')
          }));
          queryClient.setQueryData(['files', currentQueryTarget], accumulatedFiles);
        }
      } catch (e) {
        console.warn('[Files] cmd_get_cached_files error:', e);
      }

      const unlisten = await listen<any>('folder-load-chunk', (event) => {
        const payload = event.payload;
        if (payload.folderId === targetFolderId) {
          const newChunk = payload.files.map((f: any) => ({
            ...f,
            sizeStr: formatBytes(f.size),
            type: f.icon_type || (f.name.endsWith('/') ? 'folder' : 'file')
          }));
          accumulatedFiles = [
            ...accumulatedFiles.filter((existing: any) => !newChunk.some((n: any) => n.id === existing.id && (n.folder_id ?? null) === (existing.folder_id ?? null))),
            ...newChunk
          ];
          queryClient.setQueryData(['files', currentQueryTarget], accumulatedFiles);
        }
      });

      try {
        await invoke('cmd_get_files', { folderId: targetFolderId });
        return accumulatedFiles;
      } finally {
        unlisten();
      }
    },
    enabled: !!store && !isAppLocked,
  });

  const isFilesLoading = isLoading || (isFetching && allFiles.length === 0);

  const { data: playbackHistory = [] } = useQuery({
    queryKey: ['android-playback-history'],
    queryFn: () => invoke<AndroidPlaybackHistoryEntry[]>('cmd_get_android_playback_history'),
    enabled: isAndroid && !isAppLocked && (activeTab === 'home' || activeTab === 'files'),
    refetchOnWindowFocus: true,
  });
  useEffect(() => {
    if (!isAndroid) return;
    const refreshHistory = () => void queryClient.invalidateQueries({ queryKey: ['android-playback-history'] });
    window.addEventListener('android-playback-history-change', refreshHistory);
    return () => window.removeEventListener('android-playback-history-change', refreshHistory);
  }, [isAndroid, queryClient]);
  const continueWatching = useMemo(() => {
    const folderKey = String(activeFolderId ?? 'home');
    return playbackHistory.flatMap(entry => {
      if (entry.completed || entry.positionMs < 10_000 || !entry.mediaId.startsWith(`${folderKey}:`)) return [];
      const messageId = Number(entry.mediaId.slice(folderKey.length + 1));
      const file = allFiles.find(candidate => candidate.id === messageId);
      if (!file) return [];
      const progress = entry.durationMs > 0 ? Math.min(100, Math.round(entry.positionMs / entry.durationMs * 100)) : 0;
      return [{ entry, file, progress }];
    }).slice(0, 5);
  }, [activeFolderId, allFiles, playbackHistory]);

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [fileRenames, setFileRenames] = useState<Map<number, string>>(new Map());
  const {
    handleDelete: handleDeleteOp,
    handleBulkDelete,
    handleBulkDownload,
    handleBulkMove,
    deleteQueue,
    clearDeletes,
    removeDeleteItem,
    retryDelete,
  } = useFileOperations(activeFolderId, selectedIds, setSelectedIds, allFiles, queueBulkDownload);
  const activeDeleteCount = deleteQueue.filter(item => ['pending', 'deleting'].includes(item.status)).length;

  const activeFolder = activeFolderId === null
    ? 'Saved Messages'
    : folders.find(f => f.id === activeFolderId)?.name || 'Unknown Channel';

  const openSettingsSubpage = useCallback((subpage: SettingsSubpage) => {
    setNavHistory(prev => {
      const last = prev[prev.length - 1];
      if (last && last.tab === activeTab && last.settingsSubpage === settingsSubpage && last.filesSelectedFolderId === filesSelectedFolderId) {
        return prev;
      }
      return [...prev, { tab: activeTab, settingsSubpage, filesSelectedFolderId, activeFolderId }].slice(-30);
    });
    setSettingsSubpage(subpage);
  }, [activeTab, settingsSubpage, filesSelectedFolderId, activeFolderId]);

  const handleOpenFolderInFilesTab = useCallback((folderId: number | 'saved') => {
    setNavHistory(prev => {
      const last = prev[prev.length - 1];
      if (last && last.tab === activeTab && last.settingsSubpage === settingsSubpage && last.filesSelectedFolderId === filesSelectedFolderId) {
        return prev;
      }
      return [...prev, { tab: activeTab, settingsSubpage, filesSelectedFolderId, activeFolderId }].slice(-30);
    });
    setActiveTab('files');
    setFilesSelectedFolderId(folderId);
    setActiveFolderId(folderId === 'saved' ? null : folderId);
  }, [activeTab, settingsSubpage, filesSelectedFolderId, activeFolderId, setActiveFolderId]);

  const handleSwitchTab = useCallback((tab: MobileTab) => {
    if (tab === activeTab && settingsSubpage === null && filesSelectedFolderId === null) {
      return;
    }
    setNavHistory(prev => {
      const last = prev[prev.length - 1];
      if (last && last.tab === activeTab && last.settingsSubpage === settingsSubpage && last.filesSelectedFolderId === filesSelectedFolderId) {
        return prev;
      }
      return [...prev, { tab: activeTab, settingsSubpage, filesSelectedFolderId, activeFolderId }].slice(-30);
    });

    if (tab === 'home') {
      setActiveFolderId(null);
      setFilesSelectedFolderId(null);
    }
    setSettingsSubpage(null);
    setActiveTab(tab);
  }, [activeTab, settingsSubpage, filesSelectedFolderId, activeFolderId, setActiveFolderId]);

  // Folder action menu state (replaces swipe-to-reveal)
  const [folderActionMenu, setFolderActionMenu] = useState<TelegramFolder | null>(null);
  const [renameFolder, setRenameFolder] = useState<{ id: number; name: string } | null>(null);
  const [renameFileTarget, setRenameFileTarget] = useState<TelegramFile | null>(null);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showUploadDestinationSheet, setShowUploadDestinationSheet] = useState(false);
  const [showSortSheet, setShowSortSheet] = useState(false);
  const [isHomeSelectionMode, setIsHomeSelectionMode] = useState(false);
  const [transferTabFilter, setTransferTabFilter] = useState<'all' | 'uploads' | 'downloads' | 'deletions' | 'active'>('all');
  const [publicChannelTarget, setPublicChannelTarget] = useState<TelegramFolder | null>(null);

  const openMobileSupporter = useCallback(() => {
    setSupporterOfferTrigger(null);
    openSettingsSubpage('supporter');
  }, [openSettingsSubpage]);

  const showSupporterOffer = useCallback((_trigger: SupporterPromptTrigger) => {
    // Supporter offer prompt disabled
  }, []);

  useEffect(() => {
    if (supporterStatus.ad_free) setSupporterOfferTrigger(null);
  }, [supporterStatus.ad_free]);

  useEffect(() => {
    const handleValueMoment = (event: Event) => {
      const moment = (event as CustomEvent<{ moment?: SupporterPromptTrigger }>).detail?.moment;
      if (moment === 'upload_completed' || moment === 'download_completed') {
        showSupporterOffer(moment);
      }
    };
    window.addEventListener(SUPPORTER_VALUE_MOMENT_EVENT, handleValueMoment);
    return () => window.removeEventListener(SUPPORTER_VALUE_MOMENT_EVENT, handleValueMoment);
  }, [showSupporterOffer]);

  const handleFolderVisibilityToggle = useCallback(async (folder: TelegramFolder) => {
    const isPublic = folder.is_public || !!folder.username;
    if (isPublic) {
      // Make private
      try {
        await handleFolderToggleVisibility(folder.id, false);
      } catch { /* error already toasted */ }
    } else {
      // Make public — open styled bottom sheet
      setPublicChannelTarget(folder);
    }
  }, [handleFolderToggleVisibility]);

  const handleFolderShareInvite = useCallback(async (folder: TelegramFolder) => {
    try {
      const info = await handleExportFolderInvite(folder.id);
      try {
        await copyToClipboard(info.link);
        toast.success(`Invite link copied: ${info.link}`);
      } catch (e) {
        toast.error(`Failed to copy to clipboard: ${e}`);
      }
    } catch { /* backend error already toasted in hook */ }
  }, [handleExportFolderInvite]);

  const buildFolderActions = useCallback((folder: TelegramFolder): ActionItem[] => {
    const isPublic = folder.is_public || !!folder.username;
    return [
      {
        label: 'Rename',
        icon: <Pencil className="w-4 h-4" />,
        onClick: () => {
          setFolderActionMenu(null);
          setRenameFolder({ id: folder.id, name: folder.name });
        },
      },
      {
        label: isPublic ? 'Make Private' : 'Make Public',
        icon: isPublic ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />,
        onClick: () => handleFolderVisibilityToggle(folder),
      },
      {
        label: 'Copy Invite Link',
        icon: <Link className="w-4 h-4" />,
        onClick: () => handleFolderShareInvite(folder),
      },
      {
        label: 'Delete',
        icon: <Trash2 className="w-4 h-4" />,
        onClick: async () => {
          await handleFolderDelete(folder.id, folder.name);
          if (filesSelectedFolderId === folder.id) {
            setFilesSelectedFolderId(null);
            setSelectedIds([]);
          }
          if (homeFolderFilter === folder.id) {
            setHomeFolderFilter('all');
          }
        },
        destructive: true,
      },
    ];
  }, [handleFolderDelete, handleFolderVisibilityToggle, handleFolderShareInvite, filesSelectedFolderId, homeFolderFilter]);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.length === allFiles.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(allFiles.map(f => f.id));
    }
  }, [selectedIds.length, allFiles]);

  const handleClearSelection = useCallback(() => setSelectedIds([]), []);

  const handleToggleSelection = useCallback((id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }, []);

  const handleDownload = useCallback((file: TelegramFile) => {
    queueDownload(file.id, file.name, activeFolderId);
  }, [queueDownload, activeFolderId]);

  const handleDeleteFile = useCallback((file: TelegramFile) => {
    handleDeleteOp(file);
  }, [handleDeleteOp]);

  const handleOpenExternally = useCallback(async (file: TelegramFile) => {
    const toastId = toast.loading(`Opening ${file.name} in external app…`);
    try {
      const folderId = file.folder_id ?? activeFolderId;
      const path = await invoke<string>('cmd_get_preview', {
        messageId: file.id,
        folderId,
      });
      if (path) {
        await invoke('cmd_open_file_externally', { path });
        toast.dismiss(toastId);
      } else {
        toast.error(`Could not open ${file.name}`, { id: toastId });
      }
    } catch (error: any) {
      const errStr = error?.toString() || '';
      if (errStr.includes('VAULT_LOCKED') || errStr.includes('ENCRYPTED_PREVIEW_UNAVAILABLE')) {
        toast.dismiss(toastId);
        setPendingOpenFile(file);
        setVaultModalMode(vaultStatus?.exists ? 'unlock' : (cloudVaultStatus?.available ? 'restore' : 'create'));
        setVaultModalOpen(true);
        return;
      }
      toast.error(`Failed to open in external app: ${error}`, { id: toastId });
    }
  }, [activeFolderId, vaultStatus?.exists, cloudVaultStatus?.available]);

  const handleKeepOffline = useCallback(async (file: TelegramFile) => {
    const toastId = toast.loading(`Saving ${file.name} for offline use…`);
    const folderId = file.folder_id ?? activeFolderId;
    try {
      await invoke('cmd_get_preview', { messageId: file.id, folderId });
      await invoke('cmd_set_preview_pinned', { messageId: file.id, folderId, pinned: true });
      await Promise.all([refetchOfflineCache(), queryClient.invalidateQueries({ queryKey: ['files', activeFolderId] })]);
      toast.success(`${file.name} will be kept offline`, { id: toastId });
    } catch (error) {
      toast.error(`Could not keep this file offline: ${error}`, { id: toastId });
    }
  }, [activeFolderId, queryClient, refetchOfflineCache]);

  const handleRemoveOffline = useCallback(async (file: TelegramFile) => {
    const folderId = file.folder_id ?? activeFolderId;
    try {
      await invoke('cmd_set_preview_pinned', { messageId: file.id, folderId, pinned: false });
      await invoke('cmd_delete_preview_for_message', { messageId: file.id, folderId });
      await Promise.all([refetchOfflineCache(), queryClient.invalidateQueries({ queryKey: ['files', activeFolderId] })]);
      toast.success(`Removed the offline copy of ${file.name}`);
    } catch (error) {
      toast.error(`Could not remove the offline copy: ${error}`);
    }
  }, [activeFolderId, queryClient, refetchOfflineCache]);

  const handleRenameFile = useCallback((file: TelegramFile) => {
    setRenameFileTarget(file);
  }, []);

  const handleRenameSubmit = useCallback(async (newName: string) => {
    if (!renameFileTarget) return;
    const folderId = renameFileTarget.folder_id ?? activeFolderId;
    try {
      await invoke('cmd_rename_file', {
        messageId: renameFileTarget.id,
        folderId,
        newName,
      });
      updateFileQueryData(
        queryClient,
        folderId,
        new Set([renameFileTarget.id]),
        file => ({ ...file, name: newName }),
      );
      setFileRenames(prev => {
        const next = new Map(prev);
        next.set(renameFileTarget.id, newName);
        return next;
      });
      await queryClient.invalidateQueries({ queryKey: ['files'] });
      toast.success(`Renamed to "${newName}"`);
    } catch (e) {
      toast.error(`Failed to rename: ${e}`);
      throw e;
    }
  }, [renameFileTarget, activeFolderId, queryClient]);

  // Bulk share: open ShareDialog for all selected non-folder files
  const handleBulkShare = useCallback(() => {
    const shareFilesList = allFiles.filter(f => selectedIds.includes(f.id) && f.type !== 'folder');
    if (shareFilesList.length === 0) {
      toast.info('No shareable files selected (folders cannot be shared)');
      return;
    }
    setShareFiles(shareFilesList);
  }, [allFiles, selectedIds]);

  // ── Copy Telegram native t.me link ────────────────────────────────────
  const handleCopyTelegramLink = useCallback((file: TelegramFile) => {
    const folder = folders.find(f => f.id === file.folder_id) || folders.find(f => f.id === activeFolderId);
    const username = folder?.username || (folder as any)?.chat?.username || (folder as any)?.channel?.username;
    if (!username) {
      toast.error('Only available for public channels');
      return;
    }
    const url = `https://t.me/${username}/${file.id}`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success('Telegram link copied');
    }).catch(() => {
      toast.error('Failed to copy link');
    });
  }, [folders, activeFolderId]);

  const displayFiles = useMemo(() => {
    const files = fileRenames.size === 0
      ? allFiles
      : allFiles.map(f => (fileRenames.has(f.id) ? { ...f, name: fileRenames.get(f.id)! } : f));
    return sortTelegramFiles(files, settings.fileSortField, settings.fileSortDirection, settings.language);
  }, [allFiles, fileRenames, settings.fileSortField, settings.fileSortDirection, settings.language]);

  const homeFilteredFiles = useMemo(() => {
    let files = displayFiles;

    // 1. Folder filter
    if (homeFolderFilter === 'saved') {
      files = files.filter(f => f.folder_id == null);
    } else if (typeof homeFolderFilter === 'number') {
      files = files.filter(f => f.folder_id === homeFolderFilter);
    }

    // 2. Media type filter
    if (homeMediaTypeFilter === 'images') {
      files = files.filter(f => isImageFile(f.name, f.mime_type));
    } else if (homeMediaTypeFilter === 'videos') {
      files = files.filter(f => isVideoFile(f.name, f.mime_type));
    } else if (homeMediaTypeFilter === 'docs') {
      files = files.filter(f => {
        const ext = f.name.replace(/\.tdenc$/i, '').split('.').pop()?.toLowerCase() || '';
        const docExts = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'odt', 'ods', 'odp', 'csv', 'tsv', 'md'];
        const mime = f.mime_type?.toLowerCase() || '';
        return isPdfFile(f.name) || isTextOrDocFile(f.name) || docExts.includes(ext) || mime.includes('document') || mime.includes('pdf') || mime.includes('sheet') || mime.includes('presentation') || mime.includes('text/');
      });
    } else if (homeMediaTypeFilter === 'other') {
      files = files.filter(f => {
        const isImg = isImageFile(f.name, f.mime_type);
        const isVid = isVideoFile(f.name, f.mime_type);
        const ext = f.name.replace(/\.tdenc$/i, '').split('.').pop()?.toLowerCase() || '';
        const docExts = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'odt', 'ods', 'odp', 'csv', 'tsv', 'md'];
        const mime = f.mime_type?.toLowerCase() || '';
        const isDoc = isPdfFile(f.name) || isTextOrDocFile(f.name) || docExts.includes(ext) || mime.includes('document') || mime.includes('pdf') || mime.includes('sheet') || mime.includes('presentation') || mime.includes('text/');
        return !isImg && !isVid && !isDoc;
      });
    }

    if (mobileSearchQuery.trim()) {
      const q = mobileSearchQuery.trim().toLowerCase();
      files = files.filter(f => f.name.toLowerCase().includes(q));
    }

    return sortTelegramFiles(files, settings.fileSortField, settings.fileSortDirection, settings.language);
  }, [displayFiles, homeFolderFilter, homeMediaTypeFilter, mobileSearchQuery, settings.fileSortField, settings.fileSortDirection, settings.language]);

  const mediaTypeCounts = useMemo(() => {
    let baseFiles = displayFiles;
    if (homeFolderFilter === 'saved') {
      baseFiles = baseFiles.filter(f => f.folder_id == null);
    } else if (typeof homeFolderFilter === 'number') {
      baseFiles = baseFiles.filter(f => f.folder_id === homeFolderFilter);
    }

    let images = 0;
    let videos = 0;
    let docs = 0;
    let other = 0;
    const docExts = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'odt', 'ods', 'odp', 'csv', 'tsv', 'md'];

    for (const f of baseFiles) {
      const isImg = isImageFile(f.name, f.mime_type);
      const isVid = isVideoFile(f.name, f.mime_type);
      const ext = f.name.replace(/\.tdenc$/i, '').split('.').pop()?.toLowerCase() || '';
      const mime = f.mime_type?.toLowerCase() || '';
      const isDoc = isPdfFile(f.name) || isTextOrDocFile(f.name) || docExts.includes(ext) || mime.includes('document') || mime.includes('pdf') || mime.includes('sheet') || mime.includes('presentation') || mime.includes('text/');

      if (isImg) images++;
      else if (isVid) videos++;
      else if (isDoc) docs++;
      else other++;
    }

    return {
      all: baseFiles.length,
      images,
      videos,
      docs,
      other,
    };
  }, [displayFiles, homeFolderFilter]);

  const folderFileCounts = useMemo(() => {
    const counts = new Map<number | 'saved' | 'all', number>();
    counts.set('all', displayFiles.length);
    let savedCount = 0;
    for (const f of displayFiles) {
      if (f.folder_id == null) {
        savedCount++;
      } else {
        counts.set(f.folder_id, (counts.get(f.folder_id) ?? 0) + 1);
      }
    }
    counts.set('saved', savedCount);
    return counts;
  }, [displayFiles]);

  const unifiedTransferItems = useMemo(() => {
    const uploads = uploadQueue.map(item => {
      const filename = 'filename' in item ? (item as any).filename : (item.url || item.path).split(/[\\/]/).pop() || item.path;
      return {
        ...item,
        transferType: 'upload' as const,
        filename,
        currentBytes: item.uploadedBytes || 0,
        totalBytes: item.totalBytes || 0,
        speed: item.speedBytesPerSec || 0,
        folderName: item.folderId == null
          ? 'Saved Messages'
          : folders.find(f => f.id === item.folderId)?.name || 'Folder',
      };
    });

    const downloads = downloadQueue.map(item => {
      return {
        ...item,
        transferType: 'download' as const,
        filename: item.filename,
        currentBytes: item.downloadedBytes || 0,
        totalBytes: item.totalBytes || 0,
        speed: item.speedBytesPerSec || 0,
        folderName: 'Local Storage',
      };
    });

    const deletes = deleteQueue.map(item => {
      return {
        ...item,
        transferType: 'delete' as const,
        filename: item.filename,
        currentBytes: item.status === 'success' ? (item.totalBytes || 0) : 0,
        totalBytes: item.totalBytes || 0,
        speed: 0,
        folderName: item.folderId == null
          ? 'Saved Messages'
          : folders.find(f => f.id === item.folderId)?.name || 'Folder',
      };
    });

    let combined = [...uploads, ...downloads, ...deletes];
    if (transferTabFilter === 'uploads') {
      combined = uploads;
    } else if (transferTabFilter === 'downloads') {
      combined = downloads;
    } else if (transferTabFilter === 'deletions') {
      combined = deletes;
    } else if (transferTabFilter === 'active') {
      combined = combined.filter(item =>
        ['pending', 'uploading', 'downloading', 'deleting', 'encrypting', 'decrypting', 'verifying', 'waiting_for_network', 'waiting_for_unlock'].includes(item.status)
      );
    }
    return combined;
  }, [uploadQueue, downloadQueue, deleteQueue, transferTabFilter, folders]);

  const openDecryptedFileInApp = useCallback((file: TelegramFile, decryptedPath: string) => {
    const pathExt = decryptedPath.split('.').pop()?.toLowerCase() ?? '';
    const cleanName = file.name.replace(/\.tdenc$/i, '');
    const effectiveName = pathExt && pathExt !== 'bin' && pathExt !== 'tdenc'
      ? (cleanName.includes('.') ? cleanName : `${cleanName}.${pathExt}`)
      : cleanName;
    const resolvedFile: TelegramFile = {
      ...file,
      name: effectiveName,
      file_ext: pathExt || file.file_ext,
      encryption_state: 'encrypted_unlocked',
    };

    // Update queryClient file cache so the item in the list immediately reflects the unlocked file
    queryClient.setQueriesData<TelegramFile[]>({ queryKey: ['files'] }, (old) => {
      if (!old) return old;
      return old.map((f) => f.id === file.id ? { ...f, name: effectiveName, file_ext: pathExt || f.file_ext, encryption_state: 'encrypted_unlocked' } : f);
    });

    const isMedia = isMediaFile(effectiveName) || ['mp4', 'webm', 'ogg', 'mov', 'mkv', 'avi', 'mp3', 'wav', 'aac', 'flac', 'm4a'].includes(pathExt);
    const isPdf = isPdfFile(effectiveName) || pathExt === 'pdf';
    const isArchive = isArchiveFile(effectiveName) || ['zip', 'rar', '7z', 'tar', 'gz'].includes(pathExt);
    const isDoc = isTextOrDocFile(effectiveName) || ['txt', 'md', 'json', 'log', 'csv', 'xml', 'js', 'ts', 'py', 'rs'].includes(pathExt);
    const isImage = isImageFile(effectiveName) || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'avif'].includes(pathExt);

    if (isArchive) {
      setArchiveViewFile(resolvedFile);
      setPreviewFile(null);
      setPlayingFile(null);
      setPdfFile(null);
      setDocFile(null);
    } else if (isMedia) {
      setPlayingFile(resolvedFile);
      setPreviewFile(null);
      setPdfFile(null);
      setArchiveViewFile(null);
      setDocFile(null);
    } else if (isPdf) {
      setPdfFile(resolvedFile);
      setPreviewFile(null);
      setPlayingFile(null);
      setArchiveViewFile(null);
      setDocFile(null);
    } else if (isDoc) {
      setDocFile(resolvedFile);
      setPreviewFile(null);
      setPlayingFile(null);
      setPdfFile(null);
      setArchiveViewFile(null);
    } else if (isImage) {
      setPreviewFile(resolvedFile);
      setPlayingFile(null);
      setPdfFile(null);
      setArchiveViewFile(null);
      setDocFile(null);
    } else {
      setPreviewFile(resolvedFile);
      setPlayingFile(null);
      setPdfFile(null);
      setArchiveViewFile(null);
      setDocFile(null);
    }
  }, [queryClient]);

  const handlePreview = useCallback((file: TelegramFile, orderedFilesOrThumbnail?: TelegramFile[] | string | null, maybeThumbnail?: string | null) => {
    let orderedFiles: TelegramFile[] | undefined;
    let initialThumb: string | null = null;
    if (Array.isArray(orderedFilesOrThumbnail)) {
      orderedFiles = orderedFilesOrThumbnail;
      initialThumb = maybeThumbnail ?? null;
    } else if (typeof orderedFilesOrThumbnail === 'string') {
      initialThumb = orderedFilesOrThumbnail;
    }
    setPreviewInitialThumbnail(initialThumb);

    const sourceFolderId = file.folder_id ?? activeFolderId;
    void invoke('cmd_record_file_opened', {
      folderId: sourceFolderId,
      messageId: file.id,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.mime_type ?? null,
      fileExt: file.file_ext ?? null,
      createdAt: file.created_at ?? null,
      encryptionState: file.encryption_state ?? 'plain',
    }).then(() => queryClient.invalidateQueries({ queryKey: ['files', 'recents'] })).catch(() => {});

    const contextFiles = (orderedFiles || displayFiles).filter((f) => f.type !== 'folder');
    const contextIndex = contextFiles.findIndex((candidate) => sameFile(candidate, file));

    setPreviewContextFiles(contextFiles);
    setPreviewContextIndex(contextIndex);

    const isEncrypted = Boolean(
      file.name === 'Encrypted file' ||
      file.name.toLowerCase().endsWith('.tdenc') ||
      file.encryption_state === 'encrypted_key_missing' ||
      file.encryption_state === 'encrypted_locked' ||
      (file as any).is_encrypted
    );

    if (isEncrypted) {
      if (!vaultStatus?.is_unlocked) {
        setPendingOpenFile(file);
        setVaultModalMode(vaultStatus?.exists ? 'unlock' : (cloudVaultStatus?.available ? 'restore' : 'create'));
        setVaultModalOpen(true);
        return;
      }

      // Vault is unlocked! If the filename is still encrypted/masked, resolve it via cmd_get_preview
      if (file.name === 'Encrypted file' || file.name.toLowerCase().endsWith('.tdenc')) {
        const folderId = file.folder_id ?? activeFolderId;
        const cached = getCachedPreview(file.id, folderId);
        if (cached) {
          openDecryptedFileInApp(file, cached);
          return;
        }

        const toastId = toast.loading(`Preparing preview…`);
        void invoke<string>('cmd_get_preview', {
          messageId: file.id,
          folderId,
        }).then((decryptedPath) => {
          toast.dismiss(toastId);
          if (decryptedPath) {
            setCachedPreview(file.id, folderId, decryptedPath);
            openDecryptedFileInApp(file, decryptedPath);
          } else {
            setPreviewFile(file);
          }
        }).catch((err) => {
          toast.dismiss(toastId);
          const errStr = err?.toString() || '';
          if (errStr.includes('VAULT_LOCKED') || errStr.includes('ENCRYPTED_PREVIEW_UNAVAILABLE')) {
            setPendingOpenFile(file);
            setVaultModalMode(vaultStatus?.exists ? 'unlock' : (cloudVaultStatus?.available ? 'restore' : 'create'));
            setVaultModalOpen(true);
            return;
          }
          toast.error(`Preview failed: ${errStr}`);
        });
        return;
      }
    }

    const isMedia = isMediaFile(file.name);
    const isPdf = isPdfFile(file.name);
    const isArchive = isArchiveFile(file.name);
    const isDoc = isTextOrDocFile(file.name);

    if (isArchive) {
      setArchiveViewFile(file);
      setPreviewFile(null);
      setPlayingFile(null);
      setPdfFile(null);
      setDocFile(null);
    } else if (isMedia) {
      setPlayingFile(file);
      setPreviewFile(null);
      setPdfFile(null);
      setArchiveViewFile(null);
      setDocFile(null);
    } else if (isPdf) {
      setPdfFile(file);
      setPreviewFile(null);
      setPlayingFile(null);
      setArchiveViewFile(null);
      setDocFile(null);
    } else if (isDoc) {
      setDocFile(file);
      setPreviewFile(null);
      setPlayingFile(null);
      setPdfFile(null);
      setArchiveViewFile(null);
    } else if (isImageFile(file.name)) {
      setPreviewFile(file);
      setPlayingFile(null);
      setPdfFile(null);
      setArchiveViewFile(null);
      setDocFile(null);
    } else {
      setPreviewFile(file);
      setPlayingFile(null);
      setPdfFile(null);
      setArchiveViewFile(null);
      setDocFile(null);
    }
  }, [activeFolderId, displayFiles, queryClient, vaultStatus?.is_unlocked, vaultStatus?.exists, cloudVaultStatus?.available, openDecryptedFileInApp]);

  const handleUnlockOnlyThisFile = useCallback(async (passphrase: string) => {
    if (!pendingOpenFile) return;
    const file = pendingOpenFile;
    const folderId = file.folder_id ?? activeFolderId;
    const toastId = toast.loading(`Decrypting ${file.name}…`);
    try {
      const decryptedPath = await invoke<string>('cmd_get_preview', {
        messageId: file.id,
        folderId,
        passphrase,
      });

      if (!decryptedPath) {
        toast.error(`Could not decrypt ${file.name}`, { id: toastId });
        return;
      }

      setCachedPreview(file.id, folderId, decryptedPath);
      toast.success(`Decrypted ${file.name}`, { id: toastId });
      openDecryptedFileInApp(file, decryptedPath);
      setPendingOpenFile(null);
      setVaultModalOpen(false);
    } catch (err: any) {
      const errStr = err?.toString() || '';
      if (errStr.includes('WRONG_KEY') || errStr.includes('incorrect') || errStr.includes('failed to authenticate')) {
        toast.error('Incorrect passphrase', { id: toastId });
        throw new Error('Incorrect passphrase');
      }
      toast.error(`Decryption failed: ${errStr}`, { id: toastId });
      throw err;
    }
  }, [activeFolderId, openDecryptedFileInApp, pendingOpenFile]);

  const handleVaultUnlockSuccess = useCallback(async () => {
    if (pendingOpenFile) {
      const target = pendingOpenFile;
      setPendingOpenFile(null);
      try {
        const folderId = target.folder_id ?? activeFolderId;
        const decryptedPath = await invoke<string>('cmd_get_preview', {
          messageId: target.id,
          folderId,
        });
        if (decryptedPath) {
          setCachedPreview(target.id, folderId, decryptedPath);
          openDecryptedFileInApp(target, decryptedPath);
          return;
        }
      } catch {
        // fallback
      }
      setTimeout(() => {
        handlePreview(target);
      }, 300);
    }
  }, [activeFolderId, handlePreview, openDecryptedFileInApp, pendingOpenFile]);

  const navigatePreview = useCallback((step: 1 | -1) => {
    if (previewContextFiles.length === 0) return;

    const currentFileId = previewFile?.id ?? playingFile?.id ?? pdfFile?.id ?? archiveViewFile?.id ?? docFile?.id;
    if (!currentFileId) return;

    const currentIndex = previewContextFiles.findIndex((f) => f.id === currentFileId);
    if (currentIndex === -1) return;

    const nextIndex = (currentIndex + step + previewContextFiles.length) % previewContextFiles.length;
    const nextFile = previewContextFiles[nextIndex];
    if (!nextFile) return;

    setPreviewContextIndex(nextIndex);

    const isMedia = isMediaFile(nextFile.name);
    const isPdf = isPdfFile(nextFile.name);
    const isArchive = isArchiveFile(nextFile.name);
    const isDoc = isTextOrDocFile(nextFile.name);

    if (isArchive) {
      setArchiveViewFile(nextFile);
      setPreviewFile(null);
      setPlayingFile(null);
      setPdfFile(null);
      setDocFile(null);
    } else if (isMedia) {
      setPlayingFile(nextFile);
      setPreviewFile(null);
      setPdfFile(null);
      setArchiveViewFile(null);
      setDocFile(null);
    } else if (isPdf) {
      setPdfFile(nextFile);
      setPreviewFile(null);
      setPlayingFile(null);
      setArchiveViewFile(null);
      setDocFile(null);
    } else if (isDoc) {
      setDocFile(nextFile);
      setPreviewFile(null);
      setPlayingFile(null);
      setPdfFile(null);
      setArchiveViewFile(null);
    } else if (isImageFile(nextFile.name)) {
      setPreviewFile(nextFile);
      setPlayingFile(null);
      setPdfFile(null);
      setArchiveViewFile(null);
      setDocFile(null);
    } else {
      setPreviewFile(nextFile);
      setPlayingFile(null);
      setPdfFile(null);
      setArchiveViewFile(null);
      setDocFile(null);
    }
  }, [previewContextFiles, previewFile, playingFile, pdfFile, archiveViewFile, docFile]);

  const handleNextPreview = useCallback(() => {
    navigatePreview(1);
  }, [navigatePreview]);

  const handlePrevPreview = useCallback(() => {
    navigatePreview(-1);
  }, [navigatePreview]);

  const previewNeighbors = useMemo(() => {
    if (previewContextFiles.length === 0) {
      return { nextFile: null as TelegramFile | null, prevFile: null as TelegramFile | null };
    }
    const currentFile = previewFile ?? playingFile ?? pdfFile ?? archiveViewFile ?? docFile;
    if (!currentFile) {
      return { nextFile: null as TelegramFile | null, prevFile: null as TelegramFile | null };
    }
    const currentIdx = previewContextFiles.findIndex((file) => sameFile(file, currentFile));
    if (currentIdx === -1) {
      return { nextFile: null as TelegramFile | null, prevFile: null as TelegramFile | null };
    }
    const nextIdx = (currentIdx + 1) % previewContextFiles.length;
    const prevIdx = (currentIdx - 1 + previewContextFiles.length) % previewContextFiles.length;
    return {
      nextFile: previewContextFiles[nextIdx] ?? null,
      prevFile: previewContextFiles[prevIdx] ?? null,
    };
  }, [previewContextFiles, previewFile, playingFile, pdfFile, archiveViewFile, docFile]);

  const getBackLabel = useCallback((): string => {
    if (navHistory.length > 0) {
      const prev = navHistory[navHistory.length - 1];
      if (prev.tab === 'profile') return t('common.profile', 'Profile');
      if (prev.tab === 'settings') return t('common.settings', 'Settings');
      if (prev.tab === 'home') return t('common.home', 'Home');
      if (prev.tab === 'files') return t('common.files', 'Files');
      if (prev.tab === 'downloads') return t('common.transfers', 'Transfers');
    }
    return t('common.settings', 'Settings');
  }, [navHistory, t]);

  const handleBack = useCallback((): boolean => {
    // 0. Referral Modal & Global Top Modal Back Handler
    const androidWin = window as typeof window & { __tgReferralModalClose?: () => boolean };
    if (typeof window !== 'undefined' && androidWin.__tgReferralModalClose) {
      const handled = androidWin.__tgReferralModalClose();
      if (handled !== false) return true;
    }

    // 1. Media and document preview modals
    if (previewFile) { setPreviewFile(null); return true; }
    if (playingFile) { setPlayingFile(null); return true; }
    if (pdfFile) { setPdfFile(null); return true; }
    if (docFile) { setDocFile(null); return true; }
    if (archiveViewFile) { setArchiveViewFile(null); return true; }

    // 2. Full modals & dialogs
    if (showAutoBackupSheet) { setShowAutoBackupSheet(false); return true; }
    if (vaultModalOpen) { setVaultModalOpen(false); setPendingOpenFile(null); return true; }
    if (showPinModal !== 'none') { setShowPinModal('none'); return true; }
    if (showHelp) { setShowHelp(false); return true; }
    if (showProxyGuide) { setShowProxyGuide(false); return true; }
    if (supporterOfferTrigger) { setSupporterOfferTrigger(null); return true; }
    if (publicChannelTarget) { setPublicChannelTarget(null); return true; }

    // 3. Action sheets & menus
    if (showUploadDestinationSheet) { setShowUploadDestinationSheet(false); return true; }
    if (showSortSheet) { setShowSortSheet(false); return true; }
    if (folderActionMenu) { setFolderActionMenu(null); return true; }
    if (renameFolder) { setRenameFolder(null); return true; }
    if (renameFileTarget) { setRenameFileTarget(null); return true; }
    if (showCreateFolder) { setShowCreateFolder(false); return true; }
    if (shareFile) { setShareFile(null); return true; }
    if (shareFiles) { setShareFiles(null); return true; }
    if (isSidebarOpen) { setIsSidebarOpen(false); return true; }

    // 4. Multi-selection mode
    if (selectedIds.length > 0 || isHomeSelectionMode) {
      setSelectedIds([]);
      setIsHomeSelectionMode(false);
      return true;
    }

    // 5. Active search in folder or dashboard
    if (folderSearch.trim().length > 0) {
      setFolderSearch('');
      return true;
    }
    if (showMobileSearch || mobileSearchQuery.trim().length > 0) {
      setShowMobileSearch(false);
      setMobileSearchQuery('');
      return true;
    }

    // 6. Navigation History Stack (Handles Settings Subpages like Cloud Vault, Folders, Tab history)
    if (navHistory.length > 0) {
      const prev = navHistory[navHistory.length - 1];
      setNavHistory(h => h.slice(0, -1));
      setActiveTab(prev.tab);
      setSettingsSubpage(prev.settingsSubpage ?? null);
      setFilesSelectedFolderId(prev.filesSelectedFolderId ?? null);
      if (prev.activeFolderId !== undefined) {
        setActiveFolderId(prev.activeFolderId);
      }
      return true;
    }

    // 7. Fallbacks if history was empty but user is in a subpage or subfolder
    if (settingsSubpage !== null) {
      setSettingsSubpage(null);
      return true;
    }

    if (activeTab === 'files' && filesSelectedFolderId !== null) {
      setFilesSelectedFolderId(null);
      return true;
    }

    if (activeTab === 'home' && homeMediaTypeFilter !== 'all') {
      setHomeMediaTypeFilter('all');
      return true;
    }
    if (activeTab === 'home' && homeFolderFilter !== 'all') {
      setHomeFolderFilter('all');
      setActiveFolderId(null);
      return true;
    }

    if (activeTab !== 'home') {
      setActiveTab('home');
      setActiveFolderId(null);
      return true;
    }

    // 8. Root Home Screen -> Double-back to exit!
    const now = Date.now();
    if (lastBackPressRef.current > 0 && now - lastBackPressRef.current < 2000) {
      return false; // Tells Android to exit app!
    }

    lastBackPressRef.current = now;
    toast.info(t('common.press_back_again_to_exit', 'Press back again to exit'), { duration: 2000 });
    return true;
  }, [
    activeTab,
    archiveViewFile,
    docFile,
    filesSelectedFolderId,
    folderActionMenu,
    folderSearch,
    homeFolderFilter,
    homeMediaTypeFilter,
    isSidebarOpen,
    pdfFile,
    playingFile,
    previewFile,
    publicChannelTarget,
    renameFileTarget,
    renameFolder,
    selectedIds.length,
    setActiveFolderId,
    settingsSubpage,
    shareFile,
    shareFiles,
    showAutoBackupSheet,
    showCreateFolder,
    showHelp,
    showMobileSearch,
    mobileSearchQuery,
    showPinModal,
    showProxyGuide,
    showSortSheet,
    showUploadDestinationSheet,
    supporterOfferTrigger,
    t,
    navHistory,
    vaultModalOpen,
    isHomeSelectionMode,
  ]);

  useEffect(() => {
    const androidWindow = window as typeof window & { __telegramDriveHandleAndroidBack?: () => boolean };
    androidWindow.__telegramDriveHandleAndroidBack = handleBack;
    return () => {
      delete androidWindow.__telegramDriveHandleAndroidBack;
    };
  }, [handleBack]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const handled = handleBack();
        if (handled) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleBack]);

  if (isAppLocked) {
    return (
      <AppLockScreen
        customPinEnabled={settings.androidCustomPinEnabled}
        customPinHash={settings.androidCustomPinHash}
        biometricEnabled={settings.androidBiometricLock}
        isAndroid={isAndroid}
        onUnlock={() => {
          setIsAppLocked(false);
          if (isAndroid) {
            void invoke('cmd_android_unlock_app').catch(() => {});
          }
          try {
            localStorage.setItem('tg_drive_app_locked', 'false');
          } catch {}
          toast.success('App unlocked');
        }}
      />
    );
  }

  return (
    <div className={`absolute inset-0 flex flex-col bg-telegram-bg text-telegram-text overflow-hidden select-none font-sans ${isTelevision ? 'tv-shell' : ''}`}>
      {/* Premium Top Header */}
      <header className="flex items-center justify-between px-3 py-2.5 pt-[calc(0.75rem+env(safe-area-inset-top,16px))] bg-telegram-surface/90 border-b border-telegram-border/50 shadow-sm backdrop-blur-xl sticky top-0 z-40 md:ml-[280px]">
        {activeTab === 'files' && filesSelectedFolderId !== null ? (
          /* 1. Files Tab: In-Folder Header */
          <div className="flex items-center justify-between w-full gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <button
                type="button"
                onClick={() => handleBack()}
                className="flex items-center justify-center w-9 h-9 rounded-xl bg-telegram-hover/40 hover:bg-telegram-hover/70 active:scale-95 border border-telegram-border/40 text-telegram-text transition-all shrink-0 cursor-pointer"
                aria-label="Back to All Folders"
              >
                <ChevronLeft className="w-5 h-5 text-telegram-primary" />
              </button>
              <div className="min-w-0">
                <h1 className={`text-sm font-bold tracking-tight leading-tight truncate ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                  {filesSelectedFolderId === 'saved' ? t('common.saved_messages') : activeFolder}
                </h1>
                <p className="text-[10px] text-telegram-subtext font-medium leading-none mt-0.5 truncate">
                  {displayFiles.length} {displayFiles.length === 1 ? 'file' : 'files'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowUploadDestinationSheet(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-telegram-primary text-black hover:bg-telegram-primary/95 border border-telegram-primary/10 active:scale-95 transition-all duration-200 shadow-sm shadow-telegram-primary/20"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>{t('common.upload')}</span>
              </button>

              <button
                type="button"
                onClick={handleSyncFolders}
                disabled={isSyncing}
                className="flex items-center justify-center w-8 h-8 rounded-xl bg-telegram-hover/40 hover:bg-telegram-hover/70 active:scale-95 border border-telegram-border/40 text-telegram-subtext hover:text-telegram-text transition-all disabled:opacity-50"
                title={t('common.sync', 'Sync')}
                aria-label="Sync folder"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              </button>

              {typeof filesSelectedFolderId === 'number' && (
                <button
                  type="button"
                  onClick={() => {
                    const f = folders.find(folder => folder.id === filesSelectedFolderId);
                    if (f) setFolderActionMenu(f);
                  }}
                  className="flex items-center justify-center w-8 h-8 rounded-xl bg-telegram-hover/40 hover:bg-telegram-hover/70 active:scale-95 border border-telegram-border/40 text-telegram-subtext hover:text-telegram-text transition-all"
                  aria-label="Folder actions"
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ) : activeTab === 'files' && filesSelectedFolderId === null ? (
          /* 2. Files Tab: All Folders Root Header */
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-telegram-primary/15 text-telegram-primary flex items-center justify-center shrink-0 border border-telegram-primary/25">
                <Folder className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-bold text-telegram-text tracking-tight leading-tight">
                  {t('common.all_folders', 'All Folders')}
                </h1>
                <p className="text-[10px] text-telegram-subtext font-medium leading-none mt-0.5">
                  {folders.length + 1} locations • Cloud Explorer
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleOpenCreateFolder}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-telegram-primary text-black hover:bg-telegram-primary/95 border border-telegram-primary/10 active:scale-95 transition-all duration-200 shadow-sm shadow-telegram-primary/20"
                title={t('common.new_folder', 'New Folder')}
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>{t('common.new_folder', 'New Folder')}</span>
              </button>

              <button
                type="button"
                onClick={handleSyncFolders}
                disabled={isSyncing}
                className="flex items-center justify-center w-8 h-8 rounded-xl bg-telegram-hover/40 hover:bg-telegram-hover/70 active:scale-95 border border-telegram-border/40 text-telegram-subtext hover:text-telegram-text transition-all disabled:opacity-50"
                title={t('common.sync', 'Sync')}
                aria-label="Sync"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        ) : activeTab === 'downloads' ? (
          /* 3. Transfers / Downloads Tab Header */
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-telegram-primary/15 text-telegram-primary flex items-center justify-center shrink-0 border border-telegram-primary/25 shadow-sm">
                <ArrowUpDown className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-bold text-telegram-text tracking-tight leading-tight">
                  {t('common.transfers', 'Transfers')}
                </h1>
                <p className="text-[10px] text-telegram-subtext font-medium leading-none mt-0.5">
                  {activeUploadCount + activeDownloadCount + activeDeleteCount > 0
                    ? `${activeUploadCount + activeDownloadCount + activeDeleteCount} active${aggregateTransferSpeed > 0 ? ` • ${formatBytes(aggregateTransferSpeed)}/s` : ''}`
                    : networkWaitingCount > 0
                    ? `${networkWaitingCount} waiting for network`
                    : pausedUploadCount + pausedDownloadCount > 0
                    ? `${pausedUploadCount + pausedDownloadCount} paused`
                    : `${uploadQueue.length + downloadQueue.length + deleteQueue.length} items • Queue idle`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {uploadQueue.length + downloadQueue.length + deleteQueue.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    clearUploads();
                    clearDownloads();
                    clearDeletes();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-telegram-hover/40 text-telegram-subtext hover:text-telegram-text border border-telegram-border/40 active:scale-95 transition-all duration-200"
                  title="Clear Finished"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">Clear Finished</span>
                </button>
              )}
            </div>
          </div>
        ) : settingsSubpage !== null ? (
          /* Settings / Profile Subpage Header */
          <div className="flex items-center justify-between w-full gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <button
                type="button"
                onClick={() => handleBack()}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-telegram-hover/40 hover:bg-telegram-hover/70 active:scale-95 border border-telegram-border/40 text-telegram-primary text-xs font-semibold transition shrink-0 cursor-pointer"
                aria-label="Back"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>{getBackLabel()}</span>
              </button>
              <div className="min-w-0">
                <h1 className="text-sm font-bold text-telegram-text tracking-tight leading-tight truncate">
                  {settingsSubpage === 'account' && 'Account & Telegram Session'}
                  {settingsSubpage === 'pro_plans' && 'TG Drive Pro & Plans'}
                  {settingsSubpage === 'vault' && 'Cloud Vault & Encryption'}
                  {settingsSubpage === 'preferences' && t('common.preferences')}
                  {settingsSubpage === 'autobackup' && 'Auto-Backup & Sync'}
                  {settingsSubpage === 'security' && 'Device Privacy & App Lock'}
                  {settingsSubpage === 'transfers' && 'Transfer Reliability'}
                  {settingsSubpage === 'storage' && t('settings.offline_cache')}
                  {settingsSubpage === 'diagnostics' && t('settings.connection_diagnostics')}
                  {settingsSubpage === 'proxy' && t('common.proxy')}
                  {settingsSubpage === 'media' && 'Media & Playback'}
                  {settingsSubpage === 'supporter' && 'Privacy & Supporter'}
                  {settingsSubpage === 'updates' && 'Software Updates & Version'}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {settingsSubpage === 'pro_plans' && (
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                  mobileLicense?.isLicensed
                    ? mobileLicense?.planType === 'trial'
                      ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                      : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                }`}>
                  {mobileLicense?.isLicensed ? (mobileLicense.planType === 'trial' ? '🎁 Trial' : '✓ Pro Active') : '⚡ Free Plan'}
                </span>
              )}
              {settingsSubpage === 'account' && (
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${isConnected ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                  {isConnected ? '● MTProto Active' : '● Offline'}
                </span>
              )}
              {settingsSubpage === 'updates' && (
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${updateAvailable ? 'bg-amber-500/15 text-amber-400 border-amber-500/30 animate-pulse' : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'}`}>
                  {updateAvailable ? `v${updateVersion} Available` : `v${appVersion} (Latest)`}
                </span>
              )}
              {settingsSubpage === 'vault' && (
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border ${vaultStatus?.is_unlocked ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/15 text-amber-400 border-amber-500/30'}`}>
                  {vaultStatus?.is_unlocked ? '🔓 Unlocked' : '🔒 Locked'}
                </span>
              )}
              {settingsSubpage === 'autobackup' && (
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border ${syncSettings.data?.enabled ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-telegram-hover/40 text-telegram-subtext border-telegram-border/50'}`}>
                  {syncSettings.data?.enabled ? 'Active' : 'Off'}
                </span>
              )}
            </div>
          </div>
        ) : activeTab === 'settings' ? (
          /* Root Settings Header */
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-telegram-primary/15 text-telegram-primary border border-telegram-primary/20 shrink-0">
                <SettingsIcon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-bold text-telegram-text tracking-tight leading-tight">
                  {t('common.settings')}
                </h1>
                <p className="text-[10px] text-telegram-subtext font-medium leading-none mt-0.5">
                  Preferences, security &amp; connections
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-telegram-hover/40 border border-telegram-border/30 text-[10px] font-mono shrink-0">
              <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className={isConnected ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>
                {isConnected ? 'Connected' : 'Offline'}
              </span>
            </div>
          </div>
        ) : activeTab === 'profile' ? (
          /* Profile Tab Header */
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-md shrink-0">
                {userProfile?.firstName ? userProfile.firstName.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-bold text-telegram-text tracking-tight leading-tight truncate">
                  {userProfile ? `${userProfile.firstName} ${userProfile.lastName || ''}`.trim() : 'My Profile'}
                </h1>
                <p className="text-[10px] text-telegram-subtext font-medium leading-none mt-0.5 truncate">
                  {userProfile?.username ? `@${userProfile.username}` : 'Telegram Account'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-telegram-hover/40 border border-telegram-border/30 text-[10px] font-mono shrink-0">
              <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className={isConnected ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>
                {isConnected ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
        ) : (
          /* 5. Home Tab Header (Default) */
          <div className="flex items-center justify-between w-full">
            <div className="flex flex-col justify-center">
              <h1 className="brand-header-title text-[1.15rem]">
                <span className="brand-title-telegram">Telegram</span>
                <span className="brand-title-drive">Drive</span>
                <span className="brand-title-dot" />
              </h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <p className="text-[10px] text-telegram-subtext font-medium leading-none tracking-wide">
                  Cloud Vault • Online
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowMobileSearch(prev => !prev)}
                className={`flex items-center justify-center w-8 h-8 rounded-xl border transition-all active:scale-95 ${
                  showMobileSearch || mobileSearchQuery
                    ? 'bg-telegram-primary text-black border-telegram-primary shadow-sm'
                    : 'bg-telegram-hover/40 hover:bg-telegram-hover/70 text-telegram-subtext hover:text-telegram-text border-telegram-border/40'
                }`}
                title={t('common.search', 'Search')}
                aria-label={t('common.search', 'Search')}
              >
                <Search className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setShowUploadDestinationSheet(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-telegram-primary text-black hover:bg-telegram-primary/95 border border-telegram-primary/10 active:scale-95 transition-all duration-200 shadow-sm shadow-telegram-primary/20"
                title={t('common.upload', 'Upload')}
                aria-label={t('common.upload', 'Upload')}
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>{t('common.upload', 'Upload')}</span>
              </button>

              <button
                type="button"
                onClick={handleSyncFolders}
                disabled={isSyncing}
                className="flex items-center justify-center w-8 h-8 rounded-xl bg-telegram-hover/40 hover:bg-telegram-hover/70 active:scale-95 border border-telegram-border/40 text-telegram-subtext hover:text-telegram-text transition-all disabled:opacity-50"
                title={t('common.sync', 'Sync')}
                aria-label={t('common.sync', 'Sync')}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        )}

        {/* Expandable Mobile Search Bar */}
        {showMobileSearch && (
          <div className="pt-2 px-1">
            <div className="relative flex items-center">
              <Search className="absolute left-3 w-3.5 h-3.5 text-telegram-subtext pointer-events-none" />
              <input
                type="text"
                value={mobileSearchQuery}
                onChange={(e) => setMobileSearchQuery(e.target.value)}
                placeholder={t('files.search_placeholder', 'Search files by name...')}
                autoFocus
                className="w-full pl-8 pr-8 py-1.5 text-xs rounded-xl bg-telegram-surface border border-telegram-border/60 text-telegram-text placeholder-telegram-subtext/60 focus:outline-none focus:border-telegram-primary/80 transition-all shadow-inner"
              />
              {mobileSearchQuery && (
                <button
                  type="button"
                  onClick={() => setMobileSearchQuery('')}
                  className="absolute right-2.5 p-1 text-telegram-subtext hover:text-telegram-text"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Viewport Container */}
      <main ref={scrollRootRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-4 pb-32 scroll-smooth md:ml-[280px] md:px-8 lg:px-12">
        {activeTab === 'home' && (
          <div className="space-y-4">
            {/* Structured Home Drive Control Bar */}
            <div className="bg-telegram-surface/90 rounded-2xl border border-telegram-border/50 shadow-sm backdrop-blur-md overflow-hidden">
              {/* Row 1: Folder Selector Carousel */}
              <div className="px-3 pt-2.5 pb-2 border-b border-telegram-border/20">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1 scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  {/* All Folders Pill */}
                  <button
                    type="button"
                    onClick={() => {
                      setHomeFolderFilter('all');
                      setActiveFolderId(null);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all duration-200 cursor-pointer ${
                      homeFolderFilter === 'all'
                        ? 'bg-telegram-primary text-black shadow-sm font-bold'
                        : 'bg-telegram-bg/60 text-telegram-subtext hover:text-telegram-text hover:bg-telegram-hover/50 border border-telegram-border/30'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5 shrink-0" />
                    <span>{t('common.all', 'All')}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-medium ${
                      homeFolderFilter === 'all'
                        ? 'bg-black/20 text-black'
                        : 'bg-telegram-border/40 text-telegram-subtext'
                    }`}>
                      {folderFileCounts.get('all') ?? displayFiles.length}
                    </span>
                  </button>

                  {/* Saved Messages Pill */}
                  <button
                    type="button"
                    onClick={() => {
                      setHomeFolderFilter('saved');
                      setActiveFolderId(null);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all duration-200 cursor-pointer ${
                      homeFolderFilter === 'saved'
                        ? 'bg-telegram-primary text-black shadow-sm font-bold'
                        : 'bg-telegram-bg/60 text-telegram-subtext hover:text-telegram-text hover:bg-telegram-hover/50 border border-telegram-border/30'
                    }`}
                  >
                    <Bookmark className="w-3.5 h-3.5 shrink-0" />
                    <span>{t('common.saved_messages', 'Saved Messages')}</span>
                    {(folderFileCounts.get('saved') ?? 0) > 0 && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-medium ${
                        homeFolderFilter === 'saved'
                          ? 'bg-black/20 text-black'
                          : 'bg-telegram-border/40 text-telegram-subtext'
                      }`}>
                        {folderFileCounts.get('saved')}
                      </span>
                    )}
                  </button>

                  {/* Custom Folders */}
                  {folders.map(folder => {
                    const isSelected = homeFolderFilter === folder.id;
                    const count = folderFileCounts.get(folder.id);
                    return (
                      <button
                        key={folder.id}
                        type="button"
                        onClick={() => {
                          setHomeFolderFilter(folder.id);
                          setActiveFolderId(folder.id);
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? 'bg-telegram-primary text-black shadow-sm font-bold'
                            : 'bg-telegram-bg/60 text-telegram-subtext hover:text-telegram-text hover:bg-telegram-hover/50 border border-telegram-border/30'
                        }`}
                      >
                        <Folder className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate max-w-[120px]">{folder.name}</span>
                        {count !== undefined && count > 0 && (
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-medium ${
                            isSelected
                              ? 'bg-black/20 text-black'
                              : 'bg-telegram-border/40 text-telegram-subtext'
                          }`}>
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Row 2: Selected Folder Info & Select Toolbar */}
              <div className="flex items-center justify-between p-2.5 px-3 border-b border-telegram-border/30 bg-telegram-bg/15">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-telegram-primary/15 text-telegram-primary flex items-center justify-center shrink-0 border border-telegram-primary/25">
                    {homeFolderFilter === 'all' ? (
                      <Layers className="w-3.5 h-3.5" />
                    ) : homeFolderFilter === 'saved' ? (
                      <Bookmark className="w-3.5 h-3.5" />
                    ) : (
                      <Folder className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-telegram-text truncate block leading-tight">
                      {homeFolderFilter === 'all'
                        ? t('common.all_files', 'All Files')
                        : homeFolderFilter === 'saved'
                        ? t('common.saved_messages', 'Saved Messages')
                        : (folders.find(f => f.id === homeFolderFilter)?.name || 'Folder')}
                    </span>
                    <span className="text-[10px] text-telegram-subtext font-medium block leading-none mt-0.5">
                      {homeFilteredFiles.length} {homeFilteredFiles.length === 1 ? 'file' : 'files'}
                      {homeFolderFilter === 'all' ? ' • All' : ''}
                    </span>
                  </div>
                </div>

                {/* Right: Select & Grid/List Controls */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (isHomeSelectionMode || selectedIds.length > 0) {
                        handleClearSelection();
                      }
                      setIsHomeSelectionMode(prev => !prev);
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-95 cursor-pointer ${
                      isHomeSelectionMode || selectedIds.length > 0
                        ? 'bg-telegram-primary text-black font-bold shadow-sm'
                        : 'bg-telegram-surface/90 text-telegram-subtext hover:text-telegram-text border border-telegram-border/40'
                    }`}
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>{selectedIds.length > 0 ? `${selectedIds.length} selected` : 'Select'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => updateSetting('viewMode', settings.viewMode === 'list' ? 'grid' : 'list')}
                    className="flex items-center justify-center w-7 h-7 rounded-xl bg-telegram-surface/90 text-telegram-subtext hover:text-telegram-text border border-telegram-border/40 active:scale-95 transition-all cursor-pointer"
                    aria-label={settings.viewMode === 'list' ? 'Switch to Grid View' : 'Switch to List View'}
                    title={settings.viewMode === 'list' ? 'Switch to Grid View' : 'Switch to List View'}
                  >
                    {settings.viewMode === 'list' ? <LayoutGrid className="w-3.5 h-3.5" /> : <List className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowSortSheet(true)}
                    className="flex items-center justify-center w-7 h-7 rounded-xl bg-telegram-surface/90 text-telegram-subtext hover:text-telegram-text border border-telegram-border/40 active:scale-95 transition-all cursor-pointer"
                    aria-label={t('common.sort_files', 'Sort files')}
                    title={t('common.sort_files', 'Sort files')}
                  >
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </button>

                  {(isHomeSelectionMode || selectedIds.length > 0) && (
                    <>
                      <button
                        type="button"
                        onClick={handleSelectAll}
                        className="flex items-center gap-1 px-2 py-1.5 rounded-xl text-[11px] font-semibold bg-telegram-surface/90 text-telegram-subtext hover:text-telegram-text border border-telegram-border/40 active:scale-95 transition-all cursor-pointer"
                      >
                        <Check className="w-3 h-3" />
                        <span>{t('common.all', 'All')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleClearSelection();
                          setIsHomeSelectionMode(false);
                        }}
                        className="flex items-center gap-1 px-2 py-1.5 rounded-xl text-[11px] font-semibold bg-telegram-surface/90 text-telegram-subtext hover:text-telegram-text border border-telegram-border/40 active:scale-95 transition-all cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                        <span>Clear</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Row 3: Media Type Filter Chips (Under Select!) */}
              <div className="px-3 py-2 bg-telegram-bg/25">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1 scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  {/* All Types */}
                  <button
                    type="button"
                    onClick={() => setHomeMediaTypeFilter('all')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 transition-all duration-200 cursor-pointer ${
                      homeMediaTypeFilter === 'all'
                        ? 'bg-telegram-primary/20 text-telegram-primary border border-telegram-primary/50 font-bold shadow-sm'
                        : 'bg-telegram-hover/20 text-telegram-subtext hover:text-telegram-text border border-transparent'
                    }`}
                  >
                    <LayoutGrid className="w-3 h-3 shrink-0" />
                    <span>{t('common.all', 'All')}</span>
                    <span className="text-[10px] opacity-75 font-mono">({mediaTypeCounts.all})</span>
                  </button>

                  {/* Images */}
                  <button
                    type="button"
                    onClick={() => setHomeMediaTypeFilter('images')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 transition-all duration-200 cursor-pointer ${
                      homeMediaTypeFilter === 'images'
                        ? 'bg-telegram-primary/20 text-telegram-primary border border-telegram-primary/50 font-bold shadow-sm'
                        : 'bg-telegram-hover/20 text-telegram-subtext hover:text-telegram-text border border-transparent'
                    }`}
                  >
                    <ImageIcon className="w-3 h-3 shrink-0" />
                    <span>{t('common.images', 'Images')}</span>
                    <span className="text-[10px] opacity-75 font-mono">({mediaTypeCounts.images})</span>
                  </button>

                  {/* Videos */}
                  <button
                    type="button"
                    onClick={() => setHomeMediaTypeFilter('videos')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 transition-all duration-200 cursor-pointer ${
                      homeMediaTypeFilter === 'videos'
                        ? 'bg-telegram-primary/20 text-telegram-primary border border-telegram-primary/50 font-bold shadow-sm'
                        : 'bg-telegram-hover/20 text-telegram-subtext hover:text-telegram-text border border-transparent'
                    }`}
                  >
                    <Film className="w-3 h-3 shrink-0" />
                    <span>{t('common.videos', 'Videos')}</span>
                    <span className="text-[10px] opacity-75 font-mono">({mediaTypeCounts.videos})</span>
                  </button>

                  {/* Documents */}
                  <button
                    type="button"
                    onClick={() => setHomeMediaTypeFilter('docs')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 transition-all duration-200 cursor-pointer ${
                      homeMediaTypeFilter === 'docs'
                        ? 'bg-telegram-primary/20 text-telegram-primary border border-telegram-primary/50 font-bold shadow-sm'
                        : 'bg-telegram-hover/20 text-telegram-subtext hover:text-telegram-text border border-transparent'
                    }`}
                  >
                    <FileText className="w-3 h-3 shrink-0" />
                    <span>{t('common.documents', 'Documents')}</span>
                    <span className="text-[10px] opacity-75 font-mono">({mediaTypeCounts.docs})</span>
                  </button>

                  {/* Other */}
                  <button
                    type="button"
                    onClick={() => setHomeMediaTypeFilter('other')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 transition-all duration-200 cursor-pointer ${
                      homeMediaTypeFilter === 'other'
                        ? 'bg-telegram-primary/20 text-telegram-primary border border-telegram-primary/50 font-bold shadow-sm'
                        : 'bg-telegram-hover/20 text-telegram-subtext hover:text-telegram-text border border-transparent'
                    }`}
                  >
                    <FileCode className="w-3 h-3 shrink-0" />
                    <span>{t('common.other', 'Other')}</span>
                    <span className="text-[10px] opacity-75 font-mono">({mediaTypeCounts.other})</span>
                  </button>
                </div>
              </div>
            </div>

            {continueWatching.length > 0 && (
              <section className="rounded-2xl border border-telegram-border/30 bg-telegram-hover/20 p-3" aria-labelledby="continue-watching-title">
                <h2 id="continue-watching-title" className="mb-2 text-[10px] font-bold uppercase tracking-wide text-telegram-primary">Continue watching</h2>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  {continueWatching.map(({ entry, file, progress }) => (
                    <button key={entry.mediaId} type="button" onClick={() => handlePreview(file)} className="w-44 shrink-0 rounded-xl border border-telegram-border/30 bg-telegram-bg/50 p-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-telegram-primary">
                      <span className="block truncate text-xs font-semibold text-telegram-text">{settings.androidPrivateMediaMetadata ? file.name : entry.title}</span>
                      <span className="mt-1 block text-[10px] text-telegram-subtext">Resume at {Math.floor(entry.positionMs / 60_000)}:{String(Math.floor(entry.positionMs / 1000) % 60).padStart(2, '0')}</span>
                      <span className="mt-2 block h-1 overflow-hidden rounded-full bg-telegram-border/40"><span className="block h-full rounded-full bg-telegram-primary" style={{ width: `${progress}%` }} /></span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Dynamic Real File List */}
            <TouchFileList
              files={homeFilteredFiles}
              isLoading={isFilesLoading}
              onDownload={handleDownload}
              onDelete={handleDeleteFile}
              onPreview={handlePreview}
              onRename={handleRenameFile}
              onShare={setShareFile}
              onCopyTelegramLink={handleCopyTelegramLink}
              onKeepOffline={handleKeepOffline}
              onRemoveOffline={handleRemoveOffline}
              onOpenExternally={handleOpenExternally}
              onBulkShare={handleBulkShare}
              selectedIds={selectedIds}
              onToggleSelection={handleToggleSelection}
              onSelectAll={handleSelectAll}
              onClearSelection={handleClearSelection}
              onBulkDelete={handleBulkDelete}
              onBulkDownload={handleBulkDownload}
              onBulkMove={handleBulkMove}
              folders={folders}
              activeFolderId={homeFolderFilter === 'all' || homeFolderFilter === 'saved' ? null : homeFolderFilter}
              scrollElementRef={scrollRootRef}
              disableVirtualization={isTelevision}
              viewMode={settings.viewMode ?? 'grid'}
              onViewModeChange={(m) => updateSetting('viewMode', m)}
              hideToolbar={true}
              selectionMode={isHomeSelectionMode}
              onSelectionModeChange={setIsHomeSelectionMode}
            />
          </div>
        )}

        {activeTab === 'files' && (
          <div className="space-y-4">
            {filesSelectedFolderId === null ? (
              /* All Folders View */
              <div className="space-y-4">
                {/* Folder Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 text-telegram-subtext absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={folderSearch}
                    onChange={e => setFolderSearch(e.target.value)}
                    placeholder="Search folders or channels..."
                    className="w-full bg-telegram-surface/80 border border-telegram-border/50 rounded-2xl pl-10 pr-8 py-2.5 text-xs text-telegram-text placeholder:text-telegram-subtext/60 focus:outline-none focus:border-telegram-primary/60 shadow-sm transition-colors"
                  />
                  {folderSearch && (
                    <button
                      onClick={() => setFolderSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-telegram-subtext hover:text-telegram-text p-1 rounded-full"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Section: Primary Storage */}
                <div>
                  <p className="text-[11px] font-bold text-telegram-subtext/80 uppercase tracking-wider px-1 mb-2 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-telegram-primary" />
                    Primary Storage
                  </p>
                  <button
                    type="button"
                    onClick={() => handleOpenFolderInFilesTab('saved')}
                    className="w-full group text-left p-3.5 rounded-2xl transition-all duration-200 bg-telegram-surface/85 hover:bg-telegram-hover/30 border border-telegram-border/50 hover:border-telegram-primary/30 flex items-center justify-between shadow-sm active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-telegram-primary/15 text-telegram-primary border border-telegram-primary/25 flex items-center justify-center shrink-0">
                        <Bookmark className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-telegram-text truncate leading-tight group-hover:text-telegram-primary transition-colors">
                          {i18n.t("common.saved_messages")}
                        </p>
                        <p className="text-[10px] text-telegram-subtext mt-0.5 truncate">
                          Default Cloud Vault • Root media &amp; files
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-telegram-subtext group-hover:text-telegram-primary transition-colors">
                      <span className="text-[10px] font-medium hidden sm:inline">Open</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </button>
                </div>

                {/* Section: Custom Folders & Channels */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <p className="text-[11px] font-bold text-telegram-subtext/80 uppercase tracking-wider flex items-center gap-1.5">
                      <Folder className="w-3.5 h-3.5 text-telegram-primary" />
                      Folders &amp; Channels ({filteredFolders.length})
                    </p>
                    {/* Grid / List View Switcher for Folders & Channels */}
                    <div className="flex items-center gap-1 bg-telegram-surface/90 p-0.5 rounded-xl border border-telegram-border/40 shadow-sm">
                      <button
                        type="button"
                        onClick={() => handleFolderViewModeChange('grid')}
                        className={`p-1.5 rounded-lg transition-all ${
                          folderViewMode === 'grid'
                            ? 'bg-telegram-primary text-black font-bold shadow-sm'
                            : 'text-telegram-subtext hover:text-telegram-text'
                        }`}
                        aria-label="Grid view"
                        title="Grid view"
                      >
                        <LayoutGrid className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFolderViewModeChange('list')}
                        className={`p-1.5 rounded-lg transition-all ${
                          folderViewMode === 'list'
                            ? 'bg-telegram-primary text-black font-bold shadow-sm'
                            : 'text-telegram-subtext hover:text-telegram-text'
                        }`}
                        aria-label="List view"
                        title="List view"
                      >
                        <List className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {filteredFolders.length === 0 ? (
                    <div className="text-center py-8 px-4 rounded-2xl bg-telegram-surface/50 border border-dashed border-telegram-border/50">
                      <Folder className="w-8 h-8 text-telegram-subtext/30 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-telegram-text">
                        {folderSearch ? 'No folders match search' : 'No custom channels or folders'}
                      </p>
                      <p className="text-[10px] text-telegram-subtext mt-1 max-w-xs mx-auto">
                        {folderSearch ? 'Try a different search term' : 'Create folders to organize videos, photos, and files into categories.'}
                      </p>
                      {!folderSearch && (
                        <button
                          onClick={handleOpenCreateFolder}
                          className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-telegram-primary text-black font-bold text-xs shadow-sm active:scale-95 transition-all"
                        >
                          <FolderPlus className="w-3.5 h-3.5" />
                          Create First Folder
                        </button>
                      )}
                    </div>
                  ) : folderViewMode === 'grid' ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {filteredFolders.map(folder => {
                        const isPublic = folder.is_public || !!folder.username;
                        return (
                          <div
                            key={folder.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => handleOpenFolderInFilesTab(folder.id)}
                            onKeyDown={e => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleOpenFolderInFilesTab(folder.id);
                              }
                            }}
                            className="group relative flex flex-col justify-between p-3 rounded-2xl bg-telegram-surface/90 border border-telegram-border/40 hover:border-telegram-primary/50 hover:bg-telegram-hover/30 shadow-sm backdrop-blur-sm transition-all duration-200 cursor-pointer active:scale-[0.98]"
                          >
                            {/* Card Top Row: Badge + Action Button */}
                            <div className="flex items-center justify-between gap-1.5 mb-2">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold border ${
                                isPublic
                                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
                                  : 'bg-amber-500/15 text-amber-400 border-amber-500/25'
                              }`}>
                                {isPublic ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                                <span>{isPublic ? 'Public' : 'Private'}</span>
                              </span>

                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  setFolderActionMenu(folder);
                                }}
                                className="p-1 rounded-lg text-telegram-subtext hover:text-telegram-text hover:bg-telegram-hover/60 active:scale-90 transition-all shrink-0"
                                aria-label={`Actions for ${folder.name}`}
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                            </div>

                            {/* Center Icon & Folder Visual */}
                            <div className="flex items-center justify-center my-1.5 py-1">
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-md transition-transform duration-200 group-hover:scale-105 ${
                                isPublic
                                  ? 'bg-gradient-to-br from-emerald-500/20 to-teal-500/10 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-gradient-to-br from-amber-500/20 to-orange-500/10 text-amber-400 border border-amber-500/30'
                              }`}>
                                <Folder className="w-6 h-6" />
                              </div>
                            </div>

                            {/* Bottom: Folder Name & Channel Username */}
                            <div className="min-w-0 mt-1.5 text-left">
                              <p className="text-xs font-bold text-telegram-text truncate leading-tight group-hover:text-telegram-primary transition-colors">
                                {folder.name}
                              </p>
                              <p className="text-[10px] text-telegram-subtext truncate mt-0.5 font-mono">
                                {isPublic
                                  ? (folder.username ? `@${folder.username}` : 'Public Channel')
                                  : 'Private Channel'}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {filteredFolders.map(folder => {
                        const isPublic = folder.is_public || !!folder.username;
                        return (
                          <div
                            key={folder.id}
                            className="group rounded-2xl transition-all duration-200 bg-telegram-surface/85 hover:bg-telegram-hover/30 border border-telegram-border/50 hover:border-telegram-primary/30 flex items-center justify-between p-3 shadow-sm active:scale-[0.99]"
                          >
                            <button
                              type="button"
                              onClick={() => handleOpenFolderInFilesTab(folder.id)}
                              className="flex-1 flex items-center gap-3 text-left min-w-0"
                            >
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                isPublic
                                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                              }`}>
                                {isPublic ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold text-telegram-text truncate leading-tight group-hover:text-telegram-primary transition-colors">
                                  {folder.name}
                                </p>
                                <p className="text-[10px] text-telegram-subtext mt-0.5 truncate">
                                  {isPublic ? (folder.username ? `@${folder.username}` : 'Public Channel') : 'Private Channel'}
                                </p>
                              </div>
                            </button>

                            <div className="flex items-center gap-1 shrink-0 ml-2">
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  setFolderActionMenu(folder);
                                }}
                                className="p-1.5 rounded-xl text-telegram-subtext hover:text-telegram-text hover:bg-telegram-hover/60 active:scale-90 transition-all"
                                aria-label="Folder actions"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Inside Selected Folder View - Clean and directly showing files */
              <div className="space-y-4">
                {/* Real File & Media List inside this folder */}
                <TouchFileList
                  files={displayFiles}
                  isLoading={isFilesLoading}
                  onDownload={handleDownload}
                  onDelete={handleDeleteFile}
                  onPreview={handlePreview}
                  onRename={handleRenameFile}
                  onShare={setShareFile}
                  onCopyTelegramLink={handleCopyTelegramLink}
                  onKeepOffline={handleKeepOffline}
                  onRemoveOffline={handleRemoveOffline}
                  onOpenExternally={handleOpenExternally}
                  onBulkShare={handleBulkShare}
                  selectedIds={selectedIds}
                  onToggleSelection={handleToggleSelection}
                  onSelectAll={handleSelectAll}
                  onClearSelection={handleClearSelection}
                  onBulkDelete={handleBulkDelete}
                  onBulkDownload={handleBulkDownload}
                  onBulkMove={handleBulkMove}
                  folders={folders}
                  activeFolderId={activeFolderId}
                  scrollElementRef={scrollRootRef}
                  disableVirtualization={isTelevision}
                  viewMode={settings.viewMode ?? 'grid'}
                  onViewModeChange={(m) => updateSetting('viewMode', m)}
                  onOpenSort={() => setShowSortSheet(true)}
                />
              </div>
            )}
          </div>
        )}

        {activeTab === 'downloads' && (
          <div className="space-y-3.5" aria-label="Transfer queue">
            {/* 1. Top Realtime Transfer Dashboard Banner */}
            <div className="bg-telegram-surface/90 rounded-2xl border border-telegram-border/50 shadow-sm backdrop-blur-md p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-telegram-primary/25 to-telegram-primary/10 text-telegram-primary flex items-center justify-center shrink-0 border border-telegram-primary/30 shadow-sm">
                    <ArrowUpDown className={`w-5 h-5 ${activeUploadCount + activeDownloadCount + activeDeleteCount > 0 ? 'animate-pulse' : ''}`} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-telegram-text tracking-tight truncate">
                      Transfer Manager
                    </h2>
                    <div className="flex items-center gap-1.5 text-[11px] text-telegram-subtext mt-0.5">
                      <span className="flex items-center gap-1">
                        <span className={`w-2 h-2 rounded-full ${activeUploadCount + activeDownloadCount + activeDeleteCount > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-telegram-subtext/40'}`} />
                        {activeUploadCount + activeDownloadCount + activeDeleteCount > 0
                          ? `${activeUploadCount + activeDownloadCount + activeDeleteCount} active`
                          : 'Queue idle'}
                      </span>
                      {aggregateTransferSpeed > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-telegram-primary font-bold font-mono">
                            ⚡ {formatBytes(aggregateTransferSpeed)}/s
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Batch Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {activeUploadCount + activeDownloadCount > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        pauseUploads();
                        pauseDownloads();
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-telegram-hover/40 hover:bg-telegram-hover/70 text-telegram-subtext hover:text-telegram-text border border-telegram-border/40 active:scale-95 transition-all cursor-pointer"
                      title="Pause All"
                    >
                      <Pause className="w-3.5 h-3.5 text-amber-400" />
                      <span className="hidden xs:inline">Pause</span>
                    </button>
                  )}
                  {pausedUploadCount + pausedDownloadCount > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        resumeUploads();
                        resumeDownloads();
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-telegram-primary/15 text-telegram-primary hover:bg-telegram-primary/25 border border-telegram-primary/30 active:scale-95 transition-all cursor-pointer"
                      title="Resume All"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span className="hidden xs:inline">Resume</span>
                    </button>
                  )}
                  {(uploadQueue.length > 0 || downloadQueue.length > 0 || deleteQueue.length > 0) && (
                    <button
                      type="button"
                      onClick={() => {
                        clearUploads();
                        clearDownloads();
                        clearDeletes();
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-telegram-hover/40 text-telegram-subtext hover:text-red-400 border border-telegram-border/40 hover:border-red-500/30 active:scale-95 transition-all cursor-pointer"
                      title="Clear Finished"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden xs:inline">Clear</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Uploads vs Downloads vs Deletions counter pills */}
              <div className={`grid ${deleteQueue.length > 0 ? 'grid-cols-3' : 'grid-cols-2'} gap-2 pt-1 border-t border-telegram-border/25`}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setTransferTabFilter('uploads')}
                  className={`flex items-center gap-2.5 p-2 rounded-xl border transition-all cursor-pointer ${
                    transferTabFilter === 'uploads'
                      ? 'bg-sky-500/10 border-sky-500/40 shadow-sm'
                      : 'bg-telegram-bg/40 border-telegram-border/20 hover:bg-telegram-hover/30'
                  }`}
                >
                  <div className="w-7 h-7 rounded-lg bg-sky-500/15 text-sky-400 flex items-center justify-center shrink-0">
                    <ArrowUp className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] text-telegram-subtext block leading-none font-medium">Uploads</span>
                    <span className="text-xs font-bold text-telegram-text font-mono mt-1 block leading-none truncate">
                      {uploadQueue.length} <span className="text-[10px] font-normal text-telegram-subtext">({activeUploadCount})</span>
                    </span>
                  </div>
                </div>

                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setTransferTabFilter('downloads')}
                  className={`flex items-center gap-2.5 p-2 rounded-xl border transition-all cursor-pointer ${
                    transferTabFilter === 'downloads'
                      ? 'bg-emerald-500/10 border-emerald-500/40 shadow-sm'
                      : 'bg-telegram-bg/40 border-telegram-border/20 hover:bg-telegram-hover/30'
                  }`}
                >
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                    <ArrowDown className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] text-telegram-subtext block leading-none font-medium">Downloads</span>
                    <span className="text-xs font-bold text-telegram-text font-mono mt-1 block leading-none truncate">
                      {downloadQueue.length} <span className="text-[10px] font-normal text-telegram-subtext">({activeDownloadCount})</span>
                    </span>
                  </div>
                </div>

                {deleteQueue.length > 0 && (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setTransferTabFilter('deletions')}
                    className={`flex items-center gap-2.5 p-2 rounded-xl border transition-all cursor-pointer ${
                      transferTabFilter === 'deletions'
                        ? 'bg-rose-500/10 border-rose-500/40 shadow-sm'
                        : 'bg-telegram-bg/40 border-telegram-border/20 hover:bg-telegram-hover/30'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-lg bg-rose-500/15 text-rose-400 flex items-center justify-center shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] text-telegram-subtext block leading-none font-medium">Deletions</span>
                      <span className="text-xs font-bold text-telegram-text font-mono mt-1 block leading-none truncate">
                        {deleteQueue.length} <span className="text-[10px] font-normal text-telegram-subtext">({activeDeleteCount})</span>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 2. Structured Filter Tabs with Silent Horizontal Scroll */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1 scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <button
                type="button"
                onClick={() => setTransferTabFilter('all')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  transferTabFilter === 'all'
                    ? 'bg-telegram-primary text-black font-bold shadow-sm'
                    : 'bg-telegram-surface/80 text-telegram-subtext hover:text-telegram-text border border-telegram-border/30'
                }`}
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span>All Transfers</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono font-medium opacity-80">
                  {uploadQueue.length + downloadQueue.length + deleteQueue.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setTransferTabFilter('uploads')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  transferTabFilter === 'uploads'
                    ? 'bg-telegram-primary text-black font-bold shadow-sm'
                    : 'bg-telegram-surface/80 text-telegram-subtext hover:text-telegram-text border border-telegram-border/30'
                }`}
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Uploads</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono font-medium opacity-80">
                  {uploadQueue.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setTransferTabFilter('downloads')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  transferTabFilter === 'downloads'
                    ? 'bg-telegram-primary text-black font-bold shadow-sm'
                    : 'bg-telegram-surface/80 text-telegram-subtext hover:text-telegram-text border border-telegram-border/30'
                }`}
              >
                <Download className="w-3.5 h-3.5" />
                <span>Downloads</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono font-medium opacity-80">
                  {downloadQueue.length}
                </span>
              </button>

              {deleteQueue.length > 0 && (
                <button
                  type="button"
                  onClick={() => setTransferTabFilter('deletions')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                    transferTabFilter === 'deletions'
                      ? 'bg-rose-500 text-white font-bold shadow-sm'
                      : 'bg-telegram-surface/80 text-telegram-subtext hover:text-telegram-text border border-telegram-border/30'
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Deletions</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono font-medium opacity-80">
                    {deleteQueue.length}
                  </span>
                </button>
              )}

              {(activeUploadCount + activeDownloadCount + activeDeleteCount > 0 || pausedUploadCount + pausedDownloadCount > 0) && (
                <button
                  type="button"
                  onClick={() => setTransferTabFilter('active')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                    transferTabFilter === 'active'
                      ? 'bg-telegram-primary text-black font-bold shadow-sm'
                      : 'bg-telegram-surface/80 text-telegram-subtext hover:text-telegram-text border border-telegram-border/30'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Active</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono font-medium opacity-80">
                    {activeUploadCount + activeDownloadCount + activeDeleteCount}
                  </span>
                </button>
              )}
            </div>

            {/* 3. Empty State */}
            {unifiedTransferItems.length === 0 && (
              <div className="flex flex-col items-center justify-center p-8 rounded-3xl bg-telegram-surface/70 border border-telegram-border/40 text-center space-y-3">
                <div className="w-14 h-14 rounded-3xl bg-gradient-to-br from-telegram-primary/20 to-telegram-primary/5 border border-telegram-primary/25 text-telegram-primary flex items-center justify-center shadow-lg">
                  <ArrowUpDown className="w-7 h-7" />
                </div>
                <div className="max-w-xs space-y-1">
                  <h3 className="text-sm font-bold text-telegram-text">
                    {transferTabFilter === 'uploads'
                      ? 'No Uploads in Queue'
                      : transferTabFilter === 'downloads'
                      ? 'No Downloads in Queue'
                      : transferTabFilter === 'deletions'
                      ? 'No Deletions in Queue'
                      : transferTabFilter === 'active'
                      ? 'No Active Transfers'
                      : 'Transfer Queue is Empty'}
                  </h3>
                  <p className="text-xs text-telegram-subtext leading-relaxed">
                    {transferTabFilter === 'deletions'
                      ? 'Files you delete will appear here with cloud removal progress and deletion history.'
                      : 'Files you upload, download, or delete will appear here with live speed, percentage progress, and automatic background sync.'}
                  </p>
                </div>
                {transferTabFilter !== 'deletions' && (
                  <button
                    type="button"
                    onClick={() => setShowUploadDestinationSheet(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-telegram-primary text-black hover:bg-telegram-primary/95 active:scale-95 transition-all shadow-sm shadow-telegram-primary/20 cursor-pointer"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>Upload Files Now</span>
                  </button>
                )}
              </div>
            )}

            {/* 4. Structured Transfer Cards */}
            {unifiedTransferItems.length > 0 && (
              <div className="space-y-2.5">
                {unifiedTransferItems.map(item => {
                  const isUpload = item.transferType === 'upload';
                  const isDelete = item.transferType === 'delete';
                  const canCancel = (isDelete && item.status === 'pending') || (!isDelete && ['pending', 'paused', 'waiting_for_network', 'waiting_for_unlock', 'error', 'cooldown', 'uploading', 'downloading', 'encrypting', 'decrypting', 'verifying'].includes(item.status));
                  const canRetry = ['error', 'cancelled'].includes(item.status);
                  const canDismiss = isDelete && ['success', 'error', 'cancelled'].includes(item.status);
                  const isWaitingUnlock = item.status === 'waiting_for_unlock';
                  const isRunning = ['uploading', 'downloading', 'deleting', 'encrypting', 'decrypting', 'verifying'].includes(item.status);

                  // File Icon based on extension
                  const ext = item.filename.replace(/\.tdenc$/i, '').split('.').pop()?.toLowerCase() || '';
                  const isImg = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'heic'].includes(ext);
                  const isVid = ['mp4', 'mkv', 'mov', 'avi', 'webm', '3gp'].includes(ext);
                  const isMus = ['mp3', 'flac', 'wav', 'ogg', 'm4a', 'aac', 'opus'].includes(ext);
                  const isDoc = ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'xlsx', 'xls', 'pptx', 'csv'].includes(ext);

                  return (
                    <div
                      key={item.id}
                      className={`group relative rounded-2xl border p-3.5 transition-all duration-200 bg-telegram-surface/85 shadow-sm ${
                        item.status === 'error'
                          ? 'border-red-500/35 bg-red-500/5'
                          : isWaitingUnlock
                          ? 'border-amber-500/40 bg-amber-500/5 cursor-pointer active:opacity-80'
                          : isRunning
                          ? isDelete
                            ? 'border-rose-500/40 bg-rose-500/5 shadow-md shadow-rose-500/5'
                            : 'border-telegram-primary/40 bg-telegram-primary/5 shadow-md shadow-telegram-primary/5'
                          : 'border-telegram-border/40 hover:border-telegram-border/70'
                      }`}
                      onClick={isWaitingUnlock ? () => void (isUpload ? retryUpload(item.id) : retryDownload(item.id)) : undefined}
                    >
                      {/* Top Row: File Icon + Direction + Status Badge + Actions */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {/* File Type Icon */}
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                            isDelete
                              ? 'bg-rose-500/15 text-rose-400 border-rose-500/25'
                              : isImg
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
                              : isVid
                              ? 'bg-sky-500/15 text-sky-400 border-sky-500/25'
                              : isMus
                              ? 'bg-amber-500/15 text-amber-400 border-amber-500/25'
                              : isDoc
                              ? 'bg-rose-500/15 text-rose-400 border-rose-500/25'
                              : 'bg-purple-500/15 text-purple-400 border-purple-500/25'
                          }`}>
                            {isDelete ? (
                              <Trash2 className="w-4 h-4" />
                            ) : isImg ? (
                              <ImageIcon className="w-4 h-4" />
                            ) : isVid ? (
                              <Film className="w-4 h-4" />
                            ) : isMus ? (
                              <Music className="w-4 h-4" />
                            ) : isDoc ? (
                              <FileText className="w-4 h-4" />
                            ) : (
                              <FileCode className="w-4 h-4" />
                            )}
                          </div>

                          {/* Direction Badge */}
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                            isUpload
                              ? 'bg-sky-500/15 text-sky-400 border-sky-500/25'
                              : isDelete
                              ? 'bg-rose-500/15 text-rose-400 border-rose-500/25'
                              : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
                          }`}>
                            {isUpload ? <ArrowUp className="w-3 h-3" /> : isDelete ? <Trash2 className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                            <span>{isUpload ? 'Upload' : isDelete ? 'Delete' : 'Download'}</span>
                          </span>

                          {/* Auto-backup badge */}
                          {'isAutoBackup' in item && item.isAutoBackup && (
                            <span className="shrink-0 rounded-lg px-1.5 py-0.5 text-[9px] font-bold border bg-purple-500/15 text-purple-300 border-purple-500/30">
                              🛡️ Auto-Backup
                            </span>
                          )}
                        </div>

                        {/* Right: Status Pill & Actions */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Live Status Badge */}
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                            item.status === 'success'
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : item.status === 'error'
                              ? 'bg-red-500/15 text-red-400 border-red-500/30'
                              : isWaitingUnlock
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                              : item.status === 'waiting_for_network'
                              ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                              : item.status === 'paused'
                              ? 'bg-neutral-500/15 text-neutral-400 border-neutral-500/30'
                              : isRunning
                              ? isDelete
                                ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                                : 'bg-telegram-primary/15 text-telegram-primary border-telegram-primary/30'
                              : 'bg-telegram-hover/30 text-telegram-subtext border-telegram-border/30'
                          }`}>
                            {item.status === 'success' ? (
                              <>
                                <CheckCircle2 className="w-3 h-3" />
                                <span>{isDelete ? 'Deleted' : 'Completed'}</span>
                              </>
                            ) : item.status === 'error' ? (
                              <>
                                <AlertCircle className="w-3 h-3" />
                                <span>Failed</span>
                              </>
                            ) : isWaitingUnlock ? (
                              <>
                                <Lock className="w-3 h-3" />
                                <span>Tap to Unlock</span>
                              </>
                            ) : item.status === 'waiting_for_network' ? (
                              <>
                                <WifiOff className="w-3 h-3" />
                                <span>Network Pause</span>
                              </>
                            ) : item.status === 'paused' ? (
                              <>
                                <Pause className="w-3 h-3" />
                                <span>Paused</span>
                              </>
                            ) : isRunning ? (
                              <>
                                <RefreshCw className={`w-3 h-3 animate-spin ${isDelete ? 'text-rose-400' : 'text-telegram-primary'}`} />
                                <span className="font-mono">{Math.round(item.progress || 0)}%</span>
                              </>
                            ) : item.status === 'pending' ? (
                              <>
                                <Clock className="w-3 h-3 text-amber-400" />
                                <span>Waiting</span>
                              </>
                            ) : (
                              <span>{item.status.replace(/_/g, ' ')}</span>
                            )}
                          </span>

                          {/* Action Buttons */}
                          {canCancel && (
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                if (isUpload) cancelUpload(item.id);
                                else if (isDelete) removeDeleteItem(item.id);
                                else cancelDownload(item.id);
                              }}
                              className="p-1 rounded-lg text-telegram-subtext hover:text-red-400 hover:bg-red-500/10 active:scale-90 transition-all cursor-pointer"
                              title="Cancel"
                              aria-label={`Cancel ${item.filename}`}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {canDismiss && (
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                removeDeleteItem(item.id);
                              }}
                              className="p-1 rounded-lg text-telegram-subtext hover:text-telegram-text hover:bg-telegram-hover/30 active:scale-90 transition-all cursor-pointer"
                              title="Dismiss"
                              aria-label={`Dismiss ${item.filename}`}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {canRetry && (
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                if (isUpload) void retryUpload(item.id);
                                else if (isDelete) void retryDelete(item.id);
                                else void retryDownload(item.id);
                              }}
                              className="p-1 rounded-lg text-telegram-primary hover:bg-telegram-primary/15 active:scale-90 transition-all cursor-pointer"
                              title="Retry"
                              aria-label={`Retry ${item.filename}`}
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Middle: File Name & Details */}
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-telegram-text truncate tracking-tight">
                          {item.filename}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-telegram-subtext mt-1 flex-wrap">
                          <span>📁 {item.folderName}</span>
                          {item.totalBytes > 0 && (
                            <>
                              <span>•</span>
                              <span className="font-mono">
                                {isDelete ? formatBytes(item.totalBytes) : `${formatBytes(item.currentBytes)} / ${formatBytes(item.totalBytes)}`}
                              </span>
                            </>
                          )}
                          {item.speed > 0 && isRunning && (
                            <>
                              <span>•</span>
                              <span className="text-telegram-primary font-bold font-mono">
                                ⚡ {formatBytes(item.speed)}/s
                              </span>
                            </>
                          )}
                          {isDelete && (
                            <>
                              <span>•</span>
                              <span className={item.status === 'deleting' ? 'text-rose-400 font-medium' : item.status === 'success' ? 'text-emerald-400 font-medium' : item.status === 'error' ? 'text-red-400 font-medium' : 'text-telegram-subtext'}>
                                {item.status === 'deleting'
                                  ? (item.progress && item.progress < 50 ? 'Contacting Telegram…' : 'Removing file & cache…')
                                  : item.status === 'success'
                                  ? 'Deleted from Telegram'
                                  : item.status === 'error'
                                  ? (item.error || 'Failed to delete')
                                  : 'Pending delete…'}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Bottom: Progress Bar */}
                      {isRunning && (
                        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-telegram-border/40">
                          <div
                            className={`h-full rounded-full transition-all duration-300 shadow-sm ${
                              isDelete
                                ? 'bg-gradient-to-r from-rose-500 to-amber-500'
                                : 'bg-gradient-to-r from-telegram-primary to-emerald-400'
                            }`}
                            style={{ width: `${Math.max(item.progress || 0, isDelete ? 8 : 3)}%` }}
                          />
                        </div>
                      )}
                      {item.status === 'success' && isDelete && (
                        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-telegram-border/40">
                          <div className="h-full rounded-full bg-emerald-500/60 w-full" />
                        </div>
                      )}
                      {item.status === 'paused' && (
                        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-telegram-border/40">
                          <div
                            className="h-full rounded-full bg-amber-400 opacity-60"
                            style={{ width: `${Math.max(item.progress || 0, 5)}%` }}
                          />
                        </div>
                      )}
                      {item.status === 'error' && (
                        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-telegram-border/40">
                          <div className="h-full rounded-full bg-red-500/80 w-full" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-4">
            {/* If Root Settings Menu (settingsSubpage === null) */}
            {settingsSubpage === null && (
              <div className="space-y-2.5">
                {/* 0. Structured Theme Mode Card */}
                <div className="rounded-2xl bg-telegram-surface/90 border border-telegram-border/60 p-4 shadow-sm backdrop-blur-md space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500/20 via-orange-500/15 to-violet-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-xs">
                        {themePreference === 'system' ? (
                          <Smartphone className="w-5 h-5 text-sky-400" />
                        ) : themePreference === 'dark' ? (
                          <Moon className="w-5 h-5 text-indigo-400" />
                        ) : (
                          <Sun className="w-5 h-5 text-amber-400" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-telegram-text tracking-tight flex items-center gap-1.5">
                          {t('common.theme', 'Theme Mode')}
                        </h3>
                        <p className="text-[10px] text-telegram-subtext mt-0.5">
                          {themePreference === 'system'
                            ? `Follows Phone (${theme === 'dark' ? 'Dark' : 'Light'})`
                            : themePreference === 'dark'
                            ? t('common.dark_mode', 'Dark Mode')
                            : t('common.light_mode', 'Light Mode')}
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-telegram-primary/10 text-telegram-primary border border-telegram-primary/25 capitalize">
                      {themePreference === 'system' ? 'Auto (Device)' : themePreference}
                    </span>
                  </div>

                  {/* 3-Option Segmented Selector Grid */}
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setThemePreference('system')}
                      className={`relative flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-xl border text-xs font-semibold transition-all duration-200 active:scale-95 ${
                        themePreference === 'system'
                          ? 'bg-telegram-primary text-black border-telegram-primary shadow-md shadow-telegram-primary/20 ring-1 ring-telegram-primary/40'
                          : 'bg-telegram-bg/60 border-telegram-border/50 text-telegram-subtext hover:text-telegram-text hover:bg-telegram-hover/30'
                      }`}
                    >
                      <Smartphone className={`w-4 h-4 ${themePreference === 'system' ? 'text-black' : 'text-sky-400'}`} />
                      <span className="text-[11px] font-bold">System</span>
                      <span className={`text-[9px] font-normal leading-none ${themePreference === 'system' ? 'text-black/75 font-medium' : 'text-telegram-subtext/75'}`}>
                        Phone Default
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setThemePreference('light')}
                      className={`relative flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-xl border text-xs font-semibold transition-all duration-200 active:scale-95 ${
                        themePreference === 'light'
                          ? 'bg-telegram-primary text-black border-telegram-primary shadow-md shadow-telegram-primary/20 ring-1 ring-telegram-primary/40'
                          : 'bg-telegram-bg/60 border-telegram-border/50 text-telegram-subtext hover:text-telegram-text hover:bg-telegram-hover/30'
                      }`}
                    >
                      <Sun className={`w-4 h-4 ${themePreference === 'light' ? 'text-black' : 'text-amber-400'}`} />
                      <span className="text-[11px] font-bold">{t('common.light_mode', 'Light')}</span>
                      <span className={`text-[9px] font-normal leading-none ${themePreference === 'light' ? 'text-black/75 font-medium' : 'text-telegram-subtext/75'}`}>
                        Bright
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setThemePreference('dark')}
                      className={`relative flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-xl border text-xs font-semibold transition-all duration-200 active:scale-95 ${
                        themePreference === 'dark'
                          ? 'bg-telegram-primary text-black border-telegram-primary shadow-md shadow-telegram-primary/20 ring-1 ring-telegram-primary/40'
                          : 'bg-telegram-bg/60 border-telegram-border/50 text-telegram-subtext hover:text-telegram-text hover:bg-telegram-hover/30'
                      }`}
                    >
                      <Moon className={`w-4 h-4 ${themePreference === 'dark' ? 'text-black' : 'text-indigo-400'}`} />
                      <span className="text-[11px] font-bold">{t('common.dark_mode', 'Dark')}</span>
                      <span className={`text-[9px] font-normal leading-none ${themePreference === 'dark' ? 'text-black/75 font-medium' : 'text-telegram-subtext/75'}`}>
                        Night / OLED
                      </span>
                    </button>
                  </div>
                </div>

                {/* 1. General Preferences Card */}
                <SettingsMenuCard
                  icon={Sliders}
                  iconBgClass="bg-sky-500/15"
                  iconBorderClass="border-sky-500/30"
                  iconColorClass="text-sky-400"
                  title={t('common.preferences')}
                  subtitle="Theme, language, video upload mode & zip compression"
                  badge={
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20 capitalize flex items-center gap-1">
                      {themePreference === 'system' ? <Smartphone className="w-2.5 h-2.5" /> : (theme === 'dark' ? <Moon className="w-2.5 h-2.5" /> : <Sun className="w-2.5 h-2.5" />)}
                      {themePreference === 'system' ? 'System' : theme}
                    </span>
                  }
                  onClick={() => openSettingsSubpage('preferences')}
                />

                {/* 3. Device Privacy & App Lock Card (Android only) */}
                {isAndroid && (
                  <SettingsMenuCard
                    icon={Lock}
                    iconBgClass="bg-indigo-500/15"
                    iconBorderClass="border-indigo-500/30"
                    iconColorClass="text-indigo-400"
                    title="Device Privacy & App Lock"
                    subtitle="App PIN, biometric unlock & screenshot protection"
                    badge={
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold border ${(settings.androidCustomPinEnabled || settings.androidBiometricLock) ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                        {(settings.androidCustomPinEnabled || settings.androidBiometricLock) ? 'Protected' : 'Unprotected'}
                      </span>
                    }
                    onClick={() => openSettingsSubpage('security')}
                  />
                )}

                {/* 5. Transfer Reliability Card (Android only) */}
                {isAndroid && (
                  <SettingsMenuCard
                    icon={Zap}
                    iconBgClass="bg-amber-500/15"
                    iconBorderClass="border-amber-500/30"
                    iconColorClass="text-amber-400"
                    title="Transfer Reliability"
                    subtitle="Background queue, power & low battery policies"
                    badge={
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {settings.androidWifiOnlyTransfers ? 'Wi-Fi only' : 'All networks'}
                      </span>
                    }
                    onClick={() => openSettingsSubpage('transfers')}
                  />
                )}

                {/* 6. Storage & Offline Cache Card */}
                <SettingsMenuCard
                  icon={HardDrive}
                  iconBgClass="bg-purple-500/15"
                  iconBorderClass="border-purple-500/30"
                  iconColorClass="text-purple-400"
                  title={t('settings.offline_cache')}
                  subtitle="Instant offline cache, storage limit & file purge"
                  badge={
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      {offlineCache?.file_count ? `${offlineCache.file_count} cached` : '0 cached'}
                    </span>
                  }
                  onClick={() => openSettingsSubpage('storage')}
                />

                {/* 7. Connection Diagnostics Card */}
                <SettingsMenuCard
                  icon={Activity}
                  iconBgClass="bg-cyan-500/15"
                  iconBorderClass="border-cyan-500/30"
                  iconColorClass="text-cyan-400"
                  title={t('settings.connection_diagnostics')}
                  subtitle="MTProto ping latency & weekly bandwidth quota"
                  badge={
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold border ${isConnected ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                      {latencyMs !== null && latencyMs >= 0 ? `${latencyMs}ms` : (isConnected ? 'Online' : 'Offline')}
                    </span>
                  }
                  onClick={() => openSettingsSubpage('diagnostics')}
                />

                {/* 8. Proxy Configuration Card */}
                <SettingsMenuCard
                  icon={Globe}
                  iconBgClass="bg-blue-500/15"
                  iconBorderClass="border-blue-500/30"
                  iconColorClass="text-blue-400"
                  title={t('common.proxy')}
                  subtitle="Bypass ISP censorship & network blocks"
                  badge={
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold border ${settings.proxyEnabled ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-telegram-hover/40 text-telegram-subtext border-telegram-border/50'}`}>
                      {settings.proxyEnabled ? 'Active' : 'Off'}
                    </span>
                  }
                  onClick={() => openSettingsSubpage('proxy')}
                />

                {/* 9. Media & Playback Card (Android only) */}
                {isAndroid && (
                  <SettingsMenuCard
                    icon={Film}
                    iconBgClass="bg-rose-500/15"
                    iconBorderClass="border-rose-500/30"
                    iconColorClass="text-rose-400"
                    title="Media & Playback"
                    subtitle="Lock screen privacy, playback speed & subtitles"
                    badge={
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        {settings.androidPlaybackSpeed}×
                      </span>
                    }
                    onClick={() => openSettingsSubpage('media')}
                  />
                )}

                {/* 10. Privacy & Supporter Card */}
                <SettingsMenuCard
                  icon={Sparkles}
                  iconBgClass="bg-yellow-500/15"
                  iconBorderClass="border-yellow-500/30"
                  iconColorClass="text-yellow-400"
                  title="Privacy & Support"
                  subtitle="Ad-free supporter license, privacy & FAQ"
                  badge={
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                      {supporterStatus.ad_free ? 'Supporter' : 'Free'}
                    </span>
                  }
                  onClick={() => openSettingsSubpage('supporter')}
                />

                {/* 11. Software Updates & Version Card */}
                <SettingsMenuCard
                  icon={Download}
                  iconBgClass="bg-emerald-500/15"
                  iconBorderClass="border-emerald-500/30"
                  iconColorClass="text-emerald-400"
                  title="Software Updates & Version"
                  subtitle={`Installed v${appVersion} • ${updateAvailable ? `v${updateVersion} ready to install` : 'Check for new releases'}`}
                  badge={
                    updateAvailable ? (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/35 animate-pulse flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" />
                        v{updateVersion} Available
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-telegram-hover/40 text-telegram-subtext border border-telegram-border/50">
                        v{appVersion} (Latest)
                      </span>
                    )
                  }
                  onClick={() => openSettingsSubpage('updates')}
                />

                {/* About Card & Logout Button */}
                <div className="pt-2 space-y-3">
                  <StructuredBrandCard appVersion={appVersion} />

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-semibold text-xs active:scale-98 transition-all duration-200 shadow-sm"
                  >
                    <LogOut className="w-4 h-4" />
                    {t('common.logout')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Subpages Container (settingsSubpage !== null) ──────────────── */}
        {settingsSubpage !== null && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-200 pb-36 sm:pb-40">
            {/* 1. Cloud Vault Subpage */}
            {settingsSubpage === 'vault' && (
                  <>
                    <section className="rounded-2xl bg-telegram-surface/80 border border-telegram-border/50 p-4 shadow-sm backdrop-blur-md">
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2 text-telegram-primary">
                          <Shield className="w-4 h-4 text-emerald-400" />
                          <h3 className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                            Cloud Vault &amp; Encryption
                          </h3>
                        </div>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                            vaultStatus?.is_unlocked
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                          }`}
                        >
                          {vaultStatus?.is_unlocked ? '🔓 Unlocked' : '🔒 Locked'}
                        </span>
                      </div>

                      {/* Master Switch */}
                      <div className="flex items-center justify-between py-2.5 border-b border-telegram-border/20">
                        <div className="pr-3">
                          <p className="text-xs font-semibold text-telegram-text">
                            {vaultStatus?.is_unlocked ? 'Vault Unlocked' : 'Vault Locked'}
                          </p>
                          <p className="text-[10px] text-telegram-subtext mt-0.5">
                            {vaultStatus?.is_unlocked
                              ? 'Encrypted photos, videos, and files can be opened and viewed.'
                              : 'Protected files are locked. Turn ON and enter passphrase to unlock.'}
                          </p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={vaultStatus?.is_unlocked ?? false}
                          aria-label="Toggle Vault Unlock"
                          onClick={async () => {
                            if (vaultStatus?.is_unlocked) {
                              await lockVault();
                              await queryClient.invalidateQueries({ queryKey: ['files'] });
                              toast.success('Cloud Vault locked! Files are protected.');
                            } else {
                              setPendingOpenFile(null);
                              setVaultModalMode(vaultStatus?.exists ? 'unlock' : (cloudVaultStatus?.available ? 'restore' : 'create'));
                              setVaultModalOpen(true);
                            }
                          }}
                          className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ${
                            vaultStatus?.is_unlocked ? 'bg-emerald-500' : 'bg-telegram-border'
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 start-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
                              vaultStatus?.is_unlocked ? 'translate-x-5 rtl:-translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Passphrase actions */}
                      <div className="flex items-center justify-between pt-2.5">
                        <div className="pr-2">
                          <p className="text-xs font-semibold text-telegram-text">
                            {vaultStatus?.exists
                              ? 'Vault Passphrase'
                              : cloudVaultStatus?.available
                              ? 'Cloud Vault Ready'
                              : 'Set Master Passphrase'}
                          </p>
                          <p className="text-[10px] text-telegram-subtext mt-0.5">
                            {vaultStatus?.exists
                              ? 'Change the master passphrase used to encrypt & unlock files.'
                              : cloudVaultStatus?.available
                              ? 'Cloud vault found in Telegram. Enter passphrase to turn on and unlock.'
                              : 'Configure a passphrase to enable client-side encryption.'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setPendingOpenFile(null);
                            setVaultModalMode(vaultStatus?.exists ? 'change' : (cloudVaultStatus?.available ? 'restore' : 'create'));
                            setVaultModalOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-telegram-hover/60 border border-telegram-border/40 text-telegram-text hover:border-telegram-primary/40 active:scale-95 transition shrink-0"
                        >
                          {vaultStatus?.exists ? 'Change' : cloudVaultStatus?.available ? 'Turn On' : 'Set Up'}
                        </button>
                      </div>
                    </section>

                    {/* Encryption Details Info Box */}
                    <div className="p-4 rounded-2xl bg-telegram-surface/60 border border-telegram-border/40 text-xs space-y-2.5 text-telegram-subtext leading-relaxed">
                      <div className="flex items-center gap-2 text-telegram-text font-bold">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span>Zero-Knowledge Client-Side Encryption</span>
                      </div>
                      <p className="text-[11px]">
                        Files are encrypted before upload using authenticated AES-256-GCM. Your passphrase never leaves this device and is converted to a cryptographic key using Argon2id.
                      </p>
                      <p className="text-[11px]">
                        When locked, keys are purged from volatile memory and all decrypted temporary previews are erased immediately.
                      </p>
                    </div>
                  </>
                )}

                {/* 2. Preferences Subpage */}
                {settingsSubpage === 'preferences' && (
                  <section className="rounded-2xl bg-telegram-surface/80 border border-telegram-border/50 p-4 shadow-sm backdrop-blur-md">
                    <div className="flex items-center gap-2 mb-3 text-telegram-primary">
                      <Sliders className="w-3.5 h-3.5" />
                      <h3 className="text-[11px] font-bold uppercase tracking-wider">{t('common.preferences')}</h3>
                    </div>

                    {/* Theme Mode */}
                    <div className="py-2.5 border-b border-telegram-border/20 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="pr-3">
                          <p className="text-xs font-semibold text-telegram-text">{t('common.theme', 'Theme Mode')}</p>
                          <p className="text-[10px] text-telegram-subtext mt-0.5">
                            {themePreference === 'system'
                              ? `Follows Phone (${theme === 'dark' ? 'Dark' : 'Light'})`
                              : themePreference === 'dark'
                              ? t('common.dark_mode', 'Dark Mode')
                              : t('common.light_mode', 'Light Mode')}
                          </p>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-telegram-primary/10 text-telegram-primary border border-telegram-primary/25 capitalize">
                          {themePreference === 'system' ? 'Auto' : themePreference}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setThemePreference('system')}
                          className={`flex flex-col items-center justify-center gap-1 py-2 px-1.5 rounded-xl border text-xs font-medium transition-all active:scale-95 ${
                            themePreference === 'system'
                              ? 'bg-telegram-primary text-black border-telegram-primary font-bold shadow-sm'
                              : 'bg-telegram-bg border-telegram-border/50 text-telegram-subtext hover:text-telegram-text'
                          }`}
                        >
                          <Smartphone className={`w-3.5 h-3.5 ${themePreference === 'system' ? 'text-black' : 'text-sky-400'}`} />
                          <span className="text-[10px] font-bold">System</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setThemePreference('light')}
                          className={`flex flex-col items-center justify-center gap-1 py-2 px-1.5 rounded-xl border text-xs font-medium transition-all active:scale-95 ${
                            themePreference === 'light'
                              ? 'bg-telegram-primary text-black border-telegram-primary font-bold shadow-sm'
                              : 'bg-telegram-bg border-telegram-border/50 text-telegram-subtext hover:text-telegram-text'
                          }`}
                        >
                          <Sun className={`w-3.5 h-3.5 ${themePreference === 'light' ? 'text-black' : 'text-amber-400'}`} />
                          <span className="text-[10px] font-bold">{t('common.light_mode', 'Light')}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setThemePreference('dark')}
                          className={`flex flex-col items-center justify-center gap-1 py-2 px-1.5 rounded-xl border text-xs font-medium transition-all active:scale-95 ${
                            themePreference === 'dark'
                              ? 'bg-telegram-primary text-black border-telegram-primary font-bold shadow-sm'
                              : 'bg-telegram-bg border-telegram-border/50 text-telegram-subtext hover:text-telegram-text'
                          }`}
                        >
                          <Moon className={`w-3.5 h-3.5 ${themePreference === 'dark' ? 'text-black' : 'text-indigo-400'}`} />
                          <span className="text-[10px] font-bold">{t('common.dark_mode', 'Dark')}</span>
                        </button>
                      </div>
                    </div>

                    {/* Zip before upload toggle */}
                    <div className="flex items-center justify-between py-2.5 border-b border-telegram-border/20">
                      <div className="pr-3">
                        <p className="text-xs font-semibold text-telegram-text">{t('settings.zip_before_upload')}</p>
                        <p className="text-[10px] text-telegram-subtext mt-0.5">{t('settings.zip_folders_desc')}</p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={settings.zipFolders}
                        aria-label={t('settings.zip_before_upload')}
                        onClick={() => updateSetting('zipFolders', !settings.zipFolders)}
                        className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ${settings.zipFolders ? 'bg-telegram-primary' : 'bg-telegram-border'}`}
                      >
                        <span className={`absolute top-0.5 start-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${settings.zipFolders ? 'translate-x-5 rtl:-translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    {/* Video upload mode */}
                    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-telegram-border/20">
                      <div className="pr-3">
                        <p className="text-xs font-semibold text-telegram-text">{t('settings.video_upload_default')}</p>
                        <p className="text-[10px] leading-4 text-telegram-subtext mt-0.5">{t('settings.video_upload_desc')}</p>
                      </div>
                      <select
                        value={settings.videoUploadMode}
                        onChange={event => updateSetting('videoUploadMode', event.target.value as 'file' | 'media')}
                        aria-label={t('settings.video_upload_default')}
                        className="min-h-10 shrink-0 rounded-xl border border-telegram-border/50 bg-telegram-bg px-2.5 text-xs text-telegram-text focus:outline-none focus:border-telegram-primary/50"
                      >
                        <option value="file">{t('settings.video_upload_file')}</option>
                        <option value="media">{t('settings.video_upload_media')}</option>
                      </select>
                    </div>

                    {/* Default File Sorting */}
                    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-telegram-border/20">
                      <div className="pr-3">
                        <p className="text-xs font-semibold text-telegram-text">{t('settings.default_sort', 'Default File Sort')}</p>
                        <p className="text-[10px] leading-4 text-telegram-subtext mt-0.5">{t('settings.default_sort_desc', 'Choose which files appear at the top by default')}</p>
                      </div>
                      <select
                        value={`${settings.fileSortField}_${settings.fileSortDirection}`}
                        onChange={event => {
                          const selected = SORT_OPTIONS.find(opt => opt.id === event.target.value);
                          if (selected) {
                            updateSettings({ fileSortField: selected.field, fileSortDirection: selected.direction });
                          }
                        }}
                        aria-label={t('settings.default_sort', 'Default File Sort')}
                        className="min-h-10 shrink-0 rounded-xl border border-telegram-border/50 bg-telegram-bg px-2.5 text-xs text-telegram-text focus:outline-none focus:border-telegram-primary/50"
                      >
                        {SORT_OPTIONS.map(opt => (
                          <option key={opt.id} value={opt.id}>
                            {opt.fallbackLabel}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Language */}
                    <div className="flex items-center justify-between py-2.5">
                      <div className="pr-3">
                        <p className="text-xs font-semibold text-telegram-text">{t('common.language')}</p>
                        <p className="text-[10px] text-telegram-subtext mt-0.5">{t('settings.select_app_language')}</p>
                      </div>
                      <div className="relative shrink-0">
                        <select
                          value={settings.language}
                          onChange={e => updateSetting('language', e.target.value as any)}
                          className="appearance-none bg-telegram-bg border border-telegram-border/50 rounded-xl pl-3 pr-8 py-2 text-xs text-telegram-text focus:outline-none focus:border-telegram-primary/50 transition cursor-pointer"
                        >
                          {LANGUAGES.map(lang => (
                            <option key={lang.code} value={lang.code}>
                              {lang.nativeLabel}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-telegram-subtext absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                  </section>
                )}

                {/* 3. Auto-Backup Subpage */}
                {settingsSubpage === 'autobackup' && (
                  <section className="rounded-2xl bg-telegram-surface/80 border border-telegram-border/50 p-4 shadow-sm backdrop-blur-md" aria-labelledby="auto-backup-title">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500/15 to-emerald-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
                          <Cloud className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 id="auto-backup-title" className="text-xs font-bold text-telegram-text flex items-center gap-1.5">
                            Auto-Backup &amp; Sync
                            {syncSettings.data?.enabled && (
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            )}
                          </h3>
                          <p className="text-[10px] text-telegram-subtext">Google Photos-style camera &amp; media backup</p>
                        </div>
                      </div>

                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        syncSettings.data?.enabled
                          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                          : 'bg-telegram-hover/40 border-telegram-border/60 text-telegram-subtext'
                      }`}>
                        {syncSettings.data?.enabled ? 'Active' : 'Off'}
                      </span>
                    </div>

                    {/* Info & Stats Summary */}
                    <div className="rounded-xl bg-telegram-bg/50 border border-telegram-border/30 p-3 mb-3">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-telegram-subtext">Configured Folders</span>
                        <span className="font-bold text-telegram-text">
                          {syncPairs.data?.length ?? 0} folder{(syncPairs.data?.length ?? 0) === 1 ? '' : 's'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-telegram-subtext">Network Rule</span>
                        <span className="text-sky-400 font-medium">
                          {syncSettings.data?.wifiOnly ? '📶 Wi-Fi Only' : '🌐 Any Network'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-telegram-subtext">Sync Policy</span>
                        <span className="text-emerald-400 font-medium">🛡️ Safe Cloud Backup</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleOpenAutoBackup}
                        className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl bg-telegram-primary hover:bg-telegram-primary/90 text-white text-xs font-bold transition shadow-sm active:scale-98"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span>Configure Backup</span>
                      </button>

                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await setSyncEnabled(!syncSettings.data?.enabled);
                            toast.success(syncSettings.data?.enabled ? 'Auto-backup paused' : 'Auto-backup activated');
                          } catch (e: any) {
                            toast.error(e?.toString() || 'Failed to toggle backup');
                          }
                        }}
                        className={`h-9 px-3 rounded-xl border text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
                          syncSettings.data?.enabled
                            ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20'
                            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                        }`}
                      >
                        {syncSettings.data?.enabled ? (
                          <>
                            <Pause className="w-3 h-3" />
                            <span>Pause</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3" />
                            <span>Enable</span>
                          </>
                        )}
                      </button>
                    </div>
                  </section>
                )}

                {/* 4. Security & App Lock Subpage (Android) */}
                {settingsSubpage === 'security' && isAndroid && (
                  <section className="rounded-2xl bg-telegram-surface/80 border border-telegram-border/50 p-4 shadow-sm backdrop-blur-md" aria-labelledby="android-privacy-title">
                    {/* Header with status badge */}
                    <div className="flex items-center justify-between gap-2 mb-3.5">
                      <div className="flex items-center gap-2 text-telegram-primary">
                        <div className="w-7 h-7 rounded-xl bg-telegram-primary/10 flex items-center justify-center">
                          <Lock className="w-4 h-4 text-telegram-primary" />
                        </div>
                        <div>
                          <h3 id="android-privacy-title" className="text-xs font-bold text-telegram-text">Device Privacy &amp; App Lock</h3>
                          <p className="text-[10px] text-telegram-subtext">Secure access &amp; screen protection</p>
                        </div>
                      </div>
                      <div>
                        {(settings.androidCustomPinEnabled || settings.androidBiometricLock) ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                            <ShieldCheck className="w-3 h-3" />
                            Protected
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <ShieldAlert className="w-3 h-3" />
                            Unprotected
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Section 1: Custom App Password / PIN */}
                    <div className="p-3 rounded-xl bg-telegram-bg/50 border border-telegram-border/40 mb-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-start gap-2.5 flex-1">
                          <div className="w-6 h-6 rounded-lg bg-telegram-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                            <KeyRound className="w-3.5 h-3.5 text-telegram-primary" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-telegram-text">Custom App Password / PIN</p>
                            <p className="text-[10px] text-telegram-subtext leading-relaxed mt-0.5">
                              Lock app with an independent private PIN or password separate from device lock.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={settings.androidCustomPinEnabled}
                          aria-label="Custom App Password"
                          onClick={() => {
                            if (settings.androidCustomPinEnabled) {
                              handleOpenDisablePin();
                            } else {
                              if (settings.androidCustomPinHash) {
                                updateSetting('androidCustomPinEnabled', true);
                                toast.success('App password enabled');
                              } else {
                                handleOpenSetPin();
                              }
                            }
                          }}
                          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${settings.androidCustomPinEnabled ? 'bg-telegram-primary' : 'bg-telegram-border'}`}
                        >
                          <span className={`absolute start-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${settings.androidCustomPinEnabled ? 'translate-x-5 rtl:-translate-x-5' : ''}`} />
                        </button>
                      </div>

                      {/* Sub-actions when Custom Password is enabled */}
                      {settings.androidCustomPinEnabled && (
                        <div className="mt-3 pt-2.5 border-t border-telegram-border/30 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleOpenChangePin}
                            className="flex-1 h-8 rounded-lg bg-telegram-surface border border-telegram-border/50 text-[11px] font-semibold text-telegram-text hover:bg-telegram-hover/60 transition-colors flex items-center justify-center gap-1.5"
                          >
                            <Pencil className="w-3 h-3 text-telegram-subtext" />
                            <span>Change Password</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsAppLocked(true);
                              try { localStorage.setItem('tg_drive_app_locked', 'true'); } catch {}
                              toast.info('App locked');
                            }}
                            className="h-8 px-3 rounded-lg bg-telegram-primary/10 border border-telegram-primary/20 text-[11px] font-semibold text-telegram-primary hover:bg-telegram-primary/20 transition-colors flex items-center gap-1.5"
                          >
                            <Lock className="w-3 h-3" />
                            <span>Lock Now</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Section 2: Biometric or System Device Lock */}
                    <div className="p-3 rounded-xl bg-telegram-bg/50 border border-telegram-border/40 mb-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-start gap-2.5 flex-1">
                          <div className="w-6 h-6 rounded-lg bg-telegram-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                            <Fingerprint className="w-3.5 h-3.5 text-telegram-primary" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-telegram-text">System Device Lock / Biometrics</p>
                            <p className="text-[10px] text-telegram-subtext leading-relaxed mt-0.5">
                              Use device fingerprint, face unlock, or Android screen pattern.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={settings.androidBiometricLock}
                          aria-label="Biometric or device lock"
                          onClick={() => void handleBiometricLockToggle()}
                          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${settings.androidBiometricLock ? 'bg-telegram-primary' : 'bg-telegram-border'}`}
                        >
                          <span className={`absolute start-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${settings.androidBiometricLock ? 'translate-x-5 rtl:-translate-x-5' : ''}`} />
                        </button>
                      </div>
                    </div>

                    {/* Section 3: Lock Delay After Backgrounding */}
                    <div className="p-3 rounded-xl bg-telegram-bg/50 border border-telegram-border/40 mb-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-start gap-2.5 flex-1">
                          <div className="w-6 h-6 rounded-lg bg-telegram-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                            <Clock className="w-3.5 h-3.5 text-telegram-primary" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-telegram-text">Lock After Backgrounding</p>
                            <p className="text-[10px] text-telegram-subtext leading-relaxed mt-0.5">
                              Grace period before requiring password or biometric unlock.
                            </p>
                          </div>
                        </div>
                        <select
                          value={settings.androidLockAfterBackgroundMinutes}
                          onChange={event => updateSetting('androidLockAfterBackgroundMinutes', Number(event.target.value))}
                          disabled={!settings.androidBiometricLock && !settings.androidCustomPinEnabled}
                          className="min-h-9 rounded-xl border border-telegram-border/50 bg-telegram-bg px-2.5 text-xs text-telegram-text font-medium disabled:opacity-40 cursor-pointer"
                        >
                          <option value={0}>Immediately</option>
                          <option value={1}>1 minute</option>
                          <option value={5}>5 minutes</option>
                          <option value={15}>15 minutes</option>
                          <option value={60}>1 hour</option>
                        </select>
                      </div>
                    </div>

                    {/* Section 4: Privacy Screen (FLAG_SECURE) */}
                    <div className="p-3 rounded-xl bg-telegram-bg/50 border border-telegram-border/40">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-start gap-2.5 flex-1">
                          <div className="w-6 h-6 rounded-lg bg-telegram-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                            <EyeOff className="w-3.5 h-3.5 text-telegram-primary" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-telegram-text">Block Screenshots &amp; Recents Preview</p>
                            <p className="text-[10px] text-telegram-subtext leading-relaxed mt-0.5">
                              Protects files in Android app switcher and stops screen recordings (Android FLAG_SECURE).
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={settings.androidPrivacyScreen}
                          aria-label="Block screenshots & Recents previews"
                          onClick={() => updateSetting('androidPrivacyScreen', !settings.androidPrivacyScreen)}
                          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${settings.androidPrivacyScreen ? 'bg-telegram-primary' : 'bg-telegram-border'}`}
                        >
                          <span className={`absolute start-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${settings.androidPrivacyScreen ? 'translate-x-5 rtl:-translate-x-5' : ''}`} />
                        </button>
                      </div>
                    </div>
                  </section>
                )}

                {/* 5. Transfer Reliability Subpage (Android) */}
                {settingsSubpage === 'transfers' && isAndroid && (
                  <section className="rounded-2xl bg-telegram-surface/80 border border-telegram-border/50 p-4 shadow-sm backdrop-blur-md" aria-labelledby="android-transfer-policy-title">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-telegram-primary">
                        <Activity className="w-3.5 h-3.5" />
                        <h3 id="android-transfer-policy-title" className="text-[11px] font-bold uppercase tracking-wider">Transfer reliability</h3>
                      </div>
                      <span className={`h-2.5 w-2.5 rounded-full ${transferAllowed ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-amber-400'}`} title={transferWaitingReason} />
                    </div>
                    <p className="text-[10px] text-telegram-subtext mb-2">Saved queues automatically resume after reopening.</p>
                    <MobileSettingToggle checked={settings.androidWifiOnlyTransfers} label="Wi-Fi only" description="Wait for an unmetered network before uploading or downloading." onChange={() => updateSetting('androidWifiOnlyTransfers', !settings.androidWifiOnlyTransfers)} />
                    <MobileSettingToggle checked={settings.androidAllowRoaming} label="Allow roaming" description="Disabled by default to prevent unexpected carrier charges." onChange={() => updateSetting('androidAllowRoaming', !settings.androidAllowRoaming)} />
                    <MobileSettingToggle checked={settings.androidRequireCharging} label="Require charging" description="Only run queued transfers while external power is connected." onChange={() => updateSetting('androidRequireCharging', !settings.androidRequireCharging)} />
                    <MobileSettingToggle checked={settings.androidPauseOnLowBattery} label="Pause on low battery" description="Wait when battery is 15% or lower unless the device is charging." onChange={() => updateSetting('androidPauseOnLowBattery', !settings.androidPauseOnLowBattery)} />
                    <div className="mt-3 flex items-center justify-between gap-3 py-1">
                      <div>
                        <span className="block text-xs font-semibold text-telegram-text">Free-space reserve</span>
                        <span className="mt-0.5 block text-[10px] text-telegram-subtext">Downloads never consume this reserve.</span>
                      </div>
                      <select value={settings.androidMinimumFreeStorageGb} onChange={event => updateSetting('androidMinimumFreeStorageGb', Number(event.target.value))} className="min-h-10 rounded-xl border border-telegram-border/50 bg-telegram-bg px-3 text-xs text-telegram-text">
                        {[1, 2, 5, 10].map(value => <option key={value} value={value}>{value} GB</option>)}
                      </select>
                    </div>
                    {!transferAllowed && <p className="mt-3 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-[10px] text-amber-300">{transferWaitingReason}</p>}
                    {androidTransferEnvironment?.backgroundRestricted && <p className="mt-2 text-[10px] text-amber-300">Android battery optimization currently restricts this app. Transfers resume when opened.</p>}
                  </section>
                )}

                {/* 6. Storage & Offline Cache Subpage */}
                {settingsSubpage === 'storage' && (
                  <>
                    <section className="rounded-2xl bg-telegram-surface/80 border border-telegram-border/50 p-4 shadow-sm backdrop-blur-md overflow-hidden">
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2 text-telegram-primary">
                          <div className="w-7 h-7 rounded-xl bg-telegram-primary/10 flex items-center justify-center">
                            <HardDrive className="w-4 h-4 text-telegram-primary" />
                          </div>
                          <div>
                            <h3 className="text-xs font-bold text-telegram-text">{t('settings.offline_cache')}</h3>
                            <p className="text-[10px] text-telegram-subtext">Instant local storage without downloading</p>
                          </div>
                        </div>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-telegram-primary/10 text-telegram-primary border border-telegram-primary/20">
                          {offlineCache?.file_count ? `${offlineCache.file_count} cached` : '0 cached'}
                        </span>
                      </div>

                      {/* Storage Usage Progress Meter */}
                      {(() => {
                        const usedBytes = offlineCache?.total_bytes ?? 0;
                        const maxBytes = offlineCache?.max_bytes || (settings.androidMediaCacheMaxGb * 1024 * 1024 * 1024);
                        const percent = Math.min(100, Math.max(0, Math.round((usedBytes / (maxBytes || 1)) * 100)));
                        return (
                          <div className="mt-1 mb-3 p-3 rounded-xl bg-telegram-bg/50 border border-telegram-border/30">
                            <div className="flex items-center justify-between text-[11px] mb-1.5">
                              <span className="font-semibold text-telegram-text">Storage Used</span>
                              <span className="font-mono text-telegram-subtext">
                                <strong className="text-telegram-text">{formatBytes(usedBytes)}</strong> / {formatBytes(maxBytes)} ({percent}%)
                              </span>
                            </div>
                            <div className="w-full h-2 bg-telegram-surface rounded-full overflow-hidden border border-telegram-border/30">
                              <div
                                className={`h-full transition-all duration-500 rounded-full ${
                                  percent > 90 ? 'bg-red-500' : percent > 75 ? 'bg-amber-500' : 'bg-gradient-to-r from-telegram-primary to-blue-400'
                                }`}
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        );
                      })()}

                      {/* 3 Metrics Cards Grid */}
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <div className="p-2.5 rounded-xl bg-telegram-bg/50 border border-telegram-border/30 text-center">
                          <span className="block text-[10px] text-telegram-subtext uppercase font-semibold tracking-wider">Files</span>
                          <span className="text-sm font-bold text-telegram-text mt-0.5 block">
                            {offlineCache ? offlineCache.file_count : '—'}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-telegram-bg/50 border border-telegram-border/30 text-center">
                          <span className="block text-[10px] text-telegram-subtext uppercase font-semibold tracking-wider">Used</span>
                          <span className="text-sm font-bold text-telegram-text mt-0.5 block truncate">
                            {offlineCache ? formatBytes(offlineCache.total_bytes) : '—'}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-telegram-bg/50 border border-telegram-border/30 text-center">
                          <span className="block text-[10px] text-telegram-subtext uppercase font-semibold tracking-wider">Max Limit</span>
                          <select
                            value={settings.androidMediaCacheMaxGb}
                            onChange={event => updateSetting('androidMediaCacheMaxGb', Number(event.target.value))}
                            className="w-full mt-0.5 text-xs font-bold text-telegram-primary bg-transparent text-center focus:outline-none cursor-pointer"
                          >
                            {[0.5, 1, 2, 5, 10, 25].map(value => (
                              <option key={value} value={value} className="bg-telegram-bg text-telegram-text">
                                {value} GB
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <p className="text-[10px] leading-relaxed text-telegram-subtext mb-3 px-0.5">
                        {t('settings.offline_cache_desc')}
                      </p>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 pt-2 border-t border-telegram-border/30">
                        <button
                          type="button"
                          onClick={() => void refetchOfflineCache()}
                          disabled={offlineCacheLoading}
                          className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl bg-telegram-hover/40 text-telegram-text text-xs font-semibold hover:bg-telegram-hover/70 transition-colors disabled:opacity-50"
                          aria-label={t('settings.refresh_offline_cache')}
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${offlineCacheLoading ? 'animate-spin' : ''}`} />
                          <span>Refresh Stats</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => void clearOfflineCache()}
                          disabled={!offlineCache?.file_count || offlineCacheLoading}
                          className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-semibold transition-colors disabled:opacity-40"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{t('settings.clear')}</span>
                        </button>
                      </div>
                    </section>

                    {/* Shared Files (Android only) */}
                    {isAndroid && cachedFiles.length > 0 && (
                      <section className="rounded-2xl bg-telegram-surface/80 border border-telegram-border/50 p-4 shadow-sm backdrop-blur-md">
                        <div className="flex items-center gap-2 mb-3 text-telegram-primary">
                          <Share2 className="w-3.5 h-3.5" />
                          <h3 className="text-[11px] font-bold uppercase tracking-wider">{t('settings.shared_files', { count: cachedFiles.length })}</h3>
                        </div>
                        <div className="space-y-2">
                          {cachedFiles.map((entry) => {
                            const isUploading = uploadingCacheFiles.has(entry.cached_path);
                            return (
                              <div
                                key={entry.cached_path}
                                className="flex items-center justify-between p-3 rounded-xl bg-telegram-bg/50 border border-telegram-border/30"
                              >
                                <div className="min-w-0 flex-1 mr-2">
                                  <p className="text-xs font-semibold text-telegram-text truncate">{entry.file_name}</p>
                                  <p className="text-[10px] text-telegram-subtext/60 font-mono">{formatBytes(entry.file_size)}</p>
                                </div>
                                <button
                                  onClick={() => handleUploadCachedFile(entry)}
                                  disabled={isUploading || !isConnected}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-telegram-primary text-black hover:bg-telegram-primary/95 border border-telegram-primary/10 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                                >
                                  {isUploading ? (
                                    <>
                                      <div className="w-3 h-3 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                      {t('settings.uploading')}
                                    </>
                                  ) : (
                                    <>
                                      <UploadCloud className="w-3 h-3" />
                                      {t('common.upload')}
                                    </>
                                  )}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                        <button
                          onClick={handleClearCachedFiles}
                          className="w-full text-center text-[11px] text-red-400 hover:text-red-300 transition-colors py-2 mt-2"
                        >
                          {t('settings.clear_shared_files')}
                        </button>
                      </section>
                    )}
                  </>
                )}

                {/* 7. Connection Diagnostics Subpage */}
                {settingsSubpage === 'diagnostics' && (
                  <section className="rounded-2xl bg-telegram-surface/80 border border-telegram-border/50 p-4 shadow-sm backdrop-blur-md">
                    <div className="flex items-center gap-2 mb-3 text-telegram-primary">
                      <Wifi className="w-3.5 h-3.5" />
                      <h3 className="text-[11px] font-bold uppercase tracking-wider">{t('settings.connection_diagnostics')}</h3>
                    </div>

                    {/* Status */}
                    <div className="flex items-center justify-between py-2.5 border-b border-telegram-border/20">
                      <div className="flex items-center gap-2.5">
                        <Activity className="w-4 h-4 text-telegram-subtext" />
                        <div>
                          <p className="text-xs font-semibold text-telegram-text">{t('common.status')}</p>
                          <p className="text-[10px] text-telegram-subtext">MTProto Cloud Gateway</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-telegram-hover/30 border border-telegram-border/30">
                        <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                        <span className={`text-xs font-semibold ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                          {isConnected ? t('common.connected_telegram') : t('settings.offline')}
                        </span>
                      </div>
                    </div>

                    {/* Ping latency */}
                    <div className="flex items-center justify-between py-2.5 border-b border-telegram-border/20">
                      <div>
                        <p className="text-xs font-semibold text-telegram-text">{t('common.ping')}</p>
                        <p className="text-[10px] text-telegram-subtext mt-0.5">
                          {latencyMs !== null
                            ? latencyMs >= 0
                              ? `${latencyMs}ms latency`
                              : t('settings.offline')
                            : t('settings.not_tested')}
                        </p>
                      </div>
                      <button
                        onClick={handleCheckLatency}
                        disabled={checkingLatency}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-telegram-primary/15 text-telegram-primary hover:bg-telegram-primary/25 border border-telegram-primary/20 active:scale-95 transition-all duration-200 disabled:opacity-50"
                      >
                        {checkingLatency ? (
                          <>
                            <div className="w-3 h-3 border-2 border-telegram-primary/30 border-t-telegram-primary rounded-full animate-spin" />
                            {t('settings.testing')}
                          </>
                        ) : (
                          <>
                            <Zap className="w-3.5 h-3.5" />
                            {t('settings.check_ping')}
                          </>
                        )}
                      </button>
                    </div>

                    {/* Latency meter */}
                    {latencyMs !== null && latencyMs >= 0 && (
                      <div className="flex items-center gap-2 py-2 border-b border-telegram-border/20">
                        <div className="flex-1 h-2 rounded-full bg-telegram-border/30 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${latencyMs < 100 ? 'bg-green-500' : latencyMs < 250 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.min(100, Math.max(5, (500 - latencyMs) / 5))}%` }}
                          />
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${latencyMs < 100 ? 'bg-green-500/10 text-green-400' : latencyMs < 250 ? 'bg-yellow-500/10 text-yellow-400' : 'bg-red-500/10 text-red-400'}`}>
                          {latencyMs < 100 ? t('settings.excellent') : latencyMs < 250 ? t('settings.good') : t('settings.slow')}
                        </span>
                      </div>
                    )}

                    {/* Bandwidth stats */}
                    {bandwidth && (
                      <div className="py-2.5 border-b border-telegram-border/20">
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <div>
                            <p className="text-xs font-semibold text-telegram-text">Weekly bandwidth</p>
                            <p className="text-[10px] text-telegram-subtext">250 GB limit · Resets Monday</p>
                          </div>
                          <p className="text-[11px] font-mono font-semibold">
                            <span className="text-emerald-400">↑ {formatBytes(bandwidth.up_bytes)}</span>
                            {' · '}
                            <span className="text-blue-400">↓ {formatBytes(bandwidth.down_bytes)}</span>
                          </p>
                        </div>
                        <BandwidthWidget bandwidth={bandwidth} />
                      </div>
                    )}

                    {/* Support Snapshot */}
                    <div className="flex items-center justify-between gap-3 pt-2.5">
                      <div>
                        <p className="text-xs font-semibold text-telegram-text">Support snapshot</p>
                        <p className="text-[10px] text-telegram-subtext mt-0.5">Device state &amp; exit codes (no private data)</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleCopyDiagnostics()}
                        disabled={copyingDiagnostics}
                        className="min-h-10 shrink-0 rounded-xl border border-telegram-primary/25 bg-telegram-primary/15 px-3 text-xs font-semibold text-telegram-primary hover:bg-telegram-primary/25 active:scale-95 transition-all disabled:opacity-50"
                      >
                        {copyingDiagnostics ? t('common.loading') : t('settings.copy_diagnostics')}
                      </button>
                    </div>
                  </section>
                )}

                {/* 8. Proxy Configuration Subpage */}
                {settingsSubpage === 'proxy' && (
                  <section className="rounded-2xl bg-telegram-surface/80 border border-telegram-border/50 p-4 shadow-sm backdrop-blur-md">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2 text-telegram-primary">
                        <Shield className="w-3.5 h-3.5" />
                        <h3 className="text-[11px] font-bold uppercase tracking-wider">{t('common.proxy')}</h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowProxyGuide(!showProxyGuide)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-telegram-primary/10 border border-telegram-primary/20 text-telegram-primary text-[10px] font-semibold hover:bg-telegram-primary/20 transition-colors"
                      >
                        <HelpCircle className="w-3 h-3" />
                        <span>How to use?</span>
                        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showProxyGuide ? 'rotate-180' : ''}`} />
                      </button>
                    </div>

                    {/* How to use Proxy Guide Accordion */}
                    {showProxyGuide && (
                      <div className="mb-4 p-3.5 rounded-xl bg-telegram-bg/80 border border-telegram-border/50 text-[11px] space-y-3 animate-in fade-in duration-200">
                        <div>
                          <h4 className="font-bold text-telegram-text flex items-center gap-1.5 mb-1">
                            <Zap className="w-3.5 h-3.5 text-telegram-primary" />
                            Why use a SOCKS5 Proxy?
                          </h4>
                          <p className="text-telegram-subtext leading-relaxed">
                            Proxy routes Telegram Drive traffic through an alternate server to bypass ISP blocks, censorship, or college/workplace network restrictions.
                          </p>
                        </div>

                        <div className="pt-2 border-t border-telegram-border/30">
                          <h4 className="font-bold text-telegram-text flex items-center gap-1.5 mb-1.5">
                            📱 Option 1: Android Proxy / VPN Apps (Localhost)
                          </h4>
                          <p className="text-telegram-subtext leading-relaxed mb-2">
                            If you run a local proxy client on your phone, set Host to <strong className="text-telegram-text">127.0.0.1</strong> and port to:
                          </p>
                          <div className="grid grid-cols-2 gap-2 font-mono text-[10px]">
                            <div className="p-2 rounded-lg bg-telegram-surface border border-telegram-border/30">
                              <span className="text-telegram-subtext block text-[9px]">v2rayNG / Xray:</span>
                              <span className="text-telegram-text font-bold">127.0.0.1 : 10808</span>
                            </div>
                            <div className="p-2 rounded-lg bg-telegram-surface border border-telegram-border/30">
                              <span className="text-telegram-subtext block text-[9px]">Shadowsocks:</span>
                              <span className="text-telegram-text font-bold">127.0.0.1 : 1080</span>
                            </div>
                            <div className="p-2 rounded-lg bg-telegram-surface border border-telegram-border/30">
                              <span className="text-telegram-subtext block text-[9px]">Orbot (Tor):</span>
                              <span className="text-telegram-text font-bold">127.0.0.1 : 9050</span>
                            </div>
                            <div className="p-2 rounded-lg bg-telegram-surface border border-telegram-border/30">
                              <span className="text-telegram-subtext block text-[9px]">Clash / sing-box:</span>
                              <span className="text-telegram-text font-bold">127.0.0.1 : 7890</span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-telegram-border/30">
                          <h4 className="font-bold text-telegram-text flex items-center gap-1.5 mb-1">
                            🌐 Option 2: Remote SOCKS5 Server
                          </h4>
                          <ul className="text-telegram-subtext list-disc list-inside space-y-1 leading-relaxed">
                            <li><strong className="text-telegram-text">Host:</strong> Enter proxy server IP or domain (e.g., <span className="font-mono text-[10px]">198.51.100.2</span>).</li>
                            <li><strong className="text-telegram-text">Port:</strong> Enter port provided by your proxy provider (e.g., <span className="font-mono text-[10px]">1080</span>).</li>
                            <li><strong className="text-telegram-text">Username &amp; Password:</strong> Fill in only if your proxy requires authentication; otherwise leave empty.</li>
                          </ul>
                        </div>

                        <div className="pt-2 border-t border-telegram-border/30 flex items-center justify-between text-[10px] text-telegram-subtext">
                          <span>💡 Tip: After enabling, tap below to check connection latency.</span>
                          <button
                            type="button"
                            onClick={() => setShowProxyGuide(false)}
                            className="text-telegram-primary font-semibold hover:underline"
                          >
                            Hide Guide
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Enable Proxy Toggle */}
                    <div className="flex items-center justify-between py-2.5 border-b border-telegram-border/20">
                      <div className="pr-3">
                        <p className="text-xs font-semibold text-telegram-text">{t('common.enable_proxy')}</p>
                        <p className="text-[10px] text-telegram-subtext mt-0.5">{t('settings.enable_proxy_desc')}</p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={settings.proxyEnabled}
                        aria-label={t('common.enable_proxy')}
                        onClick={() => updateSetting('proxyEnabled', !settings.proxyEnabled)}
                        className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ${settings.proxyEnabled ? 'bg-telegram-primary' : 'bg-telegram-border'}`}
                      >
                        <span className={`absolute top-0.5 start-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${settings.proxyEnabled ? 'translate-x-5 rtl:-translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    {/* Proxy Type */}
                    <div className="flex items-center justify-between py-2.5 border-b border-telegram-border/20">
                      <div>
                        <p className="text-xs font-semibold text-telegram-text">{t('common.proxy_type')}</p>
                        <p className="text-[10px] text-telegram-subtext">{t('settings.socks5_desc_mobile')}</p>
                      </div>
                      <div className="relative">
                        <select
                          value={settings.proxyType}
                          onChange={e => updateSetting('proxyType', e.target.value as 'socks5')}
                          className="appearance-none bg-telegram-bg border border-telegram-border/50 rounded-xl pl-3 pr-8 py-1.5 text-xs text-telegram-text focus:outline-none focus:border-telegram-primary/50 transition cursor-pointer"
                        >
                          <option value="socks5">SOCKS5</option>
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-telegram-subtext absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    {/* Host */}
                    <div className="flex items-center justify-between py-2.5 border-b border-telegram-border/20">
                      <div>
                        <p className="text-xs font-semibold text-telegram-text">{t('common.host')}</p>
                        <p className="text-[10px] text-telegram-subtext">{t('settings.host_desc')}</p>
                      </div>
                      <input
                        type="text"
                        placeholder="127.0.0.1"
                        value={settings.proxyHost}
                        onChange={e => updateSetting('proxyHost', e.target.value)}
                        className="w-36 bg-telegram-bg border border-telegram-border/50 rounded-xl px-3 py-1.5 text-xs text-telegram-text text-right focus:outline-none focus:border-telegram-primary/50 transition placeholder:text-telegram-subtext/40"
                      />
                    </div>

                    {/* Port */}
                    <div className="flex items-center justify-between py-2.5 border-b border-telegram-border/20">
                      <div>
                        <p className="text-xs font-semibold text-telegram-text">{t('common.port')}</p>
                        <p className="text-[10px] text-telegram-subtext">{t('settings.port_desc')}</p>
                      </div>
                      <input
                        type="number"
                        min="1"
                        max="65535"
                        value={settings.proxyPort}
                        onChange={e => updateSetting('proxyPort', Math.max(1, Math.min(65535, parseInt(e.target.value) || 1080)))}
                        className="w-24 bg-telegram-bg border border-telegram-border/50 rounded-xl px-3 py-1.5 text-xs text-telegram-text text-center focus:outline-none focus:border-telegram-primary/50 transition"
                      />
                    </div>

                    {/* SOCKS5 auth fields */}
                    {settings.proxyType === 'socks5' && (
                      <>
                        <div className="flex items-center justify-between py-2.5 border-b border-telegram-border/20">
                          <div>
                            <p className="text-xs font-semibold text-telegram-text">{t('common.username')}</p>
                            <p className="text-[10px] text-telegram-subtext">{t('settings.optional')}</p>
                          </div>
                          <input
                            type="text"
                            placeholder={t('settings.optional')}
                            value={settings.proxyUsername}
                            onChange={e => updateSetting('proxyUsername', e.target.value)}
                            className="w-36 bg-telegram-bg border border-telegram-border/50 rounded-xl px-3 py-1.5 text-xs text-telegram-text text-right focus:outline-none focus:border-telegram-primary/50 transition placeholder:text-telegram-subtext/40"
                          />
                        </div>
                        <div className="flex items-center justify-between py-2.5 border-b border-telegram-border/20">
                          <div>
                            <p className="text-xs font-semibold text-telegram-text">{t('common.password')}</p>
                            <p className="text-[10px] text-telegram-subtext">{t('settings.optional')}</p>
                          </div>
                          <input
                            type="password"
                            placeholder={t('settings.optional')}
                            value={settings.proxyPassword}
                            onChange={e => updateSetting('proxyPassword', e.target.value)}
                            className="w-36 bg-telegram-bg border border-telegram-border/50 rounded-xl px-3 py-1.5 text-xs text-telegram-text text-right focus:outline-none focus:border-telegram-primary/50 transition placeholder:text-telegram-subtext/40"
                          />
                        </div>
                      </>
                    )}

                    {/* Info note */}
                    <div className="mt-3 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                      <p className="text-[10px] text-yellow-300 leading-relaxed">
                        {t('settings.proxy_reconnect_note')}
                      </p>
                    </div>
                  </section>
                )}

                {/* 9. Media & Playback Subpage (Android) */}
                {settingsSubpage === 'media' && isAndroid && (
                  <section className="rounded-2xl bg-telegram-surface/80 border border-telegram-border/50 p-4 shadow-sm backdrop-blur-md" aria-labelledby="android-media-title">
                    <div className="flex items-center gap-2 mb-3 text-telegram-primary">
                      <Film className="w-3.5 h-3.5" />
                      <h3 id="android-media-title" className="text-[11px] font-bold uppercase tracking-wider">Media &amp; playback</h3>
                    </div>
                    <MobileSettingToggle checked={settings.androidPrivateMediaMetadata} label="Private system metadata" description="Show “Private media” instead of filenames on lock screen &amp; Bluetooth." onChange={() => updateSetting('androidPrivateMediaMetadata', !settings.androidPrivateMediaMetadata)} />
                    <div className="grid grid-cols-3 gap-2 py-3">
                      <label className="text-[10px] text-telegram-subtext">Playback speed<select value={settings.androidPlaybackSpeed} onChange={event => updateSetting('androidPlaybackSpeed', Number(event.target.value))} className="mt-1 min-h-10 w-full rounded-xl border border-telegram-border/50 bg-telegram-bg px-2 text-xs text-telegram-text">{[0.5, 0.75, 1, 1.25, 1.5, 2].map(value => <option key={value} value={value}>{value}×</option>)}</select></label>
                      <label className="text-[10px] text-telegram-subtext">Movie orientation<select value={settings.androidMediaOrientation} onChange={event => updateSetting('androidMediaOrientation', event.target.value as 'auto' | 'landscape' | 'portrait')} className="mt-1 min-h-10 w-full rounded-xl border border-telegram-border/50 bg-telegram-bg px-2 text-xs text-telegram-text"><option value="auto">{i18n.t("settings.auto")}</option><option value="landscape">Landscape</option><option value="portrait">Portrait</option></select></label>
                      <label className="text-[10px] text-telegram-subtext">Subtitle size<select value={settings.androidSubtitleScale} onChange={event => updateSetting('androidSubtitleScale', Number(event.target.value))} className="mt-1 min-h-10 w-full rounded-xl border border-telegram-border/50 bg-telegram-bg px-2 text-xs text-telegram-text"><option value={0.8}>Small</option><option value={1}>Default</option><option value={1.25}>Large</option><option value={1.5}>Extra large</option></select></label>
                    </div>
                    <p className="text-[10px] leading-4 text-telegram-subtext">Audio/subtitle track selection and playback position are saved per file.</p>
                  </section>
                )}

                {/* 10. Privacy & Supporter Subpage */}
                {settingsSubpage === 'supporter' && (
                  <section className="rounded-2xl bg-telegram-surface/80 border border-telegram-border/50 p-4 shadow-sm backdrop-blur-md">
                    <div className="flex items-center gap-2 mb-3 text-telegram-primary">
                      <Shield className="w-3.5 h-3.5" />
                      <h3 className="text-[11px] font-bold uppercase tracking-wider">Privacy &amp; Support</h3>
                    </div>
                    <div id="mobile-supporter-card" className="scroll-mt-24 mb-3">
                      <MobileSupporterCard />
                    </div>
                    <div className="w-full space-y-2">
                      <button
                        type="button"
                        onClick={() => setShowHelp(true)}
                        className="w-full flex items-center justify-center gap-2 rounded-xl border border-telegram-border/50 bg-telegram-bg/50 px-3 py-2.5 text-xs font-semibold text-telegram-text hover:bg-telegram-hover/30 active:scale-95 transition-all"
                      >
                        <HelpCircle className="h-4 w-4 text-telegram-primary" aria-hidden="true" />
                        Help &amp; FAQ
                      </button>
                      <button
                        type="button"
                        onClick={handleContactDeveloper}
                        className="w-full flex items-center justify-center gap-2 rounded-xl border border-telegram-primary/30 bg-telegram-primary/10 px-3 py-2.5 text-xs font-semibold text-telegram-primary hover:bg-telegram-primary/20 active:scale-95 transition-all"
                      >
                        <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-1.97 9.289c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.26 14.4l-2.95-.924c-.643-.204-.657-.643.136-.953l11.526-4.447c.537-.194 1.006.131.59.172z"/>
                        </svg>
                        Contact Developer · @Theexposes
                      </button>
                    </div>
                    <p className="text-[10px] leading-relaxed text-telegram-subtext mt-3">All Telegram tokens and credentials remain encrypted exclusively on your local device. Transfers connect directly to Telegram.</p>
                  </section>
                )}

                {/* 11. Software Updates Subpage */}
                {settingsSubpage === 'updates' && (
                  <section className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-200">
                    {/* Top Version Card */}
                    <div className="relative rounded-3xl overflow-hidden border border-emerald-500/30 shadow-xl bg-gradient-to-br from-emerald-500/10 via-telegram-surface/90 to-sky-500/10 backdrop-blur-xl p-5 space-y-4 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-sky-500 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/25">
                          <Download className="w-7 h-7" />
                        </div>
                        <div>
                          <h3 className="text-base font-black text-telegram-text">Software Updates</h3>
                          <p className="text-xs text-telegram-subtext mt-0.5">
                            Keep TG Drive secure, ultra-fast &amp; up-to-date
                          </p>
                        </div>
                      </div>

                      {/* Current vs New Version Comparison Grid */}
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div className="p-3.5 rounded-2xl bg-telegram-bg/60 border border-telegram-border/50 text-left">
                          <span className="text-[10px] uppercase font-bold text-telegram-subtext tracking-wider block mb-1">
                            Installed Version
                          </span>
                          <span className="text-sm font-black font-mono text-telegram-text block">
                            v{appVersion}
                          </span>
                          <span className="text-[10px] text-emerald-400 font-semibold inline-flex items-center gap-1 mt-1">
                            <CheckCircle2 className="w-3 h-3" /> Current Build
                          </span>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-telegram-bg/60 border border-telegram-border/50 text-left">
                          <span className="text-[10px] uppercase font-bold text-telegram-subtext tracking-wider block mb-1">
                            Latest Version
                          </span>
                          <span className={`text-sm font-black font-mono block ${updateAvailable ? 'text-amber-400' : 'text-telegram-primary'}`}>
                            {updateVersion ? `v${updateVersion}` : (updateChecking ? 'Checking…' : `v${appVersion}`)}
                          </span>
                          <span className={`text-[10px] font-semibold inline-flex items-center gap-1 mt-1 ${updateAvailable ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {updateAvailable ? (
                              <>
                                <Sparkles className="w-3 h-3 animate-pulse" /> New Update Ready
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-3 h-3" /> Up to Date
                              </>
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Status / Error Banner */}
                      {updateError && (
                        <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/25 text-left flex items-start gap-2.5">
                          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                          <div className="text-xs">
                            <p className="font-bold text-red-400">Update Check Notice</p>
                            <p className="text-[11px] text-telegram-subtext mt-0.5">{updateError}</p>
                          </div>
                        </div>
                      )}

                      {/* Progress Bar if Downloading */}
                      {updateDownloading && (
                        <div className="space-y-2 p-3.5 rounded-2xl bg-telegram-bg/70 border border-telegram-primary/30">
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className="text-telegram-primary flex items-center gap-1.5">
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              {updatePhase === 'verifying' ? 'Verifying signed package…' : updatePhase === 'installing' ? 'Launching installer…' : `Downloading update…`}
                            </span>
                            <span className="font-mono text-telegram-text">{updateProgress}%</span>
                          </div>
                          <div className="h-2 w-full bg-telegram-border/50 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-telegram-primary to-emerald-400 rounded-full transition-all duration-300"
                              style={{ width: `${updateProgress}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-telegram-subtext text-center">
                            Please keep the app open while the update package is verified.
                          </p>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="space-y-2 pt-1">
                        {updateAvailable && !updateDownloading ? (
                          <button
                            type="button"
                            onClick={() => void downloadAndInstallUpdate()}
                            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-500 to-sky-500 hover:brightness-110 active:scale-[0.98] text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all"
                          >
                            <Download className="w-4 h-4" />
                            <span>{updateManagedByPkg ? 'Open GitHub Release Page' : `Install Update (v${updateVersion})`}</span>
                          </button>
                        ) : !updateDownloading ? (
                          <button
                            type="button"
                            onClick={() => void checkForUpdates()}
                            disabled={updateChecking}
                            className="w-full py-3.5 px-4 rounded-2xl bg-telegram-primary text-black font-black text-xs hover:bg-telegram-primary/90 active:scale-[0.98] shadow-md shadow-telegram-primary/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                          >
                            <RefreshCw className={`w-4 h-4 ${updateChecking ? 'animate-spin' : ''}`} />
                            <span>{updateChecking ? 'Checking for Updates…' : 'Check for Updates Now'}</span>
                          </button>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => void openExternalUrl(RELEASES_URL)}
                          className="w-full py-2.5 px-3 rounded-xl bg-telegram-bg/50 hover:bg-telegram-hover active:scale-[0.98] border border-telegram-border/40 text-telegram-subtext hover:text-telegram-text font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all"
                        >
                          <Globe className="w-3.5 h-3.5" />
                          <span>View Official GitHub Releases</span>
                        </button>
                      </div>
                    </div>

                    {/* Changelog & Technical Specifications */}
                    <div className="rounded-2xl bg-telegram-surface/80 border border-telegram-border/50 p-4 shadow-sm backdrop-blur-md space-y-3 text-xs">
                      <div className="flex items-center gap-2 text-telegram-primary font-bold uppercase tracking-wider text-[11px]">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Build Specifications &amp; Features</span>
                      </div>

                      <div className="space-y-2 text-telegram-subtext text-[11px] leading-relaxed">
                        <div className="p-2.5 rounded-xl bg-telegram-bg/40 border border-telegram-border/30 flex items-start gap-2">
                          <span className="text-emerald-400 font-bold">⚡</span>
                          <div>
                            <strong className="text-telegram-text">MTProto 2.0 High-Speed Engine:</strong> 100 MB/s dynamic chunking and parallel connection pipeline.
                          </div>
                        </div>

                        <div className="p-2.5 rounded-xl bg-telegram-bg/40 border border-telegram-border/30 flex items-start gap-2">
                          <span className="text-sky-400 font-bold">🛡️</span>
                          <div>
                            <strong className="text-telegram-text">TDENC2 Zero-Knowledge Vault:</strong> Full AEAD client-side encryption for private photos and documents.
                          </div>
                        </div>

                        <div className="p-2.5 rounded-xl bg-telegram-bg/40 border border-telegram-border/30 flex items-start gap-2">
                          <span className="text-purple-400 font-bold">📱</span>
                          <div>
                            <strong className="text-telegram-text">Permanent Telegram Binding:</strong> Seamless cross-device license activation with zero repeated prompts.
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>
                )}

                {/* 12. Account & Telegram Session Subpage */}
                {settingsSubpage === 'account' && (
                  <section className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-200">
                    {/* Hero Identity Card */}
                    <div className="relative rounded-3xl overflow-hidden border border-sky-500/30 shadow-xl bg-gradient-to-br from-sky-500/10 via-telegram-surface/90 to-indigo-500/10 backdrop-blur-xl p-5 space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="relative shrink-0">
                          <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-2xl sm:text-3xl shadow-xl ring-2 ring-white/20">
                            {userProfile?.firstName ? userProfile.firstName.charAt(0).toUpperCase() : <User className="w-9 h-9 sm:w-10 sm:h-10" />}
                          </div>
                          {userProfile?.isPremium && (
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-500 text-black flex items-center justify-center text-xs font-black shadow-lg ring-2 ring-telegram-surface" title="Telegram Premium">
                              ★
                            </div>
                          )}
                          {isConnected && (
                            <span className="absolute -top-1 -right-1 flex h-4 w-4">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 ring-2 ring-telegram-surface" />
                            </span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <h2 className="text-xl font-black text-telegram-text tracking-tight truncate leading-tight">
                            {userProfile ? `${userProfile.firstName} ${userProfile.lastName || ''}`.trim() : 'Telegram Account'}
                          </h2>
                          {userProfile?.username ? (
                            <p className="text-sm font-bold text-telegram-primary truncate mt-0.5">@{userProfile.username}</p>
                          ) : (
                            <p className="text-xs text-telegram-subtext mt-0.5">No username set</p>
                          )}
                          <div className="flex items-center gap-2 flex-wrap mt-2">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${isConnected ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                              {isConnected ? 'Connected · MTProto Active' : 'Disconnected'}
                            </span>
                            {userProfile?.isPremium && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                ★ Premium
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Telegram Identity Credentials Card */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 px-1">
                        <KeyRound className="w-3.5 h-3.5 text-sky-400" />
                        <span className="text-[11px] font-bold uppercase tracking-wider text-telegram-subtext">Telegram Identity &amp; Credentials</span>
                      </div>

                      <div className="rounded-2xl bg-telegram-surface/80 border border-telegram-border/50 divide-y divide-telegram-border/30 overflow-hidden shadow-xs backdrop-blur-md">
                        {/* User ID */}
                        <div className="flex items-center justify-between p-3.5 hover:bg-telegram-hover/30 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-sky-500/15 text-sky-400 border border-sky-500/20 flex items-center justify-center shrink-0">
                              <KeyRound className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="text-xs font-bold text-telegram-text block">Telegram User ID</span>
                              <span className="text-[10px] text-telegram-subtext">Unique 64-bit Telegram account identifier</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => { void copyToClipboard(String(userProfile?.id ?? '')); toast.success('User ID copied to clipboard'); }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-telegram-bg hover:bg-telegram-hover active:scale-95 border border-telegram-border/50 font-mono text-xs font-bold text-telegram-text hover:text-telegram-primary transition-all group"
                            title="Click to copy User ID"
                          >
                            <span>{userProfile?.id ?? '—'}</span>
                            <Copy className="w-3.5 h-3.5 text-telegram-subtext group-hover:text-telegram-primary transition-colors" />
                          </button>
                        </div>

                        {/* Phone Number */}
                        {userProfile?.phone && (
                          <div className="flex items-center justify-between p-3.5 hover:bg-telegram-hover/30 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0">
                                <Smartphone className="w-4 h-4" />
                              </div>
                              <div>
                                <span className="text-xs font-bold text-telegram-text block">Registered Phone</span>
                                <span className="text-[10px] text-telegram-subtext">Account phone linked with Telegram</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => { void copyToClipboard(userProfile.phone || ''); toast.success('Phone number copied to clipboard'); }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-telegram-bg hover:bg-telegram-hover active:scale-95 border border-telegram-border/50 font-mono text-xs font-bold text-telegram-text hover:text-telegram-primary transition-all group"
                              title="Click to copy Phone Number"
                            >
                              <span>{userProfile.phone.startsWith('+') ? userProfile.phone : `+${userProfile.phone}`}</span>
                              <Copy className="w-3.5 h-3.5 text-telegram-subtext group-hover:text-telegram-primary transition-colors" />
                            </button>
                          </div>
                        )}

                        {/* Username */}
                        <div className="flex items-center justify-between p-3.5 hover:bg-telegram-hover/30 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0">
                              <Globe className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="text-xs font-bold text-telegram-text block">Public Username</span>
                              <span className="text-[10px] text-telegram-subtext">Telegram handle for direct mention</span>
                            </div>
                          </div>
                          {userProfile?.username ? (
                            <button
                              type="button"
                              onClick={() => { void copyToClipboard(`@${userProfile.username}`); toast.success('Username copied to clipboard'); }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-telegram-bg hover:bg-telegram-hover active:scale-95 border border-telegram-border/50 text-xs font-bold text-telegram-primary hover:underline transition-all group"
                              title="Click to copy Username"
                            >
                              <span>@{userProfile.username}</span>
                              <Copy className="w-3.5 h-3.5 text-telegram-subtext group-hover:text-telegram-primary transition-colors" />
                            </button>
                          ) : (
                            <span className="text-xs text-telegram-subtext font-medium px-2 py-1">None</span>
                          )}
                        </div>

                        {/* Membership status */}
                        <div className="flex items-center justify-between p-3.5 hover:bg-telegram-hover/30 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
                              <Sparkles className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="text-xs font-bold text-telegram-text block">Telegram Tier</span>
                              <span className="text-[10px] text-telegram-subtext">Telegram Premium subscription status</span>
                            </div>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${userProfile?.isPremium ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : 'bg-telegram-bg text-telegram-subtext border-telegram-border/50'}`}>
                            {userProfile?.isPremium ? '★ Telegram Premium' : 'Standard Account'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* MTProto Session Security Card */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 px-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-[11px] font-bold uppercase tracking-wider text-telegram-subtext">MTProto Session &amp; Security</span>
                      </div>

                      <div className="rounded-2xl bg-telegram-surface/80 border border-telegram-border/50 divide-y divide-telegram-border/30 overflow-hidden shadow-xs backdrop-blur-md text-xs">
                        <div className="flex items-center justify-between p-3.5">
                          <span className="text-telegram-subtext font-medium">Protocol</span>
                          <span className="font-bold text-telegram-text font-mono">MTProto 2.0 (AEAD-IGE)</span>
                        </div>
                        <div className="flex items-center justify-between p-3.5">
                          <span className="text-telegram-subtext font-medium">Session Status</span>
                          <span className={`inline-flex items-center gap-1.5 font-bold ${isConnected ? 'text-emerald-400' : 'text-red-400'}`}>
                            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                            {isConnected ? 'Direct MTProto Active' : 'Disconnected'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-3.5">
                          <span className="text-telegram-subtext font-medium">Key Storage</span>
                          <span className="font-bold text-emerald-400">Local Encrypted Keystore</span>
                        </div>
                        <div className="flex items-center justify-between p-3.5">
                          <span className="text-telegram-subtext font-medium">Zero-Knowledge</span>
                          <span className="font-semibold text-telegram-text">No intermediate cloud proxies</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons: Copy & Logout */}
                    <div className="space-y-3 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          const summary = `Telegram Account Info:\nName: ${userProfile?.firstName || ''} ${userProfile?.lastName || ''}\nUser ID: ${userProfile?.id || ''}\nPhone: ${userProfile?.phone || ''}\nUsername: ${userProfile?.username ? '@' + userProfile.username : 'N/A'}`;
                          void copyToClipboard(summary.trim());
                          toast.success('Account summary copied to clipboard');
                        }}
                        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-telegram-surface hover:bg-telegram-hover active:scale-[0.98] border border-telegram-border/50 text-telegram-text font-bold text-xs shadow-xs transition-all"
                      >
                        <Copy className="w-4 h-4 text-telegram-primary" />
                        <span>Copy Profile Summary</span>
                      </button>

                      {/* Account Termination & Logout */}
                      <div className="rounded-2xl bg-red-500/5 border border-red-500/20 p-4 shadow-sm backdrop-blur-md space-y-3">
                        <div className="flex items-center gap-2">
                          <LogOut className="w-3.5 h-3.5 text-red-400" />
                          <span className="text-[11px] font-bold uppercase tracking-wider text-red-400/90">Session Termination</span>
                        </div>
                        <p className="text-[11px] text-telegram-subtext leading-relaxed">
                          Logging out will safely terminate your local MTProto session and clear encrypted cache from this device. All your cloud files remain safely preserved in Telegram.
                        </p>
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 active:bg-red-500/35 text-red-400 border border-red-500/30 font-bold text-xs active:scale-[0.98] transition-all duration-200 shadow-sm"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>{t('common.logout')}</span>
                        </button>
                      </div>
                    </div>
                  </section>
                )}

                {/* 13. TG Drive Pro & Plans Subpage */}
                {settingsSubpage === 'pro_plans' && (() => {
                  const expiry = licenseManager.getExpiryDetails(mobileLicense?.expiresAt ?? null);
                  const isProActive = Boolean(mobileLicense?.isLicensed);
                  const planType = mobileLicense?.planType;
                  const isTrial = planType === 'trial';
                  const isAnnual = planType === 'annual';
                  const isMonthly = planType === 'monthly';

                  return (
                    <section className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-200">
                      {/* Hero Current License Status Card */}
                      <div className="relative rounded-3xl overflow-hidden border border-amber-500/30 shadow-xl bg-gradient-to-br from-amber-500/15 via-telegram-surface/90 to-purple-500/15 backdrop-blur-xl p-5 space-y-4">
                        <div className="absolute -top-12 -right-12 w-44 h-44 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />

                        {/* Top Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/25">
                              <Zap className="w-6 h-6 fill-slate-950" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h2 className="text-lg font-black text-telegram-text tracking-tight">TG Drive Pro</h2>
                                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                                  isProActive
                                    ? isTrial
                                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                      : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                    : 'bg-red-500/10 text-red-400 border-red-500/20'
                                }`}>
                                  {isProActive ? (isTrial ? '🎁 Free Trial' : isAnnual ? '🌟 Annual Pass' : isMonthly ? '📅 Monthly Pass' : '✓ Lifetime Pro') : '⚡ Free Plan'}
                                </span>
                              </div>
                              <p className="text-xs text-telegram-subtext mt-0.5">
                                {userProfile ? `Linked Telegram ID: ${userProfile.id}` : 'Account Binding Active'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Current Plan Specs Box */}
                        <div className="rounded-2xl bg-telegram-bg/60 border border-telegram-border/50 divide-y divide-telegram-border/30 overflow-hidden text-xs">
                          <div className="flex items-center justify-between px-3.5 py-2.5">
                            <span className="text-telegram-subtext font-medium">Active Status</span>
                            <span className="font-bold text-telegram-text">
                              {isProActive
                                ? (isTrial ? '🎁 Free Trial Pass' : isAnnual ? '🌟 1-Year Annual Pass' : isMonthly ? '📅 1-Month Pass' : '⚡ Lifetime Pro Access')
                                : 'No Active Pro License'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between px-3.5 py-2.5">
                            <span className="text-telegram-subtext font-medium">Plan Validity</span>
                            <span className={`font-semibold ${expiry.isExpired ? 'text-red-400' : expiry.isLifetime ? 'text-emerald-400' : 'text-amber-400'}`}>
                              {isProActive ? expiry.formattedDate : 'Standard Free Tier'}
                            </span>
                          </div>

                          {isProActive && !expiry.isLifetime && (
                            <div className="flex items-center justify-between px-3.5 py-2.5 bg-amber-500/5">
                              <span className="text-amber-300 font-medium flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" />
                                Time Remaining
                              </span>
                              <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                                expiry.isExpired
                                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse'
                              }`}>
                                ⏳ {expiry.countdownText}
                              </span>
                            </div>
                          )}

                          <div className="flex items-center justify-between px-3.5 py-2.5">
                            <span className="text-telegram-subtext font-medium">Cloud Vault &amp; Ads</span>
                            <span className="font-semibold text-emerald-400">
                              {isProActive ? '100% Ad-Free · Turbo Speed' : 'Standard'}
                            </span>
                          </div>
                        </div>

                        {/* Direct Action Buttons */}
                        <div className="flex items-center gap-2 pt-1 flex-wrap">
                          {(!isProActive || isTrial || expiry.isExpired) && (
                            <button
                              type="button"
                              onClick={() => {
                                setExpiredAlertText(expiry.isExpired ? 'Your plan has expired. Please upgrade or purchase a Pro license.' : null);
                                setShowProUpgradeModal(true);
                              }}
                              className="flex-1 min-w-[140px] py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:brightness-110 active:scale-[0.98] text-slate-950 font-black text-xs shadow-md shadow-amber-500/25 flex items-center justify-center gap-2 transition-all"
                            >
                              <Zap className="w-4 h-4 fill-slate-950" />
                              <span>{isTrial ? '🚀 Upgrade to Lifetime' : '🚀 Upgrade to Pro'}</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={handleSyncMobileLicense}
                            disabled={isLicenseSyncing}
                            className="py-3 px-3.5 rounded-xl bg-telegram-surface hover:bg-telegram-hover active:scale-[0.98] border border-telegram-border/50 text-telegram-text font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                            title="Sync License with Telegram Account"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isLicenseSyncing ? 'animate-spin' : ''}`} />
                            <span>{isLicenseSyncing ? 'Syncing…' : 'Sync Status'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setShowManualKeyModal(true)}
                            className="py-3 px-3.5 rounded-xl bg-telegram-surface hover:bg-telegram-hover active:scale-[0.98] border border-telegram-border/50 text-telegram-primary font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                            title="Enter License Key manually"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            <span>Enter Key</span>
                          </button>
                        </div>
                      </div>

                      {/* ── Available Plans Section (Structured Cards) ── */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 px-1">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          <span className="text-[11px] font-bold uppercase tracking-wider text-telegram-subtext">Available Membership Plans</span>
                        </div>

                        {/* Plan Card 1: Lifetime Pro Access (Recommended) */}
                        <div
                          onClick={() => {
                            setExpiredAlertText(null);
                            setShowProUpgradeModal(true);
                          }}
                          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-telegram-surface border-2 border-amber-500/50 p-5 shadow-lg backdrop-blur-xl cursor-pointer active:scale-[0.99] transition-all group hover:border-amber-400"
                        >
                          <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-orange-500 text-slate-950 text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-bl-xl shadow-xs">
                            👑 BEST VALUE · ONE-TIME
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-start justify-between pr-16">
                              <div>
                                <h3 className="text-base font-black text-telegram-text group-hover:text-amber-400 transition-colors flex items-center gap-1.5">
                                  <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                                  Lifetime Pro Access
                                </h3>
                                <p className="text-xs text-telegram-subtext mt-0.5">Pay once, enjoy full Pro privileges forever</p>
                              </div>
                            </div>

                            <div className="flex items-baseline gap-2">
                              <span className="text-2xl font-black text-amber-400 font-mono">₹499</span>
                              <span className="text-xs text-telegram-subtext line-through font-mono">₹1,499</span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">67% OFF</span>
                            </div>

                            <div className="space-y-2 pt-1 border-t border-amber-500/20 text-xs">
                              <div className="flex items-center gap-2 text-telegram-text">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                <span>100% Ad-Free Cloud Vault Forever</span>
                              </div>
                              <div className="flex items-center gap-2 text-telegram-text">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                <span>TDENC2 Zero-Knowledge Military Encryption</span>
                              </div>
                              <div className="flex items-center gap-2 text-telegram-text">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                <span>Maximum Turbo Multi-Chunk Speeds (5x Faster)</span>
                              </div>
                              <div className="flex items-center gap-2 text-telegram-text">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                <span>Multi-Device Sync (Android, PC, Mac, Web)</span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpiredAlertText(null);
                                setShowProUpgradeModal(true);
                              }}
                              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:brightness-110 active:scale-[0.98] text-slate-950 font-black text-xs shadow-md shadow-amber-500/25 flex items-center justify-center gap-2 transition-all mt-2"
                            >
                              <span>Get Lifetime Pro Access</span>
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Plan Card 2: 1-Year Annual Pass */}
                        <div
                          onClick={() => {
                            setExpiredAlertText(null);
                            setShowProUpgradeModal(true);
                          }}
                          className="relative overflow-hidden rounded-2xl bg-telegram-surface/80 border border-telegram-border/60 p-4 shadow-sm backdrop-blur-md cursor-pointer active:scale-[0.99] transition-all hover:border-telegram-primary/40 group"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-sm font-bold text-telegram-text group-hover:text-telegram-primary transition-colors">1-Year Annual Pass</h3>
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30">365 Days</span>
                              </div>
                              <p className="text-[11px] text-telegram-subtext mt-0.5">Full year of high-speed ad-free cloud</p>
                            </div>
                            <div className="text-right">
                              <span className="text-base font-black text-telegram-text font-mono">₹299</span>
                              <span className="text-[10px] text-telegram-subtext block">/ year</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs pt-2 border-t border-telegram-border/30">
                            <span className="text-telegram-subtext">All Pro Features Included</span>
                            <span className="text-telegram-primary font-bold inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                              Select Plan <ChevronRight className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        </div>

                        {/* Plan Card 3: 1-Month Pass */}
                        <div
                          onClick={() => {
                            setExpiredAlertText(null);
                            setShowProUpgradeModal(true);
                          }}
                          className="relative overflow-hidden rounded-2xl bg-telegram-surface/80 border border-telegram-border/60 p-4 shadow-sm backdrop-blur-md cursor-pointer active:scale-[0.99] transition-all hover:border-telegram-primary/40 group"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-sm font-bold text-telegram-text group-hover:text-telegram-primary transition-colors">1-Month Pass</h3>
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">30 Days</span>
                              </div>
                              <p className="text-[11px] text-telegram-subtext mt-0.5">Flexible short-term Pro pass</p>
                            </div>
                            <div className="text-right">
                              <span className="text-base font-black text-telegram-text font-mono">₹49</span>
                              <span className="text-[10px] text-telegram-subtext block">/ month</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs pt-2 border-t border-telegram-border/30">
                            <span className="text-telegram-subtext">Cancel anytime, full Pro access</span>
                            <span className="text-telegram-primary font-bold inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                              Select Plan <ChevronRight className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* ── Feature Comparison Grid ── */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 px-1">
                          <Shield className="w-3.5 h-3.5 text-telegram-primary" />
                          <span className="text-[11px] font-bold uppercase tracking-wider text-telegram-subtext">Pro Superpowers &amp; Features</span>
                        </div>

                        <div className="grid grid-cols-1 gap-2.5">
                          <div className="p-3.5 rounded-2xl bg-telegram-surface/80 border border-telegram-border/50 flex items-start gap-3 backdrop-blur-md">
                            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/25 flex items-center justify-center shrink-0">
                              <Zap className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-telegram-text">5x Turbo Multi-Chunk Engine</h4>
                              <p className="text-[11px] text-telegram-subtext mt-0.5 leading-relaxed">
                                Parallel download and upload streams maximize Telegram datacenter transfer speeds.
                              </p>
                            </div>
                          </div>

                          <div className="p-3.5 rounded-2xl bg-telegram-surface/80 border border-telegram-border/50 flex items-start gap-3 backdrop-blur-md">
                            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 flex items-center justify-center shrink-0">
                              <ShieldCheck className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-telegram-text">TDENC2 Zero-Knowledge Vault</h4>
                              <p className="text-[11px] text-telegram-subtext mt-0.5 leading-relaxed">
                                Military AEAD client-side encryption keeps private photos and documents invisible to everyone.
                              </p>
                            </div>
                          </div>

                          <div className="p-3.5 rounded-2xl bg-telegram-surface/80 border border-telegram-border/50 flex items-start gap-3 backdrop-blur-md">
                            <div className="w-9 h-9 rounded-xl bg-sky-500/15 text-sky-400 border border-sky-500/25 flex items-center justify-center shrink-0">
                              <Sparkles className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-telegram-text">100% Ad-Free Experience</h4>
                              <p className="text-[11px] text-telegram-subtext mt-0.5 leading-relaxed">
                                Pure clean interface with zero third-party banners, popup interstitials, or sponsored delays.
                              </p>
                            </div>
                          </div>

                          <div className="p-3.5 rounded-2xl bg-telegram-surface/80 border border-telegram-border/50 flex items-start gap-3 backdrop-blur-md">
                            <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/25 flex items-center justify-center shrink-0">
                              <Smartphone className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-telegram-text">Permanent Telegram Cloud Binding</h4>
                              <p className="text-[11px] text-telegram-subtext mt-0.5 leading-relaxed">
                                Your Pro license automatically activates on any device logged into your Telegram ID.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* ── Help & Contact Developer ── */}
                      <div className="pt-2 space-y-2">
                        <button
                          type="button"
                          onClick={() => setShowHelp(true)}
                          className="w-full flex items-center justify-center gap-2 rounded-xl border border-telegram-border/50 bg-telegram-surface/80 px-3 py-2.5 text-xs font-semibold text-telegram-text hover:bg-telegram-hover/30 active:scale-95 transition-all"
                        >
                          <HelpCircle className="h-4 w-4 text-telegram-primary" />
                          Pro License FAQ &amp; Support
                        </button>
                        <button
                          type="button"
                          onClick={handleContactDeveloper}
                          className="w-full flex items-center justify-center gap-2 rounded-xl border border-telegram-primary/30 bg-telegram-primary/10 px-3 py-2.5 text-xs font-semibold text-telegram-primary hover:bg-telegram-primary/20 active:scale-95 transition-all"
                        >
                          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-1.97 9.289c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.26 14.4l-2.95-.924c-.643-.204-.657-.643.136-.953l11.526-4.447c.537-.194 1.006.131.59.172z"/>
                          </svg>
                          Contact Developer · @Theexposes
                        </button>
                      </div>
                    </section>
                  );
                })()}
              </div>
            )}

        {/* ── Profile Tab ─────────────────────────────────────────────── */}
        {activeTab === 'profile' && settingsSubpage === null && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-200 pb-36 sm:pb-40">

            {/* ── Profile Identity Header Banner ── */}
            <div className="relative rounded-3xl overflow-hidden border border-telegram-border/60 shadow-xl bg-telegram-surface/80 backdrop-blur-xl p-4.5 sm:p-5">
              <div className="absolute -top-16 -right-16 w-48 h-48 bg-gradient-to-br from-sky-500/20 to-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                  <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-2xl shadow-xl ring-2 ring-white/20">
                    {userProfile?.firstName ? userProfile.firstName.charAt(0).toUpperCase() : <User className="w-8 h-8" />}
                  </div>
                  {userProfile?.isPremium && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-black flex items-center justify-center text-[10px] font-black shadow-lg ring-2 ring-telegram-surface" title="Telegram Premium">
                      ★
                    </div>
                  )}
                  {isConnected && (
                    <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 ring-2 ring-telegram-surface" />
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="text-lg sm:text-xl font-black text-telegram-text tracking-tight truncate leading-tight">
                    {userProfile ? `${userProfile.firstName} ${userProfile.lastName || ''}`.trim() : 'Telegram User'}
                  </h2>
                  {userProfile?.username ? (
                    <p className="text-xs font-bold text-telegram-primary truncate mt-0.5">@{userProfile.username}</p>
                  ) : (
                    <p className="text-xs text-telegram-subtext truncate mt-0.5">ID: {userProfile?.id ?? '—'}</p>
                  )}
                  <div className="flex items-center gap-2 flex-wrap mt-2">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${isConnected ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                      {isConnected ? 'Online · MTProto' : 'Offline'}
                    </span>
                    {userProfile?.isPremium && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        ★ Premium
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Main Profile Navigation Bars (Account & TG Drive Pro) ── */}
            <div className="space-y-2.5">
              {/* Bar 1: Telegram Account & Session Details */}
              <SettingsMenuCard
                icon={User}
                iconBgClass="bg-gradient-to-br from-sky-500/20 to-indigo-500/20"
                iconBorderClass="border-sky-500/30"
                iconColorClass="text-sky-400"
                title="Telegram Account & Session"
                subtitle={`ID: ${userProfile?.id ?? '—'} · ${userProfile?.phone ? (userProfile.phone.startsWith('+') ? userProfile.phone : '+' + userProfile.phone) : 'Session Active'}`}
                badge={
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${isConnected ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                    {isConnected ? '🟢 Online' : '🔴 Offline'}
                  </span>
                }
                onClick={() => openSettingsSubpage('account')}
              />

              {/* Bar 2: TG Drive Pro & Subscription Plans */}
              {(() => {
                const expiry = licenseManager.getExpiryDetails(mobileLicense?.expiresAt ?? null);
                const isProActive = Boolean(mobileLicense?.isLicensed);
                const planType = mobileLicense?.planType;
                const isTrial = planType === 'trial';
                const isAnnual = planType === 'annual';
                const isMonthly = planType === 'monthly';

                return (
                  <div
                    onClick={() => openSettingsSubpage('pro_plans')}
                    className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-telegram-surface border border-amber-500/35 p-4 shadow-md backdrop-blur-md cursor-pointer active:scale-[0.98] transition-all group hover:border-amber-500/50"
                  >
                    <div className="absolute -top-10 -right-10 w-28 h-28 bg-amber-500/20 rounded-full blur-xl pointer-events-none" />
                    <div className="relative flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/20 shrink-0 group-hover:scale-105 transition-transform">
                          <Zap className="w-6 h-6 fill-slate-950" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-telegram-text group-hover:text-amber-400 transition-colors">
                              TG Drive Pro &amp; Plans
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                              isProActive
                                ? isTrial
                                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-400 border-amber-500/30 animate-pulse'
                            }`}>
                              {isProActive ? (isTrial ? '🎁 Free Trial' : isAnnual ? '🌟 Annual' : isMonthly ? '📅 Monthly' : '⚡ Lifetime') : '🚀 Upgrade'}
                            </span>
                          </div>
                          <p className="text-[11px] text-telegram-subtext mt-0.5 truncate">
                            {isProActive
                              ? (expiry.isLifetime ? 'Lifetime Access · VIP Features Active' : `Valid until ${expiry.formattedDate} · Tap to view`)
                              : 'Unlock Turbo Speed, Ad-Free & Unlimited Downloads'}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-telegram-subtext group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* ── Affiliate & Partner Program: Refer & Earn and Earnings & Withdrawals ── */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 px-1">
                <Gift className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-telegram-subtext">Affiliate &amp; Partner Program</span>
              </div>

              {/* Card 1: Refer & Earn Real Cash */}
              <div 
                onClick={() => window.dispatchEvent(new CustomEvent('open-referral-screen'))}
                className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-telegram-surface border border-amber-500/30 p-4 shadow-sm backdrop-blur-md cursor-pointer active:scale-[0.98] transition-all group"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/20 shrink-0 group-hover:scale-105 transition-transform">
                      <Gift className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-telegram-text group-hover:text-amber-400 transition-colors">Refer &amp; Earn Real Cash</span>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">₹50 / Sale</span>
                      </div>
                      <p className="text-[11px] text-telegram-subtext mt-0.5">
                        Share your invite link, friends get 10% off, you earn ₹50 per friend!
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-telegram-subtext group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>
              </div>

              {/* Card 2: Earnings & Withdrawals */}
              <div 
                onClick={() => window.dispatchEvent(new CustomEvent('open-withdrawal-screen'))}
                className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-500/15 via-blue-500/10 to-telegram-surface border border-cyan-500/30 p-4 shadow-sm backdrop-blur-md cursor-pointer active:scale-[0.98] transition-all group"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-slate-950 font-black shadow-md shadow-cyan-500/20 shrink-0 group-hover:scale-105 transition-transform">
                      <Wallet className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-telegram-text group-hover:text-cyan-400 transition-colors">Earnings &amp; Withdrawals</span>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">Instant Payout</span>
                      </div>
                      <p className="text-[11px] text-telegram-subtext mt-0.5">
                        Check wallet balance, request UPI/Bank payout &amp; view transaction history.
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-telegram-subtext group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>
              </div>
            </div>

            {/* ── Security & Cloud Services Section ── */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 px-1">
                <Shield className="w-3.5 h-3.5 text-telegram-primary" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-telegram-subtext">Security & Cloud Services</span>
              </div>

              {/* ── Cloud Vault & Encryption Card ── */}
              <SettingsMenuCard
                icon={Shield}
                iconBgClass="bg-emerald-500/15"
                iconBorderClass="border-emerald-500/30"
                iconColorClass="text-emerald-400"
                title="Cloud Vault & Encryption"
                subtitle="Master passphrase, zero-knowledge encryption & safe previews"
                badge={
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${vaultStatus?.is_unlocked ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/15 text-amber-400 border-amber-500/30'}`}>
                    {vaultStatus?.is_unlocked ? '🔓 Unlocked' : '🔒 Locked'}
                  </span>
                }
                onClick={() => openSettingsSubpage('vault')}
              />

              {/* ── Auto-Backup & Sync Card ── */}
              <SettingsMenuCard
                icon={Cloud}
                iconBgClass="bg-teal-500/15"
                iconBorderClass="border-teal-500/30"
                iconColorClass="text-teal-400"
                title="Auto-Backup & Sync"
                subtitle="Camera roll, media & folder automated cloud sync"
                badge={
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${syncSettings.data?.enabled ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-telegram-hover/40 text-telegram-subtext border-telegram-border/50'}`}>
                    {syncSettings.data?.enabled ? 'Active' : 'Off'}
                  </span>
                }
                onClick={handleOpenAutoBackup}
              />
            </div>

            {/* ── Storage Overview ── */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 px-1">
                <HardDrive className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-telegram-subtext">Storage & Cache</span>
              </div>

              <div className="rounded-2xl bg-telegram-surface/80 border border-telegram-border/50 p-4 shadow-sm backdrop-blur-md space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-telegram-bg/50 border border-telegram-border/30 flex flex-col justify-between space-y-1">
                    <span className="text-[11px] font-medium text-telegram-subtext flex items-center gap-1.5">
                      <HardDrive className="w-3.5 h-3.5 text-purple-400" />
                      Offline Cache
                    </span>
                    <div>
                      <span className="text-sm font-bold text-telegram-text block">
                        {offlineCache?.file_count ? `${offlineCache.file_count} files` : '0 files'}
                      </span>
                      <span className="text-[10px] text-telegram-subtext">
                        {offlineCache?.total_bytes ? formatBytes(offlineCache.total_bytes) : '0 B'}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-telegram-bg/50 border border-telegram-border/30 flex flex-col justify-between space-y-1">
                    <span className="text-[11px] font-medium text-telegram-subtext flex items-center gap-1.5">
                      <Folder className="w-3.5 h-3.5 text-sky-400" />
                      Active Folders
                    </span>
                    <div>
                      <span className="text-sm font-bold text-telegram-text block">
                        {folders.length} folder{folders.length !== 1 ? 's' : ''}
                      </span>
                      <span className="text-[10px] text-telegram-subtext">
                        Cloud directories
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── App Info & Engine Specs ── */}
            <StructuredBrandCard appVersion={appVersion} />

          </div>
        )}
      </main>


      {/* Slide-out Sidebar Drawer Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-[100] backdrop-blur-sm transition-opacity duration-300 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Slide-out Sidebar Drawer Panel (Right drawer on mobile, Pinned left on desktop) */}
      <aside
        className={`fixed top-0 bottom-0 w-[310px] sm:w-[330px] max-w-[86vw] bg-telegram-surface/98 backdrop-blur-2xl z-[110] shadow-2xl flex flex-col pt-[calc(0.75rem+env(safe-area-inset-top,24px))] pb-[calc(0.75rem+env(safe-area-inset-bottom,16px))] transition-transform duration-300 ease-out md:left-0 md:border-r md:border-telegram-border/60 md:translate-x-0 max-md:right-0 max-md:border-l max-md:border-telegram-border/60 max-md:rounded-l-3xl ${
          isSidebarOpen ? 'translate-x-0' : 'max-md:translate-x-full'
        }`}
        onClick={e => e.stopPropagation()}
        aria-label="Cloud storage folders navigation"
      >
        {/* Drawer Header with Glass Card */}
        <div className="p-4 pb-3 border-b border-telegram-border/40 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-transparent flex items-center justify-center overflow-hidden shrink-0 p-0.5">
                <img src="/inapp_logo.png" className="w-full h-full object-contain bg-transparent" alt="Logo" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="brand-header-title text-sm">
                    <span className="brand-title-telegram">Telegram</span>
                    <span className="brand-title-drive">Drive</span>
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-telegram-primary/15 text-telegram-primary border border-telegram-primary/20">
                    Vault
                  </span>
                </div>
                <span className="text-[11px] text-telegram-subtext font-medium block mt-0.5">
                  Cloud Explorer
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsSidebarOpen(false)}
              className="h-9 w-9 flex items-center justify-center rounded-xl bg-telegram-hover/40 hover:bg-telegram-hover/70 active:scale-95 text-telegram-subtext hover:text-telegram-text text-sm md:hidden transition-all duration-200 border border-telegram-border/30"
              aria-label="Close folders"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Connection Status Badge */}
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-telegram-hover/30 border border-telegram-border/30">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full shrink-0 ${isConnected ? 'bg-emerald-400 animate-pulse shadow-sm shadow-emerald-500/50' : 'bg-red-400'}`} />
              <span className="text-xs font-semibold text-telegram-text">
                {isConnected ? 'Telegram MTProto' : 'Offline'}
              </span>
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${isConnected ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/15 text-red-400 border border-red-500/20'}`}>
              {isConnected ? 'Active' : 'Offline'}
            </span>
          </div>

          {/* User Profile Mini Strip in Drawer */}
          {userProfile && (
            <div className="flex items-center justify-between p-2.5 rounded-2xl bg-telegram-surface border border-telegram-border/40 shadow-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs">
                  {userProfile.firstName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-telegram-text truncate leading-tight">
                    {userProfile.firstName} {userProfile.lastName || ''}
                  </p>
                  <p className="text-[10px] text-telegram-primary truncate">
                    {userProfile.username ? `@${userProfile.username}` : (userProfile.phone || 'Connected')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="p-1.5 rounded-xl text-red-400 hover:bg-red-500/10 active:scale-95 transition"
                title={t('common.logout')}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Search / Filter Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-telegram-subtext absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={folderSearch}
              onChange={e => setFolderSearch(e.target.value)}
              placeholder="Search folders or channels..."
              className="w-full bg-telegram-bg/70 border border-telegram-border/40 rounded-xl pl-8 pr-7 py-1.5 text-xs text-telegram-text placeholder:text-telegram-subtext/60 focus:outline-none focus:border-telegram-primary/50 transition-colors"
            />
            {folderSearch && (
              <button
                onClick={() => setFolderSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-telegram-subtext hover:text-telegram-text p-0.5 rounded-full"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Folder List */}
        <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto min-h-0">
          {/* Section: Primary Storage */}
          <div>
            <p className="text-[10px] font-bold text-telegram-subtext/75 uppercase tracking-wider px-2 mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-telegram-primary" />
              Primary Storage
            </p>
            <button
              onClick={() => {
                handleSwitchTab('home');
                setIsSidebarOpen(false);
              }}
              className={`w-full group text-left p-3 rounded-2xl transition-all duration-200 border flex items-center justify-between ${
                activeFolderId === null
                  ? 'bg-telegram-primary/15 border-telegram-primary/40 shadow-sm shadow-telegram-primary/5'
                  : 'bg-telegram-hover/20 hover:bg-telegram-hover/40 border-telegram-border/30 hover:border-telegram-border/50'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  activeFolderId === null
                    ? 'bg-telegram-primary text-black shadow-sm'
                    : 'bg-telegram-hover/60 text-telegram-primary border border-telegram-border/30'
                }`}>
                  <Bookmark className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className={`text-xs font-bold truncate leading-tight ${activeFolderId === null ? 'text-telegram-primary' : 'text-telegram-text'}`}>
                    {i18n.t("common.saved_messages")}
                  </p>
                  <p className="text-[10px] text-telegram-subtext mt-0.5 truncate">Default Cloud Vault</p>
                </div>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                activeFolderId === null
                  ? 'bg-telegram-primary/20 text-telegram-primary font-bold'
                  : 'bg-telegram-hover/40 text-telegram-subtext'
              }`}>
                {activeFolderId === null ? 'Active' : 'Main'}
              </span>
            </button>
          </div>

          {/* Section: Channels & Folders */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-2">
              <p className="text-[10px] font-bold text-telegram-subtext/75 uppercase tracking-wider flex items-center gap-1.5">
                <Folder className="w-3 h-3 text-telegram-primary" />
                Folders & Channels ({folders.length})
              </p>
              <button
                onClick={handleSyncFolders}
                disabled={isSyncing}
                title="Sync folders"
                className="p-1.5 rounded-xl text-telegram-subtext hover:text-telegram-primary hover:bg-telegram-hover/40 transition-colors disabled:opacity-40"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {filteredFolders.length === 0 ? (
              <div className="text-center py-6 px-4 rounded-2xl bg-telegram-hover/10 border border-dashed border-telegram-border/40">
                <Folder className="w-6 h-6 text-telegram-subtext/40 mx-auto mb-2" />
                <p className="text-xs font-semibold text-telegram-subtext">
                  {folderSearch ? 'No folders match search' : 'No custom channels or folders'}
                </p>
                <p className="text-[10px] text-telegram-subtext/70 mt-1">
                  {folderSearch ? 'Try a different search term' : 'Create a folder to organize your files'}
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {filteredFolders.map(folder => {
                  const isPublic = folder.is_public || !!folder.username;
                  const isActive = activeFolderId === folder.id;
                  return (
                    <div
                      key={folder.id}
                      className={`group rounded-2xl transition-all duration-200 border flex items-center justify-between p-2.5 ${
                        isActive
                          ? 'bg-telegram-primary/15 border-telegram-primary/40 shadow-sm shadow-telegram-primary/5'
                          : 'bg-telegram-hover/20 hover:bg-telegram-hover/40 border-telegram-border/30 hover:border-telegram-border/50'
                      }`}
                    >
                      <button
                        onClick={() => {
                          handleOpenFolderInFilesTab(folder.id);
                          setIsSidebarOpen(false);
                        }}
                        className="flex-1 flex items-center gap-2.5 text-left min-w-0"
                      >
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          isPublic
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                        }`}>
                          {isPublic ? <Globe className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-xs font-semibold truncate leading-tight ${isActive ? 'text-telegram-primary font-bold' : 'text-telegram-text'}`}>
                            {folder.name}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-telegram-subtext">
                              {isPublic ? (folder.username ? `@${folder.username}` : 'Public Channel') : 'Private Channel'}
                            </span>
                            {isActive && (
                              <span className="text-[9px] font-bold text-telegram-primary px-1.5 py-0.2 rounded-full bg-telegram-primary/20">
                                Selected
                              </span>
                            )}
                          </div>
                        </div>
                      </button>

                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setFolderActionMenu(folder);
                        }}
                        className="p-2 rounded-xl text-telegram-subtext hover:text-telegram-text hover:bg-telegram-hover/60 active:scale-90 transition-all duration-200 shrink-0"
                        aria-label="Folder actions"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </nav>

        {/* Action Panel & Bandwidth / Footer */}
        <div className="px-4 py-3 border-t border-telegram-border/40 space-y-3 bg-telegram-surface/50">
          {/* Bandwidth Widget Card */}
          <div className="rounded-xl bg-telegram-hover/20 border border-telegram-border/30 p-2.5">
            <BandwidthWidget bandwidth={bandwidth ?? null} />
          </div>

          {/* Create Folder Button */}
          <button
            onClick={handleOpenCreateFolder}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-telegram-primary text-black hover:bg-telegram-primary/95 font-bold text-xs active:scale-98 transition-all duration-200 shadow-md shadow-telegram-primary/20 cursor-pointer"
          >
            <FolderPlus className="w-4 h-4" />
            Create New Folder
          </button>

          {/* Smart Free Tier Upgrade Ad Banner in Drawer */}
          {!isProUser && (
            <div className="mt-2">
              <SmartAdBanner onUpgrade={handleTriggerPro} variant="compact" />
            </div>
          )}
        </div>
      </aside>

      {/* Folder action popover (replaces swipe-to-reveal) */}
      {folderActionMenu && (
        <ActionPopover
          title={folderActionMenu.name}
          actions={buildFolderActions(folderActionMenu)}
          onClose={() => setFolderActionMenu(null)}
        />
      )}

      {/* Rename folder bottom sheet */}
      {renameFolder && (
        <RenameFolderSheet
          folderId={renameFolder.id}
          currentName={renameFolder.name}
          onRename={handleFolderRename}
          onClose={() => setRenameFolder(null)}
        />
      )}

      {/* Rename file bottom sheet */}
      {renameFileTarget && (
        <RenameFileSheet
          file={renameFileTarget}
          currentName={fileRenames.get(renameFileTarget.id) || renameFileTarget.name}
          onRename={handleRenameSubmit}
          onClose={() => setRenameFileTarget(null)}
        />
      )}

      {/* Create folder bottom sheet */}
      {showCreateFolder && (
        <CreateFolderSheet
          onCreate={handleCreateFolder}
          onClose={() => setShowCreateFolder(false)}
        />
      )}

      {/* Make public channel bottom sheet */}
      {publicChannelTarget && (
        <MakePublicChannelSheet
          folder={publicChannelTarget}
          onConfirm={async (folderId, username) => {
            await handleFolderToggleVisibility(folderId, true, username);
          }}
          onClose={() => setPublicChannelTarget(null)}
        />
      )}

      {/* Floating Bottom Nav Bar (hidden during fullscreen previews) */}
      {!isAnyPreviewOpen && (
        <BottomNavBar
          activeTab={activeTab}
          setActiveTab={handleSwitchTab}
          isAndroid={isAndroid}
          isTelevision={isTelevision}
          activeTransferCount={activeUploadCount + activeDownloadCount + activeDeleteCount}
        />
      )}

      {/* Adsterra Banner (Android only) — z-[60] keeps it above the BottomNavBar (z-50).
           Positioned at bottom-[144px] to sit cleanly above the nav bar (~60px tall, at bottom-20=80px). */}
      {!isAnyPreviewOpen && (
        <div className={`fixed bottom-[144px] left-0 right-0 z-[60] ${isTelevision ? 'tv-sponsor-placement' : ''}`}>
          <AdsterraBanner
            visible={adVisible}
            onSupport={openMobileSupporter}
            onManualDismiss={() => showSupporterOffer('ad_dismissed')}
          />
        </div>
      )}



      {(shareFile || (shareFiles && shareFiles.length > 0)) && (
        <ShareDialog
          file={shareFile}
          files={shareFiles ?? undefined}
          onClose={() => {
            setShareFile(null);
            setShareFiles(null);
          }}
          folders={folders}
          activeFolderId={activeFolderId}
        />
      )}

      {settingsLoaded && !settings.driveTourSeen && (
        <DriveConceptTour
          onFinish={() => updateSetting('driveTourSeen', true)}
          onOpenHelp={() => { updateSetting('driveTourSeen', true); setShowHelp(true); }}
        />
      )}

      {showHelp && <LazyFeatureBoundary><LazyHelpCenterDialog onClose={() => setShowHelp(false)} /></LazyFeatureBoundary>}

      {showProUpgradeModal && (
        <PaywallGateModal
          isOpen={showProUpgradeModal}
          isCompulsory={false}
          triggerFeature={paywallTriggerFeature}
          expiredReason={expiredAlertText}
          onClose={() => setShowProUpgradeModal(false)}
          telegramAccount={{
            userId: userProfile?.id,
            phoneNumber: userProfile?.phone,
            firstName: userProfile?.firstName,
            lastName: userProfile?.lastName,
            username: userProfile?.username,
          }}
          onLogout={handleLogout}
          onActivated={async (lic) => {
            setMobileLicense(lic);
            setShowProUpgradeModal(false);
            setExpiredAlertText(null);
            await refreshStatus();
            toast.success('Telegram Drive Pro activated successfully!');
          }}
        />
      )}

      {supporterOfferTrigger && (
        <SupporterOfferDialog
          trigger={supporterOfferTrigger}
          presentation={isTelevision ? 'tv-dialog' : 'bottom-sheet'}
          onClose={() => setSupporterOfferTrigger(null)}
          onOpenSupporter={openMobileSupporter}
        />
      )}

      {previewFile && (
        <LazyFeatureBoundary>
          <LazyPreviewModal
            file={previewFile}
            initialThumbnail={previewInitialThumbnail}
            activeFolderId={previewFile.folder_id ?? activeFolderId}
            onClose={() => { setPreviewFile(null); setPreviewInitialThumbnail(null); }}
            onNext={handleNextPreview}
            onPrev={handlePrevPreview}
            currentIndex={previewContextIndex}
            totalItems={previewContextFiles.length}
            nextFile={previewNeighbors.nextFile}
            prevFile={previewNeighbors.prevFile}
            onDownload={() => queueDownload(previewFile.id, previewFile.name, previewFile.folder_id ?? activeFolderId, previewFile.size)}
          />
        </LazyFeatureBoundary>
      )}

      {playingFile && (
        <LazyFeatureBoundary>
          <LazyMediaPlayer
            file={playingFile}
            activeFolderId={playingFile.folder_id ?? activeFolderId}
            onClose={() => setPlayingFile(null)}
            onNext={handleNextPreview}
            onPrev={handlePrevPreview}
            currentIndex={previewContextIndex}
            totalItems={previewContextFiles.length}
          />
        </LazyFeatureBoundary>
      )}

      {pdfFile && (
        <LazyFeatureBoundary>
          <LazyPdfViewer
            file={pdfFile}
            activeFolderId={pdfFile.folder_id ?? activeFolderId}
            onClose={() => setPdfFile(null)}
            onNext={handleNextPreview}
            onPrev={handlePrevPreview}
            currentIndex={previewContextIndex}
            totalItems={previewContextFiles.length}
          />
        </LazyFeatureBoundary>
      )}

      {archiveViewFile && (
        <LazyFeatureBoundary>
          <LazyArchiveViewerModal
            file={archiveViewFile}
            activeFolderId={archiveViewFile.folder_id ?? activeFolderId}
            folders={folders}
            onClose={() => setArchiveViewFile(null)}
            onNext={handleNextPreview}
            onPrev={handlePrevPreview}
            currentIndex={previewContextIndex}
            totalItems={previewContextFiles.length}
            nextFile={previewNeighbors.nextFile}
            prevFile={previewNeighbors.prevFile}
          />
        </LazyFeatureBoundary>
      )}

      {docFile && (
        <LazyFeatureBoundary>
          <LazyDocumentViewerModal
            file={docFile}
            activeFolderId={docFile.folder_id ?? activeFolderId}
            onClose={() => setDocFile(null)}
            onNext={handleNextPreview}
            onPrev={handlePrevPreview}
            currentIndex={previewContextIndex}
            totalItems={previewContextFiles.length}
            onDownload={() => queueDownload(docFile.id, docFile.name, docFile.folder_id ?? activeFolderId, docFile.size)}
          />
        </LazyFeatureBoundary>
      )}

      {/* Custom Password Modal (Set / Change / Disable) */}
      {showPinModal !== 'none' && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-telegram-surface border border-telegram-border/60 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-telegram-primary">
                <div className="w-8 h-8 rounded-xl bg-telegram-primary/10 flex items-center justify-center">
                  <KeyRound className="w-4 h-4 text-telegram-primary" />
                </div>
                <h3 className="text-sm font-bold text-telegram-text">
                  {showPinModal === 'set' && 'Set Custom App Password'}
                  {showPinModal === 'change' && 'Change App Password'}
                  {showPinModal === 'disable' && 'Remove Password Protection'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPinModal('none')}
                className="w-8 h-8 rounded-xl hover:bg-telegram-hover/50 text-telegram-subtext hover:text-telegram-text flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-telegram-subtext leading-relaxed">
              {showPinModal === 'set' && 'Enter a 4–12 character PIN or password to secure Telegram Drive.'}
              {showPinModal === 'change' && 'Enter your current password and choose a new password.'}
              {showPinModal === 'disable' && 'Enter your current password to confirm disabling password protection.'}
            </p>

            {pinModalError && (
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 font-medium">
                {pinModalError}
              </div>
            )}

            <form onSubmit={handlePinModalSubmit} className="space-y-3">
              {(showPinModal === 'change' || showPinModal === 'disable') && (
                <div>
                  <label className="block text-[11px] font-semibold text-telegram-subtext mb-1">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPinPassword ? 'text' : 'password'}
                      value={currentPinInput}
                      onChange={e => setCurrentPinInput(e.target.value)}
                      placeholder="Enter current password"
                      autoFocus
                      required
                      className="w-full h-11 px-3 pr-10 rounded-xl bg-telegram-bg border border-telegram-border/50 text-xs text-telegram-text focus:outline-none focus:border-telegram-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPinPassword(!showPinPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-telegram-subtext hover:text-telegram-text"
                    >
                      {showPinPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {(showPinModal === 'set' || showPinModal === 'change') && (
                <>
                  <div>
                    <label className="block text-[11px] font-semibold text-telegram-subtext mb-1">
                      {showPinModal === 'change' ? 'New Password' : 'Password / PIN'}
                    </label>
                    <div className="relative">
                      <input
                        type={showPinPassword ? 'text' : 'password'}
                        value={newPinInput}
                        onChange={e => setNewPinInput(e.target.value)}
                        placeholder="At least 4 characters"
                        autoFocus={showPinModal === 'set'}
                        required
                        className="w-full h-11 px-3 pr-10 rounded-xl bg-telegram-bg border border-telegram-border/50 text-xs text-telegram-text focus:outline-none focus:border-telegram-primary"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPinPassword(!showPinPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-telegram-subtext hover:text-telegram-text"
                      >
                        {showPinPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-telegram-subtext mb-1">
                      Confirm {showPinModal === 'change' ? 'New ' : ''}Password
                    </label>
                    <input
                      type={showPinPassword ? 'text' : 'password'}
                      value={confirmPinInput}
                      onChange={e => setConfirmPinInput(e.target.value)}
                      placeholder="Re-enter password"
                      required
                      className="w-full h-11 px-3 rounded-xl bg-telegram-bg border border-telegram-border/50 text-xs text-telegram-text focus:outline-none focus:border-telegram-primary"
                    />
                  </div>
                </>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPinModal('none')}
                  className="flex-1 h-10 rounded-xl bg-telegram-hover/40 text-telegram-text text-xs font-semibold hover:bg-telegram-hover/70 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPinSubmitting}
                  className={`flex-1 h-10 rounded-xl text-xs font-semibold transition-colors ${
                    showPinModal === 'disable'
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-telegram-primary hover:bg-telegram-primary/90 text-white'
                  }`}
                >
                  {isPinSubmitting ? 'Saving...' : showPinModal === 'disable' ? 'Remove' : 'Save Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Destination Selector Bottom Sheet */}
      {showUploadDestinationSheet && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full max-w-md max-h-[85vh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-telegram-surface border border-telegram-border/60 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Sheet Handle */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-telegram-border/70" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-telegram-border/30">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-2xl bg-telegram-primary/15 text-telegram-primary flex items-center justify-center shrink-0 border border-telegram-primary/25 shadow-sm">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-telegram-text tracking-tight truncate">
                    {t('common.upload_destination', 'Upload Destination')}
                  </h3>
                  <p className="text-[11px] text-telegram-subtext mt-0.5 truncate">
                    {t('common.choose_upload_folder', 'Choose which folder to upload to')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowUploadDestinationSheet(false)}
                className="p-1.5 rounded-full text-telegram-subtext hover:text-telegram-text hover:bg-telegram-hover/40 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Folder Destination List */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 max-h-[50vh]">
              {/* Option 1: Saved Messages */}
              <button
                type="button"
                onClick={() => {
                  setShowUploadDestinationSheet(false);
                  void handleManualUpload(null);
                }}
                className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-200 active:scale-[0.98] text-left cursor-pointer ${
                  (activeTab === 'files' ? filesSelectedFolderId === 'saved' || filesSelectedFolderId === null : homeFolderFilter === 'saved' || homeFolderFilter === 'all')
                    ? 'bg-telegram-primary/10 border-telegram-primary/40 shadow-sm'
                    : 'bg-telegram-bg/40 border-telegram-border/30 hover:bg-telegram-hover/30 hover:border-telegram-border/50'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-telegram-primary/20 text-telegram-primary border border-telegram-primary/30 flex items-center justify-center shrink-0 shadow-sm">
                    <Bookmark className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-telegram-text truncate">
                        {t('common.saved_messages', 'Saved Messages')}
                      </p>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-telegram-primary/20 text-telegram-primary">
                        Default
                      </span>
                    </div>
                    <p className="text-[10px] text-telegram-subtext mt-0.5 truncate">
                      Personal Cloud Vault • {folderFileCounts.get('saved') ?? 0} files
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <ChevronRight className="w-4 h-4 text-telegram-subtext" />
                </div>
              </button>

              {/* Custom Folders Section */}
              {folders.length > 0 && (
                <div className="pt-2">
                  <p className="text-[10px] font-bold text-telegram-subtext/75 uppercase tracking-wider px-1 mb-2">
                    {t('common.folders', 'Folders')} ({folders.length})
                  </p>
                  <div className="space-y-1.5">
                    {folders.map(folder => {
                      const count = folderFileCounts.get(folder.id) ?? 0;
                      const isCurrent = activeTab === 'files' ? filesSelectedFolderId === folder.id : homeFolderFilter === folder.id;
                      return (
                        <button
                          key={folder.id}
                          type="button"
                          onClick={() => {
                            setShowUploadDestinationSheet(false);
                            void handleManualUpload(folder.id);
                          }}
                          className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all duration-200 active:scale-[0.98] text-left cursor-pointer ${
                            isCurrent
                              ? 'bg-telegram-primary/10 border-telegram-primary/40 shadow-sm'
                              : 'bg-telegram-bg/40 border-telegram-border/30 hover:bg-telegram-hover/30 hover:border-telegram-border/50'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/25 flex items-center justify-center shrink-0 shadow-sm">
                              <Folder className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-telegram-text truncate">
                                {folder.name}
                              </p>
                              <p className="text-[10px] text-telegram-subtext mt-0.5 truncate">
                                {folder.is_public ? 'Public Channel' : 'Private Folder'} • {count} {count === 1 ? 'file' : 'files'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <ChevronRight className="w-4 h-4 text-telegram-subtext" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-telegram-border/30 bg-telegram-bg/25 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowUploadDestinationSheet(false);
                  handleOpenCreateFolder();
                }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold bg-telegram-surface border border-telegram-border/40 text-telegram-text hover:bg-telegram-hover/50 active:scale-95 transition-all cursor-pointer"
              >
                <FolderPlus className="w-3.5 h-3.5 text-telegram-primary" />
                <span>{t('common.new_folder', 'New Folder')}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowUploadDestinationSheet(false)}
                className="py-2.5 px-4 rounded-xl text-xs font-medium text-telegram-subtext hover:text-telegram-text bg-telegram-hover/30 hover:bg-telegram-hover/60 active:scale-95 transition-all cursor-pointer"
              >
                {t('common.cancel', 'Cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File Sorting Bottom Sheet */}
      {showSortSheet && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowSortSheet(false)}
        >
          <div
            className="w-full max-w-md max-h-[85vh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-telegram-surface border border-telegram-border/60 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Sheet Handle */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-telegram-border/70" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-telegram-border/30">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-2xl bg-telegram-primary/15 text-telegram-primary flex items-center justify-center shrink-0 border border-telegram-primary/25 shadow-sm">
                  <ArrowUpDown className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-telegram-text tracking-tight truncate">
                    {t('common.sort_files', 'Sort files')}
                  </h3>
                  <p className="text-[11px] text-telegram-subtext mt-0.5 truncate">
                    {getActiveSortDescriptor(settings.fileSortField, settings.fileSortDirection).fallbackLabel}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSortSheet(false)}
                className="p-1.5 rounded-full text-telegram-subtext hover:text-telegram-text hover:bg-telegram-hover/40 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sort Options List */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 max-h-[50vh]">
              {SORT_OPTIONS.map(opt => {
                const isSelected = settings.fileSortField === opt.field && settings.fileSortDirection === opt.direction;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      updateSettings({ fileSortField: opt.field, fileSortDirection: opt.direction });
                      setShowSortSheet(false);
                    }}
                    className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'bg-telegram-primary/15 text-telegram-primary border border-telegram-primary/50 shadow-sm'
                        : 'bg-telegram-bg/50 hover:bg-telegram-hover/40 text-telegram-text border border-telegram-border/30'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-telegram-primary text-black' : 'bg-telegram-surface text-telegram-subtext'
                      }`}>
                        {opt.field === 'date' ? (
                          <Clock className="w-4 h-4" />
                        ) : opt.field === 'name' ? (
                          <ArrowUpDown className="w-4 h-4" />
                        ) : (
                          <HardDrive className="w-4 h-4" />
                        )}
                      </div>
                      <span className="truncate">{t(opt.labelKey, opt.fallbackLabel)}</span>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-telegram-primary shrink-0 ml-2" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Auto-Backup & Sync Control Center Bottom Sheet */}
      {showAutoBackupSheet && (
        <LazyFeatureBoundary>
          <LazyAutoBackupSheet
            onClose={() => setShowAutoBackupSheet(false)}
            folders={folders}
            onCreateFolder={handleCreateFolder}
          />
        </LazyFeatureBoundary>
      )}

      {/* Cloud Vault Passphrase Modal */}
      {vaultModalOpen && (
        <LazyFeatureBoundary>
          <LazyVaultPassphraseModal
            isOpen={vaultModalOpen}
            onClose={() => {
              setVaultModalOpen(false);
              setPendingOpenFile(null);
            }}
            mode={vaultModalMode}
            targetFile={pendingOpenFile}
            onUnlockOnlyThisFile={handleUnlockOnlyThisFile}
            onSuccess={handleVaultUnlockSuccess}
          />
        </LazyFeatureBoundary>
      )}

      {/* Profile Details Modal */}
      {showProfileDetailsModal && userProfile && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-fade-in"
          onClick={() => setShowProfileDetailsModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl border border-telegram-border/60 bg-telegram-surface p-5 shadow-2xl space-y-4 animate-scale-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                  {userProfile.firstName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-telegram-text flex items-center gap-1.5">
                    {userProfile.firstName} {userProfile.lastName || ''}
                    {userProfile.isPremium && <span className="text-amber-400 text-xs">★</span>}
                  </h3>
                  <p className="text-xs text-telegram-primary">
                    {userProfile.username ? `@${userProfile.username}` : 'No username set'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowProfileDetailsModal(false)}
                className="rounded-full p-1.5 text-telegram-subtext hover:text-telegram-text hover:bg-telegram-hover/40"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 rounded-2xl bg-telegram-bg/60 border border-telegram-border/40 p-3.5 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-telegram-border/20">
                <span className="text-telegram-subtext">User ID</span>
                <button
                  type="button"
                  onClick={() => {
                    void copyToClipboard(String(userProfile.id));
                    toast.success('User ID copied to clipboard');
                  }}
                  className="font-mono font-semibold text-telegram-text flex items-center gap-1 hover:text-telegram-primary"
                >
                  <span>{userProfile.id}</span>
                  <Copy className="w-3 h-3 text-telegram-subtext" />
                </button>
              </div>

              {userProfile.phone && (
                <div className="flex items-center justify-between py-1 border-b border-telegram-border/20">
                  <span className="text-telegram-subtext">Phone</span>
                  <button
                    type="button"
                    onClick={() => {
                      void copyToClipboard(userProfile.phone || '');
                      toast.success('Phone copied to clipboard');
                    }}
                    className="font-mono font-semibold text-telegram-text flex items-center gap-1 hover:text-telegram-primary"
                  >
                    <span>{userProfile.phone.startsWith('+') ? userProfile.phone : `+${userProfile.phone}`}</span>
                    <Copy className="w-3 h-3 text-telegram-subtext" />
                  </button>
                </div>
              )}

              {userProfile.username && (
                <div className="flex items-center justify-between py-1 border-b border-telegram-border/20">
                  <span className="text-telegram-subtext">Username</span>
                  <button
                    type="button"
                    onClick={() => {
                      void copyToClipboard(`@${userProfile.username}`);
                      toast.success('Username copied to clipboard');
                    }}
                    className="font-semibold text-telegram-primary flex items-center gap-1 hover:underline"
                  >
                    <span>@{userProfile.username}</span>
                    <Copy className="w-3 h-3 text-telegram-subtext" />
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between py-1 border-b border-telegram-border/20">
                <span className="text-telegram-subtext">Telegram Premium</span>
                <span className={`font-semibold ${userProfile.isPremium ? 'text-amber-400' : 'text-telegram-subtext'}`}>
                  {userProfile.isPremium ? 'Active ★' : 'No'}
                </span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-telegram-subtext">Session Status</span>
                <span className="font-semibold text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Connected
                </span>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowProfileDetailsModal(false);
                  void handleLogout();
                }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/25 font-semibold text-xs active:scale-95 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{t('common.logout')}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowProfileDetailsModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-telegram-border bg-telegram-hover/30 text-telegram-text font-semibold text-xs active:scale-95 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual License Key Entry Modal */}
      {showManualKeyModal && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-fade-in"
          onClick={() => setShowManualKeyModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl border border-telegram-border/60 bg-telegram-surface p-5 shadow-2xl space-y-4 animate-scale-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shadow-md">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-telegram-text">Activate License Key</h3>
                  <p className="text-xs text-telegram-subtext">Permanently syncs to this Telegram account</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowManualKeyModal(false)}
                className="rounded-full p-1.5 text-telegram-subtext hover:text-telegram-text hover:bg-telegram-hover/40"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleActivateMobileKey} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-telegram-subtext block mb-1">
                  License Number / Key
                </label>
                <input
                  type="text"
                  value={manualLicenseKey}
                  onChange={(e) => setManualLicenseKey(e.target.value)}
                  placeholder="TG-PRO-XXXX-XXXX"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-telegram-bg/80 border border-telegram-border/60 text-xs font-mono text-telegram-text placeholder-telegram-subtext/60 focus:outline-none focus:border-amber-500 uppercase"
                  autoFocus
                />
              </div>

              {userProfile && (
                <div className="p-2.5 rounded-xl bg-telegram-bg/50 border border-telegram-border/30 text-[11px] text-telegram-subtext space-y-1">
                  <div className="flex justify-between">
                    <span>Telegram ID:</span>
                    <span className="font-mono font-bold text-telegram-text">{userProfile.id}</span>
                  </div>
                  {userProfile.phone && (
                    <div className="flex justify-between">
                      <span>Phone:</span>
                      <span className="font-mono font-bold text-telegram-text">{userProfile.phone}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowManualKeyModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-telegram-border bg-telegram-hover/30 text-telegram-text font-semibold text-xs active:scale-95 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isActivatingManualKey || !manualLicenseKey.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 text-slate-950 font-bold text-xs disabled:opacity-50 active:scale-95 transition flex items-center justify-center gap-1.5"
                >
                  {isActivatingManualKey ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Activating…</span>
                    </>
                  ) : (
                    <span>Activate Key</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
