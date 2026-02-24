/**
 * Synchronises document metadata (title, theme-color, OG tags, etc.)
 * with values from app-config.ts at runtime so index.html doesn't
 * need to contain hardcoded brand strings.
 */
import config from './app-config';

export function syncMetadata(): void {
  // Title
  document.title = `${config.appName} - Leer Arabisch`;

  // Helper to set or create a meta tag
  const setMeta = (selector: string, value: string, attr = 'content') => {
    const el = document.querySelector(selector) as HTMLMetaElement | null;
    if (el) {
      el.setAttribute(attr, value);
    }
  };

  // Standard meta
  setMeta('meta[name="theme-color"]', config.themeColor);
  setMeta('meta[name="author"]', config.appName);
  setMeta('meta[name="description"]', `${config.appName} (${config.appNameShort}) - Leer Arabisch met passie en toewijding.`);

  // Open Graph
  setMeta('meta[property="og:title"]', config.appName);
  setMeta('meta[property="og:description"]', `Leer Arabisch met passie en toewijding – ${config.appNameAr}`);

  // Twitter
  setMeta('meta[name="twitter:site"]', config.social.twitter || '');
}
