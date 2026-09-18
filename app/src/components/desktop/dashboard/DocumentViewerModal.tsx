import { useState, useEffect, useRef, useMemo, useCallback, type ReactNode } from 'react';
import { X, Copy, Check, Download, ChevronLeft, ChevronRight, Search, FileText, WrapText, Loader2, ZoomIn, ZoomOut } from 'lucide-react';
import { invoke, convertFileSrc } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import { TelegramFile } from '../../../types';
import { copyToClipboard } from '../../../utils';
import i18n from '../../../i18n';

interface DocumentViewerModalProps {
    file: TelegramFile;
    onClose: () => void;
    onNext?: () => void;
    onPrev?: () => void;
    currentIndex?: number;
    totalItems?: number;
    activeFolderId: number | null;
    onDownload?: () => void;
}

export function DocumentViewerModal({
    file,
    onClose,
    onNext,
    onPrev,
    currentIndex,
    totalItems,
    activeFolderId,
    onDownload,
}: DocumentViewerModalProps) {
    const [content, setContent] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState<boolean>(false);
    const [wordWrap, setWordWrap] = useState<boolean>(true);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [fontSize, setFontSize] = useState<number>(13);
    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Fetch and load file text
    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);
        setContent('');

        (async () => {
            try {
                const localPath = await invoke<string>('cmd_get_preview', {
                    messageId: file.id,
                    folderId: activeFolderId,
                });

                if (cancelled) return;
                if (!localPath) {
                    setError('Unable to fetch file for preview');
                    setLoading(false);
                    return;
                }

                const assetUrl = convertFileSrc(localPath);
                const response = await fetch(assetUrl);
                if (!response.ok) {
                    throw new Error(`Failed to load file content (${response.status})`);
                }

                const text = await response.text();
                if (!cancelled) {
                    setContent(text);
                    setLoading(false);
                }
            } catch (err: unknown) {
                if (!cancelled) {
                    const message = err instanceof Error ? err.message : String(err);
                    setError(message || 'Failed to preview document');
                    setLoading(false);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [file.id, activeFolderId]);

    // Handle copy content
    const handleCopy = useCallback(async () => {
        if (!content) return;
        try {
            await copyToClipboard(content);
            setCopied(true);
            toast.success('Document content copied to clipboard');
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error('Failed to copy content');
        }
    }, [content]);

    // Keyboard navigation and shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const isTyping = document.activeElement === searchInputRef.current;

            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
                e.preventDefault();
                searchInputRef.current?.focus();
                searchInputRef.current?.select();
            } else if (!isTyping) {
                if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    onNext?.();
                } else if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    onPrev?.();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, onNext, onPrev]);

    // Lines array and search stats
    const lines = useMemo(() => content.split(/\r?\n/), [content]);
    const matchCount = useMemo(() => {
        if (!searchTerm.trim()) return 0;
        const lowerSearch = searchTerm.toLowerCase();
        let count = 0;
        for (const line of lines) {
            let pos = line.toLowerCase().indexOf(lowerSearch);
            while (pos !== -1) {
                count++;
                pos = line.toLowerCase().indexOf(lowerSearch, pos + lowerSearch.length);
            }
        }
        return count;
    }, [lines, searchTerm]);

    const extension = useMemo(() => {
        return file.name.split('.').pop()?.toUpperCase() || 'TXT';
    }, [file.name]);

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-3 backdrop-blur-xl animate-in fade-in duration-150 select-none"
            onClick={onClose}
        >
            <div
                ref={containerRef}
                className="relative flex h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-app-surface/95 shadow-2xl backdrop-blur-2xl text-app-text"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modern Glassmorphic Header */}
                <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-white/[0.03] px-4">
                    {/* Left: File Info */}
                    <div className="flex min-w-0 items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-app-accent/30 bg-app-accent/15 text-app-accent">
                            <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="truncate text-sm font-semibold text-white tracking-tight" title={file.name}>
                                {file.name}
                            </h3>
                            <div className="flex items-center gap-2 text-[11px] text-white/50">
                                <span className="rounded bg-white/10 px-1 py-0.2 font-mono text-[10px] text-white/70">
                                    {extension}
                                </span>
                                <span>{file.sizeStr}</span>
                                {lines.length > 0 && !loading && (
                                    <>
                                        <span>•</span>
                                        <span>{lines.length.toLocaleString()} lines</span>
                                    </>
                                )}
                                {typeof currentIndex === 'number' && typeof totalItems === 'number' && totalItems > 0 && (
                                    <>
                                        <span>•</span>
                                        <span className="tabular-nums text-white/40">{currentIndex + 1}/{totalItems}</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Middle: Search in document */}
                    {!loading && !error && (
                        <div className="relative hidden sm:flex items-center">
                            <Search className="pointer-events-none absolute start-2.5 h-3.5 w-3.5 text-white/40" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Find in document (Ctrl+F)..."
                                className="h-8 w-56 rounded-full border border-white/10 bg-black/40 ps-8 pe-12 text-xs text-white placeholder:text-white/30 focus:border-app-accent focus:outline-none focus:ring-1 focus:ring-app-accent"
                            />
                            {searchTerm && (
                                <span className="absolute end-2 text-[10px] text-white/40 font-mono tabular-nums">
                                    {matchCount}
                                </span>
                            )}
                        </div>
                    )}

                    {/* Right: Actions */}
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={() => setWordWrap(!wordWrap)}
                            className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
                                wordWrap
                                    ? 'border-app-accent/40 bg-app-accent/20 text-app-accent'
                                    : 'border-white/10 bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
                            }`}
                            title={wordWrap ? 'Disable word wrap' : 'Enable word wrap'}
                            aria-label="Toggle word wrap"
                        >
                            <WrapText className="h-4 w-4" />
                        </button>

                        <button
                            type="button"
                            onClick={() => setFontSize((s) => Math.max(10, s - 1))}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/60 transition-colors hover:text-white hover:bg-white/10"
                            title="Decrease font size"
                        >
                            <ZoomOut className="h-4 w-4" />
                        </button>

                        <button
                            type="button"
                            onClick={() => setFontSize((s) => Math.min(22, s + 1))}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/60 transition-colors hover:text-white hover:bg-white/10"
                            title="Increase font size"
                        >
                            <ZoomIn className="h-4 w-4" />
                        </button>

                        <button
                            type="button"
                            onClick={handleCopy}
                            disabled={loading || Boolean(error)}
                            className="flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 text-xs font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"
                            title="Copy text"
                        >
                            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                            <span className="hidden md:inline">{copied ? 'Copied' : 'Copy'}</span>
                        </button>

                        {onDownload && (
                            <button
                                type="button"
                                onClick={onDownload}
                                className="flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 text-xs font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                                title="Download"
                            >
                                <Download className="h-3.5 w-3.5" />
                                <span className="hidden md:inline">Download</span>
                            </button>
                        )}

                        <span className="mx-1 h-5 w-px bg-white/10" />

                        <button
                            type="button"
                            onClick={onClose}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/60 transition-colors hover:bg-red-500/80 hover:text-white"
                            title={i18n.t('common.close') || 'Close'}
                            aria-label="Close document viewer"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Content Body with Line Numbers */}
                <div className="relative flex-1 overflow-auto bg-black/40 font-mono select-text" style={{ fontSize: `${fontSize}px`, lineHeight: 1.6 }}>
                    {loading ? (
                        <div className="flex h-full flex-col items-center justify-center gap-3 text-white/60">
                            <Loader2 className="h-7 w-7 animate-spin text-app-accent" />
                            <p className="text-xs font-sans text-white/70">Loading document...</p>
                        </div>
                    ) : error ? (
                        <div className="flex h-full flex-col items-center justify-center p-6 text-center text-app-danger">
                            <FileText className="mb-2 h-10 w-10 opacity-60" />
                            <p className="font-semibold font-sans text-sm">Preview Unavailable</p>
                            <p className="mt-1 max-w-md font-sans text-xs text-white/60">{error}</p>
                        </div>
                    ) : (
                        <div className={`flex min-w-full ${wordWrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'}`}>
                            {/* Line Numbers Gutter */}
                            <div className="sticky start-0 z-10 flex shrink-0 select-none flex-col border-r border-white/10 bg-black/60 px-3 py-3 text-right text-white/30">
                                {lines.map((_, index) => (
                                    <span key={index} className="tabular-nums leading-[1.6]">
                                        {index + 1}
                                    </span>
                                ))}
                            </div>

                            {/* Code / Text Lines */}
                            <div className="flex-1 px-4 py-3 text-white/90">
                                {lines.map((line, idx) => {
                                    if (!searchTerm.trim()) {
                                        return (
                                            <div key={idx} className="leading-[1.6]">
                                                {line || '\u00A0'}
                                            </div>
                                        );
                                    }

                                    // Simple text highlight for search matches
                                    const lowerLine = line.toLowerCase();
                                    const lowerSearch = searchTerm.toLowerCase();
                                    const parts: ReactNode[] = [];
                                    let lastIndex = 0;
                                    let matchIndex = lowerLine.indexOf(lowerSearch, lastIndex);

                                    while (matchIndex !== -1) {
                                        if (matchIndex > lastIndex) {
                                            parts.push(line.substring(lastIndex, matchIndex));
                                        }
                                        parts.push(
                                            <mark key={matchIndex} className="rounded bg-amber-400/30 text-amber-200 px-0.5">
                                                {line.substring(matchIndex, matchIndex + lowerSearch.length)}
                                            </mark>
                                        );
                                        lastIndex = matchIndex + lowerSearch.length;
                                        matchIndex = lowerLine.indexOf(lowerSearch, lastIndex);
                                    }

                                    if (lastIndex < line.length) {
                                        parts.push(line.substring(lastIndex));
                                    }

                                    return (
                                        <div key={idx} className="leading-[1.6]">
                                            {parts.length > 0 ? parts : '\u00A0'}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Floating Previous / Next Arrows */}
                {onPrev && (
                    <button
                        type="button"
                        onClick={onPrev}
                        className="viewer-navigation absolute start-3 top-1/2 -translate-y-1/2 rounded-full border border-white/15 bg-black/60 p-2 text-white/80 shadow-lg backdrop-blur-md transition-all hover:scale-110 hover:bg-black/90 hover:text-white"
                        title="Previous file"
                        aria-label="Previous file"
                    >
                        <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
                    </button>
                )}

                {onNext && (
                    <button
                        type="button"
                        onClick={onNext}
                        className="viewer-navigation absolute end-3 top-1/2 -translate-y-1/2 rounded-full border border-white/15 bg-black/60 p-2 text-white/80 shadow-lg backdrop-blur-md transition-all hover:scale-110 hover:bg-black/90 hover:text-white"
                        title="Next file"
                        aria-label="Next file"
                    >
                        <ChevronRight className="h-5 w-5 rtl:rotate-180" />
                    </button>
                )}
            </div>
        </div>
    );
}
