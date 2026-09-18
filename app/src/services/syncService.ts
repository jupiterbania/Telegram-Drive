import { invoke } from '@tauri-apps/api/core';
import type { ConflictResolution, PresetFolderInfo, SyncConflict, SyncLogEntry, SyncPair, SyncSettings, SyncStatus } from '../types/sync';

export const getSyncSettings = () => invoke<SyncSettings>('cmd_get_sync_settings');
export const toggleSync = (enabled: boolean) => invoke<SyncSettings>('cmd_toggle_sync', { enabled });
export const updateSyncSettings = (params: {
  wifiOnly?: boolean;
  chargingOnly?: boolean;
  mediaOnly?: boolean;
  debounceMs?: number;
  encryption?: string;
}) => invoke<SyncSettings>('cmd_update_sync_settings', params);
export const triggerSyncNow = () => invoke<boolean>('cmd_trigger_sync_now');
export const getPresetFolders = () => invoke<PresetFolderInfo[]>('cmd_get_preset_folders');
export const getSyncPairs = () => invoke<SyncPair[]>('cmd_get_sync_pairs');
export const addSyncPair = (
  localPath: string,
  channelId: number,
  label?: string,
  syncDirection: 'bidirectional' | 'upload_only' | 'download_only' = 'upload_only',
  encryption?: string,
) => invoke<SyncPair>('cmd_add_sync_pair', {
  localPath,
  channelId,
  label,
  syncDirection,
  encryption,
});
export const updateSyncPair = (params: {
  pairId: number;
  channelId?: number;
  label?: string;
  syncDirection?: 'bidirectional' | 'upload_only' | 'download_only';
  encryption?: string;
  isActive?: boolean;
}) => invoke<SyncPair>('cmd_update_sync_pair', params);
export const removeSyncPair = (pairId: number) => invoke<void>('cmd_remove_sync_pair', { pairId });
export const toggleSyncPair = (pairId: number, isActive: boolean) =>
  invoke<SyncPair[]>('cmd_toggle_sync_pair', { pairId, isActive });
export const getSyncStatus = () => invoke<SyncStatus>('cmd_get_sync_status');
export const getSyncConflicts = () => invoke<SyncConflict[]>('cmd_get_sync_conflicts');
export const getSyncLog = (limit = 100) => invoke<SyncLogEntry[]>('cmd_get_sync_log', { limit });
export const resolveSyncConflict = (pairId: number, path: string, resolution: ConflictResolution) => invoke<void>('cmd_resolve_conflict', {
  pairId,
  path,
  resolution,
});

export const checkStoragePermission = () => invoke<boolean>('cmd_check_storage_permission');
export const requestStoragePermission = () => invoke<boolean>('cmd_request_storage_permission');

export const isBatteryOptimizationIgnored = () => invoke<boolean>('cmd_is_battery_optimization_ignored');
export const requestIgnoreBatteryOptimization = () => invoke<boolean>('cmd_request_ignore_battery_optimization');
export const configureAutoBackup = (enabled: boolean, wifiOnly: boolean, requireCharging: boolean) =>
  invoke<void>('cmd_configure_auto_backup', { enabled, wifiOnly, requireCharging });

