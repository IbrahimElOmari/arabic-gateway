/**
 * Cookie consent utilities.
 * Centralizes consent checking for analytics and other tracking.
 */

const COOKIE_CONSENT_KEY = 'hva-cookie-consent';

export type CookieConsentValue = 'accepted' | 'rejected' | null;

export function getCookieConsent(): CookieConsentValue {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(COOKIE_CONSENT_KEY) as CookieConsentValue;
}

/**
 * Returns true only if the user has explicitly accepted cookies (opt-in model).
 */
export function hasAnalyticsConsent(): boolean {
  return getCookieConsent() === 'accepted';
}
