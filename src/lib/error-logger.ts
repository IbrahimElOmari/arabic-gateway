/**
 * Client-side error logging service.
 * Sends errors to the analytics edge function with rate limiting and consent checking.
 */
import { supabase } from '@/integrations/supabase/client';
import { hasAnalyticsConsent } from './cookie-consent';

const MAX_ERRORS_PER_MINUTE = 5;
let errorCount = 0;
let lastResetTime = Date.now();

function resetIfNeeded() {
  const now = Date.now();
  if (now - lastResetTime > 60_000) {
    errorCount = 0;
    lastResetTime = now;
  }
}

export async function logError(error: unknown, context?: Record<string, unknown>): Promise<void> {
  // Always log to console in dev
  console.error('[ErrorLogger]', error, context);

  // Respect cookie consent
  if (!hasAnalyticsConsent()) return;

  // Rate limiting
  resetIfNeeded();
  if (errorCount >= MAX_ERRORS_PER_MINUTE) return;
  errorCount++;

  try {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    const { data: sessionData } = await supabase.auth.getSession();

    await supabase.functions.invoke('analytics', {
      body: {
        action: 'track_event',
        eventType: 'client_error',
        eventName: 'client_error',
        pagePath: window.location.pathname,
        properties: {
          errorMessage,
          errorStack,
          ...context,
        },
      },
      headers: sessionData.session?.access_token
        ? { Authorization: `Bearer ${sessionData.session.access_token}` }
        : {},
    });
  } catch {
    // Silently fail - error logging should never break the app
  }
}
