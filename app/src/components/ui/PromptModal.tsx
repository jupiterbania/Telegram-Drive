import React, { useState, useEffect, useRef } from 'react';
import { Lock, Eye, EyeOff, KeyRound, AlertCircle, AlertTriangle, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { triggerHaptic } from '../../services/feedback';

export interface PromptModalOptions {
  title: string;
  message?: string;
  warningNotice?: string;
  warningPoints?: string[];
  placeholder?: string;
  confirmPlaceholder?: string;
  defaultValue?: string;
  confirmText?: string;
  cancelText?: string;
  isPassword?: boolean;
  requireAcknowledge?: boolean;
  acknowledgeText?: string;
  validate?: (value: string) => string | null;
}

interface PromptModalProps {
  isOpen: boolean;
  options: PromptModalOptions;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}

export function PromptModal({ isOpen, options, onSubmit, onCancel }: PromptModalProps) {
  const [inputValue, setInputValue] = useState('');
  const [confirmValue, setConfirmValue] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasConfirmInput = Boolean(options.confirmPlaceholder);
  const isPasswordInput = options.isPassword ?? true;

  useEffect(() => {
    if (isOpen) {
      setInputValue(options.defaultValue || '');
      setConfirmValue('');
      setShowPassword(false);
      setShowConfirmPassword(false);
      setAcknowledged(false);
      setValidationError(null);
      const timer = setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [isOpen, options.defaultValue]);

  if (!isOpen) return null;

  // Real-time checks
  const isLengthValid = !isPasswordInput || inputValue.length >= 8;
  const isMatchValid = !hasConfirmInput || (confirmValue.length > 0 && confirmValue === inputValue);
  const isAcknowledgeValid = !options.requireAcknowledge || acknowledged;
  const canSubmit = inputValue.trim().length > 0
    && isLengthValid
    && isMatchValid
    && isAcknowledgeValid;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (isPasswordInput && inputValue.length < 8) {
      setValidationError('Passphrase must be at least 8 characters.');
      triggerHaptic('warning');
      return;
    }

    if (hasConfirmInput && inputValue !== confirmValue) {
      setValidationError('Passphrases do not match. Please verify.');
      triggerHaptic('warning');
      return;
    }

    if (options.requireAcknowledge && !acknowledged) {
      setValidationError('Please check the acknowledgment box to continue.');
      triggerHaptic('warning');
      return;
    }

    if (options.validate) {
      const err = options.validate(inputValue);
      if (err) {
        setValidationError(err);
        triggerHaptic('warning');
        return;
      }
    }

    triggerHaptic('success');
    onSubmit(inputValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onCancel();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[350] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md select-none animate-in fade-in duration-200 overflow-y-auto"
      onClick={onCancel}
      onKeyDown={handleKeyDown}
    >
      <div
        className="w-full max-w-md rounded-3xl bg-telegram-surface border border-telegram-border/60 shadow-2xl p-6 relative overflow-hidden animate-in zoom-in-95 duration-200 text-telegram-text my-auto max-h-[92vh] flex flex-col"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="prompt-dialog-title"
      >
        {/* Top Accent Gradient Bar */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-500 via-sky-500 to-telegram-primary" />

        <div className="overflow-y-auto space-y-4 pr-0.5 -mr-0.5">
          {/* Header Icon */}
          <div className="flex items-center justify-center pt-1">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-telegram-primary/20 border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-500/10">
              {options.warningNotice || options.warningPoints ? (
                <ShieldAlert className="w-7 h-7 text-amber-400" />
              ) : isPasswordInput ? (
                <Lock className="w-7 h-7 text-telegram-primary" />
              ) : (
                <KeyRound className="w-7 h-7 text-telegram-primary" />
              )}
            </div>
          </div>

          {/* Title & Message */}
          <div className="text-center space-y-1">
            <h3 id="prompt-dialog-title" className="text-lg font-bold text-telegram-text tracking-tight">
              {options.title}
            </h3>
            {options.message && (
              <p className="text-xs text-telegram-subtext leading-relaxed whitespace-pre-line max-w-[320px] mx-auto">
                {options.message}
              </p>
            )}
          </div>

          {/* Structured Security Warning Box */}
          {(options.warningNotice || (options.warningPoints && options.warningPoints.length > 0)) && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-950/40 to-orange-950/25 border border-amber-500/35 text-left text-amber-200 shadow-sm space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                  Critical Security Warning
                </span>
              </div>

              {options.warningNotice && (
                <p className="text-xs font-semibold leading-relaxed text-amber-100">
                  {options.warningNotice}
                </p>
              )}

              {options.warningPoints && options.warningPoints.length > 0 && (
                <ul className="space-y-1 text-[11px] leading-relaxed text-amber-200/90 pl-1">
                  {options.warningPoints.map((point, index) => (
                    <li key={index} className="flex items-start gap-1.5">
                      <span className="text-amber-400 font-bold shrink-0 mt-0.5">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Primary Passphrase Input */}
            <div className="space-y-1.5">
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-telegram-subtext pointer-events-none">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  ref={inputRef}
                  type={isPasswordInput && !showPassword ? 'password' : 'text'}
                  value={inputValue}
                  onChange={e => {
                    setInputValue(e.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  placeholder={options.placeholder || 'Enter passphrase'}
                  className="w-full h-11 pl-10 pr-11 rounded-xl bg-telegram-bg border border-telegram-border/40 text-sm text-telegram-text placeholder:text-telegram-subtext/50 focus:outline-none focus:border-telegram-primary focus:ring-2 focus:ring-telegram-primary/25 transition font-sans"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                />
                {isPasswordInput && (
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-telegram-subtext hover:text-telegram-text p-1 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                )}
              </div>

              {/* Length Indicator Helper */}
              {isPasswordInput && inputValue.length > 0 && (
                <div className="flex items-center gap-1.5 px-1 text-[11px]">
                  {inputValue.length >= 8 ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Minimum length satisfied ({inputValue.length} chars)
                    </span>
                  ) : (
                    <span className="text-amber-400/90">
                      Minimum 8 characters needed ({inputValue.length}/8)
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Confirm Passphrase Input (if enabled) */}
            {hasConfirmInput && (
              <div className="space-y-1.5">
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-telegram-subtext pointer-events-none">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type={isPasswordInput && !showConfirmPassword ? 'password' : 'text'}
                    value={confirmValue}
                    onChange={e => {
                      setConfirmValue(e.target.value);
                      if (validationError) setValidationError(null);
                    }}
                    placeholder={options.confirmPlaceholder || 'Confirm passphrase'}
                    className="w-full h-11 pl-10 pr-11 rounded-xl bg-telegram-bg border border-telegram-border/40 text-sm text-telegram-text placeholder:text-telegram-subtext/50 focus:outline-none focus:border-telegram-primary focus:ring-2 focus:ring-telegram-primary/25 transition font-sans"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                  />
                  {isPasswordInput && (
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 text-telegram-subtext hover:text-telegram-text p-1 transition-colors"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  )}
                </div>

                {/* Match indicator helper */}
                {confirmValue.length > 0 && (
                  <div className="flex items-center gap-1.5 px-1 text-[11px]">
                    {confirmValue === inputValue ? (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Passphrases match
                      </span>
                    ) : (
                      <span className="text-rose-400">
                        Passphrases do not match
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Acknowledgment Checkbox (for critical recovery warnings) */}
            {options.requireAcknowledge && (
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.05] transition-colors cursor-pointer text-left">
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={e => {
                    setAcknowledged(e.target.checked);
                    if (validationError) setValidationError(null);
                  }}
                  className="mt-0.5 h-4 w-4 rounded border-white/30 text-telegram-primary focus:ring-telegram-primary/40 bg-black/40"
                />
                <span className="text-[11px] text-telegram-text leading-relaxed select-none">
                  {options.acknowledgeText || 'I understand that if I lose this passphrase, my files are permanently lost and cannot be recovered by anyone.'}
                </span>
              </label>
            )}

            {/* Validation Error Banner */}
            {validationError && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-xs text-red-300 font-medium animate-in fade-in duration-150">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{validationError}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 h-11 rounded-xl bg-telegram-hover/40 hover:bg-telegram-hover/70 border border-telegram-border/40 text-xs font-semibold text-telegram-subtext hover:text-telegram-text transition active:scale-[0.98]"
              >
                {options.cancelText || 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className="flex-1 h-11 rounded-xl bg-gradient-to-r from-sky-500 via-telegram-primary to-blue-600 text-white text-xs font-bold shadow-lg shadow-telegram-primary/25 hover:opacity-95 disabled:opacity-40 disabled:pointer-events-none transition active:scale-[0.98] flex items-center justify-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{options.confirmText || 'Confirm'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
