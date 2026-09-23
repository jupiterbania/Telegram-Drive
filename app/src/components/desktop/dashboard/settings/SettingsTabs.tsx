import { useEffect, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Bug, Cloud, Database, Globe, HardDrive, Megaphone, Shield, Zap, Clipboard, Loader2, RefreshCw, Upload, Download } from 'lucide-react';
import { openExternalUrl } from '../../../../utils/url';
import { toast } from 'sonner';
import type { TFunction } from 'i18next';
import { EncryptionSettingsSection } from '../../../shared/EncryptionSettingsSection';
import { ThemesTab } from '../ThemesTab';
import { useConfirm } from '../../../../context/ConfirmContext';
import type { Settings } from '../../../../types/settings';
import {
  downloadSettingsSync,
  getSettingsSyncStatus,
  uploadSettingsSync,
  type SettingsSyncStatus,
} from '../../../../services/settingsSync';
import i18n from '../../../../i18n';

const tabMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.12, ease: [0.2, 0.8, 0.2, 1] as [number, number, number, number] },
};

interface SettingsTabFrameProps {
  children: ReactNode;
}

export function GeneralSettingsTab({ children }: SettingsTabFrameProps) {
  return <motion.div key="general" {...tabMotion} className="w-full space-y-6">{children}</motion.div>;
}

export function ProxySettingsTab({ children }: SettingsTabFrameProps) {
  return <motion.section key="proxy" {...tabMotion} className="w-full space-y-3">{children}</motion.section>;
}

export function VpnSettingsTab({ children }: SettingsTabFrameProps) {
  return <motion.section key="vpn" {...tabMotion} className="w-full space-y-3">{children}</motion.section>;
}

export function WebDavSettingsTab({ children }: SettingsTabFrameProps) {
  return <motion.section key="webdav" {...tabMotion} className="w-full space-y-4">{children}</motion.section>;
}

export function SharingSettingsTab({ children }: SettingsTabFrameProps) {
  return <motion.section key="sharing" {...tabMotion} className="w-full space-y-4">{children}</motion.section>;
}

interface PrivacySettingsTabProps {
  crashReportingEnabled: boolean;
  onCrashReportingChange: () => void;
  settings: Settings;
  onSettingsChange: (updates: Partial<Settings>) => void;
  onSettingsSyncEnabledChange: (enabled: boolean) => void;
}

function SettingsSyncSection({
  settings,
  onSettingsChange,
  onEnabledChange,
}: {
  settings: Settings;
  onSettingsChange: (updates: Partial<Settings>) => void;
  onEnabledChange: (enabled: boolean) => void;
}) {
  const { confirm } = useConfirm();
  const [passphrase, setPassphrase] = useState('');
  const [status, setStatus] = useState<SettingsSyncStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<'status' | 'upload' | 'download' | null>(null);

  const refreshStatus = async () => {
    setBusyAction('status');
    setStatusError(null);
    try {
      setStatus(await getSettingsSyncStatus());
    } catch (error) {
      setStatus(null);
      setStatusError(error instanceof Error ? error.message : String(error));
    } finally {
      setBusyAction(null);
    }
  };

  useEffect(() => {
    if (settings.telegramSettingsSyncEnabled) void refreshStatus();
  }, [settings.telegramSettingsSyncEnabled]);

  const upload = async () => {
    if (status?.available && !status.current_device) {
      const approved = await confirm({
        title: 'Replace the settings backup?',
        message: 'The latest encrypted backup came from another device. Uploading will replace it with this device’s current safe preferences.',
        confirmText: 'Replace backup',
      });
      if (!approved) return;
    }
    setBusyAction('upload');
    setStatusError(null);
    try {
      setStatus(await uploadSettingsSync(settings, passphrase));
      toast.success('Encrypted settings uploaded to Telegram Saved Messages.');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatusError(message);
      toast.error(message);
    } finally {
      setBusyAction(null);
    }
  };

  const download = async () => {
    const approved = await confirm({
      title: 'Apply settings from Telegram?',
      message: 'Synced display, transfer, network-tuning, and encryption preferences will replace their local values. Credentials and activation data are not changed.',
      confirmText: 'Apply settings',
    });
    if (!approved) return;
    setBusyAction('download');
    setStatusError(null);
    try {
      const restored = await downloadSettingsSync(passphrase);
      onSettingsChange(restored.settings);
      setStatus({
        available: true,
        updated_at: restored.updated_at,
        device_id: restored.device_id,
        current_device: status?.device_id === restored.device_id ? status.current_device : false,
      });
      toast.success('Encrypted settings downloaded and applied.');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatusError(message);
      toast.error(message);
    } finally {
      setBusyAction(null);
    }
  };

  const passphraseIsValid = passphrase.trim().length >= 12;
  const isBusy = busyAction !== null;

  return (
    <section className="rounded-lg border border-app-border-subtle bg-app-surface-sunken/20 p-4" aria-labelledby="settings-sync-title">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 gap-3">
          <Cloud className="mt-0.5 h-5 w-5 shrink-0 text-app-accent" aria-hidden="true" />
          <div>
            <h3 id="settings-sync-title" className="text-sm font-semibold text-app-text">Encrypted settings sync</h3>
            <p className="mt-1 text-xs leading-5 text-app-text-secondary">Manually move safe app preferences between devices through your own Telegram Saved Messages. Telegram Drive operates no sync server.</p>
          </div>
        </div>
        <button type="button" role="switch" aria-checked={settings.telegramSettingsSyncEnabled} aria-label="Enable encrypted settings sync" onClick={() => { setStatusError(null); setPassphrase(''); onEnabledChange(!settings.telegramSettingsSyncEnabled); }} className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${settings.telegramSettingsSyncEnabled ? 'bg-app-accent' : 'bg-app-border'}`}><span className={`absolute start-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${settings.telegramSettingsSyncEnabled ? 'translate-x-5 rtl:-translate-x-5' : ''}`} /></button>
      </div>

      {settings.telegramSettingsSyncEnabled && (
        <div className="mt-4 space-y-3">
          <div className="rounded-lg border border-app-warning/25 bg-app-warning/5 p-3 text-xs leading-5 text-app-text-secondary">
            <strong className="text-app-text">Your passphrase cannot be recovered.</strong> It is used locally and is never stored or uploaded. The encrypted Telegram message may be visible in Saved Messages. Passwords, API/WebDAV keys, proxy details, supporter activation, crash consent, and file data are always excluded.
          </div>
          <label className="block">
            <span className="text-xs font-medium text-app-text">Sync passphrase</span>
            <input type="password" value={passphrase} onChange={event => setPassphrase(event.target.value)} minLength={12} autoComplete="new-password" spellCheck={false} placeholder="At least 12 characters" className="mt-1.5 w-full rounded-control border border-app-border bg-app-surface px-3 py-2.5 text-sm text-app-text outline-none focus:border-app-accent" />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" disabled={!passphraseIsValid || isBusy} onClick={() => void upload()} className="quiet-control flex items-center gap-2 px-3 py-2 text-xs font-medium text-app-text disabled:cursor-not-allowed disabled:opacity-50">{busyAction === 'upload' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}Upload this device</button>
            <button type="button" disabled={!passphraseIsValid || isBusy || status?.available === false} onClick={() => void download()} className="quiet-control flex items-center gap-2 px-3 py-2 text-xs font-medium text-app-text disabled:cursor-not-allowed disabled:opacity-50">{busyAction === 'download' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}Download and apply</button>
            <button type="button" disabled={isBusy} onClick={() => void refreshStatus()} aria-label="Refresh settings sync status" className="quiet-control p-2 text-app-text-secondary disabled:opacity-50">{busyAction === 'status' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}</button>
          </div>
          {status && (
            <p className="text-xs leading-5 text-app-text-secondary">
              {status.available && status.updated_at
                ? `Latest backup: ${new Date(status.updated_at * 1_000).toLocaleString()}${status.current_device ? ' · uploaded by this device' : ' · uploaded by another device'}`
                : 'No encrypted settings backup was found in the latest 1,000 Saved Messages.'}
            </p>
          )}
          {statusError && <p role="alert" className="text-xs leading-5 text-app-danger">{statusError}</p>}
        </div>
      )}
    </section>
  );
}

export function SupporterSettingsSection() {
  const [license, setLicense] = useState<{ isLicensed: boolean; licenseKey: string | null; planType: string | null; hardwareId: string } | null>(null);
  const [telegramUser, setTelegramUser] = useState<{ id: number; firstName: string; phone?: string | null } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [manualKey, setManualKey] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [activating, setActivating] = useState(false);

  const loadData = async () => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const me = await invoke<{ id: number; firstName: string; phone?: string | null }>('cmd_get_me').catch(() => null);
      if (me) setTelegramUser(me);

      const m = await import('../../../../services/licenseManager');
      const current = await m.licenseManager.loadLicense();
      setLicense(current);

      if (me && !current.isLicensed) {
        const res = await m.licenseManager.checkTelegramAccount(me.id, me.phone);
        if (res.isLicensed && res.license) {
          setLicense(res.license);
        }
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleSyncStatus = async () => {
    setSyncing(true);
    try {
      const m = await import('../../../../services/licenseManager');
      if (telegramUser) {
        const res = await m.licenseManager.checkTelegramAccount(telegramUser.id, telegramUser.phone);
        if (res.isLicensed && res.license) {
          setLicense(res.license);
          toast.success('Pro status verified & active for your Telegram account!');
          return;
        }
      }
      const verified = await m.licenseManager.verifyLicense();
      const updated = await m.licenseManager.loadLicense();
      setLicense(updated);
      if (verified && updated.isLicensed) {
        toast.success('Pro license is active!');
      } else {
        toast.info('No active Pro purchase found for this account.');
      }
    } catch {
      toast.error('Unable to connect to license server.');
    } finally {
      setSyncing(false);
    }
  };

  const handleManualActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualKey.trim()) return;
    setActivating(true);
    try {
      const m = await import('../../../../services/licenseManager');
      const res = await m.licenseManager.activateLicense(manualKey.trim());
      if (res.success && res.license) {
        setLicense(res.license);
        toast.success('License activated successfully!');
        setShowManual(false);
      } else {
        toast.error(res.message || 'Invalid license key.');
      }
    } catch {
      toast.error('Activation failed.');
    } finally {
      setActivating(false);
    }
  };

  const isPro = Boolean(license?.isLicensed);
  const checkoutUrl = (() => {
    const base = 'https://tg-drive-license-service.jupiterbania472.workers.dev';
    const params = new URLSearchParams();
    if (telegramUser?.id) params.set('tg_id', String(telegramUser.id));
    if (telegramUser?.phone) params.set('tg_phone', telegramUser.phone);
    if (telegramUser?.firstName) params.set('name', telegramUser.firstName);
    return `${base}/?${params.toString()}`;
  })();

  return (
    <section className="space-y-4 rounded-xl border border-app-border-subtle bg-app-surface-sunken/25 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Zap className={`h-5 w-5 ${isPro ? 'text-amber-400' : 'text-app-text-secondary'}`} />
          <div>
            <h3 className="text-sm font-semibold text-app-text">
              TG Drive Pro {isPro ? 'Supporter' : 'Membership'}
            </h3>
            <p className="text-[11px] text-app-text-secondary">
              {telegramUser ? `Linked to Telegram ID: ${telegramUser.id}${telegramUser.phone ? ` (${telegramUser.phone})` : ''}` : 'Account Bound Licensing'}
            </p>
          </div>
        </div>
        {isPro ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-[11px] font-bold text-emerald-400">
            ✓ PRO ACTIVE
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/10 border border-slate-500/30 px-3 py-1 text-[11px] font-medium text-app-text-secondary">
            Free Plan
          </span>
        )}
      </div>

      {isPro ? (
        <div className="space-y-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-3.5 text-xs text-app-text-secondary">
          <div className="flex justify-between">
            <span>License Plan:</span>
            <span className="capitalize font-bold text-emerald-400">{license?.planType || 'Lifetime Pro'}</span>
          </div>
          <div className="flex justify-between">
            <span>Multi-Device Access:</span>
            <span className="font-semibold text-app-text">Unlimited for this Telegram Account</span>
          </div>
          <div className="flex justify-between">
            <span>Ad-Free Experience:</span>
            <span className="font-semibold text-emerald-400">Active (All Ads Blocked)</span>
          </div>
        </div>
      ) : (
        <div className="space-y-3 rounded-lg bg-amber-500/5 border border-amber-500/20 p-3.5 text-xs">
          <p className="text-app-text font-medium leading-5">
            Upgrade this Telegram account to <strong>Lifetime Pro</strong> to get maximum download/upload speeds, remove all banners, and access unlimited storage across all your devices!
          </p>
          <div className="flex items-center gap-3 pt-1">
            <a
              href={checkoutUrl}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all inline-flex items-center gap-1.5"
            >
              <span>🚀 Upgrade Account to Pro</span>
            </a>
            <button
              type="button"
              onClick={handleSyncStatus}
              disabled={syncing}
              className="quiet-button px-3 py-2 text-xs font-semibold text-app-text flex items-center gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Checking…' : 'Already Purchased? Check Status'}</span>
            </button>
          </div>
        </div>
      )}

      <div className="pt-2 border-t border-app-border-subtle flex items-center justify-between text-xs">
        <button
          type="button"
          onClick={() => setShowManual(!showManual)}
          className="text-[11px] text-cyan-400 hover:underline"
        >
          {showManual ? 'Hide manual key entry' : 'Have a license key or trial voucher?'}
        </button>

        {isPro && (
          <button
            type="button"
            onClick={handleSyncStatus}
            disabled={syncing}
            className="text-[11px] text-app-text-secondary hover:text-app-text flex items-center gap-1"
          >
            <RefreshCw className={`h-3 w-3 ${syncing ? 'animate-spin' : ''}`} />
            <span>Sync Status</span>
          </button>
        )}
      </div>

      {showManual && (
        <form onSubmit={handleManualActivate} className="pt-2 flex items-center gap-2">
          <input
            type="text"
            value={manualKey}
            onChange={(e) => setManualKey(e.target.value)}
            placeholder="TGD-XXXX-XXXX-XXXX"
            className="flex-1 px-3 py-1.5 rounded-lg bg-app-surface border border-app-border text-xs font-mono text-app-text placeholder-app-text-secondary focus:outline-none focus:border-cyan-500"
          />
          <button
            type="submit"
            disabled={activating || !manualKey.trim()}
            className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold disabled:opacity-50"
          >
            {activating ? 'Activating…' : 'Activate'}
          </button>
        </form>
      )}
    </section>
  );
}

export function LegacySupporterSettingsSection() {
  return null;
}

export function PrivacySettingsTab({ crashReportingEnabled, onCrashReportingChange, settings, onSettingsChange, onSettingsSyncEnabledChange }: PrivacySettingsTabProps) {
  return (
    <motion.section key="privacy" {...tabMotion} className="space-y-4">
      <div className="flex items-start gap-3 rounded-lg border border-app-accent/20 bg-app-accent/5 p-4">
        <Bug className="mt-0.5 h-5 w-5 shrink-0 text-app-accent" />
        <div><h3 className="text-sm font-semibold text-app-text">Crash-only reporting</h3><p className="mt-1 text-xs leading-5 text-app-text-secondary">Optional reports help diagnose unexpected app crashes. Normal usage, analytics, advertising activity, and file operations are never reported.</p></div>
      </div>
      <div className="flex items-center justify-between rounded-lg bg-app-hover/50 p-4">
        <div className="max-w-[75%]"><p className="text-sm font-medium text-app-text">Send anonymous crash reports</p><p className="mt-1 text-xs leading-5 text-app-text-secondary">Never sends file names, paths, contents, Telegram messages, credentials, or personal identifiers. Turning this off also clears reports waiting to be sent.</p></div>
        <button type="button" role="switch" aria-checked={crashReportingEnabled} aria-label="Send anonymous crash reports" onClick={onCrashReportingChange} className={`relative h-6 w-11 rounded-full transition-colors ${crashReportingEnabled ? 'bg-app-accent' : 'bg-app-border'}`}><span className={`absolute start-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${crashReportingEnabled ? 'translate-x-5 rtl:-translate-x-5' : ''}`} /></button>
      </div>
      <section className="space-y-3" aria-labelledby="data-usage-title">
        <div><h3 id="data-usage-title" className="text-sm font-semibold text-app-text">Where your data goes</h3><p className="mt-1 text-xs leading-5 text-app-text-secondary">Telegram Drive has no account server of its own. Each destination below is separated by purpose.</p></div>
        <div className="grid gap-3 sm:grid-cols-2">
          {([
            ['This device', 'Settings, queue state, thumbnails, and encrypted vault material stay local.', Database],
            ['Telegram', 'Folder channels and uploaded file messages go directly to your Telegram account.', Cloud],
            ['Sponsors', 'Sponsor content loads only in labeled ad areas. File activity is never sent to sponsors.', Megaphone],
            ['Crash reports', 'Only after consent: app version, platform, error type, and sanitized function names.', Bug],
          ] as const).map(([title, description, Icon]) => (
            <div key={title} className="rounded-lg border border-app-border-subtle bg-app-surface-sunken/25 p-3"><Icon className="h-4 w-4 text-app-accent" aria-hidden="true" /><strong className="mt-2 block text-xs text-app-text">{title}</strong><p className="mt-1 text-xs leading-5 text-app-text-secondary">{description}</p></div>
          ))}
        </div>
        <p className="rounded-lg border border-app-border-subtle p-3 text-xs leading-5 text-app-text-secondary"><strong className="text-app-text">Privacy policy summary:</strong> Telegram Drive does not sell personal data, inspect file contents for analytics, or operate a cloud account database. Revoking a share or disabling a local server stops that access immediately.</p>
      </section>
      <SettingsSyncSection settings={settings} onSettingsChange={onSettingsChange} onEnabledChange={onSettingsSyncEnabledChange} />
      <SupporterSettingsSection />
      {/* Telegram Developer Contact */}
      <div className="rounded-lg border border-app-border-subtle bg-app-surface-sunken/25 p-4">
        <h3 className="text-sm font-semibold text-app-text mb-1">Contact Developer</h3>
        <p className="text-xs leading-5 text-app-text-secondary mb-3">
          Have questions, suggestions, or need direct assistance? Chat directly with the developer on Telegram.
        </p>
        <button
          type="button"
          onClick={async () => {
            const opened = await openExternalUrl('tg://resolve?domain=Theexposes');
            if (!opened) {
              await openExternalUrl('https://t.me/Theexposes');
            }
          }}
          className="flex items-center gap-2.5 rounded-lg border border-app-accent/30 bg-app-accent/10 px-4 py-2.5 text-sm font-semibold text-app-accent hover:bg-app-accent/20 active:scale-[0.98] transition-all"
        >
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-1.97 9.289c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.26 14.4l-2.95-.924c-.643-.204-.657-.643.136-.953l11.526-4.447c.537-.194 1.006.131.59.172z"/>
          </svg>
          Contact Developer · @Theexposes
        </button>
      </div>
    </motion.section>
  );
}

interface AdvancedSettingsTabProps {
  onOpenApi: () => void;
  onOpenWebDav: () => void;
  onOpenProxy: () => void;
  onOpenVpn: () => void;
}

export function AdvancedSettingsTab({ onOpenApi, onOpenWebDav, onOpenProxy, onOpenVpn }: AdvancedSettingsTabProps) {
  return (
    <motion.section key="advanced" {...tabMotion} className="space-y-4">
      <div><h3 className="text-base font-semibold text-app-text">Advanced</h3><p className="mt-1 text-sm text-app-text-secondary">Power-user connections are grouped here so everyday settings stay calm and focused. Use the settings search to find any option by name.</p></div>
      <div className="grid gap-3 sm:grid-cols-2">
        {([
          ['REST API', 'Local automation endpoint and API key', Globe, onOpenApi],
          ['WebDAV', 'Finder and file-manager access', HardDrive, onOpenWebDav],
          ['Proxy', 'SOCKS5 and HTTP bridge settings', Shield, onOpenProxy],
          ['VPN & network', 'Retries, bandwidth, and data-center tuning', Zap, onOpenVpn],
        ] as const).map(([label, description, Icon, action]) => (
          <button key={label} type="button" onClick={action} className="quiet-surface p-4 text-start hover:border-app-accent/30 hover:bg-app-hover"><Icon className="mb-3 h-5 w-5 text-app-accent" /><strong className="block text-sm text-app-text">{label}</strong><span className="mt-1 block text-xs leading-5 text-app-text-secondary">{description}</span></button>
        ))}
      </div>
    </motion.section>
  );
}

export function EncryptionSettingsTab() {
  return <motion.section key="encryption" {...tabMotion}><EncryptionSettingsSection /></motion.section>;
}

export function ThemeSettingsTab() {
  return <ThemesTab />;
}

interface AboutSettingsTabProps {
  appVersion: string;
  diagnosticsLoading: boolean;
  t: TFunction;
  onCopyDiagnostics: () => void;
}

export function AboutSettingsTab({ appVersion, diagnosticsLoading, t, onCopyDiagnostics }: AboutSettingsTabProps) {
  return (
    <motion.section key="about" {...tabMotion} className="w-full space-y-4">
      <div className="flex flex-col items-center space-y-5 py-6">
        <img src="/inapp_logo.png" className="h-16 w-16 drop-shadow-lg object-contain bg-transparent" alt="Telegram Drive Logo" />
        <div className="text-center"><h3 className="text-base font-bold text-telegram-text">{i18n.t("common.app_title")}</h3><p className="mt-0.5 text-xs text-telegram-subtext">v{appVersion}</p></div>
        <div className="h-px w-12 bg-telegram-border" />
        <button onClick={onCopyDiagnostics} disabled={diagnosticsLoading} className="flex items-center gap-1.5 rounded-lg border border-telegram-border bg-telegram-hover px-3 py-1.5 text-xs font-medium text-telegram-subtext transition hover:bg-telegram-border/30 hover:text-telegram-text disabled:opacity-50">
          {diagnosticsLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Clipboard className="h-3 w-3" />}
          {t('settings.copy_diagnostics')}
        </button>
        <div className="space-y-3 text-center">
          <p className="text-sm font-semibold text-telegram-text">Telegram Drive</p>
          <button onClick={event => { event.preventDefault(); void openExternalUrl('https://t.me/Theexposes'); }} className="flex cursor-pointer items-center justify-center gap-1.5 text-xs text-telegram-primary transition-colors hover:text-telegram-primary/80">
            Official Telegram: @Theexposes
          </button>
        </div>
        <p className="max-w-[280px] text-center text-[11px] leading-relaxed text-telegram-subtext/60">{t('settings.tagline')}</p>
      </div>
    </motion.section>
  );
}
