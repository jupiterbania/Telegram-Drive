import { openUrl } from '@tauri-apps/plugin-opener';
import { open } from '@tauri-apps/plugin-shell';

/**
 * Opens an external web URL using the system default browser (e.g. Chrome on Android).
 *
 * Uses `@tauri-apps/plugin-opener` first (which invokes Android's native Intent.ACTION_VIEW with OpenArgs),
 * then falls back to `@tauri-apps/plugin-shell`'s `open`,
 * and finally to `window.open` if running in a web context or test environment.
 */
export async function openExternalUrl(url: string | URL): Promise<boolean> {
  const target = typeof url === 'string' ? url.trim() : url.toString().trim();
  if (!target) return false;

  try {
    await openUrl(target);
    return true;
  } catch (openerErr) {
    console.warn('[openExternalUrl] plugin-opener failed, trying plugin-shell:', openerErr);
    try {
      await open(target);
      return true;
    } catch (shellErr) {
      console.warn('[openExternalUrl] plugin-shell failed, trying window.open:', shellErr);
      try {
        if (typeof window !== 'undefined') {
          const win = window.open(target, '_blank', 'noopener,noreferrer');
          return win !== null;
        }
      } catch (winErr) {
        console.error('[openExternalUrl] All fallback methods failed:', winErr);
      }
      return false;
    }
  }
}
