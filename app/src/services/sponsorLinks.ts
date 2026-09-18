export type SponsorPlacement =
  | 'first_ad_gateway'
  | 'android_banner'
  | 'desktop_banner_fallback';

export const SPONSOR_URL = '';

export function sponsorUrlFor(_placement: SponsorPlacement): string {
  return '';
}

export function isSafeSponsorDestination(_destination: string): boolean {
  return false;
}

export async function openSponsorDestination(_destination: string): Promise<boolean> {
  return false;
}

export async function openSponsorLink(_placement: SponsorPlacement): Promise<boolean> {
  return false;
}
