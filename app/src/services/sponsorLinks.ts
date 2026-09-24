import { open as openUrl } from '@tauri-apps/plugin-shell';
import { ADSTERRA_CONFIG } from '../config/adsterraConfig';

export type SponsorPlacement =
  | 'first_ad_gateway'
  | 'android_banner'
  | 'desktop_banner_fallback';

export const SPONSOR_URL = ADSTERRA_CONFIG.directLinkUrl;

export function sponsorUrlFor(placement: SponsorPlacement): string {
  const url = ADSTERRA_CONFIG.directLinkUrl;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}psid=${encodeURIComponent(placement)}`;
}

export function isSafeSponsorDestination(destination: string): boolean {
  try {
    const parsed = new URL(destination);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export async function openSponsorDestination(destination: string): Promise<boolean> {
  if (!isSafeSponsorDestination(destination)) return false;
  try {
    await openUrl(destination);
    return true;
  } catch {
    return false;
  }
}

export async function openSponsorLink(placement: SponsorPlacement): Promise<boolean> {
  return openSponsorDestination(sponsorUrlFor(placement));
}

