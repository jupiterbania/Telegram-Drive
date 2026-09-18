export interface SyncSettings {
  enabled: boolean;
  debounceMs: number;
  encryption: 'inherit' | 'always_vault' | string;
  wifiOnly?: boolean;
  chargingOnly?: boolean;
  mediaOnly?: boolean;
}

export interface PresetFolderInfo {
  id: string;
  name: string;
  description: string;
  path: string;
  exists: boolean;
  category: string;
  icon: string;
  itemCount?: number;
}

export interface SyncPair {
  id: number;
  localPath: string;
  channelId: number;
  folderKey: string;
  label: string | null;
  syncDirection: 'bidirectional' | 'upload_only' | 'download_only';
  isActive: boolean;
  createdAt: number;
  encryption?: 'inherit' | 'standard' | 'vault' | string;
}

export interface SyncStatus {
  enabled: boolean;
  running: boolean;
  activePairs: number;
  pendingOps: number;
  conflicts: number;
  lastError: string | null;
}

export interface SyncLogEntry {
  id: number;
  pairId: number | null;
  action: string;
  relativePath: string | null;
  detail: string | null;
  createdAt: number;
}

export interface SyncConflict {
  pairId: number;
  relativePath: string;
  localPath: string;
  label: string | null;
}

export type ConflictResolution = 'keep_local' | 'keep_remote' | 'keep_both';

export interface SyncProgressPayload {
  pairId: number;
  totalOperations: number;
  completedOperations: number;
  currentFile: string;
  currentAction: string;
  status: 'processing' | 'completed' | 'error' | 'idle' | string;
  transferId?: string;
  folderId?: number;
  folderName?: string;
  fileSize?: number;
  protectionMode?: string;
}
