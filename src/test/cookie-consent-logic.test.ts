import { describe, it, expect, beforeEach } from 'vitest';
import { getCookieConsent, hasAnalyticsConsent } from '@/lib/cookie-consent';

describe('cookie-consent logic', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('getCookieConsent returns null when empty', () => {
    expect(getCookieConsent()).toBeNull();
  });

  it('hasAnalyticsConsent returns false when no consent', () => {
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it('hasAnalyticsConsent returns true when accepted', () => {
    localStorage.setItem('hva-cookie-consent', 'accepted');
    expect(hasAnalyticsConsent()).toBe(true);
  });

  it('hasAnalyticsConsent returns false when rejected', () => {
    localStorage.setItem('hva-cookie-consent', 'rejected');
    expect(hasAnalyticsConsent()).toBe(false);
  });
});
