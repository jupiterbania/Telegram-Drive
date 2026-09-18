import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import { type as osType } from '@tauri-apps/plugin-os';
import { listen } from '@tauri-apps/api/event';
import { useSettings } from '../context/SettingsContext';
import { useVaultActivity } from './useVaultActivity';
import { resetStreamInfoCache, clearAllThumbnailFailures } from '../services/videoThumbnailService';
import { notifyThumbnailInvalidation } from '../services/imagePreviewCache';
import type {
    EncryptionCapabilities,
    EncryptionCapabilityState,
    EncryptionSettings,
    VaultStatus,
    CloudVaultStatus,
    FileEncryptionInfo,
    EncryptionState,
    CryptoInventory,
    DeepVaultScanResult,
} from '../types';

interface EncryptionContextType {
    capabilities: EncryptionCapabilities | null;
    settings: EncryptionSettings | null;
    vaultStatus: VaultStatus | null;
    cloudVaultStatus: CloudVaultStatus | null;
    inventory: CryptoInventory | null;
    capabilityState: EncryptionCapabilityState;
    capabilityError: string | null;
    isLoaded: boolean;
    refreshCapabilities: () => Promise<void>;
    refreshVaultStatus: () => Promise<void>;
    refreshCloudVaultStatus: () => Promise<void>;
    refreshInventory: () => Promise<void>;
    unlockVault: (passphrase: string) => Promise<number>;
    lockVault: () => Promise<void>;
    createVault: (passphrase: string) => Promise<void>;
    changeVaultPassphrase: (newPassphrase: string) => Promise<void>;
    restoreVaultFromCloud: (passphrase: string) => Promise<void>;
    backupVaultToCloud: (passphrase: string) => Promise<void>;
    deepScanAndRecoverVault: (passphrase: string) => Promise<DeepVaultScanResult>;
    getFileEncryptionInfo: (messageId: number, folderId: number | null) => Promise<FileEncryptionInfo>;
    generateRecoveryKey: () => Promise<string>;
    exportRecovery: (recoveryPassphrase: string) => Promise<string>;
    importRecovery: (bundle: string, recoveryPassphrase: string) => Promise<void>;
}

const EncryptionContext = createContext<EncryptionContextType | undefined>(undefined);

const PERSISTED_VAULT_PASSPHRASE_KEY = 'tg_drive_vault_persisted_passphrase';

export function EncryptionProvider({ children }: { children: ReactNode }) {
    const queryClient = useQueryClient();
    const { settings: appSettings, isLoaded: appSettingsLoaded } = useSettings();
    const [capabilities, setCapabilities] = useState<EncryptionCapabilities | null>(null);
    const [settings, setSettings] = useState<EncryptionSettings | null>(null);
    const [vaultStatus, setVaultStatus] = useState<VaultStatus | null>(null);
    const [cloudVaultStatus, setCloudVaultStatus] = useState<CloudVaultStatus | null>(null);
    const [inventory, setInventory] = useState<CryptoInventory | null>(null);
    const [capabilityState, setCapabilityState] = useState<EncryptionCapabilityState>('loading');
    const [capabilityError, setCapabilityError] = useState<string | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    useVaultActivity(vaultStatus?.is_unlocked === true);

    const refreshCapabilities = useCallback(async () => {
        setCapabilityState('loading');
        setCapabilityError(null);
        try {
            const caps = await invoke<EncryptionCapabilities>('cmd_get_encryption_capabilities');
            if (caps.contract_version !== 2) {
                throw new Error(`Unsupported encryption command contract ${String(caps.contract_version)}`);
            }
            setCapabilities(caps);
            setCapabilityState(
                caps.availability === 'ready'
                    ? 'ready'
                    : caps.availability === 'blocked'
                      ? 'blocked'
                      : caps.availability === 'disabled'
                        ? 'disabled'
                        : 'blocked',
            );
        } catch (error) {
            setCapabilities(null);
            setCapabilityError(String(error));
            setCapabilityState('error');
        }
    }, []);

    const refreshVaultStatus = useCallback(async () => {
        try {
            const status = await invoke<VaultStatus>('cmd_get_vault_status');
            setVaultStatus(status);
        } catch {
            setVaultStatus(null);
        }
    }, []);

    const refreshCloudVaultStatus = useCallback(async () => {
        try {
            const status = await invoke<CloudVaultStatus>('cmd_get_cloud_vault_status');
            setCloudVaultStatus(status);
        } catch {
            setCloudVaultStatus(null);
        }
    }, []);

    const refreshInventory = useCallback(async () => {
        try {
            setInventory(await invoke<CryptoInventory>('cmd_get_crypto_inventory'));
        } catch {
            setInventory(null);
        }
    }, []);

    useEffect(() => {
        const load = async () => {
            await Promise.all([
                refreshCapabilities(),
                refreshVaultStatus(),
                refreshCloudVaultStatus(),
                refreshInventory(),
                invoke<EncryptionSettings>('cmd_get_encryption_settings').then(setSettings).catch(() => {}),
            ]);

            // Silently restore unlocked vault state if persistent key exists
            try {
                const savedPassphrase = localStorage.getItem(PERSISTED_VAULT_PASSPHRASE_KEY);
                if (savedPassphrase) {
                    const status = await invoke<VaultStatus>('cmd_get_vault_status');
                    if (status.exists && !status.is_unlocked) {
                        await invoke<number>('cmd_unlock_vault', { passphrase: savedPassphrase });
                        resetStreamInfoCache();
                        clearAllThumbnailFailures();
                        await Promise.all([refreshVaultStatus(), refreshCloudVaultStatus()]);
                        void queryClient.invalidateQueries({ queryKey: ['files'] });
                        void queryClient.invalidateQueries({ queryKey: ['cached-files'] });
                    }
                }
            } catch (err) {
                console.warn('[useEncryption] Auto-restore vault unlock failed:', err);
                try {
                    localStorage.removeItem(PERSISTED_VAULT_PASSPHRASE_KEY);
                } catch {}
            }

            setIsLoaded(true);
        };
        load();
    }, [queryClient, refreshCapabilities, refreshCloudVaultStatus, refreshInventory, refreshVaultStatus]);

    useEffect(() => {
        if (!appSettingsLoaded) return;
        const effectiveSettings: EncryptionSettings = {
            default_mode: appSettings.encryptionDefaultMode,
            protect_metadata: appSettings.encryptionProtectMetadata,
            auto_lock_minutes: appSettings.encryptionAutoLockMinutes,
            lock_on_sleep: appSettings.encryptionLockOnSleep,
            temp_policy: appSettings.encryptionTempPolicy,
            remember_device: false,
        };
        invoke<EncryptionSettings>('cmd_update_encryption_settings', { settings: effectiveSettings })
            .then(setSettings)
            .catch(error => {
                setCapabilityError(previous => previous ?? `Encryption settings were rejected: ${String(error)}`);
            });
    }, [
        appSettings.encryptionAutoLockMinutes,
        appSettings.encryptionDefaultMode,
        appSettings.encryptionLockOnSleep,
        appSettings.encryptionProtectMetadata,
        appSettings.encryptionTempPolicy,
        appSettingsLoaded,
    ]);

    useEffect(() => {
        if (!appSettingsLoaded) return;
        let mobile = false;
        try {
            const platform = osType();
            mobile = platform === 'android' || platform === 'ios';
        } catch {
            // Browser previews have no native sleep lifecycle.
            return;
        }
        if (!mobile) {
            void invoke('cmd_set_desktop_lock_on_sleep', {
                enabled: appSettings.encryptionLockOnSleep,
            }).catch(() => {});
            return;
        }
        if (!appSettings.encryptionLockOnSleep) return;
        const handleVisibility = () => {
            if (document.visibilityState === 'hidden') {
                void invoke('cmd_lock_vault').catch(() => {});
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, [appSettings.encryptionLockOnSleep, appSettingsLoaded]);

    useEffect(() => {
        let cancelled = false;
        let unlistenLocked: (() => void) | undefined;
        let unlistenUnlocked: (() => void) | undefined;

        listen('vault-locked', () => {
            if (!cancelled) {
                void refreshVaultStatus();
                void queryClient.invalidateQueries({ queryKey: ['files'] });
                void queryClient.invalidateQueries({ queryKey: ['cached-files'] });
            }
        }).then(dispose => {
            if (cancelled) dispose();
            else unlistenLocked = dispose;
        }).catch(() => {
            // Capability diagnostics surface backend mismatches elsewhere.
        });

        listen('vault-unlocked', () => {
            if (!cancelled) {
                resetStreamInfoCache();
                clearAllThumbnailFailures();
                notifyThumbnailInvalidation();
                void refreshVaultStatus();
                void refreshCloudVaultStatus();
                void queryClient.invalidateQueries({ queryKey: ['files'] });
                void queryClient.invalidateQueries({ queryKey: ['cached-files'] });
            }
        }).then(dispose => {
            if (cancelled) dispose();
            else unlistenUnlocked = dispose;
        }).catch(() => {
            // Capability diagnostics surface backend mismatches elsewhere.
        });

        return () => {
            cancelled = true;
            unlistenLocked?.();
            unlistenUnlocked?.();
        };
    }, [queryClient, refreshCloudVaultStatus, refreshVaultStatus]);

    const unlockVault = useCallback(async (passphrase: string): Promise<number> => {
        const sessionId = await invoke<number>('cmd_unlock_vault', { passphrase });
        try {
            localStorage.setItem(PERSISTED_VAULT_PASSPHRASE_KEY, passphrase);
        } catch {}
        resetStreamInfoCache();
        clearAllThumbnailFailures();
        await Promise.all([refreshVaultStatus(), refreshCloudVaultStatus()]);
        void queryClient.invalidateQueries({ queryKey: ['files'] });
        void queryClient.invalidateQueries({ queryKey: ['cached-files'] });
        return sessionId;
    }, [queryClient, refreshCloudVaultStatus, refreshVaultStatus]);

    const lockVault = useCallback(async () => {
        try {
            localStorage.removeItem(PERSISTED_VAULT_PASSPHRASE_KEY);
        } catch {}
        await invoke('cmd_lock_vault');
        await refreshVaultStatus();
        void queryClient.invalidateQueries({ queryKey: ['files'] });
        void queryClient.invalidateQueries({ queryKey: ['cached-files'] });
    }, [queryClient, refreshVaultStatus]);

    const createVault = useCallback(async (passphrase: string) => {
        await invoke('cmd_create_vault', { passphrase });
        try {
            localStorage.setItem(PERSISTED_VAULT_PASSPHRASE_KEY, passphrase);
        } catch {}
        resetStreamInfoCache();
        clearAllThumbnailFailures();
        await Promise.all([refreshVaultStatus(), refreshCloudVaultStatus()]);
        void queryClient.invalidateQueries({ queryKey: ['files'] });
        void queryClient.invalidateQueries({ queryKey: ['cached-files'] });
    }, [queryClient, refreshCloudVaultStatus, refreshVaultStatus]);

    const changeVaultPassphrase = useCallback(async (newPassphrase: string) => {
        await invoke('cmd_change_vault_passphrase', { newPassphrase });
        try {
            localStorage.setItem(PERSISTED_VAULT_PASSPHRASE_KEY, newPassphrase);
        } catch {}
        await Promise.all([refreshVaultStatus(), refreshCloudVaultStatus()]);
    }, [refreshCloudVaultStatus, refreshVaultStatus]);

    const restoreVaultFromCloud = useCallback(async (passphrase: string): Promise<void> => {
        await invoke('cmd_restore_vault_from_cloud', { passphrase });
        try {
            localStorage.setItem(PERSISTED_VAULT_PASSPHRASE_KEY, passphrase);
        } catch {}
        resetStreamInfoCache();
        clearAllThumbnailFailures();
        await Promise.all([refreshVaultStatus(), refreshCloudVaultStatus(), refreshInventory()]);
        void queryClient.invalidateQueries({ queryKey: ['files'] });
        void queryClient.invalidateQueries({ queryKey: ['cached-files'] });
    }, [queryClient, refreshCloudVaultStatus, refreshInventory, refreshVaultStatus]);

    const backupVaultToCloud = useCallback(async (passphrase: string): Promise<void> => {
        const status = await invoke<CloudVaultStatus>('cmd_backup_vault_to_cloud', { passphrase });
        setCloudVaultStatus(status);
    }, []);

    const deepScanAndRecoverVault = useCallback(async (passphrase: string): Promise<DeepVaultScanResult> => {
        const result = await invoke<DeepVaultScanResult>('cmd_deep_scan_and_recover_vault', { passphrase });
        if (result.restored) {
            try {
                localStorage.setItem(PERSISTED_VAULT_PASSPHRASE_KEY, passphrase);
            } catch {}
            resetStreamInfoCache();
            clearAllThumbnailFailures();
            await Promise.all([refreshVaultStatus(), refreshCloudVaultStatus(), refreshInventory()]);
            void queryClient.invalidateQueries({ queryKey: ['files'] });
            void queryClient.invalidateQueries({ queryKey: ['cached-files'] });
        }
        return result;
    }, [queryClient, refreshCloudVaultStatus, refreshInventory, refreshVaultStatus]);

    const getFileEncryptionInfo = useCallback(async (
        messageId: number,
        folderId: number | null,
    ): Promise<FileEncryptionInfo> => {
        return await invoke<FileEncryptionInfo>('cmd_get_file_encryption_info', {
            messageId,
            folderId,
        });
    }, []);

    const generateRecoveryKey = useCallback(async (): Promise<string> => {
        return await invoke<string>('cmd_generate_recovery_key');
    }, []);

    const exportRecovery = useCallback(async (recoveryPassphrase: string): Promise<string> => {
        return await invoke<string>('cmd_export_vault_recovery', {
            recoveryPassphrase,
        });
    }, []);

    const importRecovery = useCallback(async (
        bundle: string,
        recoveryPassphrase: string,
    ): Promise<void> => {
        await invoke('cmd_import_vault_recovery', {
            bundleBase64: bundle,
            recoveryPassphrase,
            replaceExisting: true,
        });
        await Promise.all([refreshVaultStatus(), refreshCloudVaultStatus()]);
    }, [refreshCloudVaultStatus, refreshVaultStatus]);

    const contextValue: EncryptionContextType = {
        capabilities,
        settings,
        vaultStatus,
        cloudVaultStatus,
        inventory,
        capabilityState,
        capabilityError,
        isLoaded,
        refreshCapabilities,
        refreshVaultStatus,
        refreshCloudVaultStatus,
        refreshInventory,
        unlockVault,
        lockVault,
        createVault,
        changeVaultPassphrase,
        restoreVaultFromCloud,
        backupVaultToCloud,
        deepScanAndRecoverVault,
        getFileEncryptionInfo,
        generateRecoveryKey,
        exportRecovery,
        importRecovery,
    };

    return (
        <EncryptionContext.Provider value={contextValue}>
            {children}
        </EncryptionContext.Provider>
    );
}

export function useEncryption() {
    const ctx = useContext(EncryptionContext);
    if (!ctx) {
        throw new Error('useEncryption must be used within an EncryptionProvider');
    }
    return ctx;
}

export function resolveEncryptionState(
    info: FileEncryptionInfo | undefined,
    vaultUnlocked: boolean,
): EncryptionState {
    if (!info || info.state === 'plain') return 'plain';
    if (info.state === 'encrypted_verifying') return 'encrypted_verifying';
    if (info.state === 'encrypted_corrupt') return 'encrypted_corrupt';
    if (info.state === 'encrypted_unsupported_version') return 'encrypted_unsupported_version';
    if (info.state === 'encrypted_key_missing') return 'encrypted_key_missing';

    if (vaultUnlocked) return 'encrypted_unlocked';
    return 'encrypted_locked';
}
