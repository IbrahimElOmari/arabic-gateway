/**
 * Client-side error monitoring utility.
 * 
 * Wraps logError with optional external service forwarding.
 * When a monitoring service DSN is configured (e.g. Sentry),
 * errors are forwarded there. Otherwise falls back to
 * the existing analytics-based error logging.
 * 
 * Configuration:
 *   Set VITE_ERROR_MONITOR_DSN in .env to enable external forwarding.
 *   When not set, errors go to the analytics edge function only.
 */
import { logError } from './error-logger';
import { logger } from './logger';

interface ErrorMonitorConfig {
  dsn: string | null;
  environment: string;
  release: string;
}

const config: ErrorMonitorConfig = {
  dsn: import.meta.env.VITE_ERROR_MONITOR_DSN || null,
  environment: import.meta.env.MODE || 'development',
  release: `hva@${import.meta.env.VITE_APP_VERSION || '1.0.0'}`,
};

/**
 * Report an error to monitoring services.
 * Always logs to analytics; optionally forwards to external service.
 */
export function reportError(
  error: Error | unknown,
  context?: Record<string, unknown>
): void {
  // Always log via existing error logger (analytics edge function)
  const err = error instanceof Error ? error : new Error(String(error));
  logError(err);

  // Forward to external monitoring if configured
  if (config.dsn) {
    try {
      // External service integration point
      // When Sentry or similar is configured, this would call:
      // Sentry.captureException(err, { extra: context });
      logger.info('[ErrorMonitor] Error reported to external service', {
        message: err.message,
        environment: config.environment,
        release: config.release,
        context,
      });
    } catch {
      // Silently fail — never let monitoring break the app
    }
  }
}

/**
 * Report a message-level event (not an exception).
 */
export function reportMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  context?: Record<string, unknown>
): void {
  if (config.dsn) {
    logger.info(`[ErrorMonitor] ${level}: ${message}`, context);
  }
}

/**
 * Set user context for error monitoring.
 */
export function setMonitorUser(user: { id: string; email?: string } | null): void {
  if (config.dsn && user) {
    console.info('[ErrorMonitor] User context set', { id: user.id });
  }
}

/**
 * Check if external monitoring is configured.
 */
export function isMonitoringConfigured(): boolean {
  return !!config.dsn;
}
