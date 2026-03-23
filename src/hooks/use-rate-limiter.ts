import { useCallback, useRef } from 'react';

/**
 * Generic rate limiter hook.
 * Returns a wrapped function that only executes if enough time has elapsed since the last call.
 *
 * @param fn - The function to rate-limit
 * @param intervalMs - Minimum interval between calls (default 1000ms)
 */
export function useRateLimiter<T extends (...args: any[]) => any>(
  fn: T,
  intervalMs = 1000
): { execute: (...args: Parameters<T>) => ReturnType<T> | undefined; isLimited: boolean } {
  const lastCallRef = useRef<number>(0);
  const limitedRef = useRef(false);

  const execute = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCallRef.current < intervalMs) {
        limitedRef.current = true;
        return undefined;
      }
      lastCallRef.current = now;
      limitedRef.current = false;
      return fn(...args);
    },
    [fn, intervalMs]
  );

  return { execute, isLimited: limitedRef.current };
}
