import { useState, useRef, useEffect } from 'react';
import { FolderPlus, Folder, Lock, Globe, X, Check, ShieldCheck, Sparkles, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface CreateFolderSheetProps {
  onCreate: (name: string, isPublic?: boolean, desiredUsername?: string) => Promise<void>;
  onClose: () => void;
}

export function CreateFolderSheet({ onCreate, onClose }: CreateFolderSheetProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [channelType, setChannelType] = useState<'private' | 'public'>('private');
  const [username, setUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  // Sync default username when channelType switches to public or folder name changes
  const handleTypeChange = (type: 'private' | 'public') => {
    setChannelType(type);
    if (type === 'public' && !username && name.trim()) {
      const slug = name.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 30);
      if (slug.length >= 3) {
        setUsername(slug);
      }
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    const trimmedName = name.trim();
    if (!trimmedName) return;

    setIsSubmitting(true);
    try {
      const isPublic = channelType === 'public';
      const cleanUsername = isPublic && username.trim() ? username.trim() : undefined;
      await onCreate(trimmedName, isPublic, cleanUsername);
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

  const isPublic = channelType === 'public';

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-telegram-surface border-t border-x border-telegram-border/60 rounded-t-[32px] p-5 pb-8 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Tactile drag handle */}
        <div className="flex justify-center mb-3">
          <div className="w-12 h-1.5 rounded-full bg-telegram-border/80" />
        </div>

        {/* Modal Header */}
        <div className="flex items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-sky-500/20 to-telegram-primary/20 border border-sky-500/30 flex items-center justify-center text-telegram-primary shadow-sm shadow-telegram-primary/10 shrink-0">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-telegram-text leading-tight">
                {t('folders.create_folder', 'Create New Folder')}
              </h3>
              <p className="text-xs text-telegram-subtext mt-0.5">
                Organize files in a dedicated cloud channel
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-telegram-hover/40 hover:bg-telegram-hover/80 text-telegram-subtext hover:text-telegram-text flex items-center justify-center transition-colors shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Section 1: Folder / Channel Name */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5 px-0.5">
            <label className="text-[11px] font-bold text-telegram-subtext uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-telegram-primary" />
              Folder / Channel Name
            </label>
            <span className="text-[10px] text-telegram-subtext font-mono">
              {name.length}/128
            </span>
          </div>
          <div className="relative flex items-center bg-telegram-bg border border-telegram-border/80 rounded-2xl px-3.5 py-1 focus-within:ring-2 focus-within:ring-telegram-primary/40 focus-within:border-telegram-primary transition-all shadow-inner">
            <Folder className="w-4 h-4 text-telegram-subtext/60 mr-2.5 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={128}
              className="w-full bg-transparent py-2.5 text-sm font-medium text-telegram-text placeholder:text-telegram-subtext/40 focus:outline-none"
              placeholder="e.g. Work Projects, Movies, Family Vault..."
              disabled={isSubmitting}
            />
            {name && (
              <button
                type="button"
                onClick={() => {
                  setName('');
                  inputRef.current?.focus();
                }}
                className="p-1 rounded-lg text-telegram-subtext hover:text-telegram-text hover:bg-telegram-hover/60 transition-colors shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Section 2: Channel Privacy / Visibility Selector */}
        <div className="mb-4">
          <label className="block text-[11px] font-bold text-telegram-subtext uppercase tracking-wider mb-2 px-0.5">
            Channel Type & Privacy
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Private Channel Option */}
            <div
              onClick={() => handleTypeChange('private')}
              role="button"
              tabIndex={0}
              className={`relative flex flex-col p-3 rounded-2xl border transition-all cursor-pointer select-none ${
                channelType === 'private'
                  ? 'border-telegram-primary bg-telegram-primary/10 ring-1 ring-telegram-primary/50 shadow-sm shadow-telegram-primary/10'
                  : 'border-telegram-border/70 bg-telegram-bg/50 hover:bg-telegram-hover/30 hover:border-telegram-border'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center text-indigo-400">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-telegram-text">Private Channel</span>
                </div>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                  channelType === 'private'
                    ? 'border-telegram-primary bg-telegram-primary text-white'
                    : 'border-telegram-border/80 bg-transparent'
                }`}>
                  {channelType === 'private' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </div>
              </div>
              <p className="text-[11px] text-telegram-subtext leading-relaxed">
                Only accessible via this app & invite link. Secret & secure.
              </p>
              <div className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
                <ShieldCheck className="w-3 h-3" />
                <span>Recommended for Cloud Drive</span>
              </div>
            </div>

            {/* Public Channel Option */}
            <div
              onClick={() => handleTypeChange('public')}
              role="button"
              tabIndex={0}
              className={`relative flex flex-col p-3 rounded-2xl border transition-all cursor-pointer select-none ${
                channelType === 'public'
                  ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/50 shadow-sm shadow-emerald-500/10'
                  : 'border-telegram-border/70 bg-telegram-bg/50 hover:bg-telegram-hover/30 hover:border-telegram-border'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
                    <Globe className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-telegram-text">Public Channel</span>
                </div>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                  channelType === 'public'
                    ? 'border-emerald-500 bg-emerald-500 text-white'
                    : 'border-telegram-border/80 bg-transparent'
                }`}>
                  {channelType === 'public' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </div>
              </div>
              <p className="text-[11px] text-telegram-subtext leading-relaxed">
                Has a public t.me link. Anyone on Telegram can search and view files.
              </p>
              <div className="mt-2 flex items-center gap-1 text-[10px] font-medium text-telegram-subtext">
                <Globe className="w-3 h-3 text-emerald-400" />
                <span>Custom t.me link</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Public Username Input (shown when Public is selected) */}
        {isPublic && (
          <div className="mb-4 p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 animate-in fade-in slide-in-from-top-2 duration-200">
            <label className="block text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-1.5 px-0.5">
              Public Channel Link (Optional)
            </label>
            <div className="relative flex items-center bg-telegram-bg border border-emerald-500/30 rounded-2xl px-3.5 py-1 focus-within:ring-2 focus-within:ring-emerald-500/40 focus-within:border-emerald-500 transition-all">
              <span className="text-xs font-mono font-bold text-emerald-400/90 mr-1 select-none">
                t.me/
              </span>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                onKeyDown={handleKeyDown}
                maxLength={32}
                className="w-full bg-transparent py-2 text-sm font-mono text-telegram-text placeholder:text-telegram-subtext/40 focus:outline-none"
                placeholder="channel_username"
                disabled={isSubmitting}
              />
              {username && (
                <button
                  type="button"
                  onClick={() => setUsername('')}
                  className="p-1 rounded-lg text-telegram-subtext hover:text-telegram-text hover:bg-telegram-hover/60 transition-colors shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <p className="text-[10px] text-telegram-subtext mt-1.5 px-0.5">
              Leave blank to let Telegram auto-generate a unique link.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 py-3.5 text-xs font-semibold text-telegram-subtext hover:text-telegram-text bg-telegram-hover/40 hover:bg-telegram-hover/70 rounded-2xl transition-all active:scale-[0.98]"
          >
            {t('common.cancel', 'Cancel')}
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isSubmitting || !name.trim()}
            className={`flex-[1.4] py-3.5 text-xs font-bold text-white rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg disabled:opacity-40 disabled:cursor-not-allowed ${
              isPublic
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-emerald-500/25'
                : 'bg-gradient-to-r from-sky-500 to-telegram-primary hover:from-sky-400 hover:to-telegram-primary shadow-telegram-primary/25'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating Channel...</span>
              </>
            ) : (
              <>
                {isPublic ? <Globe className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                <span>{isPublic ? 'Create Public Channel' : 'Create Private Folder'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
