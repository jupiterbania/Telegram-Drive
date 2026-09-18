import { useState, useRef, useEffect } from 'react';
import { Globe, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TelegramFolder } from '../../types';

interface MakePublicChannelSheetProps {
  folder: TelegramFolder;
  onConfirm: (folderId: number, username?: string) => Promise<void>;
  onClose: () => void;
}

export function MakePublicChannelSheet({ folder, onConfirm, onClose }: MakePublicChannelSheetProps) {
  const { t } = useTranslation();
  const defaultUsername = folder.name.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 30);
  const [username, setUsername] = useState(defaultUsername);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onConfirm(folder.id, username.trim() || undefined);
      onClose();
    } catch {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void handleSubmit();
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
          <div className="p-2.5 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
            <Globe className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-telegram-text">Make Channel Public</h3>
            <p className="text-xs text-telegram-subtext mt-0.5 truncate">
              {folder.name}
            </p>
          </div>
        </div>

        {/* Username input */}
        <div className="mb-4">
          <label className="block text-[11px] font-semibold text-telegram-subtext uppercase tracking-wider mb-1.5 px-0.5">
            Public Username
          </label>
          <div className="relative flex items-center bg-telegram-bg border border-telegram-border rounded-2xl px-3.5 py-1 focus-within:ring-2 focus-within:ring-telegram-primary/50 focus-within:border-telegram-primary/50 transition-all">
            <span className="text-xs font-mono font-medium text-telegram-subtext mr-1 select-none">
              t.me/
            </span>
            <input
              ref={inputRef}
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              onKeyDown={handleKeyDown}
              maxLength={32}
              className="w-full bg-transparent py-2.5 text-sm font-mono text-telegram-text placeholder:text-telegram-subtext/40 focus:outline-none"
              placeholder="username (optional)"
              disabled={isSubmitting}
            />
            {username && (
              <button
                type="button"
                onClick={() => {
                  setUsername('');
                  inputRef.current?.focus();
                }}
                className="p-1 rounded-lg text-telegram-subtext hover:text-telegram-text hover:bg-telegram-hover/40 transition-colors mr-1 shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <p className="text-[10px] text-telegram-subtext mt-1.5 px-1">
            Leave empty to let Telegram auto-generate a unique link.
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
            onClick={() => void handleSubmit()}
            disabled={isSubmitting}
            className="flex-1 py-3 text-xs font-bold text-white bg-telegram-primary hover:bg-telegram-primary/90 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-colors active:scale-[0.98] shadow-sm shadow-telegram-primary/20"
          >
            {isSubmitting ? 'Updating...' : 'Make Public'}
          </button>
        </div>
      </div>
    </div>
  );
}
