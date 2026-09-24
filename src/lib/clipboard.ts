/**
 * Cross-platform robust clipboard copy helper.
 * Supports both secure contexts (HTTPS/localhost) via navigator.clipboard
 * and non-secure LAN IP contexts (HTTP on local Wi-Fi, e.g. 10.x.x.x) via execCommand fallback.
 */

export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  // 1. Try modern Async Clipboard API
  if (typeof window !== 'undefined' && window.isSecureContext && navigator?.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('Async Clipboard API failed, attempting fallback...', err);
    }
  }

  // 2. Fallback for non-secure HTTP contexts (e.g. testing over local network IP on mobile)
  if (typeof document !== 'undefined') {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      textArea.style.opacity = '0';
      textArea.setAttribute('readonly', '');
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    } catch (err) {
      console.error('Fallback clipboard copy error:', err);
      return false;
    }
  }

  return false;
}
