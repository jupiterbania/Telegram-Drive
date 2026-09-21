import { open as openUrl } from '@tauri-apps/plugin-shell';

export type SponsorPlacement =
  | 'first_ad_gateway'
  | 'android_banner'
  | 'desktop_banner_fallback';

export const SPONSOR_URL =
  'https://www.effectivecpmnetwork.com/nk8qy01t0g?key=a6c132f628973ad13b326e57e4a92f40';

export function sponsorUrlFor(placement: SponsorPlacement): string {
  return `${SPONSOR_URL}&psid=${encodeURIComponent(placement)}`;
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

