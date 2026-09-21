import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Key,
  ShieldCheck,
  ShoppingBag,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ExternalLink,
  Tag,
  Flame,
  Clock,
  Lock,
  CreditCard,
  Check,
  User,
  Mail,
  ClipboardPaste,
  Zap,
  Gift,
} from 'lucide-react';
import { licenseManager, type LicenseInfo } from '../../services/licenseManager';
import { openExternalUrl } from '../../utils/url';
import { useTheme } from '../../context/ThemeContext';
import { checkEmailValidity } from '../../utils/emailValidation';

const LICENSE_API_BASE = 'https://tg-drive-license-service.jupiterbania472.workers.dev';

interface ActiveOfferInfo {
  id: string;
  title: string;
  badge?: string;
  description: string;
  discount_type?: string;
  discount_value?: number;
  original_price?: number;
  offer_price?: number;
  perks_list?: string[];
  coupon_code?: string;
  cta_text?: string;
  banner_style?: string;
  remaining_seconds?: number | null;
}

interface StoreConfigInfo {
  product_name?: string;
  price?: number;
  formatted_price?: string;
  currency?: string;
  buy_url?: string;
  features?: string[];
  trial_enabled?: boolean;
  trial_days?: number;
  trial_label?: string;
}

interface PaywallGateModalProps {
  isOpen: boolean;
  onActivated: (license: LicenseInfo) => void;
  purchaseUrl?: string;
}

const DEFAULT_PERKS = [
  '100% Ad-Free Cloud Vault',
  'Unlimited Cloud Storage & Max Speed',
  'Multi-Device Support (PC, Mac & Phone)',
  'Instant Key Delivery & PDF Supporter Certificate',
  'Lifetime Free Updates & Dedicated Support',
];

export const PaywallGateModal: React.FC<PaywallGateModalProps> = ({
  isOpen,
  onActivated,
  purchaseUrl = 'https://rzp.io/rzp/eBLEV0w',
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [activeTab, setActiveTab] = useState<'purchase' | 'activate'>('purchase');
  const [keyInput, setKeyInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const [storeConfig, setStoreConfig] = useState<StoreConfigInfo | null>(null);
  const [activeOffer, setActiveOffer] = useState<ActiveOfferInfo | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isFetchingStore, setIsFetchingStore] = useState(true);

  const [showCouponInput, setShowCouponInput] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountText: string;
    discountType?: string;
    discountValue?: number;
    discountedPrice?: number;
    originalPrice?: number;
    isReferral?: boolean;
  } | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  // Recipient form inputs for personalized certificate & key delivery
  const [customerName, setCustomerName] = useState(() => localStorage.getItem('tg_drive_checkout_name') || '');
  const [customerEmail, setCustomerEmail] = useState(() => localStorage.getItem('tg_drive_checkout_email') || '');
  const [emailSuggestion, setEmailSuggestion] = useState<string | null>(null);
  const [activatedTrialInfo, setActivatedTrialInfo] = useState<{
    key: string;
    email: string;
    days: number;
    license: LicenseInfo;
  } | null>(null);
  const [keyCopied, setKeyCopied] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [trialLoading, setTrialLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch live store settings & active offers dynamically from cloud worker
  const refreshStoreData = useCallback(async () => {
    try {
      setIsFetchingStore(true);
      const cacheBust = `_t=${Date.now()}`;
      
      const [configRes, offerRes] = await Promise.allSettled([
        fetch(`${LICENSE_API_BASE}/api/store/config?${cacheBust}`, { cache: 'no-store' }),
        fetch(`${LICENSE_API_BASE}/api/store/active-offer?${cacheBust}`, { cache: 'no-store' }),
      ]);

      let livePrice: number | undefined;
      if (configRes.status === 'fulfilled' && configRes.value.ok) {
        const configData = (await configRes.value.json()) as StoreConfigInfo;
        if (configData && configData.price !== undefined) {
          livePrice = configData.price;
          setStoreConfig(configData);
        }
      }

      if (offerRes.status === 'fulfilled' && offerRes.value.ok) {
        const offerData = (await offerRes.value.json()) as { active: boolean; offer: ActiveOfferInfo | null };
        if (offerData && offerData.active && offerData.offer) {
          // Recalculate offer_price based on the live admin price, not the stored original_price
          const base = livePrice ?? offerData.offer.original_price ?? 399;
          let computedOfferPrice = offerData.offer.offer_price;
          if (offerData.offer.discount_type === 'percent' && offerData.offer.discount_value) {
            computedOfferPrice = Math.max(1, Math.round(base * (1 - offerData.offer.discount_value / 100) * 100) / 100);
          } else if (offerData.offer.discount_type === 'flat' && offerData.offer.discount_value) {
            computedOfferPrice = Math.max(1, base - offerData.offer.discount_value);
          }
          setActiveOffer({
            ...offerData.offer,
            original_price: base,
            offer_price: computedOfferPrice,
          });
          if (typeof offerData.offer.remaining_seconds === 'number' && offerData.offer.remaining_seconds > 0) {
            setCountdown(offerData.offer.remaining_seconds);
          }
          // NOTE: Do NOT auto-apply coupon to appliedCoupon state.
          // Active offer discounts are shown via the offer banner already.
          // Coupons are a separate user-initiated action.
        } else {
          setActiveOffer(null);
        }
      }
    } catch {
      // Graceful fallback to cached state
    } finally {
      setIsFetchingStore(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    void refreshStoreData();

    // Re-sync store data when user switches back to this window/app
    const handleFocus = () => {
      void refreshStoreData();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isOpen, refreshStoreData]);

  // Real-time ticking countdown for flash deals
  useEffect(() => {
    if (countdown === null || countdown <= 0) return;
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev && prev > 1) {
          return prev - 1;
        }
        void refreshStoreData();
        return 0;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [countdown, refreshStoreData]);

  const formatCountdown = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  // Auto-format key with TGDRV prefix and clean hyphens
  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    if (!val.startsWith('TGDRV') && val.length > 0 && !val.includes('-')) {
      val = 'TGDRV-' + val;
    }
    setKeyInput(val);
    if (errorMessage) setErrorMessage(null);
  };

  const handlePasteKey = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        let clean = text.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
        if (!clean.startsWith('TGDRV') && clean.length >= 10 && !clean.includes('-')) {
          clean = 'TGDRV-' + clean;
        }
        setKeyInput(clean);
      }
    } catch {
      // Clipboard access not available
    }
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyInput.trim()) {
      setErrorMessage('Please enter a valid license key.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const result = await licenseManager.activateLicense(keyInput.trim());
      if (result.success && result.license) {
        setSuccessMessage('License verified & activated successfully! Welcome to TG Drive Pro.');
        setTimeout(() => {
          onActivated(result.license!);
        }, 1200);
      } else {
        setErrorMessage(result.message || 'Invalid license key. Please check and try again.');
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error connecting to license server.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = couponCode.trim().toUpperCase();
    if (!cleanCode) return;

    setValidatingCoupon(true);
    setCouponError(null);

    try {
      const res = await fetch(
        `${LICENSE_API_BASE}/api/store/validate-coupon?code=${encodeURIComponent(cleanCode)}&_t=${Date.now()}`,
        { cache: 'no-store' }
      );
      
      const data = (await res.json()) as {
        valid: boolean;
        code?: string;
        is_referral?: boolean;
        discount_text?: string;
        discount_type?: string;
        discount_value?: number;
        original_price?: number;
        new_price?: number;
        error?: string;
      };

      if (data.valid) {
        setAppliedCoupon({
          code: data.code || cleanCode,
          discountText: data.discount_text || (data.is_referral ? 'Referral Discount Applied' : 'Discount Applied'),
          discountType: data.discount_type,
          discountValue: data.discount_value,
          discountedPrice: data.new_price,
          originalPrice: data.original_price,
          isReferral: Boolean(data.is_referral),
        });
        setCouponError(null);
        setShowCouponInput(false);
      } else {
        setAppliedCoupon(null);
        setCouponError(data.error || 'Invalid or expired referral or coupon code.');
      }
    } catch {
      setAppliedCoupon(null);
      setCouponError('Unable to validate coupon. Please check connection and try again.');
    } finally {
      setValidatingCoupon(false);
    }
  };

  const validateFormInputs = () => {
    const cleanName = customerName.trim();
    if (!cleanName) {
      setFormError('Please enter your Full Name.');
      return false;
    }

    const emailCheck = checkEmailValidity(customerEmail);
    if (!emailCheck.isValid) {
      setFormError(emailCheck.error || 'Please enter a valid Email Address.');
      return false;
    }

    if (emailCheck.suggestedCorrection) {
      setEmailSuggestion(emailCheck.suggestedCorrection);
    }

    const cleanEmail = customerEmail.trim().toLowerCase();
    try {
      localStorage.setItem('tg_drive_checkout_name', cleanName);
      localStorage.setItem('tg_drive_checkout_email', cleanEmail);
    } catch {
      // Ignored
    }

    return true;
  };

  const handleClaimTrial = async () => {
    setFormError(null);
    if (!validateFormInputs()) {
      scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setTrialLoading(true);
    try {
      const result = await licenseManager.claimFreeTrial(customerName.trim(), customerEmail.trim());
      if (result.success && result.license && result.license.licenseKey) {
        setActivatedTrialInfo({
          key: result.license.licenseKey,
          email: customerEmail.trim().toLowerCase(),
          days: exactTrialDays,
          license: result.license,
        });
      } else {
        setFormError(result.message || 'Unable to claim free trial. Please check details.');
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error claiming free trial.');
    } finally {
      setTrialLoading(false);
    }
  };

  const handleBuyClick = async (e: React.MouseEvent | React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!validateFormInputs()) {
      scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const cleanName = customerName.trim();
    const cleanEmail = customerEmail.trim().toLowerCase();

    setCheckoutLoading(true);

    try {
      const res = await fetch(`${LICENSE_API_BASE}/api/store/create-checkout-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
          coupon_code: appliedCoupon?.code || activeOffer?.coupon_code || '',
          referral_code: appliedCoupon?.code || '',
        }),
      });

      const data = (await res.json()) as { success?: boolean; payment_url?: string; error?: string };

      if (res.ok && data.payment_url) {
        void openExternalUrl(data.payment_url);
      } else {
        const targetUrl = storeConfig?.buy_url || purchaseUrl;
        const separator = targetUrl.includes('?') ? '&' : '?';
        const urlWithPrefill = `${targetUrl}${separator}prefill[name]=${encodeURIComponent(cleanName)}&prefill[email]=${encodeURIComponent(cleanEmail)}`;
        void openExternalUrl(urlWithPrefill);
      }
    } catch {
      const targetUrl = storeConfig?.buy_url || purchaseUrl;
      const separator = targetUrl.includes('?') ? '&' : '?';
      const urlWithPrefill = `${targetUrl}${separator}prefill[name]=${encodeURIComponent(cleanName)}&prefill[email]=${encodeURIComponent(cleanEmail)}`;
      void openExternalUrl(urlWithPrefill);
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Base price computation — always use live admin price as the source of truth
  const basePrice = Math.round(storeConfig?.price !== undefined ? storeConfig.price : 399);

  // 1. Calculate price after active Special Offer
  let priceAfterOffer = basePrice;
  let offerBadge: string | null = null;

  if (activeOffer) {
    if (activeOffer.discount_type === 'percent' && activeOffer.discount_value) {
      priceAfterOffer = Math.max(1, Math.round(basePrice * (1 - activeOffer.discount_value / 100)));
      offerBadge = `${activeOffer.discount_value}% OFF`;
    } else if ((activeOffer.discount_type === 'flat' || activeOffer.discount_type === 'fixed') && activeOffer.discount_value) {
      priceAfterOffer = Math.max(1, basePrice - activeOffer.discount_value);
      offerBadge = `₹${Math.round(activeOffer.discount_value)} OFF`;
    } else if (activeOffer.offer_price !== undefined && activeOffer.offer_price > 0 && activeOffer.offer_price < basePrice) {
      priceAfterOffer = Math.round(activeOffer.offer_price);
      offerBadge = activeOffer.badge || 'SPECIAL DEAL';
    }
  }

  // 2. Calculate stacked price if a coupon is also applied on top of the offer
  let finalPrice = priceAfterOffer;
  let couponBadge: string | null = null;

  if (appliedCoupon) {
    if (appliedCoupon.discountType === 'percent' && appliedCoupon.discountValue) {
      finalPrice = Math.max(1, Math.round(priceAfterOffer * (1 - appliedCoupon.discountValue / 100)));
      couponBadge = `${appliedCoupon.discountValue}% COUPON`;
    } else if (appliedCoupon.discountType === 'fixed' && appliedCoupon.discountValue) {
      finalPrice = Math.max(1, priceAfterOffer - appliedCoupon.discountValue);
      couponBadge = `₹${Math.round(appliedCoupon.discountValue)} COUPON`;
    } else if (appliedCoupon.discountedPrice !== undefined) {
      finalPrice = Math.round(appliedCoupon.discountedPrice);
      couponBadge = appliedCoupon.discountText;
    }
  }

  const currentPrice = Math.round(finalPrice);
  const hasDiscount = currentPrice < basePrice;
  const originalStrikePrice = hasDiscount ? basePrice : null;

  // Combine badges if both offer & coupon are active
  let discountBadgeText: string | null = null;
  if (offerBadge && couponBadge) {
    discountBadgeText = `${offerBadge} + ${couponBadge}`;
  } else if (couponBadge) {
    discountBadgeText = couponBadge;
  } else if (offerBadge) {
    discountBadgeText = offerBadge;
  }

  // Pure integer formatting without .00 / .50 / decimals
  const finalFormattedPrice = `₹${currentPrice}`;

  // Formatter for clean single-line offer discount %
  const getOfferDiscountText = (offer: ActiveOfferInfo): string => {
    if (offer.discount_value && offer.discount_type === 'percent') {
      return `${offer.discount_value}% OFF`;
    }
    if (offer.discount_value && (offer.discount_type === 'flat' || offer.discount_type === 'fixed')) {
      return `₹${offer.discount_value} OFF`;
    }
    if (offer.badge) {
      const match = offer.badge.match(/\d+%/);
      if (match) {
        return `${match[0]} OFF`;
      }
      return offer.badge;
    }
    if (offer.original_price && offer.offer_price && offer.original_price > offer.offer_price) {
      const pct = Math.round(((offer.original_price - offer.offer_price) / offer.original_price) * 100);
      if (pct > 0) {
        return `${pct}% OFF`;
      }
    }
    return '';
  };

  // Display perks from active offer, store config, or standard defaults
  const perksToDisplay = (activeOffer?.perks_list && activeOffer.perks_list.length > 0)
    ? activeOffer.perks_list
    : (storeConfig?.features && storeConfig.features.length > 0)
    ? storeConfig.features
    : DEFAULT_PERKS;

  const exactTrialDays = storeConfig?.trial_days || 30;
  const isTrialAvailable = storeConfig?.trial_enabled !== false;
  const trialLabel = storeConfig?.trial_label || `${exactTrialDays}-Day Free Trial`;

  return (
    <div ref={scrollContainerRef} className={`fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 backdrop-blur-md animate-fade-in overflow-y-auto ${
      isLight ? 'bg-slate-900/40' : 'bg-black/85'
    }`}>
      <div className={`relative w-full max-w-md overflow-hidden rounded-3xl border p-4 sm:p-5 shadow-2xl my-auto transition-colors ${
        isLight
          ? 'bg-white/95 border-slate-200 text-slate-900 shadow-slate-300/60'
          : 'bg-slate-950/95 border-cyan-500/25 text-slate-100 shadow-cyan-500/10'
      }`}>
        
        {/* Ambient Radial Glow */}
        <div className={`pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 h-44 w-72 rounded-full blur-3xl ${
          isLight ? 'bg-cyan-500/10' : 'bg-cyan-500/15'
        }`} />
        <div className={`pointer-events-none absolute -bottom-20 right-0 h-44 w-44 rounded-full blur-3xl ${
          isLight ? 'bg-blue-600/5' : 'bg-blue-600/10'
        }`} />

        {/* 1. Header with Official App Branding */}
        <div className="relative flex flex-col items-center text-center mb-3">
          <div className={`relative mb-2 flex h-12 w-12 items-center justify-center rounded-2xl border p-2 shadow-lg ring-4 ${
            isLight
              ? 'bg-gradient-to-b from-slate-50 to-slate-100 border-slate-200 ring-slate-100 shadow-slate-200'
              : 'bg-gradient-to-b from-slate-900 to-slate-950 border-cyan-500/30 ring-cyan-500/5 shadow-cyan-500/20'
          }`}>
            <img
              src="/inapp_logo.png"
              alt="Telegram Drive Logo"
              className="h-full w-full object-contain drop-shadow-md"
            />
          </div>
          
          <div className="flex items-center gap-1.5">
            <h2 className={`text-lg font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Telegram Drive Pro
            </h2>
            <span className={`px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider rounded-full border ${
              isLight
                ? 'bg-cyan-50 text-cyan-700 border-cyan-200'
                : 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border-cyan-500/30'
            }`}>
              LIFETIME
            </span>
          </div>

          <p className={`text-[11px] mt-0.5 max-w-xs leading-relaxed ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            Unlock unlimited cloud storage with zero ads, maximum speed and multi-device sync.
          </p>
        </div>

        {/* 2. Segmented Tabs */}
        <div className={`relative mb-3 grid grid-cols-2 rounded-xl p-1 border shadow-inner ${
          isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-900/90 border-slate-800/90'
        }`}>
          <button
            type="button"
            onClick={() => setActiveTab('purchase')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'purchase'
                ? 'bg-gradient-to-r from-cyan-500 to-cyan-400 text-slate-950 shadow-md shadow-cyan-500/20 font-extrabold'
                : isLight
                ? 'text-slate-600 hover:text-slate-900 font-medium'
                : 'text-slate-400 hover:text-white font-medium'
            }`}
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            <span>Get License</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('activate')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'activate'
                ? 'bg-gradient-to-r from-cyan-500 to-cyan-400 text-slate-950 shadow-md shadow-cyan-500/20 font-extrabold'
                : isLight
                ? 'text-slate-600 hover:text-slate-900 font-medium'
                : 'text-slate-400 hover:text-white font-medium'
            }`}
          >
            <Key className="h-3.5 w-3.5" />
            <span>Activate Key</span>
          </button>
        </div>

        {/* ========================================================= */}
        {/* TAB 1: STRUCTURED PURCHASE & FREE TRIAL VIEW              */}
        {/* ========================================================= */}
        {activeTab === 'purchase' && (
          activatedTrialInfo ? (
            <div className="space-y-3.5 py-3 animate-fade-in text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="h-8 w-8 stroke-[2.5]" />
              </div>

              <div>
                <h3 className={`text-base font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Free Trial Activated!
                </h3>
                <p className={`text-xs mt-0.5 leading-relaxed ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  Full Pro Access is now unlocked on your device for {activatedTrialInfo.days} days.
                </p>
              </div>

              {/* On-screen Key Backup Card */}
              <div className={`rounded-2xl border p-3.5 text-left space-y-2.5 shadow-sm ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/80 border-slate-800'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                    isLight ? 'text-slate-700' : 'text-slate-200'
                  }`}>
                    <Key className="h-3.5 w-3.5 text-cyan-500" />
                    <span>Your Trial License Key</span>
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isLight ? 'bg-cyan-50 border-cyan-200 text-cyan-700' : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
                  }`}>
                    {activatedTrialInfo.days} Days
                  </span>
                </div>

                <div className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border font-mono text-sm font-black tracking-wider shadow-inner ${
                  isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-cyan-400'
                }`}>
                  <span className="truncate">{activatedTrialInfo.key}</span>
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard.writeText(activatedTrialInfo.key);
                      setKeyCopied(true);
                      setTimeout(() => setKeyCopied(false), 2000);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer shadow-sm"
                  >
                    {keyCopied ? (
                      <>
                        <Check className="h-3 w-3" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <span>Copy</span>
                    )}
                  </button>
                </div>

                <p className={`text-[11px] leading-relaxed ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  A backup PDF Certificate & activation key have also been emailed to <strong>{activatedTrialInfo.email}</strong>.
                </p>
              </div>

              {/* Continue to Pro CTA */}
              <button
                type="button"
                onClick={() => onActivated(activatedTrialInfo.license)}
                className="w-full rounded-xl bg-gradient-to-r from-cyan-400 via-cyan-500 to-blue-500 hover:from-cyan-300 hover:via-cyan-400 hover:to-blue-400 py-3 text-sm font-extrabold text-slate-950 shadow-lg shadow-cyan-500/25 transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Continue to TG Drive Pro</span>
                <span>&rarr;</span>
              </button>
            </div>
          ) : (
          <div className="space-y-3 animate-fade-in">
            
            {/* 1. LICENSE DELIVERY INFO (FIRST SECTION) */}
            <div className={`rounded-2xl border p-3.5 space-y-2.5 shadow-sm transition-colors ${
              isLight
                ? 'bg-slate-50/90 border-slate-200'
                : 'bg-slate-900/60 border-slate-800/90 backdrop-blur-sm'
            }`}>
              <div className={`flex items-center justify-between pb-1 border-b ${
                isLight ? 'border-slate-200' : 'border-slate-800/60'
              }`}>
                <span className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                  isLight ? 'text-slate-700' : 'text-slate-200'
                }`}>
                  <User className="h-3.5 w-3.5 text-cyan-500" />
                  <span>Delivery Info (Required)</span>
                </span>
                <span className={`text-[10px] font-semibold flex items-center gap-1 px-2 py-0.5 rounded-full border ${
                  isLight
                    ? 'bg-cyan-50 border-cyan-200 text-cyan-700'
                    : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
                }`}>
                  <Zap className="h-2.5 w-2.5" />
                  <span>Instant Delivery</span>
                </span>
              </div>

              {/* Full Name Input */}
              <div>
                <label className={`block text-[11px] font-medium mb-1 ${
                  isLight ? 'text-slate-600' : 'text-slate-300'
                }`}>
                  Full Name <span className="text-slate-400 text-[10px] font-normal">(Printed on Certificate & License)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400">
                    <User className="h-3.5 w-3.5" />
                  </span>
                  <input
                    type="text"
                    value={customerName}
                    onChange={e => {
                      setCustomerName(e.target.value);
                      if (formError) setFormError(null);
                    }}
                    placeholder="Enter your full name"
                    className={`w-full pl-9 pr-3 py-2 rounded-xl border text-xs font-medium focus:outline-none focus:ring-1 transition-all shadow-inner ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-cyan-500 focus:ring-cyan-500/20'
                        : 'bg-slate-950 border-slate-700/80 text-white placeholder-slate-500 focus:border-cyan-400 focus:ring-cyan-500/20'
                    }`}
                  />
                </div>
              </div>

              {/* Email Address Input */}
              <div>
                <label className={`block text-[11px] font-medium mb-1 ${
                  isLight ? 'text-slate-600' : 'text-slate-300'
                }`}>
                  Email Address <span className="text-slate-400 text-[10px] font-normal">(Where Trial / Lifetime Key & PDF are sent)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400">
                    <Mail className="h-3.5 w-3.5" />
                  </span>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={e => {
                      const val = e.target.value;
                      setCustomerEmail(val);
                      if (formError) setFormError(null);
                      if (val.includes('@') && val.includes('.')) {
                        const check = checkEmailValidity(val);
                        setEmailSuggestion(check.suggestedCorrection || null);
                      } else {
                        setEmailSuggestion(null);
                      }
                    }}
                    placeholder="name@example.com"
                    className={`w-full pl-9 pr-3 py-2 rounded-xl border text-xs font-medium focus:outline-none focus:ring-1 transition-all shadow-inner ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-cyan-500 focus:ring-cyan-500/20'
                        : 'bg-slate-950 border-slate-700/80 text-white placeholder-slate-500 focus:border-cyan-400 focus:ring-cyan-500/20'
                    }`}
                  />
                </div>
                {emailSuggestion && (
                  <div className="mt-1.5 flex items-center justify-between text-[11px] p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 animate-fade-in">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">Did you mean <strong>{emailSuggestion}</strong>?</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomerEmail(emailSuggestion);
                        setEmailSuggestion(null);
                        if (formError) setFormError(null);
                      }}
                      className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-bold text-[10px] hover:bg-amber-400 transition-colors shrink-0 ml-2 cursor-pointer"
                    >
                      Fix it
                    </button>
                  </div>
                )}
              </div>

              {formError && (
                <div className="flex items-center gap-1.5 text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl animate-fade-in">
                  <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {successMessage && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl animate-fade-in">
                  <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />
                  <span>{successMessage}</span>
                </div>
              )}
            </div>

            {/* 2. LIFETIME ACCESS / FLASH SALE (SECOND SECTION) */}
            <div className={`rounded-2xl border p-3.5 space-y-3 shadow-sm transition-colors ${
              isLight
                ? 'bg-slate-50/90 border-slate-200'
                : 'bg-slate-900/60 border-slate-800/90 backdrop-blur-sm'
            }`}>
              
              {/* Active Flash Offer Banner: Smooth left-right ticker animation */}
              {activeOffer && (
                <div className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border shadow-sm ${
                  isLight
                    ? 'bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-amber-500/10 border-amber-300/80 text-amber-900'
                    : 'bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border-amber-500/35 text-amber-200'
                }`}>
                  <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                    <Flame className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 animate-pulse" />
                    <div className="overflow-hidden whitespace-nowrap flex-1 relative max-w-[170px] sm:max-w-[210px]">
                      <span className="animate-ticker-bounce text-xs font-bold inline-block">
                        {activeOffer.title}
                      </span>
                    </div>
                    {getOfferDiscountText(activeOffer) && (
                      <span className="px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded bg-amber-500 text-slate-950 flex-shrink-0 shadow-sm whitespace-nowrap">
                        {getOfferDiscountText(activeOffer)}
                      </span>
                    )}
                  </div>

                  {countdown !== null && countdown > 0 && (
                    <div className={`flex items-center gap-1 text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg border flex-shrink-0 shadow-inner whitespace-nowrap ${
                      isLight
                        ? 'bg-white/90 text-amber-800 border-amber-300'
                        : 'text-amber-300 bg-slate-950/80 border-amber-500/30'
                    }`}>
                      <Clock className="h-3 w-3 text-amber-500 flex-shrink-0" />
                      <span>{formatCountdown(countdown)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Price Row */}
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-sm font-extrabold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      Lifetime Access
                    </span>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  </div>
                  <span className={`block text-[11px] mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    One-time payment • No recurring fees
                  </span>
                </div>

                <div className="text-right flex flex-col items-end">
                  <div className="flex items-baseline justify-end gap-1.5">
                    {hasDiscount && originalStrikePrice && (
                      <span className={`text-xs line-through font-mono ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                        ₹{Math.round(originalStrikePrice)}
                      </span>
                    )}
                    <span className={`text-2xl font-black font-mono tracking-tight drop-shadow-sm ${
                      isLight ? 'text-cyan-600' : 'text-cyan-400'
                    }`}>
                      {isFetchingStore && !storeConfig ? (
                        <span className={`inline-block h-6 w-20 animate-pulse rounded ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`} />
                      ) : (
                        finalFormattedPrice
                      )}
                    </span>
                  </div>

                  {/* Strictly Single-Line Discount Badge */}
                  {discountBadgeText && (
                    <div className="flex justify-end mt-0.5 max-w-full">
                      <span className={`inline-flex items-center whitespace-nowrap px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wider rounded border shadow-xs ${
                        isLight
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                      }`}>
                        {discountBadgeText}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Dynamic Perks Checklist */}
              <div className={`pt-2 border-t space-y-1.5 text-xs ${
                isLight ? 'border-slate-200 text-slate-700' : 'border-slate-800/70 text-slate-300'
              }`}>
                {perksToDisplay.map((perk, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="flex h-4 w-4 items-center justify-center rounded-full bg-cyan-500/15 text-cyan-500 flex-shrink-0">
                      <Check className="h-2.5 w-2.5 stroke-[3]" />
                    </div>
                    <span className={`font-medium text-xs ${isLight ? 'text-slate-700' : 'text-slate-200'}`}>{perk}</span>
                  </div>
                ))}
              </div>

              {/* Promo Code / Coupon Section */}
              <div className={`pt-2 border-t ${isLight ? 'border-slate-200' : 'border-slate-800/70'}`}>
                {!appliedCoupon ? (
                  <div>
                    {!showCouponInput ? (
                      <button
                        type="button"
                        onClick={() => setShowCouponInput(true)}
                        className="text-[11px] text-cyan-500 hover:text-cyan-600 dark:text-cyan-400/90 dark:hover:text-cyan-300 font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Tag className="h-3.5 w-3.5" />
                        <span>Have a Referral Code or Coupon? Apply here</span>
                      </button>
                    ) : (
                      <form onSubmit={handleApplyCoupon} className="flex items-center gap-2 mt-1">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            value={couponCode}
                            onChange={e => setCouponCode(e.target.value.toUpperCase())}
                            placeholder="ENTER REFERRAL OR PROMO CODE"
                            autoFocus
                            className={`w-full px-3 py-1.5 rounded-lg border text-xs font-mono font-bold uppercase focus:outline-none transition-all shadow-inner ${
                              isLight
                                ? 'bg-white border-slate-300 text-cyan-700 placeholder-slate-400 focus:border-cyan-500'
                                : 'bg-slate-950 border-slate-700 text-cyan-300 placeholder-slate-600 focus:border-cyan-400'
                            }`}
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={validatingCoupon || !couponCode.trim()}
                          className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-cyan-500/15 disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                        >
                          {validatingCoupon ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin" />
                              <span>...</span>
                            </>
                          ) : (
                            <span>Apply</span>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowCouponInput(false);
                            setCouponError(null);
                          }}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xs p-1 cursor-pointer"
                        >
                          ✕
                        </button>
                      </form>
                    )}
                    {couponError && (
                      <p className="text-[11px] text-rose-500 mt-1.5 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 flex-shrink-0" />
                        <span>{couponError}</span>
                      </p>
                    )}
                  </div>
                ) : (
                  <div className={`flex items-center justify-between text-xs px-3 py-2 rounded-xl border ${
                    appliedCoupon.isReferral
                      ? isLight ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                  }`}>
                    <div className="flex items-center gap-2">
                      <Tag className="h-3.5 w-3.5 text-emerald-500" />
                      <div>
                        <span className={`font-bold font-mono ${isLight ? 'text-emerald-800' : 'text-emerald-300'}`}>
                          {appliedCoupon.code}
                        </span>
                        <span className="text-[11px] opacity-90 ml-1.5">
                          ({appliedCoupon.discountText})
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAppliedCoupon(null);
                        setCouponCode('');
                      }}
                      className="text-[11px] text-slate-400 hover:text-rose-500 underline ml-2 shrink-0 cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* CTA 1: PROCEED TO PAYMENT (LIFETIME PRO) */}
            <button
              onClick={handleBuyClick}
              disabled={checkoutLoading || trialLoading}
              className="w-full rounded-xl bg-gradient-to-r from-cyan-400 via-cyan-500 to-blue-500 hover:from-cyan-300 hover:via-cyan-400 hover:to-blue-400 py-3 text-sm font-extrabold text-slate-950 shadow-lg shadow-cyan-500/25 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {checkoutLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
                  <span>Preparing Secure Checkout...</span>
                </>
              ) : (
                <>
                  <span>Proceed to Payment ({finalFormattedPrice})</span>
                  <ExternalLink className="h-4 w-4 text-slate-950" />
                </>
              )}
            </button>

            {/* CTA 2: FREE TRIAL CLAIM OPTION (Strictly Exact Admin Duration) */}
            {isTrialAvailable && (
              <div className={`rounded-2xl border p-3 space-y-2 transition-colors ${
                isLight
                  ? 'border-purple-200 bg-purple-50/80 text-purple-900'
                  : 'border-purple-500/30 bg-purple-500/10 text-purple-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-left">
                    <Gift className="h-4 w-4 text-purple-500 flex-shrink-0" />
                    <div>
                      <span className={`text-xs font-bold ${isLight ? 'text-purple-900' : 'text-purple-200'}`}>
                        {trialLabel}
                      </span>
                      <span className={`block text-[10px] ${isLight ? 'text-purple-700/80' : 'text-purple-300/80'}`}>
                        Zero cost • No credit card • Key & Certificate sent to email
                      </span>
                    </div>
                  </div>
                </div>

                {formError && (
                  <div className="flex items-center gap-1.5 text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl animate-fade-in">
                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleClaimTrial}
                  disabled={trialLoading || checkoutLoading}
                  className="w-full rounded-xl bg-purple-600 hover:bg-purple-500 py-2.5 text-xs font-bold text-white shadow-md shadow-purple-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  {trialLoading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Activating Free Trial...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="h-3.5 w-3.5" />
                      <span>Start {trialLabel}</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Security Footnote */}
            <div className="flex items-center justify-center gap-3 text-[11px] text-slate-400 pt-0.5">
              <span className="flex items-center gap-1">
                <Lock className="h-3 w-3" />
                <span>256-Bit SSL Encrypted</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <CreditCard className="h-3 w-3" />
                <span>UPI, Cards & NetBanking</span>
              </span>
            </div>

            {/* Bottom Switcher */}
            <div className="text-center pt-0.5 space-y-2">
              <button
                type="button"
                onClick={() => setActiveTab('activate')}
                className={`text-xs transition-colors inline-flex items-center gap-1 cursor-pointer ${
                  isLight ? 'text-slate-500 hover:text-cyan-600' : 'text-slate-400 hover:text-cyan-400'
                }`}
              >
                <span>Already have a key?</span>
                <span className="font-semibold text-cyan-500 underline">Activate here &rarr;</span>
              </button>

              <div>
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent('open-referral-modal'))}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all cursor-pointer shadow-xs"
                >
                  <span>🤝</span>
                  <span>Refer & Earn Real Cash (Earn ₹50/sale)</span>
                  <span>&rarr;</span>
                </button>
              </div>
            </div>
          </div>
          )
        )}

        {/* ========================================================= */}
        {/* TAB 2: CLEAN LICENSE ACTIVATION VIEW                      */}
        {/* ========================================================= */}
        {activeTab === 'activate' && (
          <form onSubmit={handleActivate} className="space-y-3.5 animate-fade-in">
            <div className={`rounded-2xl border p-3.5 space-y-3 shadow-sm transition-colors ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
            }`}>
              <div className="flex items-center justify-between">
                <label className={`block text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  Enter your 16-character license key:
                </label>
                <button
                  type="button"
                  onClick={handlePasteKey}
                  className="text-[11px] text-cyan-500 hover:text-cyan-600 dark:text-cyan-400 dark:hover:text-cyan-300 font-medium inline-flex items-center gap-1 transition-colors"
                >
                  <ClipboardPaste className="h-3 w-3" />
                  <span>Paste Key</span>
                </button>
              </div>
              
              <div className="relative">
                <input
                  type="text"
                  value={keyInput}
                  onChange={handleKeyChange}
                  placeholder="TGDRV-XXXX-XXXX-XXXX"
                  maxLength={22}
                  disabled={loading}
                  className={`w-full rounded-xl border px-4 py-3 font-mono text-sm font-bold tracking-widest shadow-inner focus:outline-none focus:ring-1 transition-all disabled:opacity-50 ${
                    isLight
                      ? 'bg-white border-slate-300 text-cyan-700 placeholder-slate-400 focus:border-cyan-500 focus:ring-cyan-500/20'
                      : 'bg-slate-950 border-slate-700 text-cyan-400 placeholder-slate-600 focus:border-cyan-400 focus:ring-cyan-500/20'
                  }`}
                />
                <Key className="absolute right-3.5 top-3.5 h-4 w-4 text-slate-400" />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span>Sent to your email after purchase / trial</span>
                <button
                  type="button"
                  onClick={() => void openExternalUrl(`${LICENSE_API_BASE}/recover`)}
                  className="text-cyan-500 hover:underline font-medium inline-flex items-center gap-1"
                >
                  <span>Recover Key via OTP</span>
                  <ExternalLink className="h-2.5 w-2.5" />
                </button>
              </div>
            </div>

            {/* Error / Success Feedback */}
            {errorMessage && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-500">
                <AlertCircle className="h-4 w-4 flex-shrink-0 text-rose-500" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-500">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-500" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Activate Button */}
            <button
              type="submit"
              disabled={loading || !keyInput.trim()}
              className="w-full rounded-xl bg-gradient-to-r from-cyan-400 via-cyan-500 to-blue-500 hover:from-cyan-300 hover:via-cyan-400 hover:to-blue-400 py-3 text-sm font-extrabold text-slate-950 shadow-lg shadow-cyan-500/25 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Validating Key...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  <span>Activate License</span>
                </>
              )}
            </button>

            {/* Bottom Switcher */}
            <div className="text-center pt-0.5">
              <button
                type="button"
                onClick={() => setActiveTab('purchase')}
                className={`text-xs transition-colors inline-flex items-center gap-1 ${
                  isLight ? 'text-slate-500 hover:text-cyan-600' : 'text-slate-400 hover:text-cyan-400'
                }`}
              >
                <span>Don't have a key?</span>
                <span className="font-semibold text-cyan-500 underline">Get License &rarr;</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
