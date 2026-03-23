import { useEffect, useRef, useState, useCallback } from 'react';

const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart', 'pointermove'];

/**
 * Idle timeout hook. Shows a warning before auto-logout.
 *
 * @param timeoutMs Total idle time before logout (default 30 min)
 * @param warningMs Time before timeout to show warning (default 2 min)
 * @param onTimeout Callback when timeout expires (e.g., signOut)
 */
export function useIdleTimeout(
  timeoutMs = 30 * 60 * 1000,
  warningMs = 2 * 60 * 1000,
  onTimeout?: () => void
) {
  const [showWarning, setShowWarning] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const warningRef = useRef<ReturnType<typeof setTimeout>>();

  const resetTimers = useCallback(() => {
    setShowWarning(false);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);

    warningRef.current = setTimeout(() => {
      setShowWarning(true);
    }, timeoutMs - warningMs);

    timeoutRef.current = setTimeout(() => {
      onTimeout?.();
    }, timeoutMs);
  }, [timeoutMs, warningMs, onTimeout]);

  const dismiss = useCallback(() => {
    resetTimers();
  }, [resetTimers]);

  useEffect(() => {
    resetTimers();

    const handler = () => {
      if (!showWarning) resetTimers();
    };

    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, handler, { passive: true }));

    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, handler));
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
    };
  }, [resetTimers, showWarning]);

  return { showWarning, dismiss };
}
