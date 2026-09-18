import { useState } from 'react';
import { StreamingQuality, QUALITY_LABELS, HLS_QUALITIES, QUALITY_THROTTLE_MAP, TranscodeCapabilities, TranscodeJobPhase } from '../../types';
import { Zap, Wifi, Loader2, AlertTriangle, Check, Gauge, Sliders, ChevronDown, X } from 'lucide-react';
import i18n from '../../i18n';

interface QualitySelectorProps {
    currentQuality: StreamingQuality;
    onChange: (quality: StreamingQuality) => void;
    adaptiveMode: boolean;
    onToggleAdaptive: () => void;
    measuredSpeedKbps?: number;
    transcodeCapabilities?: TranscodeCapabilities | null;
    variantStates?: Record<string, TranscodeJobPhase>;
    sourceHeight?: number | null;
}

const QUALITIES: StreamingQuality[] = ['360p', '480p', '720p', '1080p', 'original'];

const QUALITY_DESCRIPTIONS: Record<StreamingQuality, string> = {
    '1080p': 'Full HD • 5.0 Mbps high bitrate',
    '720p': 'HD • 2.5 Mbps crisp video',
    '480p': 'SD • 1.0 Mbps smooth streaming',
    '360p': 'Data Saver • 500 Kbps minimal mobile data',
    'original': 'Original • Unmodified Telegram file stream',
};

export function QualitySelector({
    currentQuality,
    onChange,
    adaptiveMode,
    onToggleAdaptive,
    measuredSpeedKbps,
    transcodeCapabilities,
    variantStates = {},
    sourceHeight = null,
}: QualitySelectorProps) {
    const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

    const handleManualQuality = (quality: StreamingQuality) => {
        if (adaptiveMode) onToggleAdaptive();
        onChange(quality);
        setMobileSheetOpen(false);
    };

    const isTranscodeAvailable = transcodeCapabilities?.available ?? false;

    // Human-readable throttle label (e.g. "500k", "1M", "2.5M")
    const throttleLabel = (quality: StreamingQuality): string => {
        if (quality === 'original') return QUALITY_LABELS[quality];
        const kbps = QUALITY_THROTTLE_MAP[quality];
        if (kbps >= 1000) return `${(kbps / 1000).toFixed(kbps % 1000 === 0 ? 0 : 1)}M`;
        return `${kbps}k`;
    };

    return (
        <>
            {/* ── Mobile & Compact View Trigger Badge ── */}
            <div className="flex md:hidden">
                <button
                    type="button"
                    onClick={() => setMobileSheetOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 border border-white/15 text-white text-xs font-semibold backdrop-blur-md transition-all shadow-md"
                    aria-label="Select video playback quality"
                >
                    {adaptiveMode ? (
                        <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                        <Sliders className="w-3.5 h-3.5 text-telegram-primary" />
                    )}
                    <span>{adaptiveMode ? 'Auto' : QUALITY_LABELS[currentQuality]}</span>
                    <ChevronDown className="w-3 h-3 text-white/60" />
                </button>
            </div>

            {/* ── Desktop View (Inline Pills) ── */}
            <div className="hidden md:flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-lg px-2 py-1.5 border border-white/10">
                {/* Adaptive toggle */}
                <button
                    onClick={onToggleAdaptive}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all duration-200 ${
                        adaptiveMode
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'text-white/40 hover:text-white/70 border border-transparent'
                    }`}
                    title={adaptiveMode
                        ? 'Adaptive mode: ON — auto-adjusts quality'
                        : isTranscodeAvailable
                            ? 'Adaptive mode: OFF — manual quality'
                            : 'Adaptive mode disabled (requires FFmpeg/HLS)'}
                    disabled={!isTranscodeAvailable}
                >
                    <Wifi className="w-3 h-3" />
                    {i18n.t("settings.auto")}
                </button>

                {/* Divider */}
                <div className="w-px h-5 bg-white/15" />

                {/* Quality presets */}
                {QUALITIES.map(quality => {
                    const isActive = currentQuality === quality && !adaptiveMode;
                    const isHls = HLS_QUALITIES.includes(quality);
                    const variantState: TranscodeJobPhase = variantStates[quality] ?? 'idle';
                    const canTranscode = isTranscodeAvailable && isHls;

                    // Upscale prevention: disable qualities that exceed source resolution
                    const qualityHeight = quality === 'original' ? Infinity : parseInt(quality);
                    const isUpscale = sourceHeight !== null && quality !== 'original' && qualityHeight > sourceHeight;
                    const isDisabled = (isHls && !canTranscode) || isUpscale;

                    let statusIcon: React.ReactNode = null;

                    if (isHls && variantState === 'preparing') {
                        statusIcon = <Loader2 className="w-3 h-3 animate-spin" />;
                    } else if (isHls && (variantState === 'caching' || variantState === 'transcoding')) {
                        statusIcon = <Loader2 className="w-3 h-3 animate-spin" />;
                    } else if (variantState === 'ready') {
                        statusIcon = <Check className="w-3 h-3 text-emerald-400" />;
                    } else if (variantState === 'failed') {
                        statusIcon = <AlertTriangle className="w-3 h-3 text-red-400" />;
                    } else if (isHls && !canTranscode) {
                        statusIcon = <Gauge className="w-3 h-3 text-white/30" />;
                    }

                    const tooltipHint = quality === 'original'
                        ? 'Stream original file'
                        : isUpscale
                            ? `Source is ${sourceHeight}p; ${quality} upscale disabled`
                            : canTranscode
                            ? variantState === 'preparing'
                                ? `Preparing ${quality}...`
                                : variantState === 'caching'
                                    ? 'Downloading source...'
                                    : variantState === 'transcoding'
                                        ? `Transcoding to ${quality}...`
                                        : variantState === 'ready'
                                            ? `${quality} ready (HLS)`
                                            : variantState === 'failed'
                                                ? `${quality} transcode failed — click to retry`
                                                : `Switch to ${quality} (HLS transcoding)`
                            : `Bandwidth cap: ${throttleLabel(quality)} — resolution unchanged`;

                    return (
                        <button
                            key={quality}
                            onClick={() => handleManualQuality(quality)}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium transition-all duration-200 ${
                                isActive
                                    ? 'bg-telegram-primary/20 text-telegram-primary border border-telegram-primary/30'
                                    : adaptiveMode
                                        ? 'text-white/35 hover:text-white/80 hover:bg-white/5 border border-transparent'
                                        : isDisabled
                                            ? 'text-white/25 hover:text-white/50 hover:bg-white/5 border border-white/5 opacity-50 cursor-not-allowed'
                                            : 'text-white/50 hover:text-white/80 hover:bg-white/5 border border-transparent'
                            }`}
                            title={tooltipHint}
                            disabled={isDisabled}
                        >
                            {statusIcon}
                            <span>{canTranscode ? QUALITY_LABELS[quality] : throttleLabel(quality)}</span>
                            {isHls && !canTranscode && !isUpscale && (
                                <span className="text-[8px] text-amber-400/60 ml-0.5">cap</span>
                            )}
                            {isUpscale && (
                                <span className="text-[8px] text-white/20 ml-0.5">N/A</span>
                            )}
                        </button>
                    );
                })}

                {/* Measured speed indicator (in adaptive mode) */}
                {adaptiveMode && measuredSpeedKbps !== undefined && measuredSpeedKbps > 0 && (
                    <>
                        <div className="w-px h-5 bg-white/15" />
                        <span className="flex items-center gap-1 text-[10px] text-white/40">
                            <Zap className="w-3 h-3" />
                            {measuredSpeedKbps > 999
                                ? `${(measuredSpeedKbps / 1000).toFixed(1)} Mbps`
                                : `${Math.round(measuredSpeedKbps)} Kbps`}
                        </span>
                    </>
                )}
            </div>

            {/* ── Mobile Quality Bottom Sheet / Modal ── */}
            {mobileSheetOpen && (
                <div
                    className="fixed inset-0 z-[300] bg-black/75 backdrop-blur-md flex flex-col justify-end p-0 sm:p-4 select-none animate-in fade-in duration-200"
                    onClick={(e) => {
                        e.stopPropagation();
                        setMobileSheetOpen(false);
                    }}
                >
                    <div
                        className="w-full max-w-md mx-auto bg-neutral-900/95 border border-white/15 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom duration-250 text-white"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Drag Handle */}
                        <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-4" />

                        {/* Header */}
                        <div className="flex items-center justify-between pb-3 border-b border-white/10">
                            <div className="min-w-0">
                                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                    <Sliders className="w-4 h-4 text-telegram-primary shrink-0" />
                                    <span>Video Quality</span>
                                </h3>
                                <p className="text-[11px] text-white/50 mt-0.5 truncate">
                                    Select streaming resolution or save mobile data
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setMobileSheetOpen(false)}
                                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 active:scale-95 transition-all shrink-0 ml-2"
                                aria-label="Close quality menu"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Quality Options List */}
                        <div className="mt-3 space-y-1.5 max-h-[60vh] overflow-y-auto pr-0.5">
                            {/* Auto Option */}
                            <button
                                type="button"
                                onClick={() => {
                                    if (!adaptiveMode) onToggleAdaptive();
                                    setMobileSheetOpen(false);
                                }}
                                disabled={!isTranscodeAvailable}
                                className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all active:scale-[0.99] ${
                                    adaptiveMode
                                        ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                                        : 'bg-white/5 hover:bg-white/10 text-white/80 border border-transparent'
                                }`}
                            >
                                <div className="flex items-center gap-3 min-w-0 text-start">
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${adaptiveMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white/60'}`}>
                                        <Wifi className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <p className="text-xs font-semibold">Auto (Adaptive)</p>
                                            <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-emerald-500/20 text-emerald-400">Recommended</span>
                                        </div>
                                        <p className="text-[11px] text-white/50 mt-0.5 truncate">
                                            {measuredSpeedKbps && measuredSpeedKbps > 0
                                                ? `Speed: ${measuredSpeedKbps > 999 ? `${(measuredSpeedKbps / 1000).toFixed(1)} Mbps` : `${Math.round(measuredSpeedKbps)} Kbps`} • auto-adjusts`
                                                : 'Automatically balances quality based on network speed'}
                                        </p>
                                    </div>
                                </div>
                                {adaptiveMode && <Check className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />}
                            </button>

                            {/* Preset Options */}
                            {QUALITIES.map((quality) => {
                                const isActive = currentQuality === quality && !adaptiveMode;
                                const isHls = HLS_QUALITIES.includes(quality);
                                const variantState: TranscodeJobPhase = variantStates[quality] ?? 'idle';
                                const canTranscode = isTranscodeAvailable && isHls;

                                const qualityHeight = quality === 'original' ? Infinity : parseInt(quality);
                                const isUpscale = sourceHeight !== null && quality !== 'original' && qualityHeight > sourceHeight;
                                const isDisabled = (isHls && !canTranscode) || isUpscale;

                                return (
                                    <button
                                        key={quality}
                                        type="button"
                                        onClick={() => handleManualQuality(quality)}
                                        disabled={isDisabled}
                                        className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all active:scale-[0.99] ${
                                            isActive
                                                ? 'bg-telegram-primary/15 border border-telegram-primary/30 text-telegram-primary'
                                                : isDisabled
                                                    ? 'opacity-40 bg-white/5 border border-transparent cursor-not-allowed text-white/40'
                                                    : 'bg-white/5 hover:bg-white/10 text-white/80 border border-transparent'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0 text-start">
                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs ${
                                                isActive
                                                    ? 'bg-telegram-primary/20 text-telegram-primary'
                                                    : 'bg-white/10 text-white/60'
                                            }`}>
                                                {quality === 'original' ? 'RAW' : quality.replace('p', '')}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <p className="text-xs font-semibold">
                                                        {quality === 'original' ? 'Original Quality' : QUALITY_LABELS[quality]}
                                                    </p>
                                                    {quality === '1080p' && (
                                                        <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-purple-500/20 text-purple-300">FHD</span>
                                                    )}
                                                    {quality === '720p' && (
                                                        <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-blue-500/20 text-blue-300">HD</span>
                                                    )}
                                                    {quality === '360p' && (
                                                        <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-amber-500/20 text-amber-300">Saver</span>
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-white/50 mt-0.5 truncate">
                                                    {isUpscale
                                                        ? `Source is ${sourceHeight}p • upscale disabled`
                                                        : QUALITY_DESCRIPTIONS[quality]}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0 ml-2">
                                            {variantState === 'preparing' || variantState === 'caching' || variantState === 'transcoding' ? (
                                                <Loader2 className="w-4 h-4 animate-spin text-telegram-primary" />
                                            ) : variantState === 'ready' && !isActive ? (
                                                <span className="text-[10px] text-emerald-400 font-medium">Cached</span>
                                            ) : null}
                                            {isActive && <Check className="w-4 h-4 text-telegram-primary" />}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
