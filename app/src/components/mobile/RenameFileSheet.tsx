import { useState, useRef, useEffect } from 'react';
import { Film, Music, Image as ImageIcon, FileText, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatBytes, isImageFile } from '../../utils';
import type { TelegramFile } from '../../types';

interface RenameFileSheetProps {
  file: TelegramFile;
  currentName: string;
  onRename: (newName: string) => Promise<void> | void;
  onClose: () => void;
}

function splitFileName(filename: string): { base: string; ext: string } {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot <= 0) {
    return { base: filename, ext: '' };
  }
  return {
    base: filename.substring(0, lastDot),
    ext: filename.substring(lastDot),
  };
}

export function RenameFileSheet({ file, currentName, onRename, onClose }: RenameFileSheetProps) {
  const { t } = useTranslation();
  const { base: initialBase, ext } = splitFileName(currentName);
  const [baseName, setBaseName] = useState(initialBase);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  const isVideo = Boolean(file.mime_type?.startsWith('video/') || file.name.match(/\.(mp4|mkv|webm|avi|mov|m4v)$/i));
  const isAudio = Boolean(file.mime_type?.startsWith('audio/') || file.name.match(/\.(mp3|flac|wav|ogg|m4a|aac|opus)$/i));
  const isImage = isImageFile(file.name);

  const handleSubmit = async () => {
    if (isSubmitting) return;
    const trimmedBase = baseName.trim();
    if (!trimmedBase) return;
    const newFullName = ext ? `${trimmedBase}${ext}` : trimmedBase;
    if (newFullName === currentName) {
      onClose();
      return;
    }
    setIsSubmitting(true);
    try {
      await onRename(newFullName);
      onClose();
    } catch {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-telegram-surface border border-telegram-border/50 rounded-t-3xl p-5 pb-8 shadow-2xl animate-in slide-in-from-bottom duration-300"
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 rounded-full bg-telegram-border/60" />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className={`p-2.5 rounded-2xl ${
              isVideo
                ? 'bg-purple-500/15 text-purple-400 border border-purple-500/20'
                : isAudio
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                : isImage
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                : 'bg-telegram-primary/15 text-telegram-primary border border-telegram-primary/20'
            }`}
          >
            {isVideo ? (
              <Film className="w-5 h-5" />
            ) : isAudio ? (
              <Music className="w-5 h-5" />
            ) : isImage ? (
              <ImageIcon className="w-5 h-5" />
            ) : (
              <FileText className="w-5 h-5" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-telegram-text">{t('files.rename_file')}</h3>
            <p className="text-xs text-telegram-subtext mt-0.5 truncate">
              {formatBytes(file.size)} • {ext ? ext.replace('.', '').toUpperCase() : 'File'}
            </p>
          </div>
        </div>

        {/* Name input with Extension indicator */}
        <div className="mb-4">
          <label className="block text-[11px] font-semibold text-telegram-subtext uppercase tracking-wider mb-1.5 px-0.5">
            File Name
          </label>
          <div className="relative flex items-center bg-telegram-bg border border-telegram-border rounded-2xl px-3.5 py-1 focus-within:ring-2 focus-within:ring-telegram-primary/50 focus-within:border-telegram-primary/50 transition-all">
            <input
              ref={inputRef}
              type="text"
              value={baseName}
              onChange={e => setBaseName(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={255}
              className="w-full bg-transparent py-2.5 text-sm text-telegram-text placeholder:text-telegram-subtext/40 focus:outline-none"
              placeholder="Enter file name"
              disabled={isSubmitting}
            />
            {baseName && (
              <button
                type="button"
                onClick={() => {
                  setBaseName('');
                  inputRef.current?.focus();
                }}
                className="p-1 rounded-lg text-telegram-subtext hover:text-telegram-text hover:bg-telegram-hover/40 transition-colors mr-1 shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            {ext && (
              <span className="px-2 py-0.5 rounded-lg bg-telegram-surface border border-telegram-border/50 text-xs font-mono font-bold text-telegram-primary shrink-0 select-none">
                {ext}
              </span>
            )}
          </div>
          <p className="text-[10px] text-telegram-subtext mt-1.5 px-1">
            The file extension {ext ? <span className="font-mono font-bold text-telegram-primary">{ext}</span> : ''} will be kept automatically.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 text-xs font-semibold text-telegram-subtext hover:text-telegram-text bg-telegram-hover/30 hover:bg-telegram-hover/50 rounded-xl transition-colors active:scale-[0.98]"
            disabled={isSubmitting}
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !baseName.trim() || (ext ? `${baseName.trim()}${ext}` : baseName.trim()) === currentName}
            className="flex-1 py-3 text-xs font-bold text-white bg-telegram-primary hover:bg-telegram-primary/90 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-colors active:scale-[0.98] shadow-sm shadow-telegram-primary/20"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>{t('files.renaming') || 'Renaming...'}</span>
              </span>
            ) : (
              t('files.rename')
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
