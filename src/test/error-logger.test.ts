import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock cookie consent
vi.mock('@/lib/cookie-consent', () => ({
  hasAnalyticsConsent: vi.fn(() => true),
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(() => Promise.resolve({ data: null, error: null })),
    },
  },
}));

import { logError } from '@/lib/error-logger';
import { hasAnalyticsConsent } from '@/lib/cookie-consent';
import { supabase } from '@/integrations/supabase/client';

describe('logError', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset rate limiter by mocking Date.now
    vi.useFakeTimers();
  });

  it('calls analytics when consent is given', () => {
    const error = new Error('test error');
    logError(error, { source: 'test' });
    expect(supabase.functions.invoke).toHaveBeenCalled();
  });

  it('does not call analytics when consent is denied', () => {
    (hasAnalyticsConsent as any).mockReturnValue(false);
    const error = new Error('test error');
    logError(error, { source: 'test' });
    expect(supabase.functions.invoke).not.toHaveBeenCalled();
  });
});
