/**
 * Adsterra Monetization & Ad Network Configuration
 * 
 * Replace the values below with your personal Adsterra Publisher account keys
 * or configure them in Cloudflare Worker for dynamic over-the-air updates.
 */

export interface AdsterraConfig {
  /** Your Adsterra Direct Link (Smartlink) URL */
  directLinkUrl: string;
  /** Your Adsterra 300x250 Banner Zone Key */
  bannerZoneKey: string;
  /** Your Adsterra Native / Social Bar Zone Script URL (optional) */
  socialBarScriptUrl?: string;
  /** Ad cooldown interval between impressions (in milliseconds) - Default: 15 mins */
  cooldownMs: number;
  /** Auto-dismiss countdown in seconds - Default: 10s */
  autoDismissSeconds: number;
}

export const ADSTERRA_CONFIG: AdsterraConfig = {
  // Replace this with your Adsterra Direct Link
  directLinkUrl: 'https://www.effectivecpmnetwork.com/nk8qy01t0g?key=a6c132f628973ad13b326e57e4a92f40',
  // Replace this with your Adsterra Banner Key
  bannerZoneKey: '9cf449272b7e1c83054b82b7639c6029',
  cooldownMs: 15 * 60 * 1000,
  autoDismissSeconds: 10,
};
