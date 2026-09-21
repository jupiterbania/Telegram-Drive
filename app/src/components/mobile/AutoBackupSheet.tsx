import { useState, useEffect } from 'react';
import {
  CloudCheck,
  CloudOff,
  RefreshCw,
  Camera,
  Image as ImageIcon,
  MessageCircle,
  Download,
  FolderPlus,
  Trash2,
  Wifi,
  BatteryCharging,
  Shield,
  CheckCircle2,
  Clock,
  ChevronLeft,
  X,
  Plus,
  FolderCheck,
  Folder,
  HardDrive,
  Lock,
  FileText,
  Edit2,
  Video,
  Sliders,
  Activity,
  AlertTriangle,
  Sparkles,
  Smartphone,
} from 'lucide-react';
import { toast } from 'sonner';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { useSync } from '../../context/SyncContext';
import {
  getPresetFolders,
  getSyncLog,
  checkStoragePermission,
  requestStoragePermission,
  isBatteryOptimizationIgnored,
  requestIgnoreBatteryOptimization,
} from '../../services/syncService';
import type { PresetFolderInfo, SyncLogEntry, SyncProgressPayload, SyncPair } from '../../types/sync';
import type { TelegramFolder } from '../../types';

interface AutoBackupSheetProps {
  onClose: () => void;
  folders?: TelegramFolder[];
  onCreateFolder?: (name: string) => Promise<void> | void;
}

type TabType = 'sources' | 'rules' | 'activity';

export function AutoBackupSheet({ onClose, folders: initialFolders = [], onCreateFolder }: AutoBackupSheetProps) {
  const [folders, setFolders] = useState<TelegramFolder[]>(initialFolders ?? []);
  const [hasStoragePermission, setHasStoragePermission] = useState<boolean>(true);
  const [isRequestingPermission, setIsRequestingPermission] = useState<boolean>(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgressPayload | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('sources');
  const [isBatteryIgnored, setIsBatteryIgnored] = useState<boolean>(true);

  const {
    settings,
    pairs,
    status,
    setEnabled,
    updateSettings,
    triggerSyncNow,
    addPair,
    updatePair,
    removePair,
    togglePair,
  } = useSync();

  const [presets, setPresets] = useState<PresetFolderInfo[]>([]);
  const [logs, setLogs] = useState<SyncLogEntry[]>([]);
  const [isSyncingNow, setIsSyncingNow] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  // Custom pair addition state
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customPath, setCustomPath] = useState('');
  const [customLabel, setCustomLabel] = useState('');
  const [customChannelId, setCustomChannelId] = useState<number | ''>('');
  const [customDirection, setCustomDirection] = useState<'upload_only' | 'bidirectional'>('upload_only');
  const [customEncryption, setCustomEncryption] = useState<'inherit' | 'standard' | 'vault'>('inherit');

  // Quick preset setup modal
  const [configuringPreset, setConfiguringPreset] = useState<PresetFolderInfo | null>(null);
  const [presetChannelId, setPresetChannelId] = useState<number | ''>('');
  const [presetEncryption, setPresetEncryption] = useState<'inherit' | 'standard' | 'vault'>('inherit');

  // Edit folder settings modal
  const [editingPair, setEditingPair] = useState<SyncPair | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editChannelId, setEditChannelId] = useState<number | ''>('');
  const [editDirection, setEditDirection] = useState<'upload_only' | 'bidirectional' | 'download_only'>('upload_only');
  const [editEncryption, setEditEncryption] = useState<'inherit' | 'standard' | 'vault'>('inherit');
  const [showEditInlineNewFolder, setShowEditInlineNewFolder] = useState(false);
  const [editNewFolderName, setEditNewFolderName] = useState('');

  // Inline Telegram folder creation
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [showInlineNewFolder, setShowInlineNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const syncEnabled = settings.data?.enabled ?? false;
  const wifiOnly = settings.data?.wifiOnly ?? true;
  const chargingOnly = settings.data?.chargingOnly ?? false;
  const mediaOnly = settings.data?.mediaOnly ?? true;
  const currentGlobalFormat = settings.data?.encryption ?? 'standard';
  const allPairsList = pairs.data ?? [];
  const activePairsList = syncEnabled ? allPairsList.filter((p) => p.isActive) : [];
  const syncStatusData = status.data;

  useEffect(() => {
    if (initialFolders && initialFolders.length > 0) {
      setFolders(initialFolders);
    } else {
      void invoke<TelegramFolder[]>('cmd_get_enriched_folders')
        .then((f) => {
          if (f && f.length > 0) setFolders(f);
        })
        .catch(() => {});
    }
  }, [initialFolders]);

  // Check Android storage permission
  useEffect(() => {
    let mounted = true;
    checkStoragePermission()
      .then((granted) => {
        if (mounted) setHasStoragePermission(granted);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  // Listen to live sync progress
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    import('@tauri-apps/api/event')
      .then(({ listen }) => {
        listen<SyncProgressPayload>('sync-progress', (event) => {
          setSyncProgress(event.payload);
        }).then((fn) => {
          unlisten = fn;
        });
      })
      .catch(() => {});
    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  // Check Battery Optimization status on mount
  useEffect(() => {
    let mounted = true;
    isBatteryOptimizationIgnored()
      .then((ignored) => {
        if (mounted) setIsBatteryIgnored(ignored);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  // Load detected preset folders on mount
  useEffect(() => {
    let mounted = true;
    getPresetFolders()
      .then((data) => {
        if (mounted) setPresets(data);
      })
      .catch((err) => {
        console.warn('Failed to get preset folders:', err);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Load sync log
  useEffect(() => {
    let mounted = true;
    getSyncLog(30)
      .then((entries) => {
        if (mounted) setLogs(entries);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [status.data]);

  // Set default channel when configuring preset
  useEffect(() => {
    if (configuringPreset && folders.length > 0 && presetChannelId === '') {
      const matched = folders.find(
        (f) =>
          f.name.toLowerCase().includes(configuringPreset.category.toLowerCase()) ||
          f.name.toLowerCase().includes('backup') ||
          f.name.toLowerCase().includes('photo')
      );
      setPresetChannelId(matched ? matched.id : folders[0].id);
    }
  }, [configuringPreset, folders, presetChannelId]);

  const handleRequestBatteryOptimization = async () => {
    try {
      await requestIgnoreBatteryOptimization();
      toast.info('Please allow unrestricted battery usage for TG Drive');
      setTimeout(() => {
        isBatteryOptimizationIgnored()
          .then((ignored) => setIsBatteryIgnored(ignored))
          .catch(() => {});
      }, 3500);
    } catch (err: any) {
      toast.error(err?.toString() || 'Failed to open battery settings');
    }
  };

  const handleRequestPermission = async () => {
    setIsRequestingPermission(true);
    try {
      const granted = await requestStoragePermission();
      setHasStoragePermission(granted);
      if (granted) {
        toast.success('Storage access granted!');
        void getPresetFolders()
          .then((data) => {
            if (data && data.length > 0) setPresets(data);
          })
          .catch(() => {});
      } else {
        toast.info('Storage permission was not granted. Please allow in Android settings.');
      }
    } catch (err: any) {
      toast.error(err?.toString() || 'Failed to request permission');
    } finally {
      setIsRequestingPermission(false);
    }
  };

  const getSuggestedFolderName = (preset: PresetFolderInfo) => {
    const name = preset.name;
    const lower = name.toLowerCase();
    if (lower.includes('camera') || lower.includes('dcim')) return 'Camera Photos';
    if (lower.includes('screenshot')) return 'Screenshots';
    if (lower.includes('whatsapp') && lower.includes('video')) return 'WhatsApp Videos';
    if (lower.includes('whatsapp')) return 'WhatsApp Images';
    if (lower.includes('telegram')) return 'Telegram Media';
    if (lower.includes('download')) return 'Downloads';
    if (lower.includes('document')) return 'Documents';
    if (
      lower.includes('photo') ||
      lower.includes('picture') ||
      lower.includes('image') ||
      lower.includes('video') ||
      lower.includes('media')
    ) {
      return name;
    }
    return `${name} Photos`;
  };

  const handleCreateNewFolder = async (targetName?: string, isForEdit: boolean = false) => {
    const rawName = isForEdit ? editNewFolderName : targetName || newFolderName;
    const nameToCreate = rawName.trim();
    if (!nameToCreate) {
      toast.error('Please enter a folder name');
      return;
    }
    setIsCreatingFolder(true);
    try {
      let created: TelegramFolder | undefined;
      if (onCreateFolder) {
        await onCreateFolder(nameToCreate);
        const allFolders = (await invoke<TelegramFolder[]>('cmd_get_enriched_folders')) || [];
        created = allFolders.find((f) => f.name === nameToCreate) || allFolders[allFolders.length - 1];
        setFolders(allFolders);
      } else {
        const newFolder = await invoke<TelegramFolder>('cmd_create_folder', { name: nameToCreate });
        created = newFolder;
        setFolders((prev) => [...prev, newFolder]);
      }
      if (created) {
        if (isForEdit) {
          setEditChannelId(created.id);
          setShowEditInlineNewFolder(false);
          setEditNewFolderName('');
        } else if (configuringPreset) {
          setPresetChannelId(created.id);
          setShowInlineNewFolder(false);
          setNewFolderName('');
        } else if (showAddCustom) {
          setCustomChannelId(created.id);
          setShowInlineNewFolder(false);
          setNewFolderName('');
        }
      }
      toast.success(`Created folder "${nameToCreate}" and selected it!`);
    } catch (err: any) {
      toast.error(err?.toString() || 'Failed to create folder');
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleToggleMaster = async () => {
    setBusyAction('toggle_master');
    try {
      const nextEnabled = !syncEnabled;
      if (!nextEnabled) {
        setSyncProgress(null);
      }
      await setEnabled(nextEnabled);
      toast.success(nextEnabled ? 'Auto-backup enabled' : 'Auto-backup paused');
    } catch (err: any) {
      toast.error(err?.toString() || 'Failed to update auto-backup status');
    } finally {
      setBusyAction(null);
    }
  };

  const handleToggleFolderActive = async (pairId: number, targetActive: boolean) => {
    setBusyAction(`toggle_pair_${pairId}`);
    try {
      if (!targetActive) {
        setSyncProgress(null);
      }
      await togglePair(pairId, targetActive);
      if (targetActive) {
        toast.success('Folder backup enabled');
      } else {
        toast.success('Folder backup paused');
      }
    } catch (err: any) {
      toast.error(err?.toString() || 'Failed to toggle folder');
    } finally {
      setBusyAction(null);
    }
  };

  const handleTriggerSync = async () => {
    setIsSyncingNow(true);
    try {
      await triggerSyncNow();
      toast.success('Sync check triggered');
    } catch (err: any) {
      toast.error(err?.toString() || 'Failed to trigger sync');
    } finally {
      setTimeout(() => setIsSyncingNow(false), 800);
    }
  };

  const handleToggleWifiOnly = async () => {
    try {
      await updateSettings({ wifiOnly: !wifiOnly });
      toast.success(!wifiOnly ? 'Wi-Fi only backup enabled' : 'Backup on any network enabled');
    } catch (err: any) {
      toast.error(err?.toString() || 'Failed to update settings');
    }
  };

  const handleToggleChargingOnly = async () => {
    try {
      await updateSettings({ chargingOnly: !chargingOnly });
      toast.success(!chargingOnly ? 'Sync only while charging enabled' : 'Sync on battery enabled');
    } catch (err: any) {
      toast.error(err?.toString() || 'Failed to update settings');
    }
  };

  const handleToggleMediaOnly = async () => {
    try {
      await updateSettings({ mediaOnly: !mediaOnly });
      toast.success(!mediaOnly ? 'Media-only filter active' : 'All files backup active');
    } catch (err: any) {
      toast.error(err?.toString() || 'Failed to update settings');
    }
  };

  const handleSetGlobalFormat = async (format: 'standard' | 'always_vault') => {
    try {
      await updateSettings({ encryption: format });
      toast.success(
        format === 'always_vault'
          ? 'Default upload format set to Protected (Vault)'
          : 'Default upload format set to Normal (Standard)'
      );
    } catch (err: any) {
      toast.error(err?.toString() || 'Failed to update default upload format');
    }
  };

  const handleBrowseCustom = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select Folder to Back Up',
      });
      if (typeof selected === 'string') {
        setCustomPath(selected);
        const folderName = selected.split(/[\/\\]/).filter(Boolean).pop() || '';
        if (folderName && !customLabel) {
          setCustomLabel(folderName);
        }
      }
    } catch (err) {
      console.warn('Folder picker not available or cancelled:', err);
    }
  };

  const handleSavePresetPair = async () => {
    if (!configuringPreset || presetChannelId === '') return;
    setBusyAction(`preset_${configuringPreset.id}`);
    try {
      const targetFolder = folders.find((f) => f.id === presetChannelId);
      await addPair(
        configuringPreset.path,
        presetChannelId as number,
        configuringPreset.name,
        'upload_only',
        presetEncryption
      );
      toast.success(`Backing up "${configuringPreset.name}" to "${targetFolder?.name || 'Telegram'}"`);
      setConfiguringPreset(null);
      setPresetEncryption('inherit');
      if (!syncEnabled) {
        await setEnabled(true);
      }
    } catch (err: any) {
      toast.error(err?.toString() || 'Failed to add backup folder');
    } finally {
      setBusyAction(null);
    }
  };

  const handleSaveCustomPair = async () => {
    if (!customPath.trim() || customChannelId === '') {
      toast.error('Please specify a folder path and target Telegram channel');
      return;
    }
    setBusyAction('add_custom');
    try {
      const targetFolder = folders.find((f) => f.id === customChannelId);
      await addPair(
        customPath.trim(),
        customChannelId as number,
        customLabel.trim() || undefined,
        customDirection,
        customEncryption
      );
      toast.success(`Backing up to "${targetFolder?.name || 'Telegram'}"`);
      setCustomPath('');
      setCustomLabel('');
      setCustomChannelId('');
      setCustomEncryption('inherit');
      setShowAddCustom(false);
      if (!syncEnabled) {
        await setEnabled(true);
      }
    } catch (err: any) {
      toast.error(err?.toString() || 'Failed to add custom folder');
    } finally {
      setBusyAction(null);
    }
  };

  const handleOpenEditPair = (pair: SyncPair) => {
    setEditingPair(pair);
    setEditLabel(pair.label || '');
    setEditChannelId(pair.channelId);
    setEditDirection(pair.syncDirection || 'upload_only');
    setEditEncryption((pair.encryption as any) || 'inherit');
    setShowEditInlineNewFolder(false);
    setEditNewFolderName('');
  };

  const handleSaveEditPair = async () => {
    if (!editingPair || editChannelId === '') return;
    setBusyAction(`edit_${editingPair.id}`);
    try {
      await updatePair({
        pairId: editingPair.id,
        channelId: Number(editChannelId),
        label: editLabel.trim() || undefined,
        syncDirection: editDirection,
        encryption: editEncryption,
        isActive: editingPair.isActive,
      });
      toast.success(`Updated backup settings for "${editLabel.trim() || editingPair.label || 'Folder'}"`);
      setEditingPair(null);
    } catch (err: any) {
      toast.error(err?.toString() || 'Failed to update folder settings');
    } finally {
      setBusyAction(null);
    }
  };

  const handleRemovePair = async (pairId: number, label: string | null) => {
    setBusyAction(`remove_${pairId}`);
    try {
      await removePair(pairId);
      toast.success(`Removed "${label || 'Folder'}" from backup`);
    } catch (err: any) {
      toast.error(err?.toString() || 'Failed to remove backup pair');
    } finally {
      setBusyAction(null);
    }
  };

  const getPresetIcon = (iconName: string) => {
    switch (iconName) {
      case 'camera':
        return <Camera className="h-5 w-5 text-emerald-400" />;
      case 'image':
        return <ImageIcon className="h-5 w-5 text-sky-400" />;
      case 'message-circle':
        return <MessageCircle className="h-5 w-5 text-emerald-400" />;
      case 'video':
        return <Video className="h-5 w-5 text-purple-400" />;
      case 'download':
        return <Download className="h-5 w-5 text-amber-400" />;
      default:
        return <HardDrive className="h-5 w-5 text-indigo-400" />;
    }
  };

  const normalizeSyncPath = (p: string) => {
    return p
      .toLowerCase()
      .replace(/\\/g, '/')
      .replace(/^\/sdcard(\/|$)/, '/storage/emulated/0$1')
      .replace(/^\/storage\/self\/primary(\/|$)/, '/storage/emulated/0$1')
      .replace(/\/+$/, '');
  };

  // Check if preset has an existing pair mapping
  const getPresetPair = (preset: PresetFolderInfo) => {
    const normPreset = normalizeSyncPath(preset.path);
    return allPairsList.find((p) => {
      const normPair = normalizeSyncPath(p.localPath);
      return normPair === normPreset;
    });
  };

  // Custom pairs that are NOT matching standard presets
  const customPairsList = allPairsList.filter((pair) => {
    const normPair = normalizeSyncPath(pair.localPath);
    return !presets.some((preset) => normalizeSyncPath(preset.path) === normPair);
  });

  const handleClose = () => {
    if (configuringPreset !== null) {
      setConfiguringPreset(null);
      return;
    }
    if (showAddCustom) {
      setShowAddCustom(false);
      return;
    }
    if (editingPair !== null) {
      setEditingPair(null);
      return;
    }
    onClose();
  };

  // Intercept Android hardware/gesture back and Escape key
  useEffect(() => {
    const handleBackAction = (): boolean => {
      if (configuringPreset !== null) {
        setConfiguringPreset(null);
        return true;
      }
      if (showAddCustom) {
        setShowAddCustom(false);
        return true;
      }
      if (editingPair !== null) {
        setEditingPair(null);
        return true;
      }
      onClose();
      return true;
    };

    const androidWindow = window as typeof window & { __telegramDriveHandleAndroidBack?: () => boolean };
    const prevHandler = androidWindow.__telegramDriveHandleAndroidBack;
    androidWindow.__telegramDriveHandleAndroidBack = handleBackAction;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        handleBackAction();
      }
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
  }, [configuringPreset, showAddCustom, editingPair, onClose]);

  const progressPercent =
    syncProgress && syncProgress.totalOperations > 0
      ? Math.min(100, Math.round((syncProgress.completedOperations / syncProgress.totalOperations) * 100))
      : 0;

  return (
    <div
      className="fixed inset-0 z-[150] flex flex-col bg-app-canvas text-app-text animate-fade-in select-none overflow-hidden font-sans"
      role="region"
      aria-label="Auto-Backup & Sync"
    >
      {/* 1. Sleek Modern Header */}
      <header className="shrink-0 flex items-center justify-between px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top,16px))] bg-app-surface/90 border-b border-app-border/40 backdrop-blur-xl sticky top-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={handleClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-app-surface-hover/70 hover:bg-app-surface-hover text-app-text border border-app-border/60 active:scale-90 transition-transform shadow-xs"
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-app-text tracking-tight truncate">
                Auto-Backup &amp; Sync
              </h1>
              {syncEnabled ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {syncStatusData?.running ? 'Syncing' : 'Active'}
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-app-border/50 border border-app-border px-2 py-0.5 text-[10px] font-medium text-app-text-tertiary">
                  Paused
                </span>
              )}
            </div>
            <p className="text-[11px] text-app-text-secondary truncate">
              Automatic background cloud backup to Telegram
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={!syncEnabled || isSyncingNow}
          onClick={handleTriggerSync}
          className="flex h-9 items-center gap-1.5 rounded-xl bg-app-accent/15 border border-app-accent/30 px-3 text-xs font-semibold text-app-accent hover:bg-app-accent/25 active:scale-95 transition disabled:opacity-40 shadow-xs shrink-0"
          title="Scan & Sync Now"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isSyncingNow ? 'animate-spin' : ''}`} />
          <span className="hidden xs:inline">Sync Now</span>
        </button>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-[calc(2.5rem+env(safe-area-inset-bottom,20px))]">
        {/* Storage Permission Warning Banner (if missing on Android) */}
        {!hasStoragePermission && (
          <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent p-4 shadow-md animate-fade-in">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Shield className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xs font-bold text-amber-300">Storage Access Required</h3>
                <p className="mt-1 text-[11px] text-app-text-secondary leading-relaxed">
                  Android requires permission to read your Camera Roll and photos for auto-backup.
                </p>
                <button
                  type="button"
                  disabled={isRequestingPermission}
                  onClick={handleRequestPermission}
                  className="mt-3 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-bold text-white shadow-md hover:bg-amber-600 active:scale-95 transition disabled:opacity-50"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {isRequestingPermission ? 'Requesting...' : 'Grant Storage Permission'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. Modern Glassmorphic Hero Status Card */}
        <div
          className={`relative overflow-hidden rounded-3xl border transition-all duration-300 shadow-md ${
            syncEnabled
              ? 'border-emerald-500/30 bg-gradient-to-b from-emerald-500/10 via-app-surface to-app-surface/90'
              : 'border-app-border/80 bg-app-surface/70'
          }`}
        >
          {/* Subtle Ambient Glow */}
          {syncEnabled && (
            <div className="pointer-events-none absolute -top-16 -right-16 h-36 w-36 rounded-full bg-emerald-500/15 blur-3xl" />
          )}

          <div className="p-4 space-y-4">
            {/* Top Switch Row */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border transition-colors shadow-inner ${
                    syncEnabled
                      ? 'border-emerald-400/40 bg-emerald-500/20 text-emerald-400'
                      : 'border-app-border bg-app-surface text-app-text-tertiary'
                  }`}
                >
                  {syncEnabled ? (
                    <CloudCheck className="h-6 w-6 animate-pulse" />
                  ) : (
                    <CloudOff className="h-6 w-6" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-app-text tracking-tight truncate">
                      {syncEnabled ? 'Auto-Backup Active' : 'Auto-Backup Disabled'}
                    </h2>
                  </div>
                  <p className="text-[11px] text-app-text-secondary mt-0.5 truncate">
                    {syncEnabled
                      ? `${activePairsList.length} folder${activePairsList.length === 1 ? '' : 's'} linked to Telegram`
                      : 'Turn on to automatically protect your photos & media'}
                  </p>
                </div>
              </div>

              {/* Master Switch */}
              <button
                type="button"
                role="switch"
                aria-checked={syncEnabled}
                disabled={busyAction === 'toggle_master'}
                onClick={handleToggleMaster}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none shadow-inner ${
                  syncEnabled ? 'bg-emerald-500' : 'bg-app-border'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    syncEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Live Upload Progress (When active operations) */}
            {syncEnabled && syncProgress && syncProgress.totalOperations > 0 && syncProgress.status !== 'idle' && (
              <div className="rounded-2xl border border-app-accent/30 bg-app-accent/10 p-3 animate-fade-in space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-app-accent flex items-center gap-1.5 truncate max-w-[70%]">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin shrink-0" />
                    <span className="truncate">
                      {syncProgress.currentFile
                        ? syncProgress.currentFile.split(/[\/\\]/).pop()
                        : 'Backing up files...'}
                    </span>
                  </span>
                  <span className="text-app-accent font-mono font-bold shrink-0 text-[11px]">
                    {syncProgress.completedOperations} / {syncProgress.totalOperations} ({progressPercent}%)
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-app-surface border border-app-border/40">
                  <div
                    className="h-full bg-gradient-to-r from-app-accent to-emerald-400 transition-all duration-300 rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Structured 3-Stat Metric Row */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-2xl bg-app-surface/60 border border-app-border/40 p-2.5 text-center">
                <span className="block text-[10px] font-semibold text-app-text-tertiary uppercase tracking-wider">
                  Folders
                </span>
                <span className="text-base font-extrabold text-app-text mt-0.5 block">
                  {allPairsList.length}
                </span>
              </div>
              <div className="rounded-2xl bg-app-surface/60 border border-app-border/40 p-2.5 text-center">
                <span className="block text-[10px] font-semibold text-app-text-tertiary uppercase tracking-wider">
                  Pending
                </span>
                <span className="text-base font-extrabold text-sky-400 mt-0.5 block">
                  {syncEnabled ? (syncStatusData?.pendingOps ?? 0) : 0}
                </span>
              </div>
              <div className="rounded-2xl bg-app-surface/60 border border-app-border/40 p-2.5 text-center">
                <span className="block text-[10px] font-semibold text-app-text-tertiary uppercase tracking-wider">
                  Conflicts
                </span>
                <span className="text-base font-extrabold text-amber-400 mt-0.5 block">
                  {syncEnabled ? (syncStatusData?.conflicts ?? 0) : 0}
                </span>
              </div>
            </div>

            {/* Contextual Notice (e.g. Waiting on Wi-Fi or No Folders Linked) */}
            {syncStatusData?.lastError && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-300 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
                <p className="text-[11px] truncate flex-1">{syncStatusData.lastError}</p>
              </div>
            )}

            {syncEnabled && activePairsList.length === 0 && (
              <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-2.5 text-xs text-sky-300 flex items-center gap-2">
                <Sparkles className="h-4 w-4 shrink-0 text-sky-400" />
                <p className="text-[11px] truncate flex-1">
                  Tap <b>"Backup"</b> on any album below to start syncing.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 3. Systematic Segmented Navigation Tabs */}
        <div className="flex rounded-2xl bg-app-surface/80 p-1 border border-app-border/60 shadow-xs">
          <button
            type="button"
            onClick={() => setActiveTab('sources')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'sources'
                ? 'bg-app-accent text-white shadow-sm'
                : 'text-app-text-secondary hover:text-app-text'
            }`}
          >
            <Folder className="h-3.5 w-3.5" />
            <span>Folders</span>
            <span
              className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === 'sources' ? 'bg-white/25 text-white' : 'bg-app-border/60 text-app-text-tertiary'
              }`}
            >
              {allPairsList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rules')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'rules'
                ? 'bg-app-accent text-white shadow-sm'
                : 'text-app-text-secondary hover:text-app-text'
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>Smart Rules</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('activity')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'activity'
                ? 'bg-app-accent text-white shadow-sm'
                : 'text-app-text-secondary hover:text-app-text'
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            <span>Activity</span>
            {logs.length > 0 && (
              <span
                className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeTab === 'activity' ? 'bg-white/25 text-white' : 'bg-app-border/60 text-app-text-tertiary'
                }`}
              >
                {logs.length}
              </span>
            )}
          </button>
        </div>

        {/* ================= TAB 1: SOURCES & FOLDERS ================= */}
        {activeTab === 'sources' && (
          <div className="space-y-4 animate-fade-in">
            {/* Gallery Albums Section */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-app-text-secondary">
                    Detected Media Albums
                  </h3>
                  <p className="text-[11px] text-app-text-tertiary">
                    Instant 1-tap backup for device media folders
                  </p>
                </div>
                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                  Auto-Detect
                </span>
              </div>

              <div className="space-y-2">
                {presets.map((preset) => {
                  const pair = getPresetPair(preset);
                  const isFolderActive = Boolean(syncEnabled && pair && pair.isActive);
                  const isBusy =
                    busyAction === `preset_${preset.id}` || (pair ? busyAction === `toggle_pair_${pair.id}` : false);
                  const targetFolder = pair ? folders.find((f) => f.id === pair.channelId) : undefined;

                  return (
                    <div
                      key={preset.id}
                      className={`flex items-center justify-between gap-3 rounded-2xl border p-3.5 transition-all shadow-xs ${
                        isFolderActive
                          ? 'border-emerald-500/40 bg-emerald-500/5'
                          : pair
                          ? 'border-app-border/80 bg-app-surface/60 opacity-90'
                          : 'border-app-border/60 bg-app-surface hover:bg-app-surface-hover/60'
                      }`}
                    >
                      {/* Left: Icon and info */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-app-surface border border-app-border shadow-xs">
                          {getPresetIcon(preset.icon)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-bold text-app-text truncate">{preset.name}</p>
                            {preset.itemCount !== undefined && preset.itemCount > 0 && (
                              <span className="shrink-0 rounded-md bg-app-surface-hover px-1.5 py-0.5 text-[9px] font-medium text-app-text-secondary border border-app-border/50">
                                {preset.itemCount} items
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-app-text-tertiary truncate mt-0.5" title={preset.path}>
                            {preset.description || preset.path}
                          </p>

                          {/* Connected Destination Pill if paired */}
                          {pair && (
                            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 border border-emerald-500/25 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                                <Folder className="h-2.5 w-2.5" />
                                {targetFolder?.name || `Folder #${pair.channelId}`}
                              </span>
                              {pair.encryption === 'vault' && (
                                <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/15 border border-purple-500/25 px-1.5 py-0.5 text-[10px] font-semibold text-purple-300">
                                  <Lock className="h-2.5 w-2.5" />
                                  Vault
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="shrink-0 flex items-center gap-1.5">
                        {pair ? (
                          <>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleToggleFolderActive(pair.id, !isFolderActive)}
                              className={`rounded-xl px-2.5 py-1.5 text-xs font-semibold transition active:scale-95 disabled:opacity-50 ${
                                isFolderActive
                                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25'
                                  : 'bg-app-surface border border-app-border text-app-text-secondary hover:text-app-text'
                              }`}
                            >
                              {isFolderActive ? 'Active' : 'Resume'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEditPair(pair)}
                              className="flex h-8 w-8 items-center justify-center rounded-xl bg-app-surface border border-app-border text-app-text-secondary hover:text-app-text active:scale-95 transition"
                              title="Edit Backup Settings"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemovePair(pair.id, pair.label || preset.name)}
                              className="flex h-8 w-8 items-center justify-center rounded-xl bg-app-danger/10 text-app-danger border border-app-danger/20 hover:bg-app-danger/20 active:scale-95 transition"
                              title="Remove Backup"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => setConfiguringPreset(preset)}
                            className="flex items-center gap-1 rounded-xl bg-app-accent px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:brightness-110 active:scale-95 transition disabled:opacity-50"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Backup</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Custom Folders Section */}
            <div className="space-y-2.5 pt-2">
              <div className="flex items-center justify-between px-1">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-app-text-secondary">
                    Custom Linked Folders ({customPairsList.length})
                  </h3>
                  <p className="text-[11px] text-app-text-tertiary">
                    Any specific folder on your internal storage
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddCustom(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-app-accent/15 border border-app-accent/30 px-3 py-1.5 text-xs font-semibold text-app-accent hover:bg-app-accent/25 transition active:scale-95"
                >
                  <FolderPlus className="h-3.5 w-3.5" />
                  <span>Add Folder</span>
                </button>
              </div>

              {customPairsList.length === 0 ? (
                <div
                  onClick={() => setShowAddCustom(true)}
                  className="cursor-pointer rounded-2xl border border-dashed border-app-border/80 bg-app-surface/40 hover:bg-app-surface/70 p-5 text-center transition"
                >
                  <FolderPlus className="mx-auto h-7 w-7 text-app-text-tertiary mb-1.5 opacity-75" />
                  <p className="text-xs font-bold text-app-text">Need to sync another folder?</p>
                  <p className="text-[11px] text-app-text-tertiary mt-0.5">
                    Tap here to select any custom folder on your device.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {customPairsList.map((pair) => {
                    const targetFolder = folders.find((f) => f.id === pair.channelId);
                    const isPairActive = Boolean(syncEnabled && pair.isActive);
                    const isToggling = busyAction === `toggle_pair_${pair.id}`;
                    return (
                      <div
                        key={pair.id}
                        className={`flex items-center justify-between gap-3 rounded-2xl border p-3.5 transition-all shadow-xs ${
                          isPairActive
                            ? 'border-emerald-500/30 bg-app-surface'
                            : 'border-app-border/60 bg-app-surface/50 opacity-80'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${
                              isPairActive
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-app-surface text-app-text-tertiary border-app-border'
                            }`}
                          >
                            <FolderCheck className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-app-text truncate">
                              {pair.label || 'Custom Folder'}
                            </p>
                            <p className="text-[10px] text-app-text-tertiary truncate" title={pair.localPath}>
                              {pair.localPath}
                            </p>
                            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 border border-emerald-500/25 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                                <Folder className="h-2.5 w-2.5" />
                                {targetFolder?.name || `Folder #${pair.channelId}`}
                              </span>
                              {pair.encryption === 'vault' && (
                                <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/15 border border-purple-500/25 px-1.5 py-0.5 text-[10px] font-semibold text-purple-300">
                                  <Lock className="h-2.5 w-2.5" />
                                  Vault
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            disabled={isToggling}
                            onClick={() => handleToggleFolderActive(pair.id, !isPairActive)}
                            className={`rounded-xl px-2.5 py-1.5 text-xs font-semibold transition active:scale-95 disabled:opacity-50 ${
                              isPairActive
                                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                                : 'bg-app-surface border border-app-border text-app-text-secondary hover:text-app-text'
                            }`}
                          >
                            {isPairActive ? 'Active' : 'Resume'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditPair(pair)}
                            className="flex h-8 w-8 items-center justify-center rounded-xl bg-app-surface border border-app-border text-app-text-secondary hover:text-app-text transition active:scale-95"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemovePair(pair.id, pair.label)}
                            className="flex h-8 w-8 items-center justify-center rounded-xl bg-app-danger/10 text-app-danger border border-app-danger/20 hover:bg-app-danger/20 transition active:scale-95"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 2: SMART RULES & SETTINGS ================= */}
        {activeTab === 'rules' && (
          <div className="space-y-4 animate-fade-in">
            {/* Network & Power Rules */}
            <div className="rounded-3xl border border-app-border/80 bg-app-surface p-4 space-y-3.5 shadow-xs">
              <div className="flex items-center gap-2">
                <Wifi className="h-4 w-4 text-app-accent" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-app-text">
                  Network &amp; Power Settings
                </h3>
              </div>

              {/* Wi-Fi Only */}
              <div className="flex items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    <Wifi className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-app-text">Wi-Fi Only Backup</p>
                    <p className="text-[10px] text-app-text-tertiary">
                      Save cellular data by backing up only on Wi-Fi
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={wifiOnly}
                  onClick={handleToggleWifiOnly}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    wifiOnly ? 'bg-app-accent' : 'bg-app-border'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      wifiOnly ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Only While Charging */}
              <div className="flex items-center justify-between gap-3 border-t border-app-border/40 pt-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <BatteryCharging className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-app-text">Only while Charging</p>
                    <p className="text-[10px] text-app-text-tertiary">
                      Preserve battery by waiting until plugged into power
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={chargingOnly}
                  onClick={handleToggleChargingOnly}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    chargingOnly ? 'bg-app-accent' : 'bg-app-border'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      chargingOnly ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Media Files Only Filter */}
              <div className="flex items-center justify-between gap-3 border-t border-app-border/40 pt-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <ImageIcon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-app-text">Media Files Only</p>
                    <p className="text-[10px] text-app-text-tertiary">
                      Skip cache, logs &amp; system files (photos &amp; videos only)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={mediaOnly}
                  onClick={handleToggleMediaOnly}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    mediaOnly ? 'bg-app-accent' : 'bg-app-border'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      mediaOnly ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Storage & Security Format */}
            <div className="rounded-3xl border border-app-border/80 bg-app-surface p-4 space-y-3.5 shadow-xs">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-app-accent" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-app-text">
                  Security &amp; Encryption Format
                </h3>
              </div>

              <div>
                <p className="text-xs font-semibold text-app-text">Default Upload Format</p>
                <p className="text-[10px] text-app-text-tertiary mt-0.5">
                  Applied to backup folders when format is set to Default
                </p>

                <div className="grid grid-cols-2 gap-2 mt-2.5">
                  <button
                    type="button"
                    onClick={() => handleSetGlobalFormat('standard')}
                    className={`flex items-center justify-center gap-2 rounded-2xl border p-3 text-xs font-semibold transition active:scale-98 ${
                      currentGlobalFormat === 'standard'
                        ? 'border-app-accent bg-app-accent/15 text-app-accent shadow-xs'
                        : 'border-app-border bg-app-surface/60 text-app-text-secondary hover:text-app-text'
                    }`}
                  >
                    <FileText className="h-4 w-4" />
                    <span>Normal (Standard)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSetGlobalFormat('always_vault')}
                    className={`flex items-center justify-center gap-2 rounded-2xl border p-3 text-xs font-semibold transition active:scale-98 ${
                      currentGlobalFormat === 'always_vault'
                        ? 'border-purple-500 bg-purple-500/15 text-purple-300 shadow-xs'
                        : 'border-app-border bg-app-surface/60 text-app-text-secondary hover:text-app-text'
                    }`}
                  >
                    <Lock className="h-4 w-4" />
                    <span>Protected (Vault)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Android Background & Battery Health */}
            <div className="rounded-3xl border border-app-border/80 bg-app-surface p-4 space-y-3.5 shadow-xs">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-app-accent" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-app-text">
                  Android Background Engine
                </h3>
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-2xl border ${
                      syncEnabled
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-app-border/30 text-app-text-tertiary border-app-border'
                    }`}
                  >
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-app-text">24/7 Background Sync</p>
                    <p className="text-[10px] text-app-text-tertiary">
                      Automatically syncs when new photos are taken
                    </p>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-xl border ${
                    syncEnabled
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-app-border/30 text-app-text-tertiary border-app-border/40'
                  }`}
                >
                  {syncEnabled ? 'Running' : 'Paused'}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-app-border/40 pt-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-2xl border ${
                      isBatteryIgnored
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}
                  >
                    <Shield className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-app-text">Battery Optimization</p>
                    <p className="text-[10px] text-app-text-tertiary">
                      {isBatteryIgnored
                        ? 'Unrestricted: Android will not kill background uploads'
                        : 'Recommended: Allow background sync to prevent sleep kill'}
                    </p>
                  </div>
                </div>

                {isBatteryIgnored ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-xl">
                    <CheckCircle2 className="h-3 w-3" />
                    Allowed
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleRequestBatteryOptimization}
                    className="rounded-xl bg-amber-500 hover:bg-amber-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition active:scale-95 shrink-0"
                  >
                    Allow Sync
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 3: ACTIVITY & LOGS ================= */}
        {activeTab === 'activity' && (
          <div className="space-y-3 animate-fade-in">
            <div className="flex items-center justify-between px-1">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-app-text-secondary">
                  Recent Sync Activity
                </h3>
                <p className="text-[11px] text-app-text-tertiary">
                  Timeline of backed up files &amp; events
                </p>
              </div>
              <button
                type="button"
                onClick={handleTriggerSync}
                disabled={!syncEnabled || isSyncingNow}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-app-accent hover:underline disabled:opacity-40"
              >
                <RefreshCw className={`h-3 w-3 ${isSyncingNow ? 'animate-spin' : ''}`} />
                Scan Now
              </button>
            </div>

            {logs.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-app-border/80 p-8 text-center bg-app-surface/40">
                <Clock className="mx-auto h-8 w-8 text-app-text-tertiary/60 mb-2" />
                <p className="text-xs font-semibold text-app-text">No sync activity yet</p>
                <p className="text-[11px] text-app-text-tertiary mt-1">
                  When new files are backed up, their upload history will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {logs.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-app-surface border border-app-border/60 p-3 text-xs shadow-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-app-text">
                        {entry.relativePath || entry.action}
                      </p>
                      {entry.detail && (
                        <p className="truncate text-[10px] text-app-text-tertiary mt-0.5">
                          {entry.detail}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-[10px] font-mono text-app-text-tertiary bg-app-surface-hover px-2 py-0.5 rounded-lg border border-app-border/40">
                      {new Date(entry.createdAt * 1000).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ================= MODAL: QUICK PRESET SETUP ================= */}
      {configuringPreset && (
        <div
          className="fixed inset-0 z-[160] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4 animate-fade-in"
          onClick={() => setConfiguringPreset(null)}
        >
          <div
            className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl border border-app-border/80 bg-app-surface p-5 sm:p-6 shadow-2xl space-y-4 animate-scale-up max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-app-border/40 pb-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-inner">
                  {getPresetIcon(configuringPreset.icon)}
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-app-text tracking-tight truncate">
                    Back up {configuringPreset.name}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-mono text-[10px] text-app-text-tertiary bg-app-surface-hover px-2 py-0.5 rounded-md border border-app-border/40 truncate max-w-[220px]">
                      {configuringPreset.path}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setConfiguringPreset(null)}
                className="rounded-full p-2 text-app-text-secondary hover:text-app-text hover:bg-app-surface-hover transition active:scale-95 shrink-0"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Destination Folder Selector */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-app-text-secondary flex items-center gap-1.5">
                  <Folder className="h-3.5 w-3.5 text-app-accent" />
                  <span>Target Telegram Folder</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowInlineNewFolder(!showInlineNewFolder)}
                  className="text-[11px] font-semibold text-app-accent hover:underline flex items-center gap-1"
                >
                  <FolderPlus className="h-3.5 w-3.5" />
                  {showInlineNewFolder ? 'Existing Folders' : '+ New Folder'}
                </button>
              </div>

              {showInlineNewFolder ? (
                <div className="rounded-2xl border border-app-accent/40 bg-app-accent/5 p-3.5 space-y-2.5 shadow-inner">
                  <p className="text-[11px] font-medium text-app-text-secondary">
                    Create a dedicated Telegram folder for this backup:
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder={`e.g. ${getSuggestedFolderName(configuringPreset)}`}
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void handleCreateNewFolder();
                        }
                      }}
                      className="flex-1 rounded-xl border border-app-border bg-app-surface px-3 py-2.5 text-xs text-app-text placeholder:text-app-text-tertiary focus:border-app-accent focus:outline-none shadow-xs"
                      autoFocus
                    />
                    <button
                      type="button"
                      disabled={isCreatingFolder || !newFolderName.trim()}
                      onClick={() => handleCreateNewFolder()}
                      className="rounded-xl bg-app-accent px-4 py-2 text-xs font-bold text-white disabled:opacity-50 flex items-center gap-1 shrink-0 shadow-sm active:scale-95 transition"
                    >
                      {isCreatingFolder ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : 'Create'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* 1-Tap Recommended Folder option if matching folder doesn't already exist */}
                  {!folders.some((f) => f.name.toLowerCase() === getSuggestedFolderName(configuringPreset).toLowerCase()) && (
                    <button
                      type="button"
                      disabled={isCreatingFolder}
                      onClick={() => handleCreateNewFolder(getSuggestedFolderName(configuringPreset))}
                      className="w-full flex items-center justify-between rounded-2xl border border-sky-500/30 bg-gradient-to-r from-sky-500/15 to-emerald-500/10 p-3 text-xs text-app-text hover:border-sky-500/50 active:scale-98 transition text-left group shadow-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
                          <FolderPlus className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-app-text truncate">
                            Create folder "{getSuggestedFolderName(configuringPreset)}"
                          </p>
                          <p className="text-[10px] text-app-text-tertiary">Recommended 1-tap dedicated folder</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold bg-sky-500/25 border border-sky-500/40 px-2 py-1 rounded-lg text-sky-300 shrink-0 ml-2 shadow-xs">
                        1-Tap
                      </span>
                    </button>
                  )}

                  {/* Existing Folders Select Dropdown */}
                  {folders.length === 0 ? (
                    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
                      No cloud folders found. Use "+ New Folder" above to create one.
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold text-app-text-tertiary uppercase tracking-wider block">
                        Or select existing folder:
                      </span>
                      <div className="relative">
                        <select
                          value={presetChannelId}
                          onChange={(e) => setPresetChannelId(Number(e.target.value))}
                          className="w-full appearance-none rounded-2xl border border-app-border/80 bg-app-surface-hover/80 px-3.5 py-3 pr-9 text-xs font-medium text-app-text focus:border-app-accent focus:outline-none shadow-xs transition"
                        >
                          {folders.map((f) => (
                            <option key={f.id} value={f.id}>
                              📁 {f.name} {f.is_public ? '(Public)' : ''}
                            </option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-app-text-tertiary">
                          <ChevronLeft className="h-4 w-4 -rotate-90" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Upload Format Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-app-text-secondary flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-app-accent" />
                <span>Upload Security Format</span>
              </label>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPresetEncryption('inherit')}
                  className={`flex flex-col items-center justify-center rounded-2xl border p-2.5 text-center transition active:scale-95 ${
                    presetEncryption === 'inherit'
                      ? 'border-app-accent bg-app-accent/15 text-app-accent font-bold shadow-xs'
                      : 'border-app-border bg-app-surface-hover/40 text-app-text-secondary hover:text-app-text'
                  }`}
                >
                  <Sparkles className="h-4 w-4 mb-1" />
                  <span className="text-xs">Default</span>
                  <span className="text-[9px] text-app-text-tertiary mt-0.5">
                    {currentGlobalFormat === 'always_vault' ? 'Vault' : 'Normal'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPresetEncryption('standard')}
                  className={`flex flex-col items-center justify-center rounded-2xl border p-2.5 text-center transition active:scale-95 ${
                    presetEncryption === 'standard'
                      ? 'border-sky-500 bg-sky-500/15 text-sky-400 font-bold shadow-xs'
                      : 'border-app-border bg-app-surface-hover/40 text-app-text-secondary hover:text-app-text'
                  }`}
                >
                  <FileText className="h-4 w-4 mb-1" />
                  <span className="text-xs">Normal</span>
                  <span className="text-[9px] text-app-text-tertiary mt-0.5">Standard</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPresetEncryption('vault')}
                  className={`flex flex-col items-center justify-center rounded-2xl border p-2.5 text-center transition active:scale-95 ${
                    presetEncryption === 'vault'
                      ? 'border-purple-500 bg-purple-500/15 text-purple-300 font-bold shadow-xs'
                      : 'border-app-border bg-app-surface-hover/40 text-app-text-secondary hover:text-app-text'
                  }`}
                >
                  <Lock className="h-4 w-4 mb-1" />
                  <span className="text-xs">Encrypted</span>
                  <span className="text-[9px] text-app-text-tertiary mt-0.5">Vault</span>
                </button>
              </div>
            </div>

            {/* Reassuring Safe Backup Mode Banner */}
            <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/25 p-3 text-xs text-emerald-300 flex items-start gap-2.5">
              <Shield className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                <span className="font-bold text-emerald-200">Safe Cloud Backup: </span>
                Copies files to Telegram automatically. Deleting media on Telegram will never delete photos on your phone.
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setConfiguringPreset(null)}
                className="flex-1 rounded-2xl border border-app-border/80 bg-app-surface-hover/60 hover:bg-app-surface-hover px-4 py-3 text-xs font-semibold text-app-text-secondary hover:text-app-text transition active:scale-95"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={presetChannelId === '' || busyAction?.startsWith('preset_')}
                onClick={handleSavePresetPair}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 px-4 py-3 text-xs font-bold text-white shadow-lg active:scale-95 transition disabled:opacity-50"
              >
                {busyAction?.startsWith('preset_') ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <CloudCheck className="h-4 w-4" />
                )}
                <span>Start Backup</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD CUSTOM FOLDER ================= */}
      {showAddCustom && (
        <div
          className="fixed inset-0 z-[160] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4 animate-fade-in"
          onClick={() => setShowAddCustom(false)}
        >
          <div
            className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl border border-app-border/80 bg-app-surface p-5 sm:p-6 shadow-2xl space-y-4 animate-scale-up max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-app-border/40 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-app-accent/15 text-app-accent border border-app-accent/30 shadow-inner">
                  <FolderPlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-app-text tracking-tight">Add Custom Folder</h3>
                  <p className="text-[11px] text-app-text-tertiary">Select any device directory for backup</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddCustom(false)}
                className="rounded-full p-2 text-app-text-secondary hover:text-app-text hover:bg-app-surface-hover transition active:scale-95"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Folder Path Input & Browse */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-app-text-secondary mb-1">
                  Folder Path on Device
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="/storage/emulated/0/Documents"
                    value={customPath}
                    onChange={(e) => setCustomPath(e.target.value)}
                    className="flex-1 rounded-2xl border border-app-border bg-app-surface-hover px-3.5 py-2.5 text-xs text-app-text placeholder:text-app-text-tertiary focus:border-app-accent focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleBrowseCustom}
                    className="rounded-2xl border border-app-border bg-app-surface-hover/80 hover:bg-app-surface-hover px-4 py-2.5 text-xs font-semibold text-app-text transition active:scale-95"
                  >
                    Browse
                  </button>
                </div>
              </div>

              {/* Folder Label */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-app-text-secondary mb-1">
                  Folder Label (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Work Documents"
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  className="w-full rounded-2xl border border-app-border bg-app-surface-hover px-3.5 py-2.5 text-xs text-app-text placeholder:text-app-text-tertiary focus:border-app-accent focus:outline-none"
                />
              </div>

              {/* Target Telegram Channel / Folder */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-app-text-secondary">
                    Target Telegram Folder
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowInlineNewFolder(!showInlineNewFolder)}
                    className="text-[11px] font-semibold text-app-accent hover:underline flex items-center gap-1"
                  >
                    <FolderPlus className="h-3.5 w-3.5" />
                    {showInlineNewFolder ? 'Choose Existing' : '+ New Folder'}
                  </button>
                </div>

                {showInlineNewFolder ? (
                  <div className="rounded-2xl border border-app-accent/40 bg-app-accent/5 p-3.5 space-y-2 shadow-inner">
                    <p className="text-[11px] text-app-text-secondary">Create a new Telegram folder:</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. Work Backups"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            void handleCreateNewFolder();
                          }
                        }}
                        className="flex-1 rounded-xl border border-app-border bg-app-surface px-3 py-2 text-xs text-app-text focus:border-app-accent focus:outline-none"
                        autoFocus
                      />
                      <button
                        type="button"
                        disabled={isCreatingFolder || !newFolderName.trim()}
                        onClick={() => handleCreateNewFolder()}
                        className="rounded-xl bg-app-accent px-3 py-2 text-xs font-semibold text-white disabled:opacity-50 flex items-center gap-1 shrink-0 active:scale-95 transition"
                      >
                        {isCreatingFolder ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : 'Create'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <select
                      value={customChannelId}
                      onChange={(e) => setCustomChannelId(Number(e.target.value))}
                      className="w-full appearance-none rounded-2xl border border-app-border bg-app-surface-hover px-3.5 py-3 pr-9 text-xs font-medium text-app-text focus:border-app-accent focus:outline-none"
                    >
                      <option value="">Select a Channel / Folder</option>
                      {folders.map((f) => (
                        <option key={f.id} value={f.id}>
                          📁 {f.name} {f.is_public ? '(Public)' : ''}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-app-text-tertiary">
                      <ChevronLeft className="h-4 w-4 -rotate-90" />
                    </div>
                  </div>
                )}
              </div>

              {/* Upload Format */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-app-text-secondary mb-1.5">
                  Upload Security Format
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setCustomEncryption('inherit')}
                    className={`flex flex-col items-center justify-center rounded-2xl border p-2.5 text-center transition active:scale-95 ${
                      customEncryption === 'inherit'
                        ? 'border-app-accent bg-app-accent/15 text-app-accent font-bold'
                        : 'border-app-border bg-app-surface-hover/40 text-app-text-secondary hover:text-app-text'
                    }`}
                  >
                    <Sparkles className="h-4 w-4 mb-1" />
                    <span className="text-xs">Default</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomEncryption('standard')}
                    className={`flex flex-col items-center justify-center rounded-2xl border p-2.5 text-center transition active:scale-95 ${
                      customEncryption === 'standard'
                        ? 'border-sky-500 bg-sky-500/15 text-sky-400 font-bold'
                        : 'border-app-border bg-app-surface-hover/40 text-app-text-secondary hover:text-app-text'
                    }`}
                  >
                    <FileText className="h-4 w-4 mb-1" />
                    <span className="text-xs">Normal</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomEncryption('vault')}
                    className={`flex flex-col items-center justify-center rounded-2xl border p-2.5 text-center transition active:scale-95 ${
                      customEncryption === 'vault'
                        ? 'border-purple-500 bg-purple-500/15 text-purple-300 font-bold'
                        : 'border-app-border bg-app-surface-hover/40 text-app-text-secondary hover:text-app-text'
                    }`}
                  >
                    <Lock className="h-4 w-4 mb-1" />
                    <span className="text-xs">Vault</span>
                  </button>
                </div>
              </div>

              {/* Sync Mode */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-app-text-secondary mb-1">
                  Sync Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCustomDirection('upload_only')}
                    className={`rounded-2xl border p-2.5 text-xs font-semibold text-center transition active:scale-95 ${
                      customDirection === 'upload_only'
                        ? 'border-app-accent bg-app-accent/15 text-app-accent'
                        : 'border-app-border bg-app-surface-hover/40 text-app-text-secondary'
                    }`}
                  >
                    ⬆️ Upload Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomDirection('bidirectional')}
                    className={`rounded-2xl border p-2.5 text-xs font-semibold text-center transition active:scale-95 ${
                      customDirection === 'bidirectional'
                        ? 'border-app-accent bg-app-accent/15 text-app-accent'
                        : 'border-app-border bg-app-surface-hover/40 text-app-text-secondary'
                    }`}
                  >
                    🔄 Two-Way Mirror
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowAddCustom(false)}
                className="flex-1 rounded-2xl border border-app-border/80 bg-app-surface-hover/60 hover:bg-app-surface-hover px-4 py-3 text-xs font-semibold text-app-text-secondary hover:text-app-text transition active:scale-95"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!customPath.trim() || customChannelId === '' || busyAction === 'add_custom'}
                onClick={handleSaveCustomPair}
                className="flex-1 rounded-2xl bg-app-accent hover:brightness-110 px-4 py-3 text-xs font-bold text-white shadow-lg active:scale-95 transition disabled:opacity-50"
              >
                Add Folder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDIT BACKUP SETTINGS ================= */}
      {editingPair && (
        <div
          className="fixed inset-0 z-[160] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4 animate-fade-in"
          onClick={() => setEditingPair(null)}
        >
          <div
            className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl border border-app-border/80 bg-app-surface p-5 sm:p-6 shadow-2xl space-y-4 animate-scale-up max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-app-border/40 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-app-accent/15 text-app-accent border border-app-accent/30 shadow-inner">
                  <Edit2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-app-text tracking-tight">Edit Backup Settings</h3>
                  <p className="text-[11px] text-app-text-tertiary">Configure folder sync destination &amp; format</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingPair(null)}
                className="rounded-full p-2 text-app-text-secondary hover:text-app-text hover:bg-app-surface-hover transition active:scale-95"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-app-text-secondary mb-1">
                  Device Folder Path
                </label>
                <div className="rounded-2xl border border-app-border/70 bg-app-surface-hover/60 px-3.5 py-2.5 text-xs font-mono text-app-text-tertiary truncate select-all">
                  {editingPair.localPath}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-app-text-secondary mb-1">
                  Folder Label
                </label>
                <input
                  type="text"
                  placeholder="e.g. Camera Photos"
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  className="w-full rounded-2xl border border-app-border bg-app-surface-hover px-3.5 py-2.5 text-xs text-app-text focus:border-app-accent focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-app-text-secondary">
                    Destination Telegram Folder
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowEditInlineNewFolder(!showEditInlineNewFolder)}
                    className="text-[10px] font-semibold text-app-accent hover:underline flex items-center gap-1"
                  >
                    <FolderPlus className="h-3 w-3" />
                    {showEditInlineNewFolder ? 'Existing Folder' : '+ New Folder'}
                  </button>
                </div>

                {showEditInlineNewFolder ? (
                  <div className="rounded-2xl border border-app-accent/40 bg-app-accent/5 p-3 space-y-2 shadow-inner">
                    <p className="text-[10px] text-app-text-secondary">Create a new Telegram folder:</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. My Secure Backup"
                        value={editNewFolderName}
                        onChange={(e) => setEditNewFolderName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            void handleCreateNewFolder(undefined, true);
                          }
                        }}
                        className="flex-1 rounded-xl border border-app-border bg-app-surface px-2.5 py-1.5 text-xs text-app-text focus:border-app-accent focus:outline-none"
                        autoFocus
                      />
                      <button
                        type="button"
                        disabled={isCreatingFolder || !editNewFolderName.trim()}
                        onClick={() => handleCreateNewFolder(undefined, true)}
                        className="rounded-xl bg-app-accent px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50 flex items-center gap-1 shrink-0 active:scale-95 transition"
                      >
                        {isCreatingFolder ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : 'Create'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <select
                      value={editChannelId}
                      onChange={(e) => setEditChannelId(Number(e.target.value))}
                      className="w-full appearance-none rounded-2xl border border-app-border bg-app-surface-hover px-3.5 py-3 pr-9 text-xs font-medium text-app-text focus:border-app-accent focus:outline-none"
                    >
                      {folders.map((f) => (
                        <option key={f.id} value={f.id}>
                          📁 {f.name} {f.is_public ? '(Public)' : ''}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-app-text-tertiary">
                      <ChevronLeft className="h-4 w-4 -rotate-90" />
                    </div>
                  </div>
                )}
              </div>

              {/* Upload Format */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-app-text-secondary mb-1.5">
                  Upload Security Format
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditEncryption('inherit')}
                    className={`flex flex-col items-center justify-center rounded-2xl border p-2.5 text-center transition active:scale-95 ${
                      editEncryption === 'inherit'
                        ? 'border-app-accent bg-app-accent/15 text-app-accent font-bold'
                        : 'border-app-border bg-app-surface-hover/40 text-app-text-secondary hover:text-app-text'
                    }`}
                  >
                    <Sparkles className="h-4 w-4 mb-1" />
                    <span className="text-xs">Default</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditEncryption('standard')}
                    className={`flex flex-col items-center justify-center rounded-2xl border p-2.5 text-center transition active:scale-95 ${
                      editEncryption === 'standard'
                        ? 'border-sky-500 bg-sky-500/15 text-sky-400 font-bold'
                        : 'border-app-border bg-app-surface-hover/40 text-app-text-secondary hover:text-app-text'
                    }`}
                  >
                    <FileText className="h-4 w-4 mb-1" />
                    <span className="text-xs">Normal</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditEncryption('vault')}
                    className={`flex flex-col items-center justify-center rounded-2xl border p-2.5 text-center transition active:scale-95 ${
                      editEncryption === 'vault'
                        ? 'border-purple-500 bg-purple-500/15 text-purple-300 font-bold'
                        : 'border-app-border bg-app-surface-hover/40 text-app-text-secondary hover:text-app-text'
                    }`}
                  >
                    <Lock className="h-4 w-4 mb-1" />
                    <span className="text-xs">Vault</span>
                  </button>
                </div>
              </div>

              {/* Sync Direction */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-app-text-secondary mb-1">
                  Sync Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditDirection('upload_only')}
                    className={`rounded-2xl border p-2.5 text-xs font-semibold text-center transition active:scale-95 ${
                      editDirection === 'upload_only'
                        ? 'border-app-accent bg-app-accent/15 text-app-accent'
                        : 'border-app-border bg-app-surface-hover/40 text-app-text-secondary'
                    }`}
                  >
                    ⬆️ Upload Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditDirection('bidirectional')}
                    className={`rounded-2xl border p-2.5 text-xs font-semibold text-center transition active:scale-95 ${
                      editDirection === 'bidirectional'
                        ? 'border-app-accent bg-app-accent/15 text-app-accent'
                        : 'border-app-border bg-app-surface-hover/40 text-app-text-secondary'
                    }`}
                  >
                    🔄 Two-Way Mirror
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setEditingPair(null)}
                className="flex-1 rounded-2xl border border-app-border/80 bg-app-surface-hover/60 hover:bg-app-surface-hover px-4 py-3 text-xs font-semibold text-app-text-secondary hover:text-app-text transition active:scale-95"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={editChannelId === '' || busyAction === `edit_${editingPair.id}`}
                onClick={handleSaveEditPair}
                className="flex-1 rounded-2xl bg-app-accent hover:brightness-110 px-4 py-3 text-xs font-bold text-white shadow-lg active:scale-95 transition disabled:opacity-50"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
