import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import {
    isImageCacheEntryExpired,
    PREVIEW_CACHE_MAX_ITEMS,
    THUMBNAIL_CACHE_MAX_ITEMS,
} from './imageCachePolicy';
import { isVideoFile } from '../utils/files';
import { captureVideoThumbnail, saveThumbnailToDisk, clearAllThumbnailFailures, resetStreamInfoCache } from './videoThumbnailService';

type CacheEntry = {
    src: string;
    cachedAt: number;
};

const previewCache = new Map<string, CacheEntry>();
const thumbnailCache = new Map<string, CacheEntry>();
const pendingPreviews = new Map<string, Promise<string | null>>();
const pendingThumbnails = new Map<string, Promise<string | null>>();

export const getImageCacheKey = (fileId: number, folderId?: number | null): string =>
    `${folderId ?? 'home'}:${fileId}`;

const normalizeAssetSource = (value: string): string => {
    if (!value) return '';
    if (/^(?:data:|blob:|asset:|https?:)/i.test(value)) return value;
    return convertFileSrc(value);
};

/* ========================================================================== */
/* IndexedDB Persistent Storage for Thumbnails                                 */
/* ========================================================================== */

const IDB_NAME = 'telegram_drive_image_cache_v3';
const IDB_STORE = 'thumbnails';
let idbInstance: IDBDatabase | null = null;
let idbDisabled = false;
let legacyPurged = false;

function purgeLegacyDatabase(): void {
    if (legacyPurged || typeof indexedDB === 'undefined') return;
    legacyPurged = true;
    try {
        indexedDB.deleteDatabase('telegram_drive_image_cache_v1');
        indexedDB.deleteDatabase('telegram_drive_image_cache_v2');
    } catch {
        // Ignore legacy deletion error
    }
}

function openDatabase(): Promise<IDBDatabase | null> {
    if (idbDisabled || typeof indexedDB === 'undefined') return Promise.resolve(null);
    purgeLegacyDatabase();
    if (idbInstance) return Promise.resolve(idbInstance);

    return new Promise((resolve) => {
        try {
            const request = indexedDB.open(IDB_NAME, 1);
            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(IDB_STORE)) {
                    db.createObjectStore(IDB_STORE, { keyPath: 'key' });
                }
            };
            request.onsuccess = (event) => {
                idbInstance = (event.target as IDBOpenDBRequest).result;
                idbInstance.onclose = () => { idbInstance = null; };
                resolve(idbInstance);
            };
            request.onerror = () => {
                idbDisabled = true;
                resolve(null);
            };
        } catch {
            idbDisabled = true;
            resolve(null);
        }
    });
}

async function getPersistentEntry(key: string): Promise<string | null> {
    const db = await openDatabase();
    if (!db) return null;

    return new Promise((resolve) => {
        try {
            const tx = db.transaction(IDB_STORE, 'readonly');
            const store = tx.objectStore(IDB_STORE);
            const request = store.get(key);
            request.onsuccess = () => {
                const result = request.result;
                if (result && result.src && !isImageCacheEntryExpired(result.cachedAt)) {
                    resolve(result.src);
                } else {
                    resolve(null);
                }
            };
            request.onerror = () => resolve(null);
        } catch {
            resolve(null);
        }
    });
}

async function setPersistentEntry(key: string, src: string): Promise<void> {
    const db = await openDatabase();
    if (!db) return;

    return new Promise((resolve) => {
        try {
            const tx = db.transaction(IDB_STORE, 'readwrite');
            const store = tx.objectStore(IDB_STORE);
            store.put({ key, src, cachedAt: Date.now() });
            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve();
        } catch {
            resolve();
        }
    });
}

async function setPersistentEntriesBatch(entries: { key: string; src: string }[]): Promise<void> {
    if (entries.length === 0) return;
    const db = await openDatabase();
    if (!db) return;

    return new Promise((resolve) => {
        try {
            const tx = db.transaction(IDB_STORE, 'readwrite');
            const store = tx.objectStore(IDB_STORE);
            const now = Date.now();
            for (const entry of entries) {
                store.put({ key: entry.key, src: entry.src, cachedAt: now });
            }
            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve();
        } catch {
            resolve();
        }
    });
}

async function removePersistentEntry(key: string): Promise<void> {
    const db = await openDatabase();
    if (!db) return;

    return new Promise((resolve) => {
        try {
            const tx = db.transaction(IDB_STORE, 'readwrite');
            const store = tx.objectStore(IDB_STORE);
            store.delete(key);
            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve();
        } catch {
            resolve();
        }
    });
}

async function clearPersistentStorage(): Promise<void> {
    const db = await openDatabase();
    if (!db) return;

    return new Promise((resolve) => {
        try {
            const tx = db.transaction(IDB_STORE, 'readwrite');
            const store = tx.objectStore(IDB_STORE);
            store.clear();
            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve();
        } catch {
            resolve();
        }
    });
}

/* ========================================================================== */
/* In-Memory LRU Cache Helper                                                 */
/* ========================================================================== */

const safeRevokeBlob = (src?: string | null): void => {
    if (src && src.startsWith('blob:')) {
        try {
            URL.revokeObjectURL(src);
        } catch {
            // Ignore object URL revocation failures
        }
    }
};

const remember = (cache: Map<string, CacheEntry>, key: string, src: string, maxItems: number): void => {
    if (cache.has(key)) {
        const existing = cache.get(key);
        if (existing && existing.src !== src) {
            safeRevokeBlob(existing.src);
        }
        cache.delete(key);
    }
    cache.set(key, { src, cachedAt: Date.now() });
    while (cache.size > maxItems) {
        const oldestKey = cache.keys().next().value;
        if (!oldestKey) break;
        const entry = cache.get(oldestKey);
        safeRevokeBlob(entry?.src);
        cache.delete(oldestKey);
    }
};

const read = (cache: Map<string, CacheEntry>, key: string, maxItems: number): string | null => {
    const entry = cache.get(key);
    if (!entry) return null;
    if (isImageCacheEntryExpired(entry.cachedAt)) {
        safeRevokeBlob(entry.src);
        cache.delete(key);
        return null;
    }
    remember(cache, key, entry.src, maxItems);
    return entry.src;
};

/* ========================================================================== */
/* Prioritized Concurrency Queue for Thumbnail Loading                       */
/* ========================================================================== */

const MAX_CONCURRENT_THUMBNAILS = 5;
let activeThumbnailCount = 0;

type QueueItem = {
    key: string;
    fileId: number;
    folderId?: number | null;
    priority: number;
    fileName?: string;
    resolve: (src: string | null) => void;
    reject: (err: any) => void;
};

const thumbnailQueue: QueueItem[] = [];

function processThumbnailQueue(): void {
    if (activeThumbnailCount >= MAX_CONCURRENT_THUMBNAILS || thumbnailQueue.length === 0) {
        return;
    }

    // Sort queue descending by priority (highest priority first)
    thumbnailQueue.sort((a, b) => b.priority - a.priority);

    const next = thumbnailQueue.shift();
    if (!next) return;

    // Check if resolved by cache in the meantime
    const cached = read(thumbnailCache, next.key, THUMBNAIL_CACHE_MAX_ITEMS);
    if (cached) {
        next.resolve(cached);
        processThumbnailQueue();
        return;
    }

    activeThumbnailCount++;

    invoke<string>('cmd_get_thumbnail', {
        messageId: next.fileId,
        folderId: next.folderId ?? null,
    })
        .then(async (path) => {
            if (path) {
                const src = normalizeAssetSource(path);
                remember(thumbnailCache, next.key, src, THUMBNAIL_CACHE_MAX_ITEMS);
                void setPersistentEntry(next.key, src);
                next.resolve(src);
                return;
            }

            // If backend thumbnail is empty, check if this is a video file or encrypted media
            const isVideoCandidate = next.fileName
                ? (isVideoFile(next.fileName) || next.fileName.endsWith('.tdenc') || next.fileName === 'TDENC2' || next.fileName === 'Encrypted file')
                : true;
            if (isVideoCandidate) {
                try {
                    const videoThumb = await captureVideoThumbnail(next.fileId, next.folderId, next.fileName);
                    if (videoThumb) {
                        remember(thumbnailCache, next.key, videoThumb, THUMBNAIL_CACHE_MAX_ITEMS);
                        void setPersistentEntry(next.key, videoThumb);
                        void saveThumbnailToDisk(next.fileId, next.folderId, videoThumb);
                        next.resolve(videoThumb);
                        return;
                    }
                } catch {
                    // Ignore video capture errors and fall through
                }
            }

            next.resolve(null);
        })
        .catch(async (err) => {
            const isVideoCandidate = next.fileName
                ? (isVideoFile(next.fileName) || next.fileName.endsWith('.tdenc') || next.fileName === 'TDENC2' || next.fileName === 'Encrypted file')
                : true;
            if (isVideoCandidate) {
                try {
                    const videoThumb = await captureVideoThumbnail(next.fileId, next.folderId, next.fileName);
                    if (videoThumb) {
                        remember(thumbnailCache, next.key, videoThumb, THUMBNAIL_CACHE_MAX_ITEMS);
                        void setPersistentEntry(next.key, videoThumb);
                        void saveThumbnailToDisk(next.fileId, next.folderId, videoThumb);
                        next.resolve(videoThumb);
                        return;
                    }
                } catch {
                    // Fall through
                }
            }
            next.reject(err);
        })
        .finally(() => {
            activeThumbnailCount--;
            pendingThumbnails.delete(next.key);
            processThumbnailQueue();
        });
}

/* ========================================================================== */
/* Public API                                                                 */
/* ========================================================================== */

export const getCachedPreview = (fileId: number, folderId?: number | null): string | null =>
    read(previewCache, getImageCacheKey(fileId, folderId), PREVIEW_CACHE_MAX_ITEMS);

export const getCachedThumbnail = (fileId: number, folderId?: number | null): string | null =>
    read(thumbnailCache, getImageCacheKey(fileId, folderId), THUMBNAIL_CACHE_MAX_ITEMS);

/**
 * Fast asynchronous peek: checks in-memory cache first (0ms), then IndexedDB (<5ms).
 * Returns the cached src if found and promotes it to memory, without touching Tauri IPC.
 */
export const peekThumbnail = async (fileId: number, folderId?: number | null): Promise<string | null> => {
    const key = getImageCacheKey(fileId, folderId);
    const inMem = read(thumbnailCache, key, THUMBNAIL_CACHE_MAX_ITEMS);
    if (inMem) return inMem;

    const persistent = await getPersistentEntry(key);
    if (persistent) {
        remember(thumbnailCache, key, persistent, THUMBNAIL_CACHE_MAX_ITEMS);
        return persistent;
    }
    return null;
};

/**
 * Manually populates the preview cache for a file from a local decrypted path.
 */
export const setCachedPreview = (fileId: number, folderId: number | null | undefined, localPath: string): string => {
    const key = getImageCacheKey(fileId, folderId);
    const src = normalizeAssetSource(localPath);
    remember(previewCache, key, src, PREVIEW_CACHE_MAX_ITEMS);
    return src;
};

/**
 * Loads a full-resolution preview for the viewer modal.
 */
export const loadPreview = (fileId: number, folderId?: number | null, passphrase?: string | null): Promise<string | null> => {
    const key = getImageCacheKey(fileId, folderId);
    const cached = read(previewCache, key, PREVIEW_CACHE_MAX_ITEMS);
    if (cached) return Promise.resolve(cached);

    const existing = pendingPreviews.get(key);
    if (existing) return existing;

    const request = invoke<string>('cmd_get_preview', {
        messageId: fileId,
        folderId: folderId ?? null,
        passphrase: passphrase ?? null,
    }).then((path) => {
        if (!path) return null;
        const src = normalizeAssetSource(path);
        remember(previewCache, key, src, PREVIEW_CACHE_MAX_ITEMS);
        return src;
    }).finally(() => {
        pendingPreviews.delete(key);
    });

    pendingPreviews.set(key, request);
    return request;
};

/**
 * Enqueues a thumbnail load request with priority.
 * Items visible in viewport should pass priority >= 10.
 */
export const loadThumbnail = (
    fileId: number,
    folderId?: number | null,
    priority = 10,
    fileName?: string,
): Promise<string | null> => {
    const key = getImageCacheKey(fileId, folderId);
    const cached = read(thumbnailCache, key, THUMBNAIL_CACHE_MAX_ITEMS);
    if (cached) return Promise.resolve(cached);

    // If already in flight or in queue, boost priority and return existing promise
    const existing = pendingThumbnails.get(key);
    if (existing) {
        const item = thumbnailQueue.find((q) => q.key === key);
        if (item) {
            if (item.priority < priority) {
                item.priority = priority;
            }
            if (fileName && fileName !== item.fileName) {
                item.fileName = fileName;
            }
        }
        return existing;
    }

    // Check IndexedDB asynchronously before enqueuing IPC call
    const request = new Promise<string | null>((resolve, reject) => {
        getPersistentEntry(key).then((persistedSrc) => {
            if (persistedSrc) {
                remember(thumbnailCache, key, persistedSrc, THUMBNAIL_CACHE_MAX_ITEMS);
                pendingThumbnails.delete(key);
                resolve(persistedSrc);
                return;
            }

            thumbnailQueue.push({
                key,
                fileId,
                folderId,
                priority,
                fileName,
                resolve,
                reject,
            });
            processThumbnailQueue();
        }).catch(() => {
            thumbnailQueue.push({
                key,
                fileId,
                folderId,
                priority,
                fileName,
                resolve,
                reject,
            });
            processThumbnailQueue();
        });
    });

    pendingThumbnails.set(key, request);
    return request;
};

/**
 * Manually populates the thumbnail cache (memory, IndexedDB, disk) from an extracted image source.
 */
export const setCachedThumbnail = (
    fileId: number,
    folderId: number | null | undefined,
    src: string,
): void => {
    const key = getImageCacheKey(fileId, folderId);
    remember(thumbnailCache, key, src, THUMBNAIL_CACHE_MAX_ITEMS);
    void setPersistentEntry(key, src);
    void saveThumbnailToDisk(fileId, folderId, src);
};

/**
 * Cancels a queued thumbnail request if it hasn't started downloading yet.
 * Used when a card scrolls out of the viewport.
 */
export const cancelThumbnailLoad = (fileId: number, folderId?: number | null): void => {
    const key = getImageCacheKey(fileId, folderId);
    const idx = thumbnailQueue.findIndex((item) => item.key === key);
    if (idx !== -1) {
        const [removed] = thumbnailQueue.splice(idx, 1);
        removed.resolve(null);
        pendingThumbnails.delete(key);
    }
};

/**
 * Batch-checks a set of files against disk and IndexedDB.
 * Returns immediately for cached items and populates memory cache for 0ms access.
 */
export const checkCachedThumbnailsBatch = async (
    items: { fileId: number; folderId?: number | null }[],
): Promise<Map<string, string>> => {
    const results = new Map<string, string>();
    const neededDiskCheck: { message_id: number; folder_id: number | null }[] = [];

    // Phase 1: Check memory & IndexedDB
    for (const item of items) {
        const key = getImageCacheKey(item.fileId, item.folderId);
        const inMem = read(thumbnailCache, key, THUMBNAIL_CACHE_MAX_ITEMS);
        if (inMem) {
            results.set(key, inMem);
            continue;
        }
        neededDiskCheck.push({
            message_id: item.fileId,
            folder_id: item.folderId ?? null,
        });
    }

    if (neededDiskCheck.length === 0) {
        return results;
    }

    // Phase 2: Call fast Rust batch disk checker
    try {
        const diskResults = await invoke<Record<string, string>>('cmd_check_cached_thumbnails', {
            items: neededDiskCheck,
        });

        const toPersist: { key: string; src: string }[] = [];
        for (const [key, localPath] of Object.entries(diskResults)) {
            if (localPath) {
                const src = normalizeAssetSource(localPath);
                remember(thumbnailCache, key, src, THUMBNAIL_CACHE_MAX_ITEMS);
                results.set(key, src);
                toPersist.push({ key, src });
            }
        }
        if (toPersist.length > 0) {
            void setPersistentEntriesBatch(toPersist);
        }
    } catch {
        // Fall back gracefully if batch command is unsupported
    }

    return results;
};

export const forgetPreview = (fileId: number, folderId?: number | null): void => {
    const key = getImageCacheKey(fileId, folderId);
    const existing = previewCache.get(key);
    safeRevokeBlob(existing?.src);
    previewCache.delete(key);
};

export const forgetThumbnail = (fileId: number, folderId?: number | null): void => {
    const key = getImageCacheKey(fileId, folderId);
    const existing = thumbnailCache.get(key);
    safeRevokeBlob(existing?.src);
    thumbnailCache.delete(key);
    cancelThumbnailLoad(fileId, folderId);
    void removePersistentEntry(key);
};

export const clearImageMemoryCaches = (): void => {
    for (const entry of previewCache.values()) {
        safeRevokeBlob(entry.src);
    }
    for (const entry of thumbnailCache.values()) {
        safeRevokeBlob(entry.src);
    }
    previewCache.clear();
    thumbnailCache.clear();
    thumbnailQueue.length = 0;
    pendingPreviews.clear();
    pendingThumbnails.clear();
    void clearPersistentStorage();
};

/* ========================================================================== */
/* Vault State & Thumbnail Invalidation Listeners                             */
/* ========================================================================== */

type ThumbnailInvalidationListener = () => void;
const invalidationListeners = new Set<ThumbnailInvalidationListener>();

export const subscribeThumbnailInvalidation = (listener: ThumbnailInvalidationListener): (() => void) => {
    invalidationListeners.add(listener);
    return () => {
        invalidationListeners.delete(listener);
    };
};

export const notifyThumbnailInvalidation = (): void => {
    resetStreamInfoCache();
    clearAllThumbnailFailures();
    // Clear in-memory thumbnail cache so encrypted files get a fresh load
    // attempt after vault is unlocked (avoids stale "no thumbnail" entries).
    for (const entry of thumbnailCache.values()) {
        safeRevokeBlob(entry.src);
    }
    thumbnailCache.clear();
    thumbnailQueue.length = 0;
    pendingThumbnails.clear();
    for (const listener of invalidationListeners) {
        try {
            listener();
        } catch {
            // Ignore listener errors
        }
    }
};

// Automatically listen for vault-unlocked event to trigger re-fetch of encrypted thumbnails
try {
    listen('vault-unlocked', () => {
        notifyThumbnailInvalidation();
    }).catch(() => {});
} catch {
    // Non-Tauri environment fallback
}
