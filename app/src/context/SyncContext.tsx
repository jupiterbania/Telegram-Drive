import { createContext, useCallback, useContext, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  addSyncPair,
  updateSyncPair,
  removeSyncPair,
  toggleSyncPair,
  resolveSyncConflict,
  toggleSync,
  triggerSyncNow as triggerSyncNowService,
  updateSyncSettings as updateSyncSettingsService,
} from '../services/syncService';
import { syncQueryKeys, useSyncEngine } from '../hooks/useSyncEngine';
import type { ConflictResolution, SyncPair, SyncSettings, SyncStatus } from '../types/sync';

type SyncContextValue = ReturnType<typeof useSyncEngine> & {
  setEnabled: (enabled: boolean) => Promise<void>;
  updateSettings: (params: {
    wifiOnly?: boolean;
    chargingOnly?: boolean;
    mediaOnly?: boolean;
    debounceMs?: number;
    encryption?: string;
  }) => Promise<void>;
  triggerSyncNow: () => Promise<boolean>;
  addPair: (
    localPath: string,
    channelId: number,
    label?: string,
    syncDirection?: 'bidirectional' | 'upload_only' | 'download_only',
    encryption?: string,
  ) => Promise<void>;
  updatePair: (params: {
    pairId: number;
    channelId?: number;
    label?: string;
    syncDirection?: 'bidirectional' | 'upload_only' | 'download_only';
    encryption?: string;
    isActive?: boolean;
  }) => Promise<void>;
  removePair: (pairId: number) => Promise<void>;
  togglePair: (pairId: number, isActive: boolean) => Promise<void>;
  resolveConflict: (pairId: number, path: string, resolution: ConflictResolution) => Promise<void>;
  refresh: () => Promise<void>;
};

const SyncContext = createContext<SyncContextValue | null>(null);

export function SyncProvider({ children }: { children: ReactNode }) {
  const engine = useSyncEngine();
  const queryClient = useQueryClient();
  const refresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: syncQueryKeys.settings }),
      queryClient.invalidateQueries({ queryKey: syncQueryKeys.pairs }),
      queryClient.invalidateQueries({ queryKey: syncQueryKeys.status }),
      queryClient.invalidateQueries({ queryKey: syncQueryKeys.conflicts }),
    ]);
  }, [queryClient]);

  const setEnabled = useCallback(async (enabled: boolean) => {
    const updated = await toggleSync(enabled);
    queryClient.setQueryData(syncQueryKeys.settings, updated);
    if (!enabled) {
      queryClient.setQueryData(syncQueryKeys.status, (old: SyncStatus | undefined) =>
        old ? { ...old, enabled: false, running: false, activePairs: 0, pendingOps: 0 } : old
      );
    }
    await refresh();
  }, [refresh, queryClient]);

  const updateSettings = useCallback(async (params: {
    wifiOnly?: boolean;
    chargingOnly?: boolean;
    mediaOnly?: boolean;
    debounceMs?: number;
    encryption?: string;
  }) => {
    await updateSyncSettingsService(params);
    await refresh();
  }, [refresh]);

  const triggerSyncNow = useCallback(async () => {
    const res = await triggerSyncNowService();
    await refresh();
    return res;
  }, [refresh]);

  const addPair = useCallback(async (
    localPath: string,
    channelId: number,
    label?: string,
    syncDirection: 'bidirectional' | 'upload_only' | 'download_only' = 'upload_only',
    encryption?: string,
  ) => {
    await addSyncPair(localPath, channelId, label, syncDirection, encryption);
    await refresh();
  }, [refresh]);

  const updatePair = useCallback(async (params: {
    pairId: number;
    channelId?: number;
    label?: string;
    syncDirection?: 'bidirectional' | 'upload_only' | 'download_only';
    encryption?: string;
    isActive?: boolean;
  }) => {
    await updateSyncPair(params);
    await refresh();
  }, [refresh]);

  const removePair = useCallback(async (pairId: number) => {
    await removeSyncPair(pairId);
    let remainingActive = false;
    queryClient.setQueryData(syncQueryKeys.pairs, (old: SyncPair[] | undefined) => {
      if (!old) return [];
      const filtered = old.filter((p) => p.id !== pairId);
      remainingActive = filtered.some((p) => p.isActive);
      return filtered;
    });
    if (!remainingActive) {
      queryClient.setQueryData(syncQueryKeys.settings, (old: SyncSettings | undefined) =>
        old ? { ...old, enabled: false } : old
      );
      queryClient.setQueryData(syncQueryKeys.status, (old: SyncStatus | undefined) =>
        old ? { ...old, enabled: false, running: false, activePairs: 0, pendingOps: 0 } : old
      );
    }
    await refresh();
  }, [refresh, queryClient]);

  const togglePair = useCallback(async (pairId: number, isActive: boolean) => {
    const updatedPairs = await toggleSyncPair(pairId, isActive);
    queryClient.setQueryData(syncQueryKeys.pairs, updatedPairs);
    const anyActive = updatedPairs.some((p) => p.isActive);
    queryClient.setQueryData(syncQueryKeys.settings, (old: SyncSettings | undefined) => {
      if (!old) return old;
      return { ...old, enabled: anyActive };
    });
    queryClient.setQueryData(syncQueryKeys.status, (old: SyncStatus | undefined) => {
      if (!old) return old;
      return {
        ...old,
        enabled: anyActive,
        running: anyActive ? old.running : false,
        activePairs: updatedPairs.filter((p) => p.isActive).length,
        pendingOps: anyActive ? old.pendingOps : 0,
      };
    });
    await refresh();
  }, [refresh, queryClient]);

  const resolveConflict = useCallback(async (pairId: number, path: string, resolution: ConflictResolution) => {
    await resolveSyncConflict(pairId, path, resolution);
    await refresh();
  }, [refresh]);

  return (
    <SyncContext.Provider
      value={{
        ...engine,
        setEnabled,
        updateSettings,
        triggerSyncNow,
        addPair,
        updatePair,
        removePair,
        togglePair,
        resolveConflict,
        refresh,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  const context = useContext(SyncContext);
  if (!context) throw new Error('useSync must be used inside SyncProvider');
  return context;
}
