import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, File, Maximize, Scan, X, ZoomIn, ZoomOut, RotateCw, Download, Lock, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { TelegramFile } from '../../../types';
import { isImageFile, isVideoFile, isMediaFile, formatBytes } from '../../../utils';
import { useSettings } from '../../../context/SettingsContext';
import { userFacingError } from '../../../services/userFacingError';
import {
    forgetPreview,
    forgetThumbnail,
    getCachedPreview,
    getCachedThumbnail,
    loadPreview,
    loadThumbnail,
    peekThumbnail,
} from '../../../services/imagePreviewCache';
const LazyVaultPassphraseModal = lazy(() => import('../../mobile/VaultPassphraseModal').then((m) => ({ default: m.VaultPassphraseModal })));
import i18n from '../../../i18n';

const MAX_PREFETCH_BYTES = 25 * 1024 * 1024;
const MIN_IMAGE_ZOOM = 0.25;
const MAX_IMAGE_ZOOM = 16;
const IMAGE_ZOOM_STEP = 1.25;

type Point = { x: number; y: number };
type ImageTransform = { zoom: number; pan: Point };

function distance(a: Point, b: Point): number {
    return Math.hypot(b.x - a.x, b.y - a.y);
}

function midpoint(a: Point, b: Point): Point {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

type PreviewProgress = {
    message_id: number;
    folder_id: number | null;
    downloaded_bytes: number;
    total_bytes: number;
    percent: number;
};

interface PreviewModalProps {
    file: TelegramFile;
    onClose: () => void;
    onNext?: () => void;
    onPrev?: () => void;
    currentIndex?: number;
    totalItems?: number;
    nextFile?: TelegramFile | null;
    prevFile?: TelegramFile | null;
    activeFolderId: number | null;
    onDownload?: () => void;
    initialThumbnail?: string | null;
}

export function PreviewModal({
    file,
    onClose,
    onNext,
    onPrev,
    currentIndex,
    totalItems,
    nextFile,
    prevFile,
    activeFolderId,
    onDownload,
    initialThumbnail,
}: PreviewModalProps) {
    const { t } = useTranslation();
    const { settings } = useSettings();
    const [imagePreview, setImagePreview] = useState(() => isImageFile(file.name, file.mime_type));

    useEffect(() => {
        setImagePreview(isImageFile(file.name, file.mime_type));
    }, [file.id, file.name, file.mime_type]);

    const [thumbnailSrc, setThumbnailSrc] = useState<string | null>(() => {
        if (!imagePreview) return null;
        return initialThumbnail ?? getCachedThumbnail(file.id, activeFolderId);
    });
    const [fullSrc, setFullSrc] = useState<string | null>(null);
    const [fullReady, setFullReady] = useState(false);
    const [loading, setLoading] = useState(true);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [rotation, setRotation] = useState<number>(0);
    const [showControls, setShowControls] = useState(true);
    const [showUnlockModal, setShowUnlockModal] = useState(false);
    const latestRequestRef = useRef(0);
    const currentFileIdRef = useRef(file.id);
    currentFileIdRef.current = file.id;
    const imageViewportRef = useRef<HTMLDivElement>(null);
    const fullImageRef = useRef<HTMLImageElement>(null);
    const [imageTransform, setImageTransform] = useState<ImageTransform>({ zoom: 1, pan: { x: 0, y: 0 } });
    const imageTransformRef = useRef(imageTransform);
    const [imageInteracting, setImageInteracting] = useState(false);
    const activePointersRef = useRef(new Map<number, Point>());
    const pointerGestureRef = useRef<
        | { type: 'pan'; start: Point; startPan: Point }
        | { type: 'pinch'; startDistance: number; startZoom: number; startCenter: Point; startPan: Point }
        | null
    >(null);
    const pointerStartRef = useRef<{ point: Point; time: number } | null>(null);
    const gestureHadMultiplePointersRef = useRef(false);
    const lastTouchTapRef = useRef<{ point: Point; time: number } | null>(null);
    const [swipeOffset, setSwipeOffset] = useState<number>(0);
    const [isSwiping, setIsSwiping] = useState<boolean>(false);
    const [slideTransition, setSlideTransition] = useState<boolean>(false);
    const swipeOffsetRef = useRef<number>(0);
    const isSwipingRef = useRef<boolean>(false);
    const isChangingFileRef = useRef<boolean>(false);

    const commitImageTransform = useCallback((next: ImageTransform) => {
        imageTransformRef.current = next;
        setImageTransform(next);
    }, []);

    const clampPan = useCallback((pan: Point, zoom: number): Point => {
        const viewport = imageViewportRef.current;
        const image = fullImageRef.current;
        if (!viewport || !image) return zoom <= 1 ? { x: 0, y: 0 } : pan;

        const maxX = Math.max(0, (image.clientWidth * zoom - viewport.clientWidth) / 2);
        const maxY = Math.max(0, (image.clientHeight * zoom - viewport.clientHeight) / 2);
        return {
            x: Math.max(-maxX, Math.min(maxX, pan.x)),
            y: Math.max(-maxY, Math.min(maxY, pan.y)),
        };
    }, []);

    const zoomImageTo = useCallback((requestedZoom: number, focalPoint?: Point) => {
        const viewport = imageViewportRef.current;
        const current = imageTransformRef.current;
        const zoom = Math.max(MIN_IMAGE_ZOOM, Math.min(MAX_IMAGE_ZOOM, requestedZoom));
        let pan = current.pan;

        if (viewport && focalPoint && current.zoom > 0) {
            const bounds = viewport.getBoundingClientRect();
            const focalOffset = {
                x: focalPoint.x - (bounds.left + bounds.width / 2),
                y: focalPoint.y - (bounds.top + bounds.height / 2),
            };
            const ratio = zoom / current.zoom;
            pan = {
                x: focalOffset.x - (focalOffset.x - current.pan.x) * ratio,
                y: focalOffset.y - (focalOffset.y - current.pan.y) * ratio,
            };
        }

        commitImageTransform({ zoom, pan: clampPan(pan, zoom) });
    }, [clampPan, commitImageTransform]);

    const fitImage = useCallback(() => {
        commitImageTransform({ zoom: 1, pan: { x: 0, y: 0 } });
    }, [commitImageTransform]);

    const showActualImageSize = useCallback(() => {
        const image = fullImageRef.current;
        if (!image || image.clientWidth <= 0 || image.clientHeight <= 0) return;
        const actualSizeZoom = Math.max(
            image.naturalWidth / image.clientWidth,
            image.naturalHeight / image.clientHeight,
            1,
        );
        zoomImageTo(actualSizeZoom);
    }, [zoomImageTo]);

    const panImageBy = useCallback((x: number, y: number) => {
        const current = imageTransformRef.current;
        const pan = clampPan({ x: current.pan.x + x, y: current.pan.y + y }, current.zoom);
        commitImageTransform({ ...current, pan });
    }, [clampPan, commitImageTransform]);

    const toggleImageZoom = useCallback((point?: Point) => {
        if (imageTransformRef.current.zoom > 1.05) fitImage();
        else zoomImageTo(2, point);
    }, [fitImage, zoomImageTo]);

    useEffect(() => {
        let disposed = false;
        let unlisten: (() => void) | undefined;

        listen<PreviewProgress>('preview-progress', ({ payload }) => {
            if (
                payload.message_id === file.id
                && (payload.folder_id ?? null) === activeFolderId
            ) {
                setProgress(payload.percent);
            }
        }).then((stopListening) => {
            if (disposed) stopListening();
            else unlisten = stopListening;
        }).catch(() => {
            // Progress is an enhancement; preview loading remains fully functional without it.
        });

        return () => {
            disposed = true;
            unlisten?.();
        };
    }, [file.id, activeFolderId]);

    useEffect(() => {
        const requestId = ++latestRequestRef.current;
        const cachedPreview = getCachedPreview(file.id, activeFolderId);
        const resolvedThumbnail = imagePreview
            ? (initialThumbnail ?? getCachedThumbnail(file.id, activeFolderId))
            : null;

        setThumbnailSrc(resolvedThumbnail);
        setFullSrc(cachedPreview);
        setFullReady(Boolean(cachedPreview));
        setLoading(!cachedPreview);
        setProgress(cachedPreview ? 100 : 0);
        setError(null);
        fitImage();
        setRotation(0);
        activePointersRef.current.clear();
        pointerGestureRef.current = null;
        setImageInteracting(false);
        isChangingFileRef.current = false;
        setIsSwiping(false);
        isSwipingRef.current = false;
        setSlideTransition(false);
        setSwipeOffset(0);
        swipeOffsetRef.current = 0;

        if (imagePreview && !resolvedThumbnail) {
            peekThumbnail(file.id, activeFolderId).then((peeked) => {
                if (requestId === latestRequestRef.current && peeked) {
                    setThumbnailSrc(peeked);
                }
            });
            loadThumbnail(file.id, activeFolderId, 100, file.name).then((src) => {
                if (requestId === latestRequestRef.current && src) {
                    setThumbnailSrc(src);
                }
            }).catch(() => {});
        }

        // Fast prefetch thumbnails for neighboring files to make carousel swipe instantaneous
        if (nextFile && isImageFile(nextFile.name)) {
            loadThumbnail(nextFile.id, activeFolderId, 80, nextFile.name).catch(() => {});
        }
        if (prevFile && isImageFile(prevFile.name)) {
            loadThumbnail(prevFile.id, activeFolderId, 80, prevFile.name).catch(() => {});
        }

        loadPreview(file.id, activeFolderId).then((src) => {
            if (requestId !== latestRequestRef.current) return;
            if (!src) {
                setError('Preview not available');
                setLoading(false);
                return;
            }
            setFullSrc(src);
            const isImg = isImageFile(file.name, file.mime_type) || isImageFile(src);
            setImagePreview(isImg);
            if (!isImg) setLoading(false);
        }).catch((loadError) => {
            if (requestId !== latestRequestRef.current) return;
            const raw = loadError instanceof Error ? loadError.message : String(loadError);
            if (raw.includes('ENCRYPTED_PREVIEW_UNAVAILABLE') || raw.includes('encrypted file')) {
                setError('ENCRYPTED_FILE');
            } else {
                setError(userFacingError(loadError, t));
            }
            setLoading(false);
        });
    }, [file.id, file.name, file.mime_type, activeFolderId, imagePreview, fitImage, initialThumbnail, nextFile, prevFile, t]);

    // Prefetch both next and previous images ahead of time for instantaneous swipe navigation
    useEffect(() => {
        if (!fullReady) return;
        if (settings.vpnMode && settings.bandwidthLimitDownKBs > 0) return;
        const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
        if (connection?.saveData) return;

        const filesToPrefetch = [nextFile, prevFile].filter(
            (f): f is TelegramFile => Boolean(f && isImageFile(f.name) && f.size <= MAX_PREFETCH_BYTES)
        );
        if (filesToPrefetch.length === 0) return;

        const timerId = window.setTimeout(() => {
            for (const target of filesToPrefetch) {
                if (!getCachedPreview(target.id, activeFolderId)) {
                    void loadPreview(target.id, activeFolderId).catch(() => {});
                }
            }
        }, 350);

        return () => {
            window.clearTimeout(timerId);
        };
    }, [fullReady, nextFile, prevFile, activeFolderId, settings.vpnMode, settings.bandwidthLimitDownKBs]);

    useEffect(() => {
        if (!fullReady) return;
        const viewport = imageViewportRef.current;
        if (!viewport) return;

        const keepTransformInBounds = () => {
            const current = imageTransformRef.current;
            commitImageTransform({ ...current, pan: clampPan(current.pan, current.zoom) });
        };
        const observer = typeof ResizeObserver !== 'undefined'
            ? new ResizeObserver(keepTransformInBounds)
            : null;
        observer?.observe(viewport);

        return () => observer?.disconnect();
    }, [clampPan, commitImageTransform, fullReady]);

    useEffect(() => {
        const el = imageViewportRef.current;
        if (!el) return;

        const preventMultiTouch = (e: TouchEvent) => {
            if (e.touches.length > 1) {
                e.preventDefault();
            }
        };

        const preventGesture = (e: Event) => {
            e.preventDefault();
        };

        el.addEventListener('touchstart', preventMultiTouch, { passive: false });
        el.addEventListener('touchmove', preventMultiTouch, { passive: false });
        el.addEventListener('gesturestart', preventGesture, { passive: false });
        el.addEventListener('gesturechange', preventGesture, { passive: false });
        el.addEventListener('gestureend', preventGesture, { passive: false });

        return () => {
            el.removeEventListener('touchstart', preventMultiTouch);
            el.removeEventListener('touchmove', preventMultiTouch);
            el.removeEventListener('gesturestart', preventGesture);
            el.removeEventListener('gesturechange', preventGesture);
            el.removeEventListener('gestureend', preventGesture);
        };
    }, []);

    const handleImageWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
        if (!fullReady) return;
        event.preventDefault();
        const factor = Math.exp(-event.deltaY * 0.002);
        zoomImageTo(imageTransformRef.current.zoom * factor, { x: event.clientX, y: event.clientY });
    }, [fullReady, zoomImageTo]);

    const handleImagePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
        if (isChangingFileRef.current) return;
        if ((!fullReady && !thumbnailSrc) || event.button !== 0) return;
        event.preventDefault();
        const point = { x: event.clientX, y: event.clientY };
        activePointersRef.current.set(event.pointerId, point);
        try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* unsupported WebView */ }

        if (activePointersRef.current.size === 1) {
            pointerStartRef.current = { point, time: Date.now() };
            gestureHadMultiplePointersRef.current = false;
            pointerGestureRef.current = {
                type: 'pan',
                start: point,
                startPan: imageTransformRef.current.pan,
            };
            swipeOffsetRef.current = 0;
            setSwipeOffset(0);
            setSlideTransition(false);
        } else {
            gestureHadMultiplePointersRef.current = true;
            isSwipingRef.current = false;
            setIsSwiping(false);
            swipeOffsetRef.current = 0;
            setSwipeOffset(0);
            const [first, second] = [...activePointersRef.current.values()];
            pointerGestureRef.current = {
                type: 'pinch',
                startDistance: Math.max(1, distance(first, second)),
                startZoom: imageTransformRef.current.zoom,
                startCenter: midpoint(first, second),
                startPan: imageTransformRef.current.pan,
            };
        }
        setImageInteracting(true);
    }, [fullReady, thumbnailSrc]);

    const handleImagePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
        if (isChangingFileRef.current) return;
        if (!activePointersRef.current.has(event.pointerId)) return;
        event.preventDefault();
        activePointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        const gesture = pointerGestureRef.current;
        if (!gesture) return;

        if (activePointersRef.current.size >= 2 && gesture.type === 'pinch') {
            isSwipingRef.current = false;
            setIsSwiping(false);
            const [first, second] = [...activePointersRef.current.values()];
            const center = midpoint(first, second);
            const zoom = Math.max(
                MIN_IMAGE_ZOOM,
                Math.min(MAX_IMAGE_ZOOM, gesture.startZoom * distance(first, second) / gesture.startDistance),
            );
            const viewport = imageViewportRef.current;
            let pan = gesture.startPan;
            if (viewport) {
                const bounds = viewport.getBoundingClientRect();
                const startFocal = {
                    x: gesture.startCenter.x - (bounds.left + bounds.width / 2),
                    y: gesture.startCenter.y - (bounds.top + bounds.height / 2),
                };
                const ratio = zoom / gesture.startZoom;
                pan = {
                    x: startFocal.x - (startFocal.x - gesture.startPan.x) * ratio + center.x - gesture.startCenter.x,
                    y: startFocal.y - (startFocal.y - gesture.startPan.y) * ratio + center.y - gesture.startCenter.y,
                };
            }
            commitImageTransform({ zoom, pan: clampPan(pan, zoom) });
        } else if (activePointersRef.current.size === 1 && gesture.type === 'pan') {
            const current = [...activePointersRef.current.values()][0];
            const isZoomed = imageTransformRef.current.zoom > 1.05;

            if (isZoomed) {
                const pan = {
                    x: gesture.startPan.x + current.x - gesture.start.x,
                    y: gesture.startPan.y + current.y - gesture.start.y,
                };
                const zoom = imageTransformRef.current.zoom;
                commitImageTransform({ zoom, pan: clampPan(pan, zoom) });
            } else {
                const deltaX = current.x - gesture.start.x;
                if (Math.abs(deltaX) > 6 || isSwipingRef.current) {
                    isSwipingRef.current = true;
                    setIsSwiping(true);

                    let offset = deltaX;
                    if (offset > 0 && !onPrev) {
                        offset = Math.sign(offset) * Math.pow(Math.abs(offset), 0.75);
                    } else if (offset < 0 && !onNext) {
                        offset = Math.sign(offset) * Math.pow(Math.abs(offset), 0.75);
                    }

                    swipeOffsetRef.current = offset;
                    setSwipeOffset(offset);
                }
            }
        }
    }, [clampPan, commitImageTransform, onNext, onPrev]);

    const finishImagePointer = useCallback((event: React.PointerEvent<HTMLDivElement>, allowTap: boolean) => {
        if (isChangingFileRef.current) return;
        const endPoint = { x: event.clientX, y: event.clientY };
        const pointerStart = pointerStartRef.current;
        const wasSingleTouch = event.pointerType === 'touch' && !gestureHadMultiplePointersRef.current;
        try { event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* unsupported WebView */ }
        activePointersRef.current.delete(event.pointerId);

        const currentOffset = swipeOffsetRef.current;
        const isZoomed = imageTransformRef.current.zoom > 1.05;

        if (!isZoomed && isSwipingRef.current && pointerStart) {
            const duration = Math.max(1, Date.now() - pointerStart.time);
            const velocityX = currentOffset / duration;
            const isFlick = Math.abs(currentOffset) > 30 && Math.abs(velocityX) > 0.3;
            const isDraggedFar = Math.abs(currentOffset) > 60;

            if ((isDraggedFar || isFlick) && currentOffset < 0 && onNext) {
                // Swiped Left -> next image
                isChangingFileRef.current = true;
                setSlideTransition(true);
                const exitDistance = -(window.innerWidth || 500);
                setSwipeOffset(exitDistance);
                swipeOffsetRef.current = exitDistance;
                setTimeout(() => {
                    onNext();
                }, 180);
            } else if ((isDraggedFar || isFlick) && currentOffset > 0 && onPrev) {
                // Swiped Right -> prev image
                isChangingFileRef.current = true;
                setSlideTransition(true);
                const exitDistance = window.innerWidth || 500;
                setSwipeOffset(exitDistance);
                swipeOffsetRef.current = exitDistance;
                setTimeout(() => {
                    onPrev();
                }, 180);
            } else {
                setSlideTransition(true);
                setSwipeOffset(0);
                swipeOffsetRef.current = 0;
            }
        } else if (allowTap && wasSingleTouch && pointerStart) {
            const distanceMoved = distance(pointerStart.point, endPoint);
            const elapsed = Date.now() - pointerStart.time;
            if (distanceMoved < 10 && elapsed < 300) {
                const now = Date.now();
                const lastTap = lastTouchTapRef.current;
                if (lastTap && now - lastTap.time < 300 && distance(lastTap.point, endPoint) < 25) {
                    lastTouchTapRef.current = null;
                    toggleImageZoom(endPoint);
                } else {
                    lastTouchTapRef.current = { point: endPoint, time: now };
                }
            }
        }

        if (activePointersRef.current.size === 1) {
            const remaining = [...activePointersRef.current.values()][0];
            pointerGestureRef.current = {
                type: 'pan',
                start: remaining,
                startPan: imageTransformRef.current.pan,
            };
        } else if (activePointersRef.current.size === 0) {
            pointerGestureRef.current = null;
            pointerStartRef.current = null;
            gestureHadMultiplePointersRef.current = false;
            setImageInteracting(false);
            setSlideTransition(true);
            setSwipeOffset(0);
            swipeOffsetRef.current = 0;
            isSwipingRef.current = false;
            setIsSwiping(false);
        }
    }, [onNext, onPrev, toggleImageZoom]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
                return;
            }

            const key = event.key.toLowerCase();
            if (imagePreview && (event.key === '+' || event.key === '=')) {
                event.preventDefault();
                zoomImageTo(imageTransformRef.current.zoom * IMAGE_ZOOM_STEP);
            } else if (imagePreview && event.key === '-') {
                event.preventDefault();
                zoomImageTo(imageTransformRef.current.zoom / IMAGE_ZOOM_STEP);
            } else if (imagePreview && key === '0') {
                event.preventDefault();
                fitImage();
            } else if (imagePreview && key === '1') {
                event.preventDefault();
                showActualImageSize();
            } else if (imagePreview && imageTransformRef.current.zoom > 1.05 && event.key.startsWith('Arrow')) {
                event.preventDefault();
                const amount = event.shiftKey ? 160 : 64;
                if (event.key === 'ArrowRight') panImageBy(-amount, 0);
                else if (event.key === 'ArrowLeft') panImageBy(amount, 0);
                else if (event.key === 'ArrowDown') panImageBy(0, -amount);
                else if (event.key === 'ArrowUp') panImageBy(0, amount);
            } else if (event.key === 'ArrowRight' || key === 'l') {
                event.preventDefault();
                onNext?.();
            } else if (event.key === 'ArrowLeft' || key === 'j') {
                event.preventDefault();
                onPrev?.();
            } else if (event.key === 'Escape') {
                event.preventDefault();
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, onNext, onPrev, imagePreview, zoomImageTo, fitImage, showActualImageSize, panImageBy]);

    const imageTransformStyle = `translate3d(${imageTransform.pan.x}px, ${imageTransform.pan.y}px, 0) scale(${imageTransform.zoom}) rotate(${rotation}deg)`;

    // Progressive Live Clarity calculations based on enhancing progress (0% -> 100%)
    const safeProgress = Math.max(0, Math.min(100, progress));
    const liveBlur = fullReady ? 0 : Math.max(0, ((100 - safeProgress) / 100) * 16);
    const liveContrast = fullReady ? 100 : Math.round(100 + (safeProgress / 100) * 8);
    const liveSaturate = fullReady ? 100 : Math.round(100 + (safeProgress / 100) * 5);
    const liveBrightness = fullReady ? 100 : Math.round(96 + (safeProgress / 100) * 4);
    const liveScale = fullReady ? 1 : 1 + ((100 - safeProgress) / 100) * 0.02;
    const thumbnailFilterStyle = loading
        ? `blur(${liveBlur.toFixed(1)}px) contrast(${liveContrast}%) saturate(${liveSaturate}%) brightness(${liveBrightness}%)`
        : 'none';

    return (
        <div
            className="viewer-overlay fixed inset-0 z-[150] flex flex-col w-screen h-screen bg-black select-none overflow-hidden"
            onClick={() => setShowControls((prev) => !prev)}
        >
            {/* Top Bar: Floating Glass Header */}
            <div
                className={`absolute top-0 inset-x-0 z-30 flex items-center justify-between px-3 sm:px-5 py-2.5 sm:py-3 bg-gradient-to-b from-black/85 via-black/40 to-transparent backdrop-blur-[2px] transition-all duration-200 pointer-events-auto pt-[max(0.75rem,env(safe-area-inset-top,0.75rem))] ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center gap-2.5 min-w-0">
                    <button
                        onClick={onClose}
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center transition-all border border-white/10 shrink-0"
                        title={i18n.t("common.close")}
                        aria-label="Close preview"
                    >
                        <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
                    </button>
                    <div className="min-w-0">
                        <h2 className="truncate text-xs sm:text-sm font-semibold text-white max-w-[180px] sm:max-w-md md:max-w-xl" title={file.name}>
                            {file.name}
                        </h2>
                        <p className="text-[10px] sm:text-xs text-white/50 flex items-center gap-2">
                            {typeof currentIndex === 'number' && typeof totalItems === 'number' && totalItems > 0 && (
                                <span className="tabular-nums">{currentIndex + 1} / {totalItems}</span>
                            )}
                            {file.size > 0 && (
                                <span>• {formatBytes(file.size)}</span>
                            )}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <button
                        type="button"
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center transition-all border border-white/10"
                        onClick={() => setRotation((prev) => (prev + 90) % 360)}
                        title="Rotate 90°"
                        aria-label="Rotate image"
                    >
                        <RotateCw className="h-4 w-4" />
                    </button>

                    {onDownload && (
                        <button
                            type="button"
                            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center transition-all border border-white/10"
                            onClick={onDownload}
                            title="Download"
                            aria-label="Download image"
                        >
                            <Download className="h-4 w-4" />
                        </button>
                    )}

                    <button
                        onClick={onClose}
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center transition-all border border-white/10"
                        title={i18n.t("common.close")}
                        aria-label="Close preview"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Error Message or Encrypted File Card */}
            {error && (
                error === 'ENCRYPTED_FILE' || error.includes('[VAULT_LOCKED]') || error.toLowerCase().includes('encrypted') ? (
                    <div className="m-auto max-w-sm border border-telegram-border/60 bg-telegram-surface/95 p-6 rounded-3xl text-telegram-text backdrop-blur-md text-center shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
                        <div className="w-14 h-14 mx-auto rounded-2xl bg-telegram-primary/15 border border-telegram-primary/30 flex items-center justify-center text-telegram-primary shadow-lg shadow-telegram-primary/10">
                            <Lock className="w-7 h-7" />
                        </div>
                        <div>
                            <p className="text-base font-bold text-telegram-text tracking-tight">Encrypted File</p>
                            <p className="mt-1.5 text-xs leading-relaxed text-telegram-subtext">
                                Unlock your Cloud Vault with passphrase to preview and view this file.
                            </p>
                        </div>
                        <button
                            onClick={() => setShowUnlockModal(true)}
                            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-telegram-primary text-black font-bold text-xs shadow-md shadow-telegram-primary/25 hover:opacity-95 transition flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                        >
                            <Lock className="w-4 h-4" />
                            <span>Unlock Vault with Passphrase</span>
                        </button>
                        {onDownload && (
                            <button
                                onClick={onDownload}
                                className="w-full py-2 px-4 rounded-xl bg-telegram-hover/40 hover:bg-telegram-hover/70 border border-telegram-border/30 text-telegram-text text-xs font-semibold transition flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                            >
                                <Download className="w-4 h-4" />
                                <span>Download Encrypted File</span>
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="m-auto max-w-md border border-red-500/30 bg-red-950/40 p-5 rounded-2xl text-red-300 backdrop-blur-md text-center">
                        <p className="text-sm font-semibold">Preview Error</p>
                        <p className="mt-1 text-xs leading-relaxed text-red-200/80">{error}</p>
                    </div>
                )
            )}

            {/* Fullscreen Image Viewport */}
            {!error && imagePreview && (
                <div
                    ref={imageViewportRef}
                    className={`relative flex-1 w-full h-full flex items-center justify-center overflow-hidden ${imageTransform.zoom > 1 ? (imageInteracting ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in'}`}
                    style={{ touchAction: 'none', overscrollBehavior: 'contain' }}
                    onWheel={handleImageWheel}
                    onPointerDown={handleImagePointerDown}
                    onPointerMove={handleImagePointerMove}
                    onPointerUp={(event) => finishImagePointer(event, true)}
                    onPointerCancel={(event) => finishImagePointer(event, false)}
                    onDoubleClick={(event) => toggleImageZoom({ x: event.clientX, y: event.clientY })}
                >
                    <div
                        className="relative w-full h-full flex items-center justify-center pointer-events-none select-none"
                        style={{
                            transform: `translate3d(${swipeOffset}px, 0, 0)`,
                            transformOrigin: 'center center',
                            transition: (imageInteracting || isSwiping)
                                ? 'none'
                                : slideTransition
                                    ? 'transform 220ms cubic-bezier(0.2, 0.9, 0.3, 1), opacity 220ms'
                                    : 'transform 180ms ease-out, opacity 200ms',
                            willChange: 'transform, opacity',
                            opacity: Math.abs(swipeOffset) > 0
                                ? Math.max(0.25, 1 - Math.abs(swipeOffset) / 450)
                                : (fullReady || thumbnailSrc ? 1 : 0),
                        }}
                    >
                        {thumbnailSrc && !fullReady && (
                            <img
                                src={thumbnailSrc}
                                decoding="async"
                                className="pointer-events-none absolute inset-0 m-auto max-h-full max-w-full select-none object-contain"
                                alt=""
                                aria-hidden="true"
                                draggable={false}
                                style={{
                                    transform: `${imageTransformStyle} scale(${liveScale})`,
                                    transformOrigin: 'center center',
                                    filter: thumbnailFilterStyle,
                                    transition: (imageInteracting || isSwiping)
                                        ? 'none'
                                        : 'transform 180ms ease-out, filter 300ms cubic-bezier(0.2, 0.8, 0.2, 1)',
                                    willChange: 'filter, transform',
                                }}
                                onError={() => {
                                    forgetThumbnail(file.id, activeFolderId);
                                    setThumbnailSrc(null);
                                }}
                            />
                        )}

                        {fullSrc && (
                            <img
                                ref={fullImageRef}
                                src={fullSrc}
                                decoding="async"
                                draggable={false}
                                className={`pointer-events-none absolute inset-0 m-auto max-h-full max-w-full select-none object-contain ${fullReady ? 'opacity-100' : 'opacity-0'}`}
                                alt={file.name}
                                style={{
                                    transform: imageTransformStyle,
                                    transformOrigin: 'center center',
                                    transition: (imageInteracting || isSwiping)
                                        ? 'none'
                                        : 'transform 180ms ease-out, opacity 350ms cubic-bezier(0.2, 0.9, 0.3, 1)',
                                    willChange: 'opacity, transform',
                                }}
                                onLoad={(event) => {
                                    const image = event.currentTarget;
                                    const loadedFileId = file.id;
                                    const reveal = () => {
                                        if (currentFileIdRef.current !== loadedFileId) return;
                                        setFullReady(true);
                                        setLoading(false);
                                        setProgress(100);
                                    };
                                    if (typeof image.decode === 'function') {
                                        void image.decode().catch(() => {}).finally(reveal);
                                    } else {
                                        reveal();
                                    }
                                }}
                                onError={() => {
                                    forgetPreview(file.id, activeFolderId);
                                    setError('Failed to render image preview');
                                    setLoading(false);
                                }}
                            />
                        )}
                    </div>

                    {loading && (
                        thumbnailSrc ? (
                            <div className="absolute bottom-20 z-20 flex items-center gap-2.5 px-4 py-2 rounded-full bg-black/80 border border-white/20 backdrop-blur-xl text-white/90 text-xs shadow-2xl animate-in fade-in duration-200">
                                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-telegram-primary shrink-0" />
                                <span className="font-medium">Enhancing to full resolution…</span>
                                {progress > 0 && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-telegram-primary font-mono text-[11px] font-bold">{progress}%</span>
                                        <div className="w-16 h-1.5 rounded-full bg-white/20 overflow-hidden">
                                            <div
                                                className="h-full bg-telegram-primary rounded-full transition-all duration-300 ease-out"
                                                style={{ width: `${safeProgress}%` }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="viewer-toolbar absolute start-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rtl:translate-x-1/2 flex flex-col items-center gap-2 px-5 py-4 text-white bg-black/70 rounded-2xl border border-white/10 backdrop-blur-md">
                                <div className="h-7 w-7 animate-spin rounded-full border-2 border-white/25 border-t-telegram-primary" />
                                <p className="text-xs font-medium">Loading preview…</p>
                                {progress > 0 && (
                                    <div className="h-1.5 w-36 overflow-hidden rounded-full bg-white/15" aria-label={`${progress}%`}>
                                        <div className="h-full rounded-full bg-telegram-primary transition-[width] duration-200" style={{ width: `${progress}%` }} />
                                    </div>
                                )}
                            </div>
                        )
                    )}
                </div>
            )}

            {!error && !imagePreview && !loading && fullSrc && (
                <div className="m-auto max-w-lg p-6 text-center text-white bg-black/60 rounded-2xl border border-white/10 backdrop-blur-md">
                    {(isVideoFile(file.name, file.mime_type) || isVideoFile(fullSrc)) ? (
                        <div className="flex flex-col items-center">
                            <video
                                src={fullSrc}
                                controls
                                playsInline
                                className="max-h-[60vh] max-w-full rounded-xl shadow-2xl mb-4"
                            />
                            <h3 className="truncate text-base font-medium max-w-xs" title={file.name}>{file.name}</h3>
                        </div>
                    ) : (isMediaFile(file.name, file.mime_type) || isMediaFile(fullSrc)) ? (
                        <div className="flex flex-col items-center gap-3">
                            <audio src={fullSrc} controls className="w-full max-w-xs mb-2" />
                            <h3 className="truncate text-base font-medium max-w-xs" title={file.name}>{file.name}</h3>
                        </div>
                    ) : (
                        <div>
                            <File className="mx-auto mb-3 h-10 w-10 text-telegram-primary" />
                            <h3 className="truncate text-base font-medium" title={file.name}>{file.name}</h3>
                            <p className="mt-2 text-xs text-white/60">Decrypted preview is ready.</p>
                            <div className="mt-4 flex justify-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => invoke('cmd_open_file_externally', { path: fullSrc })}
                                    className="flex items-center gap-2 px-4 py-2 bg-telegram-primary hover:bg-telegram-primary/80 text-white rounded-xl text-xs font-semibold shadow transition-all active:scale-95"
                                >
                                    <ExternalLink className="h-4 w-4" />
                                    Open in Default App
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Bottom Floating Toolbar */}
            {fullReady && (
                <div
                    className={`absolute bottom-4 sm:bottom-6 inset-x-0 z-30 flex justify-center pointer-events-none pb-[env(safe-area-inset-bottom,0px)] transition-all duration-200 ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
                >
                    <div
                        className="pointer-events-auto flex items-center gap-1 sm:gap-2 px-3 py-1.5 rounded-full border border-white/15 bg-black/75 shadow-2xl backdrop-blur-xl text-white"
                        onPointerDown={(event) => event.stopPropagation()}
                        onDoubleClick={(event) => event.stopPropagation()}
                        onWheel={(event) => event.stopPropagation()}
                        onClick={(event) => event.stopPropagation()}
                    >
                        <button
                            type="button"
                            className="viewer-control disabled:opacity-30"
                            onClick={() => zoomImageTo(imageTransformRef.current.zoom / IMAGE_ZOOM_STEP)}
                            disabled={imageTransform.zoom <= MIN_IMAGE_ZOOM + 0.001}
                            title={t('common.zoom_out_shortcut')}
                            aria-label={t('common.zoom_out')}
                        >
                            <ZoomOut className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            className="min-w-12 rounded-md px-1.5 py-0.5 text-[11px] font-mono tabular-nums text-white/85 hover:bg-white/10 transition-colors"
                            onClick={fitImage}
                            title={t('common.fit_image_shortcut')}
                            aria-label={`${t('common.current_zoom', { percent: Math.round(imageTransform.zoom * 100) })}. ${t('common.fit_image')}`}
                        >
                            {Math.round(imageTransform.zoom * 100)}%
                        </button>
                        <button
                            type="button"
                            className="viewer-control disabled:opacity-30"
                            onClick={() => zoomImageTo(imageTransformRef.current.zoom * IMAGE_ZOOM_STEP)}
                            disabled={imageTransform.zoom >= MAX_IMAGE_ZOOM - 0.001}
                            title={t('common.zoom_in_shortcut')}
                            aria-label={t('common.zoom_in')}
                        >
                            <ZoomIn className="h-4 w-4" />
                        </button>
                        <span className="mx-0.5 h-4 w-px bg-white/20" aria-hidden="true" />
                        <button
                            type="button"
                            className="viewer-control"
                            onClick={fitImage}
                            title={t('common.fit_image_shortcut')}
                            aria-label={t('common.fit_image')}
                        >
                            <Maximize className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            className="viewer-control"
                            onClick={showActualImageSize}
                            title={t('common.actual_size_shortcut')}
                            aria-label={t('common.actual_size')}
                        >
                            <Scan className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}

            {showUnlockModal && (
                <Suspense fallback={null}>
                    <LazyVaultPassphraseModal
                        isOpen={showUnlockModal}
                        onClose={() => setShowUnlockModal(false)}
                        targetFile={file}
                        onUnlockOnlyThisFile={async (pwd) => {
                            setShowUnlockModal(false);
                            setError(null);
                            setLoading(true);
                            try {
                                forgetPreview(file.id, activeFolderId);
                                const src = await loadPreview(file.id, activeFolderId, pwd);
                                if (src) {
                                    setFullSrc(src);
                                    const isImg = isImageFile(file.name, file.mime_type) || isImageFile(src);
                                    setImagePreview(isImg);
                                    setFullReady(true);
                                }
                            } catch (err: any) {
                                setError(userFacingError(err, t));
                            } finally {
                                setLoading(false);
                            }
                        }}
                        onSuccess={() => {
                            setShowUnlockModal(false);
                            setError(null);
                            setLoading(true);
                            forgetPreview(file.id, activeFolderId);
                            loadPreview(file.id, activeFolderId).then((src) => {
                                if (src) {
                                    setFullSrc(src);
                                    const isImg = isImageFile(file.name, file.mime_type) || isImageFile(src);
                                    setImagePreview(isImg);
                                    setFullReady(true);
                                }
                                setLoading(false);
                            }).catch((err) => {
                                setError(userFacingError(err, t));
                                setLoading(false);
                            });
                        }}
                    />
                </Suspense>
            )}
        </div>
    );
}
