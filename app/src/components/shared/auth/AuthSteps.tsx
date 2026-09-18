import { useState, useEffect, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ChevronDown, ExternalLink, HelpCircle, Key, Lock, Phone, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
import i18n from '../../../i18n';
import { Country, detectCountryFromPhone, guessUserCountry } from '../../../data/countries';
import { CountrySelectModal } from './CountrySelectModal';

export type AuthStep = 'setup' | 'phone' | 'code' | 'password';
export type CodeDelivery =
  | 'telegram_app'
  | 'sms'
  | 'call'
  | 'flash_call'
  | 'missed_call'
  | 'email'
  | 'email_setup'
  | 'fragment'
  | 'firebase'
  | 'sms_word'
  | 'sms_phrase'
  | 'unsupported';

export interface CodeRequestResult {
  status: 'code_required' | 'authorized' | 'qr_recommended';
  delivery: CodeDelivery;
  codeLength?: number;
  destinationHint?: string;
  fragmentUrl?: string;
  resendAfterSeconds?: number;
  nextDelivery?: CodeDelivery;
  numericCode: boolean;
}

interface AuthSetupStepProps {
  apiId: string;
  apiHash: string;
  isMobile: boolean;
  onApiIdChange: (value: string) => void;
  onApiHashChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  onShowHelp: () => void;
  onDevLogin: () => void;
}

export function AuthSetupStep({
  apiId,
  apiHash,
  isMobile,
  onApiIdChange,
  onApiHashChange,
  onSubmit,
  onShowHelp,
  onDevLogin,
}: AuthSetupStepProps) {
  return (
    <motion.form key="setup" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} onSubmit={onSubmit} className="space-y-4">
      <div className="rounded-container border border-app-accent/20 bg-app-accent/5 p-4 text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-app-selected text-app-accent"><QrCode className="h-5 w-5" /></div>
        <h2 className="mt-3 text-sm font-semibold text-app-text">QR-first secure sign in</h2>
        <p className="mt-1 text-xs leading-5 text-app-text-secondary">Desktop sign-in uses Telegram's QR device flow. A one-time API ID and hash are still required by Telegram to identify this open-source client.</p>
      </div>
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-app-text-tertiary"><span className="h-px flex-1 bg-app-border-subtle" />Advanced client credentials<span className="h-px flex-1 bg-app-border-subtle" /></div>
      <div className="space-y-3">
        <div>
          <label htmlFor="telegram-api-id" className="auth-label">{i18n.t("auth.api_id")}</label>
          <div className="relative">
            <Key className="auth-input-icon" />
            <input type="text" id="telegram-api-id" value={apiId} onChange={event => onApiIdChange(event.target.value)} placeholder="12345678" className="auth-input font-mono" />
          </div>
        </div>
        <div>
          <label htmlFor="telegram-api-hash" className="auth-label">{i18n.t("auth.api_hash")}</label>
          <div className="relative">
            <Key className="auth-input-icon" />
            <input type="text" id="telegram-api-hash" value={apiHash} onChange={event => onApiHashChange(event.target.value)} placeholder="abcdef123456..." className="auth-input font-mono" />
          </div>
        </div>
      </div>
      <button type="submit" className="quiet-control auth-primary-action">
        {isMobile ? 'Continue to phone sign in' : 'Continue to QR sign in'} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
      </button>
      <button type="button" onClick={onShowHelp} className="quiet-control auth-secondary-action w-full">
        <HelpCircle className="w-3 h-3" /> {i18n.t("auth.how_to_get_credentials")}
      </button>
      {import.meta.env.DEV && (
        <button type="button" onClick={onDevLogin} className="quiet-control auth-secondary-action w-full text-app-danger">{i18n.t("auth.dev_mode")}</button>
      )}
    </motion.form>
  );
}

interface AuthMethodStepProps {
  isMobile: boolean;
  loginMethod: 'phone' | 'qr';
  loading: boolean;
  phone: string;
  qrUrl: string | null;
  qrPolling: boolean;
  onPhoneChange: (value: string) => void;
  onSelectPhone: () => void;
  onSelectQr: () => void;
  onPhoneSubmit: (event: FormEvent) => void;
  onQrLogin: () => void;
  onBack: () => void;
}

export function AuthMethodStep({
  isMobile,
  loginMethod,
  loading,
  phone,
  qrUrl,
  qrPolling,
  onPhoneChange,
  onSelectPhone,
  onSelectQr,
  onPhoneSubmit,
  onQrLogin,
  onBack,
}: AuthMethodStepProps) {
  const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);

  // Initialize selected country: from existing phone or guess from user locale/timezone
  const [selectedCountry, setSelectedCountry] = useState<Country>(() => {
    if (phone) {
      const detected = detectCountryFromPhone(phone);
      if (detected) return detected.country;
    }
    return guessUserCountry();
  });

  // National number (digits after country dial code)
  const [nationalNumber, setNationalNumber] = useState<string>(() => {
    if (phone) {
      const detected = detectCountryFromPhone(phone);
      if (detected) return detected.nationalNumber;
      return phone.replace(/^\+/, '');
    }
    return '';
  });

  // Keep state in sync if phone prop changes from outside
  useEffect(() => {
    if (!phone) return;
    const detected = detectCountryFromPhone(phone);
    if (detected) {
      setSelectedCountry((prev) => (prev.iso !== detected.country.iso ? detected.country : prev));
      setNationalNumber((prev) => (prev !== detected.nationalNumber ? detected.nationalNumber : prev));
    }
  }, [phone]);

  const handleSelectCountry = (country: Country) => {
    setSelectedCountry(country);
    const cleanedDigits = nationalNumber.replace(/[^0-9]/g, '');
    const fullNumber = cleanedDigits ? `${country.dialCode}${cleanedDigits}` : country.dialCode;
    onPhoneChange(fullNumber);
  };

  const handleNationalNumberChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = event.target.value;

    // If user types or pastes an international number starting with +
    if (rawValue.trim().startsWith('+')) {
      const detected = detectCountryFromPhone(rawValue);
      if (detected) {
        setSelectedCountry(detected.country);
        const digits = detected.nationalNumber.replace(/[^0-9]/g, '');
        setNationalNumber(digits);
        onPhoneChange(`${detected.country.dialCode}${digits}`);
        return;
      }
    }

    const cleanedDigits = rawValue.replace(/[^0-9]/g, '');
    setNationalNumber(cleanedDigits);
    const fullNumber = cleanedDigits ? `${selectedCountry.dialCode}${cleanedDigits}` : '';
    onPhoneChange(fullNumber);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const cleanedDigits = nationalNumber.replace(/[^0-9]/g, '');
    const fullNumber = `${selectedCountry.dialCode}${cleanedDigits}`;
    onPhoneChange(fullNumber);
    onPhoneSubmit(event);
  };

  return (
    <motion.div key="phone" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-5">
      {!isMobile && (
        <div className="quiet-control flex overflow-hidden border border-app-border bg-app-surface-sunken/40 p-0.5">
          <button type="button" onClick={onSelectPhone} className={`quiet-control order-2 flex h-8 flex-1 items-center justify-center gap-2 text-metadata font-medium ${loginMethod === 'phone' ? 'bg-app-surface-raised text-app-text shadow-sm' : 'text-app-text-secondary hover:text-app-text'}`}>
            <Phone className="w-4 h-4" /> {i18n.t("auth.phone_number")}
          </button>
          <button type="button" onClick={onSelectQr} className={`quiet-control order-1 flex h-8 flex-1 items-center justify-center gap-2 text-metadata font-medium ${loginMethod === 'qr' ? 'bg-app-surface-raised text-app-text shadow-sm' : 'text-app-text-secondary hover:text-app-text'}`}>
            <QrCode className="w-4 h-4" /> {i18n.t("auth.qr_code")}
          </button>
        </div>
      )}

      {loginMethod === 'phone' ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. Country Selection Bar */}
          <div className="space-y-1.5 text-left">
            <span className="auth-label text-app-text-secondary text-xs font-medium">
              Country
            </span>
            <button
              type="button"
              onClick={() => setIsCountryModalOpen(true)}
              className="w-full flex items-center justify-between h-11 px-3.5 rounded-control border border-app-border bg-app-surface-sunken/40 hover:bg-app-surface-sunken/70 hover:border-app-border-focus text-app-text transition-all text-left group cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-xl leading-none select-none shrink-0" role="img" aria-label={selectedCountry.name}>
                  {selectedCountry.flag}
                </span>
                <span className="text-ui font-medium text-app-text truncate">
                  {selectedCountry.name}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-full bg-app-surface-sunken border border-app-border/40 text-app-text-secondary">
                  {selectedCountry.dialCode}
                </span>
                <ChevronDown className="w-4 h-4 text-app-text-tertiary group-hover:text-app-text transition-colors" />
              </div>
            </button>
          </div>

          {/* 2. Phone Number Input with attached Calling Code Chip */}
          <div className="space-y-1.5 text-left">
            <label htmlFor="telegram-phone-number" className="auth-label text-app-text-secondary text-xs font-medium">
              {i18n.t("auth.phone_number")}
            </label>
            <div className="flex items-center rounded-control border border-app-border bg-app-surface-sunken/40 focus-within:border-app-accent/70 focus-within:bg-app-surface-sunken/60 transition-all overflow-hidden">
              {/* Dial code button */}
              <button
                type="button"
                onClick={() => setIsCountryModalOpen(true)}
                className="flex items-center gap-1.5 px-3 h-11 border-e border-app-border/60 bg-app-surface-sunken/50 hover:bg-app-hover text-app-text text-ui font-mono font-semibold shrink-0 transition-colors cursor-pointer"
                title="Change Country Code"
              >
                <span className="text-base leading-none select-none">{selectedCountry.flag}</span>
                <span>{selectedCountry.dialCode}</span>
                <ChevronDown className="w-3 h-3 text-app-text-tertiary ms-0.5" />
              </button>

              {/* National Phone Input */}
              <input
                id="telegram-phone-number"
                type="tel"
                inputMode="tel"
                value={nationalNumber}
                onChange={handleNationalNumberChange}
                placeholder={selectedCountry.placeholder || "123 456 7890"}
                className="w-full h-11 px-3 bg-transparent text-ui font-mono tracking-wide text-app-text placeholder:text-app-text-tertiary outline-none"
                autoFocus
              />
            </div>
            <p className="text-[11px] text-app-text-tertiary ps-1">
              Enter your mobile number registered with Telegram
            </p>
          </div>

          <div className="flex flex-col gap-3 pt-1">
            <button
              type="submit"
              disabled={loading || !nationalNumber.trim()}
              className="quiet-control auth-primary-action disabled:opacity-45"
            >
              {loading ? 'Connecting...' : <>{i18n.t("auth.continue")} <ArrowRight className="h-4 w-4 rtl:rotate-180" /></>}
            </button>
            <button type="button" onClick={onBack} className="quiet-control auth-secondary-action w-full">
              {i18n.t("auth.back_to_config")}
            </button>
          </div>

          {/* Country Selection Modal */}
          <CountrySelectModal
            isOpen={isCountryModalOpen}
            selectedCountry={selectedCountry}
            onSelect={handleSelectCountry}
            onClose={() => setIsCountryModalOpen(false)}
          />
        </form>
      ) : (
        <div className="flex flex-col items-center gap-5">
          {loading && !qrUrl && (
            <div className="flex h-52 w-52 items-center justify-center rounded-container bg-app-surface-sunken/45">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-app-border border-t-app-accent" />
            </div>
          )}
          {qrUrl && (
            <>
              <div className="rounded-container bg-white p-3 shadow-[var(--shadow-raised)]">
                <QRCodeSVG value={qrUrl} size={200} level="M" bgColor="#ffffff" fgColor="#000000" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-ui text-app-text">{i18n.t("auth.scan_qr")}</p>
                <p className="text-metadata text-app-text-tertiary">Settings &gt; Devices &gt; Link Desktop Device</p>
              </div>
              {qrPolling && (
                <div className="flex items-center gap-2 text-metadata text-app-accent">
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-app-border border-t-app-accent" /> {i18n.t("auth.waiting_for_scan")}
                </div>
              )}
              <button type="button" onClick={onQrLogin} className="quiet-control auth-secondary-action px-2">{i18n.t("auth.refresh_qr")}</button>
            </>
          )}
          <button type="button" onClick={onBack} className="quiet-control auth-secondary-action w-full">{i18n.t("auth.back_to_config")}</button>
        </div>
      )}
    </motion.div>
  );
}

interface AuthCodeStepProps {
  codeDelivery: CodeRequestResult | null;
  deliveryMessage: string;
  code: string;
  loading: boolean;
  resendWait: number;
  isMobile: boolean;
  onCodeChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  onOpenFragment: () => void;
  onResend: () => void;
  onUseQr: () => void;
  onChangePhone: () => void;
}

export function AuthCodeStep({
  codeDelivery,
  deliveryMessage,
  code,
  loading,
  resendWait,
  isMobile,
  onCodeChange,
  onSubmit,
  onOpenFragment,
  onResend,
  onUseQr,
  onChangePhone,
}: AuthCodeStepProps) {
  const { t } = useTranslation();
  return (
    <motion.form key="code" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} onSubmit={onSubmit} className="space-y-5">
      <div className="rounded-control border border-app-accent/20 bg-app-selected p-3 text-center">
        <p className="text-ui leading-relaxed text-app-text">{deliveryMessage}</p>
      </div>
      {codeDelivery?.fragmentUrl && (
        <button type="button" onClick={onOpenFragment} className="quiet-control auth-secondary-action w-full">
          {t('auth.open_fragment')} <ExternalLink className="h-4 w-4" />
        </button>
      )}
      {codeDelivery?.status === 'code_required' && (
        <div className="space-y-2">
          <label htmlFor="telegram-auth-code" className="auth-label">{t('auth.telegram_code')}</label>
          <div className="relative">
            <Key className="auth-input-icon" />
            <input
              id="telegram-auth-code"
              type="text"
              inputMode={codeDelivery.numericCode ? 'numeric' : 'text'}
              autoComplete="one-time-code"
              value={code}
              onChange={event => {
                const value = codeDelivery.numericCode ? event.target.value.replace(/\D/g, '') : event.target.value;
                onCodeChange(codeDelivery.codeLength ? value.slice(0, codeDelivery.codeLength) : value);
              }}
              maxLength={codeDelivery.codeLength}
              placeholder={codeDelivery.numericCode ? '1 2 3 4 5' : t('auth.code_word_placeholder')}
              autoFocus
              className={`auth-input pe-3 ps-10 text-center font-mono text-base ${codeDelivery.numericCode ? 'tracking-[0.4em]' : 'tracking-wide'}`}
            />
          </div>
        </div>
      )}
      <div className="flex flex-col gap-3">
        {codeDelivery?.status === 'code_required' && (
          <button type="submit" disabled={loading || !code} className="quiet-control auth-primary-action disabled:opacity-45">
            {loading ? t('auth.verifying') : t('auth.sign_in')}
          </button>
        )}
        {codeDelivery?.nextDelivery && codeDelivery.resendAfterSeconds !== undefined && (
          <button type="button" onClick={onResend} disabled={loading || resendWait > 0} className="quiet-control auth-secondary-action w-full disabled:opacity-45">
            {loading ? t('auth.resending') : resendWait > 0 ? t('auth.resend_in', { seconds: resendWait }) : t('auth.resend_code')}
          </button>
        )}
        {!isMobile && (
          <button type="button" onClick={onUseQr} className="quiet-control auth-secondary-action w-full"><QrCode className="h-4 w-4" /> {t('auth.use_qr_instead')}</button>
        )}
        <button type="button" onClick={onChangePhone} className="quiet-control auth-secondary-action w-full">{t('auth.change_phone')}</button>
      </div>
    </motion.form>
  );
}

interface AuthPasswordStepProps {
  password: string;
  loading: boolean;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  onBack: () => void;
}

export function AuthPasswordStep({ password, loading, onPasswordChange, onSubmit, onBack }: AuthPasswordStepProps) {
  return (
    <motion.form key="password" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-2">
        <div className="mb-4 rounded-control border border-app-accent/20 bg-app-selected p-3">
          <p className="text-center text-metadata text-app-accent">{i18n.t("auth.two_factor_enabled")}</p>
        </div>
        <label htmlFor="telegram-cloud-password" className="auth-label">{i18n.t("auth.cloud_password")}</label>
        <div className="relative">
          <Lock className="auth-input-icon" />
          <input id="telegram-cloud-password" type="password" value={password} onChange={event => onPasswordChange(event.target.value)} placeholder={i18n.t("auth.password_placeholder")} className="auth-input" autoFocus />
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <button type="submit" disabled={loading || !password} className="quiet-control auth-primary-action disabled:opacity-45">{loading ? 'Verifying...' : 'Unlock'}</button>
        <button type="button" onClick={onBack} className="quiet-control auth-secondary-action w-full">{i18n.t("auth.back_to_code")}</button>
      </div>
    </motion.form>
  );
}
