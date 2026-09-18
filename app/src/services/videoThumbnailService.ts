import { invoke } from '@tauri-apps/api/core';
import { isVideoFile } from '../utils/files';

export interface StreamInfo {
    token: string;
    base_url: string;
    operation_token?: string | null;
}

// Global cached stream info promise
let cachedStreamInfoPromise: Promise<StreamInfo | null> | null = null;

export async function getStreamInfo(): Promise<StreamInfo | null> {
    if (!cachedStreamInfoPromise) {
        cachedStreamInfoPromise = invoke<StreamInfo>('cmd_get_stream_info')
            .catch((err) => {
                logWarn('Failed to get stream info:', err);
                cachedStreamInfoPromise = null;
                return null;
            });
    }
    return cachedStreamInfoPromise;
}

export function resetStreamInfoCache(): void {
    cachedStreamInfoPromise = null;
}

/**
 * Builds the local streaming URL for a given file message ID and folder.
 */
export async function getVideoStreamUrl(
    fileId: number,
    folderId?: number | null
): Promise<string | null> {
    const streamInfo = await getStreamInfo();
    if (!streamInfo || !streamInfo.base_url) return null;

    const folderIdParam = folderId !== null && folderId !== undefined ? folderId.toString() : 'home';
    const streamCredential = streamInfo.operation_token
        ? `&credential=${encodeURIComponent(streamInfo.operation_token)}`
        : '';

    return `${streamInfo.base_url}/stream/${folderIdParam}/${fileId}?token=${encodeURIComponent(streamInfo.token)}${streamCredential}`;
}

// Failed items tracking to avoid retry storms
const failedThumbnails = new Map<string, number>();
const FAILURE_COOLDOWN_MS = 60_000; // 1 minute cooldown

function isFailedRecently(key: string): boolean {
    const lastFailed = failedThumbnails.get(key);
    if (!lastFailed) return false;
    if (Date.now() - lastFailed > FAILURE_COOLDOWN_MS) {
        failedThumbnails.delete(key);
        return false;
    }
    return true;
}

function markFailed(key: string): void {
    failedThumbnails.set(key, Date.now());
}

export function clearThumbnailFailure(key: string): void {
    failedThumbnails.delete(key);
}

export function clearAllThumbnailFailures(): void {
    failedThumbnails.clear();
}

// Concurrency queue for video frame capture
const MAX_CONCURRENT_VIDEO_CAPTURES = 2;
let activeCaptureCount = 0;

interface VideoCaptureTask {
    key: string;
    fileId: number;
    folderId?: number | null;
    fileName?: string;
    resolve: (dataUrl: string | null) => void;
    reject: (err: any) => void;
}

const captureQueue: VideoCaptureTask[] = [];

function processCaptureQueue(): void {
    if (activeCaptureCount >= MAX_CONCURRENT_VIDEO_CAPTURES || captureQueue.length === 0) {
        return;
    }

    const task = captureQueue.shift();
    if (!task) return;

    activeCaptureCount++;

    doCaptureVideoThumbnail(task.fileId, task.folderId, task.fileName)
        .then((dataUrl) => {
            if (dataUrl) {
                task.resolve(dataUrl);
            } else {
                markFailed(task.key);
                task.resolve(null);
            }
        })
        .catch(() => {
            markFailed(task.key);
            task.resolve(null);
        })
        .finally(() => {
            activeCaptureCount--;
            processCaptureQueue();
        });
}

/**
 * Capture video thumbnail using a concurrency queue.
 */
export function captureVideoThumbnail(
    fileId: number,
    folderId?: number | null,
    fileName?: string
): Promise<string | null> {
    const key = `${folderId ?? 'home'}:${fileId}`;
    if (isFailedRecently(key)) {
        return Promise.resolve(null);
    }

    // Check if filename is definitely not a video (allow encrypted filenames)
    if (fileName && !isVideoFile(fileName) && !fileName.endsWith('.tdenc') && fileName !== 'TDENC2' && fileName !== 'Encrypted file') {
        return Promise.resolve(null);
    }

    return new Promise((resolve, reject) => {
        captureQueue.push({
            key,
            fileId,
            folderId,
            fileName,
            resolve,
            reject,
        });
        processCaptureQueue();
    });
}

/**
 * Internal execution of video thumbnail extraction via stream URL.
 */
async function doCaptureVideoThumbnail(
    fileId: number,
    folderId?: number | null,
    _fileName?: string
): Promise<string | null> {
    const streamUrl = await getVideoStreamUrl(fileId, folderId);
    if (!streamUrl) return null;

    return extractFrameFromVideoUrl(streamUrl);
}

/**
 * Extracts a frame from a video URL using an offscreen HTML5 video element and canvas.
 */
export function extractFrameFromVideoUrl(videoUrl: string): Promise<string | null> {
    if (typeof document === 'undefined') {
        return Promise.resolve(null);
    }

    return new Promise((resolve) => {
        const video = document.createElement('video');
        video.crossOrigin = 'anonymous';
        video.preload = 'metadata';
        video.muted = true;
        video.playsInline = true;

        let settled = false;
        const timer = setTimeout(() => {
            finish(null);
        }, 8000); // 8 second safety timeout

        const finish = (result: string | null) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            video.onloadeddata = null;
            video.onseeked = null;
            video.onerror = null;
            video.pause();
            video.removeAttribute('src');
            video.load();
            resolve(result);
        };

        video.onerror = () => finish(null);

        const captureCanvas = () => {
            try {
                const w = video.videoWidth;
                const h = video.videoHeight;
                if (!w || !h || w <= 0 || h <= 0) {
                    finish(null);
                    return;
                }

                // Target dimensions for clear, recognizable thumbnail (100KB - 200KB range)
                const MAX_THUMB_W = 640;
                const MAX_THUMB_H = 480;
                const scale = Math.min(MAX_THUMB_W / w, MAX_THUMB_H / h, 1);
                const targetW = Math.max(1, Math.round(w * scale));
                const targetH = Math.max(1, Math.round(h * scale));

                const canvas = document.createElement('canvas');
                canvas.width = targetW;
                canvas.height = targetH;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    finish(null);
                    return;
                }

                ctx.drawImage(video, 0, 0, targetW, targetH);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.80);
                finish(dataUrl);
            } catch {
                finish(null);
            }
        };

        video.onseeked = () => {
            captureCanvas();
        };

        video.onloadeddata = () => {
            try {
                // Seek minimally (0.1s) to avoid downloading deeper into the video stream
                const duration = video.duration;
                const targetTime = Number.isFinite(duration) && duration > 0.5 ? 0.1 : 0.0;
                if (targetTime > 0) {
                    video.currentTime = targetTime;
                } else {
                    captureCanvas();
                }
            } catch {
                captureCanvas();
            }
        };

        try {
            video.src = videoUrl;
        } catch {
            finish(null);
        }
    });
}

/**
 * Extracts a frame from an existing, rendered HTMLVideoElement (e.g. while playing in MediaPlayer).
 */
export function extractFrameFromVideoElement(video: HTMLVideoElement): string | null {
    try {
        const w = video.videoWidth;
        const h = video.videoHeight;
        if (!w || !h || w <= 0 || h <= 0) return null;

        const MAX_THUMB_W = 640;
        const MAX_THUMB_H = 480;
        const scale = Math.min(MAX_THUMB_W / w, MAX_THUMB_H / h, 1);
        const targetW = Math.max(1, Math.round(w * scale));
        const targetH = Math.max(1, Math.round(h * scale));

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        ctx.drawImage(video, 0, 0, targetW, targetH);
        return canvas.toDataURL('image/jpeg', 0.80);
    } catch {
        return null;
    }
}

/**
 * Persists an extracted thumbnail base64 to disk via Tauri backend.
 */
export async function saveThumbnailToDisk(
    fileId: number,
    folderId: number | null | undefined,
    base64Data: string
): Promise<string | null> {
    try {
        return await invoke<string>('cmd_save_thumbnail', {
            messageId: fileId,
            folderId: folderId ?? null,
            imageBase64: base64Data,
        });
    } catch (err) {
        logWarn('Failed to save thumbnail to disk:', err);
        return null;
    }
}

function logWarn(...args: any[]): void {
    if (typeof console !== 'undefined' && console.warn) {
        console.warn('[videoThumbnailService]', ...args);
    }
}
