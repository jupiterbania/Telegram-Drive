import { useState, useRef, useEffect, useCallback } from 'react';
import { Lock, Eye, EyeOff, Fingerprint, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { hashAppPin } from '../../utils/security';

interface AppLockScreenProps {
  customPinEnabled: boolean;
  customPinHash: string;
  biometricEnabled: boolean;
  isAndroid: boolean;
  onUnlock: () => void;
}

export function AppLockScreen({
  customPinEnabled,
  customPinHash,
  biometricEnabled,
  isAndroid,
  onUnlock,
}: AppLockScreenProps) {
  const [pinInput, setPinInput] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const biometricAttemptedRef = useRef(false);

  // Biometric Unlock Trigger
  const triggerBiometric = useCallback(async (isAuto = false) => {
    if (!biometricEnabled || !isAndroid) return;
    try {
      const authenticated = await invoke<boolean>('cmd_android_authenticate', {
        reason: 'Authenticate to unlock Telegram Drive',
      });
      if (authenticated) {
        if (isAndroid) {
          void invoke('cmd_android_unlock_app').catch(() => {});
        }
        onUnlock();
      } else if (!isAuto) {
        setError('Biometric authentication cancelled or failed.');
      }
    } catch {
      if (!isAuto) {
        setError('Biometric authentication failed.');
      }
    }
  }, [biometricEnabled, isAndroid, onUnlock]);

  // Listen for native Android unlock event
  useEffect(() => {
    (window as any).__telegramDriveOnAppUnlocked = () => {
      onUnlock();
    };
    return () => {
      delete (window as any).__telegramDriveOnAppUnlocked;
    };
  }, [onUnlock]);

  // Auto-prompt biometrics once on mount (with safety delay to allow native startup to settle)
  useEffect(() => {
    if (biometricEnabled && isAndroid && !biometricAttemptedRef.current) {
      biometricAttemptedRef.current = true;
      const timer = setTimeout(() => {
        void triggerBiometric(true);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [biometricEnabled, isAndroid, triggerBiometric]);

  // Auto-focus PIN input if PIN is enabled
  useEffect(() => {
    if (customPinEnabled) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [customPinEnabled]);

  const handlePinSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isVerifying) return;
    const trimmed = pinInput.trim();
    if (!trimmed) {
      setError('Please enter your password / PIN');
      return;
    }

    setIsVerifying(true);
    setError(null);
    try {
      const hashed = await hashAppPin(trimmed);
      if (hashed === customPinHash) {
        if (isAndroid) {
          void invoke('cmd_android_unlock_app').catch(() => {});
        }
        onUnlock();
      } else {
        setError('Incorrect password. Please try again.');
        setPinInput('');
        inputRef.current?.focus();
      }
    } catch {
      setError('Failed to verify password.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-telegram-bg text-telegram-text flex flex-col justify-between items-center p-6 select-none font-sans overflow-y-auto">
      {/* Top Header Security Indicator */}
      <div className="w-full pt-[calc(0.5rem+env(safe-area-inset-top,12px))] flex items-center justify-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-telegram-surface border border-telegram-border/50 text-[11px] font-medium text-telegram-subtext shadow-sm">
          <ShieldCheck className="w-3.5 h-3.5 text-telegram-primary" />
          <span>Encrypted Cloud Storage Locked</span>
        </div>
      </div>

      {/* Main Center Box */}
      <div className="w-full max-w-xs flex flex-col items-center my-auto py-6">
        {/* App Logo & Floating Badge */}
        <div className="relative mb-5 flex items-center justify-center">
          <div className="w-24 h-24 rounded-3xl bg-telegram-surface/80 border border-telegram-border/60 flex items-center justify-center shadow-2xl relative">
            <img
              src="/inapp_logo.png"
              alt="Telegram Drive"
              className="w-16 h-16 object-contain drop-shadow-xl bg-transparent"
            />
            <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-telegram-primary text-black flex items-center justify-center shadow-md border-2 border-telegram-bg">
              <Lock className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Title & Subtitle */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-telegram-text tracking-tight">
            Telegram Drive
          </h2>
          <p className="text-xs text-telegram-subtext mt-1 max-w-[240px]">
            {customPinEnabled && biometricEnabled
              ? 'Enter your PIN or use biometrics to access your files.'
              : customPinEnabled
              ? 'Enter your private app password to unlock.'
              : 'Authenticate with device biometrics to unlock.'}
          </p>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="w-full mb-4 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 font-medium text-center animate-shake">
            {error}
          </div>
        )}

        {/* PIN / Password Entry Form */}
        {customPinEnabled && (
          <form onSubmit={handlePinSubmit} className="w-full space-y-3">
            <div className="relative flex items-center">
              <input
                ref={inputRef}
                type={showPin ? 'text' : 'password'}
                value={pinInput}
                onChange={e => {
                  setPinInput(e.target.value);
                  setError(null);
                }}
                placeholder="Enter PIN / Password"
                className="w-full h-12 px-4 pr-11 rounded-2xl bg-telegram-surface border border-telegram-border/70 text-center text-sm font-mono tracking-widest text-telegram-text placeholder:tracking-normal placeholder:text-xs placeholder:font-sans placeholder:text-telegram-subtext/40 focus:outline-none focus:border-telegram-primary focus:ring-2 focus:ring-telegram-primary/30 transition shadow-inner"
                disabled={isVerifying}
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3.5 text-telegram-subtext hover:text-telegram-text p-1 transition-colors"
                aria-label={showPin ? 'Hide password' : 'Show password'}
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <button
              type="submit"
              disabled={isVerifying || !pinInput.trim()}
              className="w-full h-11 rounded-2xl bg-gradient-to-r from-sky-500 to-telegram-primary text-white text-xs font-bold transition shadow-md shadow-telegram-primary/25 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <span>Unlock</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Biometrics Quick Action Button */}
        {biometricEnabled && isAndroid && (
          <div className={`w-full ${customPinEnabled ? 'mt-4 pt-4 border-t border-telegram-border/40' : ''}`}>
            <button
              type="button"
              onClick={() => void triggerBiometric(false)}
              className="w-full h-11 rounded-2xl bg-telegram-surface hover:bg-telegram-hover/60 border border-telegram-border/60 text-telegram-text text-xs font-semibold transition flex items-center justify-center gap-2 active:scale-[0.98] shadow-sm"
            >
              <Fingerprint className="w-4 h-4 text-telegram-primary" />
              <span>Unlock with Fingerprint</span>
            </button>
          </div>
        )}
      </div>

      {/* Bottom Footer Note */}
      <div className="w-full pb-[calc(0.5rem+env(safe-area-inset-bottom,12px))] text-center">
        <p className="text-[10px] text-telegram-subtext/60">
          Your files stay securely encrypted on your device.
        </p>
      </div>
    </div>
  );
}
