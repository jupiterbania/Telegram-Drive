import { useEffect, useState, useRef, useCallback } from 'react';
import { X, ArrowLeft, Maximize2, Minimize2 } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { TelegramFile } from '../../../types';
import { isVideoFile, isAudioFile } from '../../../utils';
import { AdaptiveMediaPlayer } from './AdaptiveMediaPlayer';
import i18n from '../../../i18n';

interface StreamInfo {
    token: string;
    base_url: string;
    operation_token?: string | null;
}

interface MediaPlayerProps {
    file: TelegramFile;
    onClose: () => void;
    onNext?: () => void;
    onPrev?: () => void;
    currentIndex?: number;
    totalItems?: number;
    activeFolderId: number | null;
}


export function MediaPlayer({ file, onClose, onNext, onPrev, currentIndex, totalItems, activeFolderId }: MediaPlayerProps) {
    const [streamInfo, setStreamInfo] = useState<StreamInfo | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const controlsTimeoutRef = useRef<number | null>(null);

    const handleUserActivity = useCallback(() => {
        setShowControls(true);
        if (controlsTimeoutRef.current) window.clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = window.setTimeout(() => {
            const video = document.querySelector('video');
            if (video && !video.paused) {
                setShowControls(false);
            }
        }, 3500);
    }, []);

    const toggleFullscreen = useCallback(async () => {
        try {
            const win = getCurrentWindow();
            const fs = await win.isFullscreen();
            await win.setFullscreen(!fs);
            setIsFullscreen(!fs);
        } catch {
            // Not running in Tauri — fall back to webview fullscreen
            const el = containerRef.current;
            if (!el) return;
            if (document.fullscreenElement) {
                document.exitFullscreen().catch(() => {});
            } else {
                el.requestFullscreen().catch(() => {});
            }
        }
    }, []);

    // Sync isFullscreen when OS changes fullscreen (e.g. Escape / green button)
    useEffect(() => {
        let mounted = true;
        let unlistenFn: (() => void) | undefined;
        getCurrentWindow().onResized(async () => {
            if (!mounted) return;
            try {
                const fs = await getCurrentWindow().isFullscreen();
                setIsFullscreen(fs);
            } catch {}
        }).then(fn => { if (mounted) unlistenFn = fn; });
        return () => {
            mounted = false;
            unlistenFn?.();
        };
    }, []);

    useEffect(() => {
        invoke<StreamInfo>('cmd_get_stream_info').then(setStreamInfo).catch(() => {});
    }, []);

    const folderIdParam = activeFolderId !== null ? activeFolderId.toString() : 'home';
    const streamCredential = streamInfo?.operation_token
        ? `&credential=${encodeURIComponent(streamInfo.operation_token)}`
        : '';
    const streamUrl = streamInfo
        ? `${streamInfo.base_url}/stream/${folderIdParam}/${file.id}?token=${encodeURIComponent(streamInfo.token)}${streamCredential}`
        : null;

    const isVideo = isVideoFile(file.name);
    const isAudio = isAudioFile(file.name);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
                return;
            }

            const key = e.key.toLowerCase();

            if (e.key === 'ArrowRight' || key === 'l') {
                e.preventDefault();
                onNext?.();
                return;
            }

            if (e.key === 'ArrowLeft' || key === 'j') {
                e.preventDefault();
                onPrev?.();
                return;
            }

            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }

            if (key === 'f') {
                e.preventDefault();
                toggleFullscreen();
            }

            if (key === 'm') {
                e.preventDefault();
                const video = document.querySelector('video');
                if (video) {
                    video.muted = !video.muted;
                }
            }

            if (e.key === ' ') {
                e.preventDefault();
                const video = document.querySelector('video');
                if (video) {
                    video.paused ? video.play().catch(() => {}) : video.pause();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, onNext, onPrev, toggleFullscreen]);

    // All video files: use AdaptiveMediaPlayer so both mobile and desktop
    // have multi-quality controls (Auto, 1080p, 720p, 480p, 360p, Original)
    // with hardware-accelerated playback on mobile.
    if (isVideo && streamUrl) {
        return (
            <AdaptiveMediaPlayer
                file={file}
                streamUrl={streamUrl}
                activeFolderId={activeFolderId}
                onClose={onClose}
                onNext={onNext}
                onPrev={onPrev}
                currentIndex={currentIndex}
                totalItems={totalItems}
            />
        );
    }

    return (
        <div
            className="fixed inset-0 z-[200] w-screen h-screen bg-black select-none overflow-hidden flex flex-col justify-center animate-in fade-in duration-150"
            onClick={handleUserActivity}
            onPointerMove={handleUserActivity}
        >
            <div ref={containerRef} className="relative w-full h-full flex flex-col items-center justify-center" onClick={e => e.stopPropagation()}>
                {/* Floating Top Header Bar */}
                <div
                    className={`absolute top-0 inset-x-0 z-30 flex items-center justify-between px-3 sm:px-5 py-2.5 sm:py-3 bg-gradient-to-b from-black/85 via-black/40 to-transparent backdrop-blur-[2px] transition-all duration-200 pointer-events-auto pt-[max(0.75rem,env(safe-area-inset-top,0.75rem))] ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}
                >
                    <div className="flex items-center gap-2.5 min-w-0">
                        <button
                            onClick={onClose}
                            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center transition-all border border-white/10 shrink-0"
                            title={i18n.t("common.close")}
                            aria-label="Close media player"
                        >
                            <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
                        </button>
                        <div className="min-w-0">
                            <h2 className="truncate text-xs sm:text-sm font-semibold text-white max-w-[200px] sm:max-w-md md:max-w-xl" title={file.name}>
                                {file.name}
                            </h2>
                            <p className="text-[10px] sm:text-xs text-white/50 flex items-center gap-2">
                                {typeof currentIndex === 'number' && typeof totalItems === 'number' && totalItems > 0 && (
                                    <span className="tabular-nums">{currentIndex + 1} / {totalItems}</span>
                                )}
                                <span>• Telegram Drive Stream</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        <button
                            onClick={toggleFullscreen}
                            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center transition-all border border-white/10"
                            title={isFullscreen ? 'Exit fullscreen (F)' : 'Fullscreen (F)'}
                            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                        >
                            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                        </button>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center transition-all border border-white/10"
                            title="Close (Esc)"
                            aria-label="Close media player"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Main Media Container */}
                <div
                    className="relative w-full h-full flex items-center justify-center overflow-hidden bg-black"
                    onClick={() => {
                        handleUserActivity();
                    }}
                >
                    {!streamUrl ? (
                        <div className="flex flex-col items-center gap-4 text-white">
                            <div className="w-10 h-10 border-3 border-telegram-primary border-t-transparent rounded-full animate-spin" />
                            <p className="text-sm font-medium text-white/80">Preparing stream...</p>
                        </div>
                    ) : isVideo ? (
                        <video
                            src={streamUrl}
                            controls
                            controlsList="nodownload"
                            autoPlay
                            playsInline
                            className="w-full h-full max-h-screen object-contain"
                            onPlay={handleUserActivity}
                            onPause={() => setShowControls(true)}
                        />
                    ) : isAudio ? (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-telegram-primary/20 via-black/80 to-black px-4">
                            <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl bg-telegram-surface border border-white/10 flex items-center justify-center mb-8 shadow-2xl animate-pulse-slow">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-14 h-14 text-telegram-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
                            </div>
                            <h3 className="text-base sm:text-lg font-semibold text-white truncate max-w-md text-center mb-1">{file.name}</h3>
                            <p className="text-xs text-white/50 mb-6">Audio Playback</p>
                            <audio src={streamUrl} controls autoPlay className="w-full max-w-md" />
                        </div>
                    ) : (
                        <div className="text-white">Unsupported media type</div>
                    )}
                </div>
            </div>
        </div>
    );
}
