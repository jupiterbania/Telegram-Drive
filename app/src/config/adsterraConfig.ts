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
  /** Your Adsterra 300x250 Banner Script URL */
  bannerScriptUrl?: string;
  /** Your Adsterra Native / Social Bar Zone Script URL (optional) */
  socialBarScriptUrl?: string;
  /** Ad cooldown interval between impressions (in milliseconds) - Default: 15 mins */
  cooldownMs: number;
  /** Auto-dismiss countdown in seconds - Default: 10s */
  autoDismissSeconds: number;
}

export const ADSTERRA_CONFIG: AdsterraConfig = {
  // User's Active Adsterra Smartlink (Direct Link)
  directLinkUrl: 'https://www.profitableratecpmnetwork.com/jjf7657e3m?key=ce5513558127ef2ddb8280919a539411',
  // Adsterra 300x250 Banner Key
  bannerZoneKey: '9396e3814bf36c82b64a6ddc1c7538ea',
  bannerScriptUrl: 'https://www.highrevenueformat.com/9396e3814bf36c82b64a6ddc1c7538ea/invoke.js',
  cooldownMs: 15 * 60 * 1000,
  autoDismissSeconds: 10,
};
