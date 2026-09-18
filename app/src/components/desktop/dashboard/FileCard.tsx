import { useCallback, useState, useEffect, useRef, memo } from 'react';
import { Folder, Eye, Trash2, Link, Check, Play } from 'lucide-react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { TelegramFile } from '../../../types';
import {
    cancelThumbnailLoad,
    forgetThumbnail,
    getCachedThumbnail,
    loadThumbnail,
    peekThumbnail,
    subscribeThumbnailInvalidation,
} from '../../../services/imagePreviewCache';
import { FileTypeIcon } from '../../shared/FileTypeIcon';
import { useVideoMetadata } from '../../../hooks/useVideoMetadata';
import { useCachedVariants } from '../../../hooks/useCachedVariants';
import { VideoMetaBadge } from '../../shared/VideoMetaBadge';
import { EncryptionBadge } from '../../shared/EncryptionBadge';
import { describeFileActions } from './fileActionDescriptors';
import { isImageFile, isVideoFile } from '../../../utils';
import i18n from '../../../i18n';

interface FileCardProps {
    file: TelegramFile;
    onDelete: () => void;
    onDownload: () => void;
    onPreview?: (thumbnail?: string | null) => void;
    onShare?: () => void;
    isSelected: boolean;
    onClick?: (e: React.MouseEvent) => void;
    onContextMenu?: (e: React.MouseEvent) => void;
    activeFolderId?: number | null;
    height?: number;
    onToggleSelection?: () => void;
    selectedIds?: number[];
    disableDrag?: boolean;
}

export const FileCard = memo(function FileCard({ file, onDelete, onDownload, onPreview, onShare, isSelected, onClick, onContextMenu, activeFolderId, height, onToggleSelection, selectedIds, disableDrag = false }: FileCardProps) {
    const actions = describeFileActions(file);
    const { isFolder } = actions;
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [isInViewport, setIsInViewport] = useState(false);
    const [thumbnail, setThumbnail] = useState<string | null>(() => getCachedThumbnail(file.id, activeFolderId));
    const [thumbnailReady, setThumbnailReady] = useState(() => Boolean(getCachedThumbnail(file.id, activeFolderId)));
    const fileIds = selectedIds?.includes(file.id) ? selectedIds : [file.id];
    const {
        attributes,
        listeners,
        setNodeRef: setDraggableNodeRef,
        isDragging,
    } = useDraggable({
        id: `telegram-file-${file.folder_id ?? 'home'}-${file.id}`,
        disabled: isFolder || disableDrag,
        data: { kind: 'telegram-files', fileIds, label: file.name },
    });
    const {
        setNodeRef: setDroppableNodeRef,
        isOver,
        active: dragActive,
    } = useDroppable({
        id: `content-folder-${file.id}`,
        disabled: !isFolder,
        data: { kind: 'content-folder', folderId: file.id },
    });
    const setNodeRef = useCallback((node: HTMLDivElement | null) => {
        containerRef.current = node;
        setDraggableNodeRef(node);
        setDroppableNodeRef(node);
    }, [setDraggableNodeRef, setDroppableNodeRef]);
    const isFileDragOver = isFolder && isOver && dragActive?.data.current?.kind === 'telegram-files';

    // Lazy video metadata badge (.mp4 only)
    const { data: videoMeta, isLoading: videoMetaLoading } = useVideoMetadata(
        file.id,
        file.folder_id ?? null,
        file.name,
    );

    // Cached HLS variants
    const { data: cachedVariants } = useCachedVariants(
        file.id,
        file.folder_id ?? null,
        file.name,
    );
    const cachedQualities = (cachedVariants || []).filter(v => v.available).map(v => v.quality);

    const isImage = isImageFile(file.name, file.mime_type);
    const isVideo = isVideoFile(file.name, file.mime_type);
    const isMediaWithThumb = isImage || isVideo;
    const isPotentialMedia = isMediaWithThumb || Boolean(file.encryption_state?.startsWith('encrypted')) || file.name.endsWith('.tdenc') || file.name === 'TDENC2';

    // Viewport-only intersection observer
    useEffect(() => {
        const el = containerRef.current;
        if (!el || typeof IntersectionObserver === 'undefined') {
            setIsInViewport(true);
            return;
        }
        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        setIsInViewport(true);
                        observer.disconnect();
                        break;
                    }
                }
            },
            { rootMargin: '250px 0px' }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    // Lazy load thumbnail for image and video files
    useEffect(() => {
        if (isFolder || !isPotentialMedia) return;

        let cancelled = false;

        const tryLoad = () => {
            if (cancelled) return;
            const currentIsImage = isImageFile(file.name, file.mime_type);
            const currentIsVideo = isVideoFile(file.name, file.mime_type);
            // For encrypted files (isPotentialMedia=true but not yet image/video by name),
            // still attempt thumbnail load — the backend handles decryption.
            const isEncrypted = Boolean(file.encryption_state?.startsWith('encrypted'));
            const isEncryptedUnlocked = file.encryption_state === 'encrypted_unlocked';
            if (!currentIsImage && !currentIsVideo && !isEncrypted) return;

            // 1. Synchronous check
            const syncCached = getCachedThumbnail(file.id, activeFolderId);
            if (syncCached) {
                setThumbnail(syncCached);
                setThumbnailReady(true);
                return;
            }

            // 2. Asynchronous peek (IndexedDB check)
            peekThumbnail(file.id, activeFolderId).then((persisted) => {
                if (cancelled) return;
                if (persisted) {
                    setThumbnail(persisted);
                    setThumbnailReady(true);
                }
            });

            // 3. Only fetch from network/IPC when in or near viewport
            // Encrypted but locked files shouldn't waste time trying
            if (!isInViewport) return;
            if (isEncrypted && !isEncryptedUnlocked) return;

            loadThumbnail(file.id, activeFolderId, 10, file.name).then((result) => {
                if (!cancelled && result) {
                    if (result !== syncCached) setThumbnailReady(false);
                    setThumbnail(result);
                }
            }).catch(() => {
                // Silently fail - will show icon instead
            });
        };

        tryLoad();

        const unsubscribe = subscribeThumbnailInvalidation(() => {
            if (!cancelled) {
                tryLoad();
            }
        });

        return () => {
            cancelled = true;
            unsubscribe();
            if (!thumbnail) {
                cancelThumbnailLoad(file.id, activeFolderId);
            }
        };
    }, [file.id, file.name, file.mime_type, file.encryption_state, activeFolderId, isFolder, isMediaWithThumb, isPotentialMedia, isInViewport]);

    return (
        <div
            ref={setNodeRef}
            className="file-card-container relative h-full min-w-0 overflow-hidden"
            style={{ opacity: isDragging ? 0.45 : undefined }}
            {...(!isFolder ? attributes : {})}
            {...(!isFolder ? listeners : {})}
            role="group"
            aria-label={file.name}
            onContextMenu={onContextMenu}
            onClick={onClick}
        >
            <div
                className={`group relative h-full w-full min-w-0 cursor-pointer overflow-hidden rounded-xl border backdrop-blur-sm transition-all duration-200
                ${isSelected 
                    ? 'border-app-accent bg-app-selected/80 shadow-md ring-2 ring-app-accent/60' 
                    : 'border-white/5 bg-app-surface/60 hover:-translate-y-0.5 hover:border-app-accent/40 hover:bg-app-surface/85 hover:shadow-lg'}
                ${isFileDragOver ? 'bg-app-selected ring-2 ring-app-accent' : ''}`}
                style={height ? { height: `${height}px` } : { aspectRatio: '4/3' }}
            >
                {/* Thumbnail or Swimming Wave / Icon */}
                {thumbnail ? (
                    <div className="absolute inset-0">
                        {!thumbnailReady && (
                            <div className="shimmer-effect absolute inset-0 z-0 flex items-center justify-center">
                                <div className="opacity-20 scale-90">
                                    <FileTypeIcon filename={file.name} size="lg" className="h-11 w-11" />
                                </div>
                            </div>
                        )}
                        <img
                            src={thumbnail}
                            alt={file.name}
                            loading="lazy"
                            decoding="async"
                            className={`h-full w-full object-cover transition-opacity duration-300 group-hover:scale-105 motion-reduce:transition-none ${thumbnailReady ? 'opacity-100' : 'opacity-0'}`}
                            onLoad={() => setThumbnailReady(true)}
                            onError={() => {
                                forgetThumbnail(file.id, activeFolderId);
                                setThumbnail(null);
                                setThumbnailReady(false);
                            }}
                        />
                        {/* Play Icon Badge for Video */}
                        {isVideo && (
                            <div className="pointer-events-none absolute bottom-2 right-2 z-20">
                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-black/65 backdrop-blur-md text-white shadow-md border border-white/25">
                                    <Play className="h-3.5 w-3.5 fill-white ms-0.5" />
                                </div>
                            </div>
                        )}
                        {/* Gradient overlay for text readability */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent transition-opacity duration-200" />
                    </div>
                ) : isMediaWithThumb ? (
                    /* Full-card swimming shimmer wave for media awaiting thumbnail */
                    <div className="shimmer-effect absolute inset-0 flex items-center justify-center">
                        <div className="opacity-20 transition-transform duration-200 group-hover:scale-110">
                            <FileTypeIcon filename={file.name} size="lg" className="h-11 w-11 max-h-full max-w-full shrink-0 drop-shadow-sm" />
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />
                    </div>
                ) : (
                    <div className="file-card-icon absolute inset-x-0 bottom-12 top-0 flex items-center justify-center p-3 transition-transform duration-200 group-hover:scale-110">
                        {isFolder ? (
                            <Folder className="h-11 w-11 max-h-full max-w-full shrink-0 text-app-accent drop-shadow-sm" strokeWidth={1.75} />
                        ) : (
                            <FileTypeIcon filename={file.name} size="lg" className="h-11 w-11 max-h-full max-w-full shrink-0 drop-shadow-sm" />
                        )}
                    </div>
                )}

                {/* Selection Checkmark */}
                <button
                    type="button"
                    aria-label={isSelected ? `Deselect ${file.name}` : `Select ${file.name}`}
                    aria-pressed={isSelected}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (onToggleSelection) onToggleSelection();
                    }}
                    className={`absolute start-2 top-2 z-10 flex h-[22px] w-[22px] cursor-pointer items-center justify-center rounded-full border transition-all duration-150 ${isSelected ? 'border-app-accent bg-app-accent text-app-accent-contrast shadow-sm scale-100' : 'border-white/50 bg-black/40 text-white opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:scale-110'}`}
                >
                    {isSelected && <Check className="h-3 w-3" />}
                </button>

                {/* File info overlay at bottom with fixed height slots */}
                <div className={`file-card-info absolute inset-x-0 bottom-0 z-[1] min-h-12 overflow-hidden px-3 py-2 ${thumbnail ? 'text-white' : 'text-app-text'}`}>
                    <h2 className="block w-full min-w-0 truncate text-ui font-medium tracking-tight" title={file.name}>{file.name}</h2>
                    <div className="file-card-metadata mt-0.5 flex h-4.5 w-full min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap">
                        <p className={`shrink-0 text-metadata font-medium ${thumbnail ? 'text-white/80' : 'text-app-text-secondary'}`}>{file.sizeStr}</p>
                        <EncryptionBadge state={file.encryption_state ?? 'plain'} className="shrink-0" />
                        <VideoMetaBadge metadata={videoMeta} isLoading={videoMetaLoading} />
                        {cachedQualities.length > 0 && (
                            <span className="inline-flex min-w-0 items-center gap-0.5 overflow-hidden">
                                {cachedQualities.map(q => (
                                    <span key={q} className="inline-flex items-center gap-0.5 rounded bg-emerald-500/15 px-1 py-0.5 text-badge font-semibold text-emerald-400">
                                        <Check className="h-2.5 w-2.5" />
                                        {q}
                                    </span>
                                ))}
                            </span>
                        )}
                    </div>
                </div>

                {/* Modern Quick actions floating pill on hover */}
                <div className="file-card-actions absolute end-2 top-2 z-10 flex max-w-[calc(100%-2.75rem)] items-center gap-0.5 overflow-hidden rounded-full border border-white/15 bg-black/65 p-1 opacity-0 shadow-lg backdrop-blur-md transition-all duration-200 group-hover:opacity-100 focus-within:opacity-100">
                    <button type="button" aria-label={`Preview ${file.name}`} onClick={(e) => { e.stopPropagation(); if (onPreview) onPreview(thumbnail) }} className="quiet-control file-action-btn flex h-6 w-6 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/20 hover:text-white" title={i18n.t("files.preview")}>
                        <Eye className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" aria-label={`Download ${file.name}`} onClick={(e) => { e.stopPropagation(); onDownload() }} className="quiet-control file-action-btn flex h-6 w-6 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/20 hover:text-white" title={i18n.t("files.download")}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    </button>
                    {actions.canShare && onShare && (
                        <button type="button" aria-label={`Share ${file.name}`} onClick={(e) => { e.stopPropagation(); onShare() }} className="quiet-control file-action-btn flex h-6 w-6 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/20 hover:text-white" title={i18n.t("files.share")}>
                            <Link className="h-3.5 w-3.5" />
                        </button>
                    )}
                    <button type="button" aria-label={`Delete ${file.name}`} onClick={(e) => { e.stopPropagation(); onDelete() }} className="quiet-control file-action-btn flex h-6 w-6 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-red-500/80 hover:text-white" title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>
        </div>
    );
});
