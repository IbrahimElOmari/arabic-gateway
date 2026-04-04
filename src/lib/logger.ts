/**
 * Production-safe logger.
 * In development: all levels are logged.
 * In production: only errors are logged; log/warn/info are no-ops.
 */
const isDev = import.meta.env.DEV;

export const logger = {
  log: (...args: unknown[]) => { if (isDev) console.log(...args); },
  warn: (...args: unknown[]) => { if (isDev) console.warn(...args); },
  error: (...args: unknown[]) => { console.error(...args); },
  info: (...args: unknown[]) => { if (isDev) console.info(...args); },
};
