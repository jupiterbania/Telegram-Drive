import { describe, expect, it, vi } from 'vitest';
import * as tauriCore from '@tauri-apps/api/core';
import {
  triggerSyncNow,
  getPresetFolders,
  updateSyncSettings,
  addSyncPair,
  updateSyncPair,
  toggleSync,
} from '../../src/services/syncService';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

describe('syncService functions', () => {
  it('calls cmd_trigger_sync_now correctly', async () => {
    vi.mocked(tauriCore.invoke).mockResolvedValueOnce(true);
    const result = await triggerSyncNow();
    expect(tauriCore.invoke).toHaveBeenCalledWith('cmd_trigger_sync_now');
    expect(result).toBe(true);
  });

  it('calls cmd_get_preset_folders correctly', async () => {
    const mockPresets = [
      {
        id: 'camera',
        name: 'Camera Roll',
        description: 'Camera photos',
        path: '/storage/emulated/0/DCIM/Camera',
        exists: true,
        category: 'camera',
        icon: 'camera',
      },
    ];
    vi.mocked(tauriCore.invoke).mockResolvedValueOnce(mockPresets);
    const result = await getPresetFolders();
    expect(tauriCore.invoke).toHaveBeenCalledWith('cmd_get_preset_folders');
    expect(result).toEqual(mockPresets);
  });

  it('calls cmd_update_sync_settings with smart rules', async () => {
    const mockUpdated = {
      enabled: true,
      debounceMs: 3000,
      encryption: 'always_vault',
      wifiOnly: true,
      chargingOnly: true,
      mediaOnly: true,
    };
    vi.mocked(tauriCore.invoke).mockResolvedValueOnce(mockUpdated);
    const result = await updateSyncSettings({ wifiOnly: true, chargingOnly: true, mediaOnly: true, encryption: 'always_vault' });
    expect(tauriCore.invoke).toHaveBeenCalledWith('cmd_update_sync_settings', {
      wifiOnly: true,
      chargingOnly: true,
      mediaOnly: true,
      encryption: 'always_vault',
    });
    expect(result).toEqual(mockUpdated);
  });

  it('calls cmd_add_sync_pair defaulting to upload_only backup direction and custom encryption', async () => {
    const mockPair = {
      id: 1,
      localPath: '/storage/emulated/0/DCIM/Camera',
      channelId: 12345,
      folderKey: '12345',
      label: 'Camera Roll',
      syncDirection: 'upload_only' as const,
      encryption: 'vault',
      isActive: true,
      createdAt: 1000,
    };
    vi.mocked(tauriCore.invoke).mockResolvedValueOnce(mockPair);
    const result = await addSyncPair('/storage/emulated/0/DCIM/Camera', 12345, 'Camera Roll', 'upload_only', 'vault');
    expect(tauriCore.invoke).toHaveBeenCalledWith('cmd_add_sync_pair', {
      localPath: '/storage/emulated/0/DCIM/Camera',
      channelId: 12345,
      label: 'Camera Roll',
      syncDirection: 'upload_only',
      encryption: 'vault',
    });
    expect(result).toEqual(mockPair);
  });

  it('calls cmd_update_sync_pair correctly', async () => {
    const updatedPair = {
      id: 1,
      localPath: '/storage/emulated/0/DCIM/Camera',
      channelId: 67890,
      folderKey: '67890',
      label: 'Encrypted Photos',
      syncDirection: 'upload_only' as const,
      encryption: 'vault',
      isActive: true,
      createdAt: 1000,
    };
    vi.mocked(tauriCore.invoke).mockResolvedValueOnce(updatedPair);
    const result = await updateSyncPair({
      pairId: 1,
      channelId: 67890,
      label: 'Encrypted Photos',
      syncDirection: 'upload_only',
      encryption: 'vault',
      isActive: true,
    });
    expect(tauriCore.invoke).toHaveBeenCalledWith('cmd_update_sync_pair', {
      pairId: 1,
      channelId: 67890,
      label: 'Encrypted Photos',
      syncDirection: 'upload_only',
      encryption: 'vault',
      isActive: true,
    });
    expect(result).toEqual(updatedPair);
  });

  it('calls cmd_toggle_sync correctly', async () => {
    vi.mocked(tauriCore.invoke).mockResolvedValueOnce({ enabled: true });
    await toggleSync(true);
    expect(tauriCore.invoke).toHaveBeenCalledWith('cmd_toggle_sync', { enabled: true });
  });

  it('calls battery optimization and auto backup functions correctly', async () => {
    vi.mocked(tauriCore.invoke).mockResolvedValueOnce(true);
    const ignored = await (await import('../../src/services/syncService')).isBatteryOptimizationIgnored();
    expect(tauriCore.invoke).toHaveBeenCalledWith('cmd_is_battery_optimization_ignored');
    expect(ignored).toBe(true);

    vi.mocked(tauriCore.invoke).mockResolvedValueOnce(true);
    const requested = await (await import('../../src/services/syncService')).requestIgnoreBatteryOptimization();
    expect(tauriCore.invoke).toHaveBeenCalledWith('cmd_request_ignore_battery_optimization');
    expect(requested).toBe(true);

    vi.mocked(tauriCore.invoke).mockResolvedValueOnce(undefined);
    await (await import('../../src/services/syncService')).configureAutoBackup(true, true, false);
    expect(tauriCore.invoke).toHaveBeenCalledWith('cmd_configure_auto_backup', {
      enabled: true,
      wifiOnly: true,
      requireCharging: false,
    });
  });
});
