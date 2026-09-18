import React, { useState, useEffect, useRef } from 'react';
import {
  Unlock,
  Eye,
  EyeOff,
  ShieldCheck,
  KeyRound,
  X,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  HelpCircle,
  FileKey,
} from 'lucide-react';
import { toast } from 'sonner';
import { useEncryption } from '../../hooks/useEncryption';
import { useQueryClient } from '@tanstack/react-query';
import { TelegramFile } from '../../types';
import { formatBytes } from '../../utils/files';

interface VaultPassphraseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  mode?: 'unlock' | 'create' | 'change' | 'restore';
  targetFile?: TelegramFile | null;
  onUnlockOnlyThisFile?: (passphrase: string) => Promise<void> | void;
}

function getPasswordStrength(pwd: string): { score: number; label: string; color: string; width: string } {
  if (!pwd) return { score: 0, label: '', color: 'bg-transparent', width: '0%' };
  if (pwd.length < 8) return { score: 1, label: 'Too Short (Min. 8)', color: 'bg-red-500', width: '25%' };
  let score = 1;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;

  if (score <= 2) return { score: 2, label: 'Fair', color: 'bg-amber-500', width: '50%' };
  if (score <= 4) return { score: 3, label: 'Good', color: 'bg-sky-500', width: '75%' };
  return { score: 4, label: 'Strong', color: 'bg-emerald-500', width: '100%' };
}

export const VaultPassphraseModal: React.FC<VaultPassphraseModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  mode = 'unlock',
  targetFile,
  onUnlockOnlyThisFile,
}) => {
  const {
    vaultStatus,
    cloudVaultStatus,
    refreshCloudVaultStatus,
    unlockVault,
    createVault,
    changeVaultPassphrase,
    restoreVaultFromCloud,
    deepScanAndRecoverVault,
    exportRecovery,
  } = useEncryption();
  const queryClient = useQueryClient();

  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [passwordHint, setPasswordHint] = useState('');
  const [savedHint, setSavedHint] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [keyLossAcknowledged, setKeyLossAcknowledged] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingSingle, setIsSubmittingSingle] = useState(false);
  const [isSubmittingAll, setIsSubmittingAll] = useState(false);
  const [isDeepScanning, setIsDeepScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [forceCreateMode, setForceCreateMode] = useState(false);

  // Post-creation recovery flow
  const [createdSuccess, setCreatedSuccess] = useState(false);
  const [createdPassphrase, setCreatedPassphrase] = useState('');
  const [recoveryBundle, setRecoveryBundle] = useState<string | null>(null);
  const [isExportingRecovery, setIsExportingRecovery] = useState(false);
  const [copiedBundle, setCopiedBundle] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const isVaultCreated = vaultStatus?.exists ?? false;
  const isCloudAvailable = cloudVaultStatus?.available ?? false;
  const [checkingCloud, setCheckingCloud] = useState(!isVaultCreated && cloudVaultStatus === null);
  const effectiveMode = !isVaultCreated
    ? (isCloudAvailable && !forceCreateMode ? 'restore' : 'create')
    : mode;
  const isSingleFileMode = (effectiveMode === 'unlock' || effectiveMode === 'restore') && Boolean(targetFile && onUnlockOnlyThisFile);

  useEffect(() => {
    let active = true;
    if (isOpen && !isVaultCreated) {
      setCheckingCloud(true);
      refreshCloudVaultStatus().finally(() => {
        if (active) setCheckingCloud(false);
      });
    } else {
      setCheckingCloud(false);
    }
    return () => {
      active = false;
    };
  }, [isOpen, isVaultCreated, refreshCloudVaultStatus]);

  useEffect(() => {
    if (isOpen) {
      setPassphrase('');
      setConfirmPassphrase('');
      setPasswordHint('');
      setKeyLossAcknowledged(false);
      setErrorMessage(null);
      setShowHint(false);
      setCreatedSuccess(false);
      setCreatedPassphrase('');
      setRecoveryBundle(null);
      setCopiedBundle(false);
      setIsExportingRecovery(false);

      setIsSubmittingSingle(false);
      setIsSubmittingAll(false);
      setIsSubmitting(false);

      try {
        const hint = localStorage.getItem('tg_drive_vault_hint');
        setSavedHint(hint);
      } catch {
        setSavedHint(null);
      }

      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, effectiveMode]);

  if (!isOpen) return null;

  const handleExportRecoveryDirectly = async () => {
    if (!createdPassphrase) return;
    setIsExportingRecovery(true);
    try {
      const bundle = await exportRecovery(createdPassphrase);
      setRecoveryBundle(bundle);
      try {
        await navigator.clipboard.writeText(bundle);
        setCopiedBundle(true);
        toast.success('Recovery bundle generated and copied to clipboard!');
      } catch {
        toast.success('Recovery bundle generated successfully!');
      }
    } catch (err) {
      toast.error(`Could not export recovery bundle: ${String(err)}`);
    } finally {
      setIsExportingRecovery(false);
    }
  };

  const handleFinishSuccess = () => {
    onClose();
    if (onSuccess) {
      onSuccess();
    }
  };

  const handleUnlockOnlyThis = async () => {
    setErrorMessage(null);
    const trimmed = passphrase.trim();
    if (!trimmed) {
      setErrorMessage('Please enter your passphrase');
      return;
    }
    if (!onUnlockOnlyThisFile) return;

    setIsSubmittingSingle(true);
    try {
      if (effectiveMode === 'restore') {
        await restoreVaultFromCloud(trimmed);
        await queryClient.invalidateQueries({ queryKey: ['files'] });
      }
      await onUnlockOnlyThisFile(trimmed);
      onClose();
    } catch (err: any) {
      const errStr = err?.toString() || '';
      if (errStr.includes('WRONG_KEY') || errStr.includes('incorrect') || errStr.includes('failed to authenticate') || errStr.includes('Incorrect passphrase')) {
        setErrorMessage('Incorrect passphrase. Please try again.');
      } else {
        setErrorMessage(errStr.replace(/^Error:\s*/, '') || 'Failed to decrypt this file');
      }
    } finally {
      setIsSubmittingSingle(false);
    }
  };

  const handleUnlockAll = async () => {
    setErrorMessage(null);
    const trimmed = passphrase.trim();
    if (!trimmed) {
      setErrorMessage('Please enter your passphrase');
      return;
    }

    setIsSubmittingAll(true);
    try {
      if (effectiveMode === 'restore') {
        await restoreVaultFromCloud(trimmed);
        await queryClient.invalidateQueries({ queryKey: ['files'] });
        toast.success('Vault restored and unlocked from Telegram cloud!');
      } else {
        await unlockVault(trimmed);
        await queryClient.invalidateQueries({ queryKey: ['files'] });
        toast.success('Vault unlocked! Decrypting your files…');
      }
      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      const errStr = err?.toString() || '';
      if (errStr.includes('WRONG_KEY') || errStr.includes('incorrect') || errStr.includes('failed to authenticate') || errStr.includes('Incorrect passphrase')) {
        setErrorMessage('Incorrect passphrase. Please try again.');
      } else {
        setErrorMessage(errStr.replace(/^Error:\s*/, '') || (effectiveMode === 'restore' ? 'Failed to restore vault' : 'Failed to unlock vault'));
      }
    } finally {
      setIsSubmittingAll(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSingleFileMode) {
      // Form submitted via Enter key in single file mode
      await handleUnlockAll();
      return;
    }

    setErrorMessage(null);

    const trimmed = passphrase.trim();
    if (!trimmed) {
      setErrorMessage('Please enter your passphrase');
      return;
    }

    if (effectiveMode === 'create' || effectiveMode === 'change') {
      if (trimmed.length < 8) {
        setErrorMessage('Passphrase must be at least 8 characters');
        return;
      }
      if (trimmed !== confirmPassphrase.trim()) {
        setErrorMessage('Passphrases do not match');
        return;
      }
      if (effectiveMode === 'create' && !keyLossAcknowledged) {
        setErrorMessage('Please acknowledge the key-loss warning to continue');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (effectiveMode === 'create') {
        await createVault(trimmed);
        if (passwordHint.trim()) {
          try {
            localStorage.setItem('tg_drive_vault_hint', passwordHint.trim());
          } catch {
            // non-fatal
          }
        }
        await queryClient.invalidateQueries({ queryKey: ['files'] });
        setCreatedPassphrase(trimmed);
        setCreatedSuccess(true);
        toast.success('Vault created and safely synced to Telegram cloud!');
        return;
      } else if (effectiveMode === 'change') {
        await changeVaultPassphrase(trimmed);
        if (passwordHint.trim()) {
          try {
            localStorage.setItem('tg_drive_vault_hint', passwordHint.trim());
          } catch {
            // non-fatal
          }
        }
        toast.success('Vault passphrase updated successfully!');
      } else if (effectiveMode === 'restore') {
        try {
          await restoreVaultFromCloud(trimmed);
        } catch (firstErr) {
          // If fast restore fails, attempt deep scan across all candidate backups
          const deepRes = await deepScanAndRecoverVault(trimmed);
          if (!deepRes.restored) {
            throw firstErr;
          }
        }
        await queryClient.invalidateQueries({ queryKey: ['files'] });
        toast.success('Vault restored and unlocked from Telegram cloud!');
        onClose();
        if (onSuccess) {
          onSuccess();
        }
        if (targetFile && onUnlockOnlyThisFile) {
          await onUnlockOnlyThisFile(trimmed);
        }
        return;
      } else {
        try {
          await unlockVault(trimmed);
        } catch (unlockErr) {
          // If local unlock fails, check if an older valid cloud vault backup exists in Telegram
          try {
            const deepRes = await deepScanAndRecoverVault(trimmed);
            if (deepRes.restored) {
              await queryClient.invalidateQueries({ queryKey: ['files'] });
              toast.success('Recovered and unlocked matching vault from Telegram cloud!');
              onClose();
              if (onSuccess) onSuccess();
              if (targetFile && onUnlockOnlyThisFile) await onUnlockOnlyThisFile(trimmed);
              return;
            }
          } catch {}
          throw unlockErr;
        }
        await queryClient.invalidateQueries({ queryKey: ['files'] });
        toast.success('Vault unlocked! Decrypting your files…');
      }

      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      const errStr = err?.toString() || '';
      if (errStr.includes('WRONG_KEY') || errStr.includes('incorrect') || errStr.includes('failed to authenticate') || errStr.includes('Incorrect passphrase')) {
        setErrorMessage('Incorrect passphrase. Please try again.');
      } else {
        setErrorMessage(errStr.replace(/^Error:\s*/, '') || (effectiveMode === 'restore' ? 'Failed to restore vault' : 'Failed to unlock vault'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeepScan = async () => {
    const trimmed = passphrase.trim();
    if (!trimmed) {
      setErrorMessage('Please enter your passphrase to search Telegram for backups');
      return;
    }
    setIsDeepScanning(true);
    setErrorMessage(null);
    try {
      const result = await deepScanAndRecoverVault(trimmed);
      if (result.restored) {
        toast.success(result.message);
        await queryClient.invalidateQueries({ queryKey: ['files'] });
        onClose();
        if (onSuccess) onSuccess();
        if (targetFile && onUnlockOnlyThisFile) await onUnlockOnlyThisFile(trimmed);
      } else {
        setErrorMessage(result.message);
      }
    } catch (err: any) {
      setErrorMessage(err?.toString() || 'Deep cloud scan failed');
    } finally {
      setIsDeepScanning(false);
    }
  };

  const strength = getPasswordStrength(passphrase);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in overflow-y-auto">
      <div
        className="w-full max-w-md rounded-3xl border border-app-border/80 bg-app-surface shadow-2xl p-6 relative animate-slide-up my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={createdSuccess ? handleFinishSuccess : onClose}
          disabled={isSubmitting}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-app-surface-hover/80 text-app-text-secondary hover:text-app-text transition active:scale-95 disabled:opacity-50"
        >
          <X className="h-4 w-4" />
        </button>

        {/* --- Checking Cloud State --- */}
        {checkingCloud ? (
          <div className="flex flex-col items-center justify-center py-10 space-y-3 animate-fade-in text-center">
            <div className="h-8 w-8 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
            <p className="text-xs text-app-text-secondary font-medium">Checking for Cloud Vault in Telegram…</p>
          </div>
        ) : createdSuccess ? (
          <div className="space-y-4 pt-1">
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 shadow-lg shadow-emerald-500/10 mb-3">
                <CheckCircle2 className="h-7 w-7 text-emerald-400" />
              </div>
              <h2 className="text-lg font-bold text-app-text">Vault Created Successfully!</h2>
              <p className="mt-1 text-xs text-app-text-secondary leading-relaxed">
                Your zero-knowledge encrypted vault is active.
              </p>
            </div>

            {/* Critical Recovery Alert */}
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-amber-400 text-xs">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>Save Your Recovery Bundle</span>
              </div>
              <p className="text-[11px] text-amber-200/90 leading-relaxed">
                If you ever forget your master passphrase, this recovery bundle is the <strong>only way</strong> to regain access to your encrypted files.
              </p>
            </div>

            {/* Recovery Bundle Box or Generator */}
            {!recoveryBundle ? (
              <button
                type="button"
                onClick={handleExportRecoveryDirectly}
                disabled={isExportingRecovery}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-app-accent py-3 text-xs font-bold text-app-accent-contrast shadow-md hover:brightness-110 active:scale-95 transition disabled:opacity-50"
              >
                {isExportingRecovery ? (
                  <>
                    <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Generating Bundle…</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>Generate & Copy Recovery Bundle</span>
                  </>
                )}
              </button>
            ) : (
              <div className="space-y-2">
                <textarea
                  readOnly
                  rows={3}
                  value={recoveryBundle}
                  className="w-full resize-none rounded-xl border border-app-border bg-app-surface-sunken p-2.5 font-mono text-[10px] text-app-text focus:outline-none"
                />
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(recoveryBundle);
                      setCopiedBundle(true);
                      toast.success('Copied to clipboard!');
                    } catch {
                      toast.error('Could not copy to clipboard');
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-app-border bg-app-surface py-2 text-xs font-semibold text-app-text hover:bg-app-surface-hover transition active:scale-95"
                >
                  {copiedBundle ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  <span>{copiedBundle ? 'Copied to Clipboard' : 'Copy Recovery Bundle'}</span>
                </button>
                <p className="text-[10px] text-center text-app-text-tertiary">
                  Save this bundle in a secure notes app, USB drive, or password manager.
                </p>
              </div>
            )}

            <div className="pt-2">
              <button
                type="button"
                onClick={handleFinishSuccess}
                className="w-full rounded-xl border border-app-border bg-app-surface py-2.5 text-xs font-semibold text-app-text-secondary hover:bg-app-surface-hover transition active:scale-95"
              >
                {recoveryBundle ? 'Done' : "I'll back up later in Settings"}
              </button>
            </div>
          </div>
        ) : (
          /* --- Screen 1: Normal Unlock / Create / Change Form --- */
          <>
            {/* Icon & Header */}
            <div className="text-center mb-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-500/20 via-emerald-500/20 to-teal-500/20 border border-sky-500/30 text-emerald-400 shadow-lg shadow-emerald-500/10 mb-3">
                {isSingleFileMode ? (
                  <FileKey className="h-7 w-7 text-sky-400" />
                ) : effectiveMode === 'restore' ? (
                  <ShieldCheck className="h-7 w-7 text-emerald-400" />
                ) : effectiveMode === 'unlock' ? (
                  <Unlock className="h-7 w-7 text-emerald-400" />
                ) : (
                  <KeyRound className="h-7 w-7 text-sky-400" />
                )}
              </div>
              <h2 className="text-lg font-bold text-app-text">
                {isSingleFileMode
                  ? 'Unlock Encrypted File'
                  : effectiveMode === 'restore'
                  ? 'Cloud Vault Detected'
                  : effectiveMode === 'unlock'
                  ? 'Unlock Cloud Vault'
                  : effectiveMode === 'create'
                  ? 'Set Vault Passphrase'
                  : 'Change Vault Passphrase'}
              </h2>
              <p className="mt-1 text-xs text-app-text-secondary leading-relaxed">
                {isSingleFileMode
                  ? 'Enter your passphrase. You can unlock only this file or unlock your full vault.'
                  : effectiveMode === 'restore'
                  ? 'Your encrypted vault backup was found in Telegram Saved Messages. Enter your passphrase to restore access.'
                  : effectiveMode === 'unlock'
                  ? 'Enter your passphrase to decrypt and open your protected photos, videos, and files.'
                  : effectiveMode === 'create'
                  ? 'Create a secure master passphrase to protect and unlock your encrypted cloud vault.'
                  : 'Enter a new master passphrase for your encrypted cloud vault.'}
              </p>
            </div>

            {/* Target File Card if unlocking a specific file */}
            {isSingleFileMode && targetFile && (
              <div className="mb-3.5 rounded-2xl border border-sky-500/20 bg-sky-500/5 p-3 flex items-center gap-3 animate-fade-in">
                <div className="h-10 w-10 shrink-0 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shadow-sm">
                  <FileKey className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-app-text truncate" title={targetFile.name}>
                    {targetFile.name}
                  </div>
                  <div className="text-[11px] text-app-text-tertiary flex items-center gap-2 mt-0.5">
                    <span className="inline-block px-1.5 py-0.5 rounded bg-sky-500/15 border border-sky-500/30 text-[10px] text-sky-300 font-mono">
                      Encrypted
                    </span>
                    {targetFile.size > 0 && <span>{formatBytes(targetFile.size)}</span>}
                  </div>
                </div>
              </div>
            )}

            {/* Amber Warning Banner on Create Mode */}
            {effectiveMode === 'create' && (
              <div className="mb-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 space-y-1.5 animate-fade-in">
                <div className="flex items-center gap-2 font-semibold text-amber-400 text-xs">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>No Password Recovery</span>
                </div>
                <p className="text-[11px] text-amber-200/90 leading-relaxed">
                  Telegram Drive uses client-side zero-knowledge encryption. We <strong>cannot</strong> reset your passphrase. If lost, your encrypted files are permanently inaccessible.
                </p>
              </div>
            )}

            {/* Error Alert */}
            {errorMessage && (
              <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300 animate-fade-in">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                <div className="flex-1 leading-relaxed">{errorMessage}</div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-app-text-secondary mb-1.5">
                  {effectiveMode === 'unlock' || effectiveMode === 'restore'
                    ? 'Vault Passphrase'
                    : effectiveMode === 'create'
                    ? 'Master Passphrase (Min. 8 chars)'
                    : 'New Master Passphrase (Min. 8 chars)'}
                </label>
                <div className="relative">
                  <input
                    ref={inputRef}
                    type={showPassword ? 'text' : 'password'}
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    placeholder="Enter passphrase"
                    disabled={isSubmitting}
                    className="w-full rounded-xl border border-app-border bg-app-surface-sunken px-3.5 py-2.5 pr-10 text-sm text-app-text placeholder-app-text-tertiary focus:border-app-accent focus:outline-none transition disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-app-text-tertiary hover:text-app-text transition"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {/* Password Strength Meter for Create/Change */}
                {(effectiveMode === 'create' || effectiveMode === 'change') && passphrase.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="h-1.5 w-full rounded-full bg-app-surface-hover overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
                        style={{ width: strength.width }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-app-text-tertiary">Strength:</span>
                      <span className={`font-semibold ${strength.score <= 1 ? 'text-red-400' : strength.score === 2 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {strength.label}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {(effectiveMode === 'create' || effectiveMode === 'change') && (
                <div>
                  <label className="block text-xs font-semibold text-app-text-secondary mb-1.5">
                    Confirm Passphrase
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassphrase}
                    onChange={(e) => setConfirmPassphrase(e.target.value)}
                    placeholder="Confirm passphrase"
                    disabled={isSubmitting}
                    className="w-full rounded-xl border border-app-border bg-app-surface-sunken px-3.5 py-2.5 text-sm text-app-text placeholder-app-text-tertiary focus:border-app-accent focus:outline-none transition disabled:opacity-50"
                  />
                </div>
              )}

              {/* Password Hint Field (Optional) on Create / Change */}
              {(effectiveMode === 'create' || effectiveMode === 'change') && (
                <div>
                  <label className="block text-xs font-semibold text-app-text-secondary mb-1">
                    Password Hint <span className="text-[10px] font-normal text-app-text-tertiary">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={passwordHint}
                    onChange={(e) => setPasswordHint(e.target.value)}
                    placeholder="e.g. Favorite childhood pet or street"
                    disabled={isSubmitting}
                    className="w-full rounded-xl border border-app-border bg-app-surface-sunken px-3.5 py-2 text-xs text-app-text placeholder-app-text-tertiary focus:border-app-accent focus:outline-none transition disabled:opacity-50"
                  />
                  <p className="mt-1 text-[10px] text-app-text-tertiary">
                    Stored locally on this device as a personal memory clue.
                  </p>
                </div>
              )}

              {/* Show Hint Option on Unlock Screen */}
              {effectiveMode === 'unlock' && savedHint && (
                <div className="pt-0.5">
                  {!showHint ? (
                    <button
                      type="button"
                      onClick={() => setShowHint(true)}
                      className="text-[11px] text-app-accent hover:underline flex items-center gap-1 font-medium"
                    >
                      <HelpCircle className="h-3.5 w-3.5" />
                      <span>Need a reminder? Show Password Hint</span>
                    </button>
                  ) : (
                    <div className="rounded-xl border border-app-border/80 bg-app-surface-sunken p-2.5 text-xs text-app-text-secondary animate-fade-in flex items-start gap-2">
                      <HelpCircle className="h-4 w-4 text-app-accent shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-app-text">Hint: </span>
                        <span>{savedHint}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Mandatory Acknowledgment Checkbox on Create */}
              {effectiveMode === 'create' && (
                <label className="flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={keyLossAcknowledged}
                    onChange={(e) => setKeyLossAcknowledged(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded accent-amber-500 shrink-0"
                  />
                  <span className="text-[11px] leading-snug text-app-text-secondary">
                    I understand that Telegram Drive cannot recover forgotten passphrases, and losing it means permanent loss of my encrypted files.
                  </span>
                </label>
              )}

              {/* Tip regarding password managers */}
              {(effectiveMode === 'create' || effectiveMode === 'change') && (
                <p className="text-[10px] text-app-text-tertiary leading-normal">
                  💡 Tip: Save your master passphrase in a trusted Password Manager (e.g. Bitwarden, 1Password, or Keychain).
                </p>
              )}

              {/* Action Buttons */}
              {isSingleFileMode ? (
                <div className="pt-2 space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Option 2: Unlock Only This File */}
                    <button
                      type="button"
                      onClick={handleUnlockOnlyThis}
                      disabled={isSubmitting || !passphrase.trim() || !onUnlockOnlyThisFile}
                      className="flex items-center justify-center gap-2 rounded-xl border border-sky-500/40 bg-sky-500/10 hover:bg-sky-500/20 py-2.5 px-3 text-xs font-semibold text-sky-300 transition active:scale-95 disabled:opacity-50 cursor-pointer shadow-sm shadow-sky-500/10"
                    >
                      {isSubmittingSingle ? (
                        <>
                          <div className="h-3.5 w-3.5 border-2 border-sky-400/30 border-t-sky-400 rounded-full animate-spin" />
                          <span>Decrypting…</span>
                        </>
                      ) : (
                        <>
                          <FileKey className="h-4 w-4 shrink-0 text-sky-400" />
                          <span className="truncate">Unlock Only This File</span>
                        </>
                      )}
                    </button>

                    {/* Option 3: Unlock All */}
                    <button
                      type="button"
                      onClick={handleUnlockAll}
                      disabled={isSubmitting || !passphrase.trim()}
                      className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 via-emerald-500 to-teal-500 py-2.5 px-3 text-xs font-bold text-white shadow-md shadow-emerald-500/20 hover:brightness-110 active:scale-95 transition disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmittingAll ? (
                        <>
                          <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Unlocking All…</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="h-4 w-4 shrink-0 text-white" />
                          <span className="truncate">Unlock All</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Micro-notes explaining both actions */}
                  <div className="rounded-xl bg-app-surface-sunken/60 border border-app-border/40 p-2 text-[10.5px] text-app-text-tertiary space-y-1">
                    <div className="flex items-start gap-1.5">
                      <span className="font-semibold text-sky-400 shrink-0">• Only This File:</span>
                      <span>Decrypts this file temporarily. Cloud Vault stays locked in Settings.</span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <span className="font-semibold text-emerald-400 shrink-0">• Unlock All:</span>
                      <span>Unlocks entire cloud vault globally and turns on Vault in Settings.</span>
                    </div>
                  </div>

                  {/* Option 1: Cancel */}
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="w-full rounded-xl border border-app-border bg-app-surface py-2 text-xs font-semibold text-app-text-secondary hover:bg-app-surface-hover hover:text-app-text transition active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="pt-2 flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="flex-1 rounded-xl border border-app-border bg-app-surface py-2.5 text-xs font-semibold text-app-text-secondary hover:bg-app-surface-hover transition active:scale-95 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      isSubmitting ||
                      !passphrase.trim() ||
                      (effectiveMode === 'create' && (!keyLossAcknowledged || passphrase.trim().length < 8))
                    }
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 via-emerald-500 to-teal-500 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-500/20 hover:brightness-110 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-4 w-4" />
                        <span>
                          {effectiveMode === 'restore'
                            ? 'Turn On & Unlock'
                            : effectiveMode === 'unlock'
                            ? 'Unlock Vault'
                            : effectiveMode === 'create'
                            ? 'Create Vault'
                            : 'Update Passphrase'}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Deep Scan Recover Option */}
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={handleDeepScan}
                  disabled={isSubmitting || isDeepScanning || !passphrase.trim()}
                  className="text-[11px] text-sky-400 hover:text-sky-300 hover:underline inline-flex items-center justify-center gap-1.5 mx-auto disabled:opacity-50 transition cursor-pointer font-medium"
                >
                  {isDeepScanning ? (
                    <>
                      <div className="h-3 w-3 border-2 border-sky-400/30 border-t-sky-400 rounded-full animate-spin" />
                      <span>Scanning Telegram for Historical Vaults…</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="h-3.5 w-3.5" />
                      <span>Deep Scan Telegram for Previous Vault Backups</span>
                    </>
                  )}
                </button>
              </div>

              {/* Toggle between Cloud Restore and Fresh Create */}
              {effectiveMode === 'restore' && (
                <p className="pt-2 text-center text-[11px] text-app-text-tertiary">
                  Want to start over with a brand new key?{' '}
                  <button
                    type="button"
                    onClick={() => setForceCreateMode(true)}
                    className="text-app-accent hover:underline font-medium cursor-pointer"
                  >
                    Create a new empty vault
                  </button>
                </p>
              )}
              {forceCreateMode && !isVaultCreated && (
                <p className="pt-2 text-center text-[11px] text-app-text-tertiary">
                  Found your previous vault?{' '}
                  <button
                    type="button"
                    onClick={() => setForceCreateMode(false)}
                    className="text-app-accent hover:underline font-medium cursor-pointer"
                  >
                    Restore from Telegram Cloud
                  </button>
                </p>
              )}
            </form>
          </>
        )}
      </div>
    </div>
  );
};
