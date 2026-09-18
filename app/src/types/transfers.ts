import type { UploadProtectionIntent } from './encryption';
import type { VideoUploadMode } from './settings';

export interface QueueItem {
  id: string;
  path: string;
  url?: string;
  folderId: number | null;
  status: 'pending' | 'paused' | 'waiting_for_network' | 'downloading' | 'uploading' | 'success' | 'error' | 'cancelled' | 'waiting_for_unlock' | 'encrypting' | 'decrypting' | 'verifying';
  error?: string;
  progress?: number;
  uploadedBytes?: number;
  totalBytes?: number;
  speedBytesPerSec?: number;
  tempZipPath?: string;
  /** Android-private staged copy that survives activity/process recreation. */
  androidStaged?: boolean;
  protection?: UploadProtectionIntent;
  /** Snapshot of the video preference used when this upload was queued. */
  videoUploadMode?: VideoUploadMode;
  /** True if this upload is originated from Auto-Backup */
  isAutoBackup?: boolean;
  /** Display format for auto-backup e.g. 'Encrypted' or 'Normal' */
  autoBackupFormat?: string;
  /** Source folder name e.g. 'Camera Photos' */
  autoBackupFolder?: string;
}

export type DroppedPathRejectionReason = 'directory' | 'missing' | 'unreadable' | 'unsupported';

export interface DroppedPathRejection {
  path: string;
  reason: DroppedPathRejectionReason;
}

export interface DroppedPathValidation {
  accepted: string[];
  rejected: DroppedPathRejection[];
}

export interface DropUploadResult {
  queued: number;
  rejected: DroppedPathRejection[];
  cancelled?: boolean;
}

export interface DownloadItem {
  id: string;
  messageId: number;
  filename: string;
  folderId: number | null;
  status: 'pending' | 'paused' | 'waiting_for_network' | 'cooldown' | 'downloading' | 'success' | 'error' | 'cancelled' | 'waiting_for_unlock' | 'decrypting' | 'verifying';
  error?: string;
  progress?: number;
  downloadedBytes?: number;
  totalBytes?: number;
  speedBytesPerSec?: number;
  savePath?: string;
  protectionMode?: 'vault' | 'passphrase' | 'vault_and_passphrase';
  /** In-memory only. Never persist this single-use credential handle. */
  promptToken?: number;
}

export interface DeleteQueueItem {
  id: string;
  messageId: number;
  filename: string;
  folderId: number | null;
  status: 'pending' | 'deleting' | 'success' | 'error' | 'cancelled';
  error?: string;
  progress?: number;
  totalBytes?: number;
  startedAt?: number;
}
