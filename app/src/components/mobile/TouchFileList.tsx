import { useRef, useState, useCallback, useEffect, useMemo, memo, type RefObject } from 'react';
import { useVirtualizer, type VirtualItem } from '@tanstack/react-virtual';
import { DownloadCloud, Trash2, Pencil, CheckSquare, X, Check, FolderInput, MoreVertical, Eye, Link, Copy, Pin, PinOff, LayoutGrid, List, ExternalLink, Play, ArrowUpDown } from 'lucide-react';
import { FileTypeIcon } from '../shared/FileTypeIcon';
import { ActionPopover, ActionItem } from './ActionPopover';
import { TelegramFile, TelegramFolder } from '../../types';
import { isImageFile, isVideoFile } from '../../utils';
import {
  cancelThumbnailLoad,
  forgetThumbnail,
  getCachedThumbnail,
  loadThumbnail,
  peekThumbnail,
  subscribeThumbnailInvalidation,
} from '../../services/imagePreviewCache';
import i18n from '../../i18n';

const GridFileCard = memo(function GridFileCard({
  file,
  activeFolderId,
  isSelected,
  isSelectionActive,
  onClick,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onActionClick,
}: {
  file: TelegramFile;
  activeFolderId: number | null;
  isSelected: boolean;
  isSelectionActive: boolean;
  onClick: (thumb?: string | null) => void;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onActionClick: (e: React.MouseEvent) => void;
}) {
  const effectiveFolderId = file.folder_id !== undefined ? file.folder_id : activeFolderId;
  const isImage = isImageFile(file.name, file.mime_type);
  const isVideo = isVideoFile(file.name, file.mime_type);
  const isPotentialMedia = isImage || isVideo || Boolean(file.encryption_state?.startsWith('encrypted')) || file.name.endsWith('.tdenc') || file.name === 'TDENC2';
  const canHaveThumbnail = isImage || isVideo;
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [isInViewport, setIsInViewport] = useState(false);
  const [thumb, setThumb] = useState<string | null>(() => (canHaveThumbnail ? getCachedThumbnail(file.id, effectiveFolderId) : null));
  const [isLoaded, setIsLoaded] = useState(() => Boolean(canHaveThumbnail && getCachedThumbnail(file.id, effectiveFolderId)));
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [file.id, file.name, file.mime_type, file.encryption_state]);

  useEffect(() => {
    const el = cardRef.current;
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

  useEffect(() => {
    if (file.type === 'folder' || !isPotentialMedia) return;
    let active = true;

    const tryLoad = () => {
      if (!active) return;
      const currentIsImage = isImageFile(file.name, file.mime_type);
      const currentIsVideo = isVideoFile(file.name, file.mime_type);
      // For encrypted files, still attempt thumbnail — backend handles decryption.
      const isEncrypted = Boolean(file.encryption_state?.startsWith('encrypted'));
      const isEncryptedUnlocked = file.encryption_state === 'encrypted_unlocked';
      if (!currentIsImage && !currentIsVideo && !isEncrypted) return;

      // 1. Synchronous check
      const syncCached = getCachedThumbnail(file.id, effectiveFolderId);
      if (syncCached) {
        setThumb(syncCached);
        setIsLoaded(true);
        setHasError(false);
        return;
      }

      // 2. Asynchronous peek (IndexedDB)
      peekThumbnail(file.id, effectiveFolderId).then((persisted) => {
        if (!active) return;
        if (persisted) {
          setThumb(persisted);
          setIsLoaded(true);
          setHasError(false);
        }
      });

      // 3. Viewport-gated loading
      if (!isInViewport) return;
      // Locked encrypted files shouldn't try
      if (isEncrypted && !isEncryptedUnlocked) return;

      loadThumbnail(file.id, effectiveFolderId, 10, file.name)
        .then(src => {
          if (active && src) {
            setThumb(src);
            setIsLoaded(true);
            setHasError(false);
          } else if (active && !src) {
            setHasError(true);
          }
        })
        .catch(() => {
          if (active) setHasError(true);
        });
    };

    tryLoad();

    // Re-attempt thumbnail load when vault unlocks
    const unsubscribe = subscribeThumbnailInvalidation(() => {
      if (active) {
        setHasError(false);
        tryLoad();
      }
    });

    return () => {
      active = false;
      unsubscribe();
      if (!thumb) {
        cancelThumbnailLoad(file.id, effectiveFolderId);
      }
    };
  }, [file.id, file.name, file.type, file.mime_type, file.encryption_state, effectiveFolderId, canHaveThumbnail, isPotentialMedia, isInViewport]);

  return (
    <div
      ref={cardRef}
      role="button"
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClick={() => onClick(thumb)}
      className={`file-card-optimized group relative flex flex-col rounded-2xl bg-telegram-surface/90 border p-2 transition-all duration-200 cursor-pointer active:scale-[0.98] shadow-sm backdrop-blur-sm ${
        isSelected
          ? 'border-telegram-primary/80 bg-telegram-primary/10 shadow-md shadow-telegram-primary/10 ring-2 ring-telegram-primary/50'
          : 'border-telegram-border/40 hover:border-telegram-border/60 hover:bg-telegram-hover/30'
      }`}
    >
      {/* Thumbnail Container with Floating 3-Dot Button & Selection Checkbox */}
      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-telegram-hover/20 border border-telegram-border/20 flex items-center justify-center">
        {/* Floating Selection Checkbox */}
        {isSelectionActive && (
          <div className="absolute top-2 left-2 z-30">
            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shadow-md transition-all ${
              isSelected ? 'bg-telegram-primary border-telegram-primary text-black scale-105' : 'border-white/70 bg-black/40 backdrop-blur-sm'
            }`}>
              {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
            </div>
          </div>
        )}

        {/* Floating 3-Dot Action Button on Top of Thumbnail */}
        <button
          type="button"
          onPointerDown={e => e.stopPropagation()}
          onClick={onActionClick}
          className="absolute top-2 right-2 z-30 flex h-7 w-7 items-center justify-center rounded-full bg-black/45 backdrop-blur-md text-white/90 hover:text-white hover:bg-black/65 active:scale-90 transition-all shadow-md border border-white/10"
          aria-label="Actions"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {canHaveThumbnail && !hasError ? (
          <>
            {/* Shimmer wave loader while thumbnail is loading or image is decoding */}
            {!isLoaded && (
              <div className="shimmer-effect absolute inset-0 z-0 flex items-center justify-center">
                <div className="opacity-20 scale-90">
                  <FileTypeIcon filename={file.name} />
                </div>
              </div>
            )}
            {thumb && (
              <img
                src={thumb}
                alt={file.name}
                className={`w-full h-full object-cover transition-opacity duration-300 relative z-10 ${
                  isLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                loading="lazy"
                decoding="async"
                onLoad={() => setIsLoaded(true)}
                onError={() => {
                  forgetThumbnail(file.id, effectiveFolderId);
                  setThumb(null);
                  setHasError(true);
                  setIsLoaded(false);
                }}
              />
            )}
            {isVideo && isLoaded && (
              <div className="absolute bottom-2 right-2 z-20 pointer-events-none">
                <div className="px-2 py-0.5 rounded-full bg-black/75 backdrop-blur-md flex items-center gap-1 text-white shadow-md border border-white/20">
                  <Play className="w-2.5 h-2.5 fill-white shrink-0" />
                  <span className="text-[9px] font-bold font-mono tracking-wider">VIDEO</span>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="scale-110">
            <FileTypeIcon filename={file.name} />
          </div>
        )}
      </div>

      {/* Bottom Info: Title, Size & File Extension Badge */}
      <div className="min-w-0 pt-2 px-1">
        <p className="text-xs font-semibold text-telegram-text truncate leading-tight" title={file.name}>
          {file.name}
        </p>
        <div className="flex items-center justify-between mt-1 gap-1">
          <span className="text-[10px] text-telegram-subtext font-mono font-medium truncate">
            {file.sizeStr}
          </span>
          {file.file_ext && (
            <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-telegram-surface-raised/90 text-telegram-subtext/90 border border-telegram-border/30 shrink-0">
              {file.file_ext.replace('.', '')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

const FileRowThumbnail = memo(function FileRowThumbnail({ file, activeFolderId }: { file: TelegramFile; activeFolderId: number | null }) {
  const effectiveFolderId = file.folder_id !== undefined ? file.folder_id : activeFolderId;
  const isImage = isImageFile(file.name, file.mime_type);
  const isVideo = isVideoFile(file.name, file.mime_type);
  const isPotentialMedia = isImage || isVideo || Boolean(file.encryption_state?.startsWith('encrypted')) || file.name.endsWith('.tdenc') || file.name === 'TDENC2';
  const canHaveThumbnail = isImage || isVideo;
  const rowRef = useRef<HTMLDivElement | null>(null);
  const [isInViewport, setIsInViewport] = useState(false);
  const [thumb, setThumb] = useState<string | null>(() => (canHaveThumbnail ? getCachedThumbnail(file.id, effectiveFolderId) : null));
  const [isLoaded, setIsLoaded] = useState(() => Boolean(canHaveThumbnail && getCachedThumbnail(file.id, effectiveFolderId)));
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [file.id, file.name, file.mime_type, file.encryption_state]);

  useEffect(() => {
    const el = rowRef.current;
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

  useEffect(() => {
    if (file.type === 'folder' || !isPotentialMedia) return;
    let active = true;

    const tryLoad = () => {
      if (!active) return;
      const currentIsImage = isImageFile(file.name, file.mime_type);
      const currentIsVideo = isVideoFile(file.name, file.mime_type);
      // For encrypted files, still attempt thumbnail — backend handles decryption.
      const isEncrypted = Boolean(file.encryption_state?.startsWith('encrypted'));
      const isEncryptedUnlocked = file.encryption_state === 'encrypted_unlocked';
      if (!currentIsImage && !currentIsVideo && !isEncrypted) return;

      const syncCached = getCachedThumbnail(file.id, effectiveFolderId);
      if (syncCached) {
        setThumb(syncCached);
        setIsLoaded(true);
        setHasError(false);
        return;
      }

      peekThumbnail(file.id, effectiveFolderId).then((persisted) => {
        if (!active) return;
        if (persisted) {
          setThumb(persisted);
          setIsLoaded(true);
          setHasError(false);
        }
      });

      if (!isInViewport) return;
      // Locked encrypted files shouldn't try
      if (isEncrypted && !isEncryptedUnlocked) return;

      loadThumbnail(file.id, effectiveFolderId, 10, file.name)
        .then(src => {
          if (active && src) {
            setThumb(src);
            setIsLoaded(true);
            setHasError(false);
          } else if (active && !src) {
            setHasError(true);
          }
        })
        .catch(() => {
          if (active) setHasError(true);
        });
    };

    tryLoad();

    // Re-attempt thumbnail load when vault unlocks
    const unsubscribe = subscribeThumbnailInvalidation(() => {
      if (active) {
        setHasError(false);
        tryLoad();
      }
    });

    return () => {
      active = false;
      unsubscribe();
      if (!thumb) {
        cancelThumbnailLoad(file.id, effectiveFolderId);
      }
    };
  }, [file.id, file.name, file.type, file.mime_type, file.encryption_state, effectiveFolderId, canHaveThumbnail, isPotentialMedia, isInViewport]);

  if (canHaveThumbnail && !hasError) {
    return (
      <div ref={rowRef} className="w-11 h-11 rounded-xl overflow-hidden bg-telegram-hover/30 border border-telegram-border/30 shrink-0 shadow-sm relative group">
        {!isLoaded && (
          <div className="shimmer-effect absolute inset-0 z-0 flex items-center justify-center">
            <div className="opacity-20 scale-75">
              <FileTypeIcon filename={file.name} />
            </div>
          </div>
        )}
        {thumb && (
          <img
            src={thumb}
            alt={file.name}
            className={`w-full h-full object-cover transition-opacity duration-300 relative z-10 group-hover:scale-105 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            loading="lazy"
            decoding="async"
            onLoad={() => setIsLoaded(true)}
            onError={() => {
              setHasError(true);
              setIsLoaded(false);
            }}
          />
        )}
        {isVideo && isLoaded && (
          <div className="absolute bottom-1 right-1 z-20 pointer-events-none">
            <div className="w-4 h-4 rounded-full bg-black/70 backdrop-blur-sm flex items-center justify-center text-white shadow-sm border border-white/20">
              <Play className="w-2.5 h-2.5 fill-white text-white ml-0.5" />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={rowRef} className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0">
      <FileTypeIcon filename={file.name} />
    </div>
  );
});

function FileListSkeleton({ viewMode = 'grid' }: { viewMode?: 'list' | 'grid' }) {
  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pb-28 animate-in fade-in duration-200">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="relative flex flex-col rounded-2xl bg-telegram-surface/90 border border-telegram-border/40 p-2 shadow-sm backdrop-blur-sm overflow-hidden"
          >
            {/* Shimmer Thumbnail Square */}
            <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-telegram-hover/30 border border-telegram-border/20 flex items-center justify-center shimmer-effect">
              {/* Floating circular 3-dot skeleton placeholder */}
              <div className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/25 border border-white/10" />
            </div>

            {/* Bottom Title & Size Lines */}
            <div className="min-w-0 pt-2 px-1 space-y-1.5">
              <div
                className="h-3 rounded-md bg-telegram-hover/60 shimmer-effect"
                style={{ width: `${60 + (i % 4) * 10}%` }}
              />
              <div className="h-2.5 w-14 rounded-md bg-telegram-hover/40 shimmer-effect" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2.5 pb-28 animate-in fade-in duration-200">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-2.5 rounded-2xl bg-telegram-surface/90 border border-telegram-border/40 shadow-sm backdrop-blur-sm"
        >
          {/* Shimmer Squircle Thumbnail */}
          <div className="w-11 h-11 rounded-xl overflow-hidden bg-telegram-hover/30 border border-telegram-border/20 shrink-0 shimmer-effect" />

          {/* Info Lines */}
          <div className="flex-1 min-w-0 space-y-1.5">
            <div
              className="h-3.5 rounded-md bg-telegram-hover/60 shimmer-effect"
              style={{ width: `${50 + (i % 4) * 12}%` }}
            />
            <div className="h-2.5 w-24 rounded-md bg-telegram-hover/40 shimmer-effect" />
          </div>

          {/* Action icon placeholder */}
          <div className="w-7 h-7 rounded-xl bg-telegram-hover/30 shrink-0 shimmer-effect opacity-60" />
        </div>
      ))}
    </div>
  );
}

interface TouchFileListProps {
  files: TelegramFile[];
  isLoading: boolean;
  onDownload: (file: TelegramFile) => void;
  onDelete: (file: TelegramFile) => void;
  onPreview: (file: TelegramFile, thumbnail?: string | null) => void;
  onRename: (file: TelegramFile) => void;
  selectedIds: number[];
  onToggleSelection: (id: number) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onBulkDelete: () => void;
  onBulkDownload: () => void;
  onBulkMove: (targetFolderId: number | null) => void;
  onBulkShare?: () => void;
  onShare?: (file: TelegramFile) => void;
  onCopyTelegramLink?: (file: TelegramFile) => void;
  onKeepOffline?: (file: TelegramFile) => void;
  onRemoveOffline?: (file: TelegramFile) => void;
  onOpenExternally?: (file: TelegramFile) => void;
  folders: TelegramFolder[];
  activeFolderId: number | null;
  scrollElementRef: RefObject<HTMLElement | null>;
  disableVirtualization?: boolean;
  viewMode?: 'list' | 'grid';
  onViewModeChange?: (mode: 'list' | 'grid') => void;
  hideToolbar?: boolean;
  selectionMode?: boolean;
  onSelectionModeChange?: (active: boolean) => void;
  onOpenSort?: () => void;
}

export function TouchFileList({
  files,
  isLoading,
  onDownload,
  onDelete,
  onPreview,
  onRename,
  selectedIds,
  onToggleSelection,
  onSelectAll,
  onClearSelection,
  onBulkDelete,
  onBulkDownload,
  onBulkMove,
  onBulkShare,
  onShare,
  onCopyTelegramLink,
  onKeepOffline,
  onRemoveOffline,
  onOpenExternally,
  folders,
  activeFolderId,
  scrollElementRef,
  disableVirtualization = false,
  viewMode: controlledViewMode,
  onViewModeChange,
  hideToolbar = false,
  selectionMode: controlledSelectionMode,
  onSelectionModeChange,
  onOpenSort,
}: TouchFileListProps) {
  const [internalSelectionMode, setInternalSelectionMode] = useState(false);
  const selectionMode = controlledSelectionMode !== undefined ? controlledSelectionMode : internalSelectionMode;
  const setSelectionMode = onSelectionModeChange ?? setInternalSelectionMode;
  const [showMovePicker, setShowMovePicker] = useState(false);
  const [actionMenuFile, setActionMenuFile] = useState<TelegramFile | null>(null);
  const [internalViewMode, setInternalViewMode] = useState<'list' | 'grid'>('grid');
  const viewMode = controlledViewMode ?? internalViewMode;

  // Guard against brief unpopulated moments so we don't flash "Empty" before files load
  const [hasSettled, setHasSettled] = useState(false);
  useEffect(() => {
    if (isLoading) {
      setHasSettled(false);
    } else {
      const timer = setTimeout(() => {
        setHasSettled(true);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [isLoading, activeFolderId]);

  const showSkeleton = isLoading || (!hasSettled && files.length === 0);
  const showEmpty = !isLoading && hasSettled && files.length === 0;

  const handleToggleViewMode = useCallback(() => {
    const nextMode = viewMode === 'list' ? 'grid' : 'list';
    if (onViewModeChange) {
      onViewModeChange(nextMode);
    } else {
      setInternalViewMode(nextMode);
    }
  }, [viewMode, onViewModeChange]);

  const isSelectionActive = selectionMode || selectedIds.length > 0;

  // Long-press detection refs
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressPosRef = useRef<{ x: number; y: number } | null>(null);
  const longPressFiredRef = useRef(false);
  const listRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);
  const LONG_PRESS_DURATION = 500;
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  useEffect(() => {
    const updateScrollMargin = () => {
      const list = listRef.current;
      const scrollElement = scrollElementRef.current;
      if (!list || !scrollElement) return;
      const listRect = list.getBoundingClientRect();
      const scrollRect = scrollElement.getBoundingClientRect();
      setScrollMargin(listRect.top - scrollRect.top + scrollElement.scrollTop);
    };
    updateScrollMargin();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateScrollMargin);
    if (listRef.current) {
      observer?.observe(listRef.current);
      if (listRef.current.parentElement) observer?.observe(listRef.current.parentElement);
    }
    if (scrollElementRef.current) observer?.observe(scrollElementRef.current);
    window.addEventListener('resize', updateScrollMargin);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', updateScrollMargin);
    };
  }, [files.length, isSelectionActive, scrollElementRef]);

  const rowVirtualizer = useVirtualizer({
    enabled: !disableVirtualization,
    count: files.length,
    getScrollElement: () => scrollElementRef.current,
    estimateSize: () => 82,
    overscan: 10,
    gap: 10,
    paddingEnd: 80,
    getItemKey: index => files[index]?.id ?? index,
    scrollMargin,
  });

  // Long-press handlers — defined BEFORE any early returns to satisfy Rules of Hooks.
  // On Android, long-press opens the action popover (file options menu).
  const handlePointerDown = useCallback((e: React.PointerEvent, file: TelegramFile) => {
    if (isSelectionActive) return;
    longPressFiredRef.current = false;
    longPressPosRef.current = { x: e.clientX, y: e.clientY };
    longPressTimerRef.current = setTimeout(() => {
      longPressFiredRef.current = true;
      // Haptic feedback — short vibration pulse (Web Vibration API, supported in Android WebView)
      navigator.vibrate?.(15);
      setActionMenuFile(file);
    }, LONG_PRESS_DURATION);
  }, [isSelectionActive]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!longPressPosRef.current || !longPressTimerRef.current) return;
    const dx = Math.abs(e.clientX - longPressPosRef.current.x);
    const dy = Math.abs(e.clientY - longPressPosRef.current.y);
    if (dx > 10 || dy > 10) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
      longPressPosRef.current = null;
    }
  }, []);

  const handlePointerUp = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    longPressPosRef.current = null;
  }, []);

  // Build action items for a file's popover menu
  const buildFileActions = useCallback((file: TelegramFile): ActionItem[] => {
    const actions: ActionItem[] = [
      {
        label: 'Preview',
        icon: <Eye className="w-4 h-4" />,
        onClick: () => onPreview(file),
      },
      {
        label: 'Download',
        icon: <DownloadCloud className="w-4 h-4" />,
        onClick: () => onDownload(file),
      },
      {
        label: 'Rename',
        icon: <Pencil className="w-4 h-4" />,
        onClick: () => onRename(file),
      },
    ];
    if (file.type !== 'folder' && onOpenExternally) {
      actions.push({
        label: 'Open in external app',
        icon: <ExternalLink className="w-4 h-4" />,
        onClick: () => onOpenExternally(file),
      });
    }
    if (file.type !== 'folder' && onKeepOffline) {
      actions.push({
        label: 'Keep offline',
        icon: <Pin className="w-4 h-4" />,
        onClick: () => onKeepOffline(file),
      });
    }
    if (file.type !== 'folder' && file.offline_available && onRemoveOffline) {
      actions.push({
        label: 'Remove offline copy',
        icon: <PinOff className="w-4 h-4" />,
        onClick: () => onRemoveOffline(file),
      });
    }
    if (file.type !== 'folder' && onShare) {
      actions.push({
        label: 'Share Link',
        icon: <Link className="w-4 h-4" />,
        onClick: () => onShare(file),
      });
    }
    // Telegram native t.me link (only for files in public channels with a username)
    if (file.type !== 'folder' && onCopyTelegramLink) {
      const folder = folders.find(f => f.id === file.folder_id) || folders.find(f => f.id === activeFolderId);
      const username = folder?.username || (folder as any)?.chat?.username || (folder as any)?.channel?.username;
      if (username) {
        actions.push({
          label: 'Copy Telegram Link',
          icon: <Copy className="w-4 h-4" />,
          onClick: () => onCopyTelegramLink(file),
        });
      }
    }
    actions.push({
      label: 'Delete',
      icon: <Trash2 className="w-4 h-4" />,
      onClick: () => onDelete(file),
      destructive: true,
    });
    return actions;
  }, [onPreview, onDownload, onRename, onDelete, onShare, onCopyTelegramLink, onKeepOffline, onRemoveOffline, onOpenExternally, folders, activeFolderId]);

  const renderFileRow = (file: TelegramFile, index: number, virtualRow?: VirtualItem) => {
    const isSelected = selectedIdSet.has(file.id);
    return (
      <div
        key={file.id}
        data-index={virtualRow ? index : undefined}
        ref={virtualRow ? rowVirtualizer.measureElement : undefined}
        role="button"
        tabIndex={0}
        onPointerDown={(e) => handlePointerDown(e, file)}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={() => {
          if (longPressFiredRef.current) {
            longPressFiredRef.current = false;
            return;
          }
          if (isSelectionActive) onToggleSelection(file.id);
          else onPreview(file);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            if (isSelectionActive) onToggleSelection(file.id);
            else onPreview(file);
          }
        }}
        style={virtualRow ? {
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          transform: `translateY(${virtualRow.start - scrollMargin}px)`,
        } : undefined}
        className={`file-row-optimized flex items-center justify-between p-3 rounded-2xl bg-telegram-surface/90 border transition-all duration-200 cursor-pointer active:scale-[0.99] shadow-sm backdrop-blur-sm ${
          isSelected
            ? 'border-telegram-primary/60 bg-telegram-primary/10 shadow-telegram-primary/5'
            : 'border-telegram-border/40 hover:border-telegram-border/60 hover:bg-telegram-hover/30'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {isSelectionActive && (
            <div className={`flex-shrink-0 w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all duration-200 ${
              isSelected
                ? 'bg-telegram-primary border-telegram-primary text-black'
                : 'border-telegram-border/60 bg-transparent'
            }`}>
              {isSelected && <Check className="w-3.5 h-3.5" />}
            </div>
          )}
          <FileRowThumbnail file={file} activeFolderId={activeFolderId} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-telegram-text truncate leading-snug">{file.name}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-telegram-subtext font-medium font-mono px-1.5 py-0.5 rounded-md bg-telegram-hover/40 border border-telegram-border/25">{file.sizeStr}</span>
              <span className="w-1 h-1 bg-telegram-border rounded-full" />
              <span className="text-[10px] text-telegram-subtext font-medium truncate">{file.created_at || 'Sync'}</span>
            </div>
          </div>
        </div>

        {!isSelectionActive && (
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setActionMenuFile(file);
            }}
            className="flex-shrink-0 p-2 rounded-xl hover:bg-telegram-hover/50 active:scale-90 text-telegram-subtext hover:text-telegram-text transition-all duration-200"
            aria-label={`Actions for ${file.name}`}
          >
            <MoreVertical className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>
    );
  };

  return (
    <>
      {showSkeleton && (
        <FileListSkeleton viewMode={viewMode} />
      )}

      {showEmpty && (
        <div className="flex flex-col items-center justify-center py-20 space-y-3.5 text-center px-4 animate-in fade-in duration-300">
          <div className="w-16 h-16 rounded-2xl bg-telegram-hover/20 text-telegram-subtext border border-telegram-border/30 flex items-center justify-center text-3xl shadow-inner backdrop-blur-sm">
            📁
          </div>
          <div className="space-y-1 max-w-xs">
            <h4 className="text-sm font-bold text-telegram-text">This folder is empty</h4>
            <p className="text-xs text-telegram-subtext leading-relaxed">
              Upload files or synchronise folders to begin managing content.
            </p>
          </div>
        </div>
      )}

      {!showSkeleton && files.length > 0 && (
        <>
          {/* Structured List Toolbar */}
          {!hideToolbar && (
            <div className="flex items-center justify-between px-1 mb-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (isSelectionActive) {
                      onClearSelection();
                    }
                    setSelectionMode(!selectionMode);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-95 ${
                    isSelectionActive
                      ? 'bg-telegram-primary text-black font-bold shadow-sm'
                      : 'bg-telegram-surface/90 text-telegram-subtext hover:text-telegram-text border border-telegram-border/40'
                  }`}
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  {isSelectionActive ? `${selectedIds.length} selected` : 'Select'}
                </button>

                {/* Grid / List View Switcher */}
                <button
                  onClick={handleToggleViewMode}
                  className="flex items-center justify-center w-8 h-8 rounded-xl bg-telegram-surface/90 text-telegram-subtext hover:text-telegram-text border border-telegram-border/40 active:scale-95 transition-all"
                  aria-label={viewMode === 'list' ? 'Switch to Grid View' : 'Switch to List View'}
                  title={viewMode === 'list' ? 'Switch to Grid View' : 'Switch to List View'}
                >
                  {viewMode === 'list' ? <LayoutGrid className="w-4 h-4" /> : <List className="w-4 h-4" />}
                </button>

                {/* Sort Button */}
                {onOpenSort && (
                  <button
                    type="button"
                    onClick={onOpenSort}
                    className="flex items-center justify-center w-8 h-8 rounded-xl bg-telegram-surface/90 text-telegram-subtext hover:text-telegram-text border border-telegram-border/40 active:scale-95 transition-all cursor-pointer"
                    aria-label={i18n.t("common.sort_files", "Sort files")}
                    title={i18n.t("common.sort_files", "Sort files")}
                  >
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                )}

                {isSelectionActive && (
                  <>
                    <button
                      onClick={onSelectAll}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold bg-telegram-surface/90 text-telegram-subtext hover:text-telegram-text border border-telegram-border/40 active:scale-95 transition-all"
                    >
                      <Check className="w-3 h-3" />
                      {i18n.t("common.all")}
                    </button>
                    <button
                      onClick={onClearSelection}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold bg-telegram-surface/90 text-telegram-subtext hover:text-telegram-text border border-telegram-border/40 active:scale-95 transition-all"
                    >
                      <X className="w-3 h-3" />
                      Clear
                    </button>
                  </>
                )}
              </div>
              <span className="text-[11px] font-medium text-telegram-subtext">
                {files.length} {files.length === 1 ? 'file' : 'files'}
              </span>
            </div>
          )}

          {/* Move-to-folder picker modal */}
          {showMovePicker && (
            <div
              className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 backdrop-blur-sm"
              onClick={() => setShowMovePicker(false)}
            >
              <div
                className="bg-telegram-surface border border-telegram-border/60 rounded-2xl p-5 w-[300px] max-h-[60vh] flex flex-col shadow-2xl backdrop-blur-md"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-telegram-text">{i18n.t("files.move")} {selectedIds.length} file{selectedIds.length !== 1 ? 's' : ''} to...</h3>
                  <button
                    onClick={() => setShowMovePicker(false)}
                    className="p-1.5 rounded-lg hover:bg-telegram-hover/40 text-telegram-subtext hover:text-telegram-text"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
                  {/* Saved Messages */}
                  <button
                    onClick={() => { onBulkMove(null); setShowMovePicker(false); }}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                      activeFolderId === null
                        ? 'bg-telegram-primary/15 text-telegram-primary font-bold'
                        : 'text-telegram-text hover:bg-telegram-hover/40'
                    }`}
                  >
                    📁 Saved Messages
                  </button>
                  {folders
                    .filter(f => f.id !== activeFolderId)
                    .map(folder => (
                      <button
                        key={folder.id}
                        onClick={() => { onBulkMove(folder.id); setShowMovePicker(false); }}
                        className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold text-telegram-text hover:bg-telegram-hover/40 transition-all duration-200"
                      >
                        📁 {folder.name}
                      </button>
                    ))}
                  {folders.filter(f => f.id !== activeFolderId).length === 0 && (
                    <p className="text-xs text-telegram-subtext/60 text-center py-4">No other folders available</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* File list: Grid or List */}
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 gap-2.5 pb-28">
              {files.map((file) => {
                const isSelected = selectedIdSet.has(file.id);
                return (
                  <GridFileCard
                    key={file.id}
                    file={file}
                    activeFolderId={activeFolderId}
                    isSelected={isSelected}
                    isSelectionActive={isSelectionActive}
                    onPointerDown={(e) => handlePointerDown(e, file)}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onClick={(thumb) => {
                      if (longPressFiredRef.current) {
                        longPressFiredRef.current = false;
                        return;
                      }
                      if (isSelectionActive) onToggleSelection(file.id);
                      else onPreview(file, thumb);
                    }}
                    onActionClick={(e) => {
                      e.stopPropagation();
                      setActionMenuFile(file);
                    }}
                  />
                );
              })}
            </div>
          ) : (
            <div
              ref={listRef}
              className={disableVirtualization ? 'space-y-2.5 pb-28' : 'relative pb-28'}
              style={disableVirtualization ? undefined : { height: `${rowVirtualizer.getTotalSize()}px` }}
            >
              {disableVirtualization
                ? files.map((file, index) => renderFileRow(file, index))
                : rowVirtualizer.getVirtualItems().map((virtualRow) =>
                  renderFileRow(files[virtualRow.index], virtualRow.index, virtualRow))}
            </div>
          )}

          {/* Floating Batch Action Bar - structured layout that fits all screens */}
          {isSelectionActive && selectedIds.length > 0 && (
            <div className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom,8px))] left-3.5 right-3.5 z-40 bg-telegram-surface/95 backdrop-blur-2xl border border-telegram-border/60 rounded-2xl p-2 shadow-2xl shadow-black/40 space-y-1.5 animate-in slide-in-from-bottom-3 duration-200">
              {/* Header with selection counter and clear action */}
              <div className="flex items-center justify-between px-1.5 pt-0.5 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-telegram-text">
                  <span className="flex h-5 min-w-5 px-1.5 items-center justify-center rounded-full bg-telegram-primary text-black text-[10px] font-extrabold shadow-sm">
                    {selectedIds.length}
                  </span>
                  <span>{selectedIds.length === 1 ? 'file' : 'files'} selected</span>
                </div>
                <button
                  type="button"
                  onClick={onClearSelection}
                  className="flex items-center gap-1 text-[11px] font-semibold text-telegram-subtext hover:text-telegram-text py-0.5 px-2 rounded-lg hover:bg-telegram-hover/30 active:scale-95 transition-all"
                >
                  <X className="w-3 h-3" />
                  <span>{i18n.t("common.clear_selection")}</span>
                </button>
              </div>

              {/* Action buttons row */}
              <div className="flex items-center justify-between gap-1.5">
                <button
                  type="button"
                  onClick={onBulkDownload}
                  aria-label={`Download ${selectedIds.length} files`}
                  className="flex flex-1 min-w-0 flex-col items-center justify-center py-2 px-1 rounded-xl text-[11px] font-bold bg-telegram-primary/15 text-telegram-primary border border-telegram-primary/25 active:scale-95 hover:bg-telegram-primary/25 transition-all select-none"
                >
                  <DownloadCloud className="w-4 h-4 mb-0.5 shrink-0" />
                  <span className="truncate w-full text-center leading-tight">
                    {i18n.t("files.download")}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowMovePicker(true)}
                  aria-label={`Move ${selectedIds.length} files`}
                  className="flex flex-1 min-w-0 flex-col items-center justify-center py-2 px-1 rounded-xl text-[11px] font-bold bg-yellow-500/15 text-yellow-400 border border-yellow-500/25 active:scale-95 hover:bg-yellow-500/25 transition-all select-none"
                >
                  <FolderInput className="w-4 h-4 mb-0.5 shrink-0" />
                  <span className="truncate w-full text-center leading-tight">
                    {i18n.t("files.move")}
                  </span>
                </button>

                {onBulkShare && (
                  <button
                    type="button"
                    onClick={onBulkShare}
                    aria-label={`Share ${selectedIds.length} files`}
                    className="flex flex-1 min-w-0 flex-col items-center justify-center py-2 px-1 rounded-xl text-[11px] font-bold bg-teal-500/15 text-teal-400 border border-teal-500/25 active:scale-95 hover:bg-teal-500/25 transition-all select-none"
                  >
                    <Link className="w-4 h-4 mb-0.5 shrink-0" />
                    <span className="truncate w-full text-center leading-tight">
                      {i18n.t("files.share")}
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onBulkDelete}
                  aria-label={`Delete ${selectedIds.length} files`}
                  className="flex flex-1 min-w-0 flex-col items-center justify-center py-2 px-1 rounded-xl text-[11px] font-bold bg-red-500/15 text-red-400 border border-red-500/25 active:scale-95 hover:bg-red-500/25 transition-all select-none"
                >
                  <Trash2 className="w-4 h-4 mb-0.5 shrink-0" />
                  <span className="truncate w-full text-center leading-tight">
                    {i18n.t("files.delete")}
                  </span>
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Action popover for file operations */}
      {actionMenuFile && (
        <ActionPopover
          title={actionMenuFile.name}
          actions={buildFileActions(actionMenuFile)}
          onClose={() => setActionMenuFile(null)}
        />
      )}
    </>
  );
}
