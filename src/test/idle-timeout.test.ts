import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIdleTimeout } from '../hooks/use-idle-timeout';

describe('useIdleTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows warning before timeout', () => {
    const onTimeout = vi.fn();
    const { result } = renderHook(() =>
      useIdleTimeout(10000, 3000, onTimeout) // 10s timeout, 3s warning
    );

    expect(result.current.showWarning).toBe(false);

    // Advance to warning time (10s - 3s = 7s)
    act(() => { vi.advanceTimersByTime(7000); });
    expect(result.current.showWarning).toBe(true);
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it('calls onTimeout when time expires', () => {
    const onTimeout = vi.fn();
    renderHook(() => useIdleTimeout(5000, 1000, onTimeout));

    act(() => { vi.advanceTimersByTime(5000); });
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it('resets when dismiss is called', () => {
    const onTimeout = vi.fn();
    const { result } = renderHook(() => useIdleTimeout(10000, 3000, onTimeout));

    act(() => { vi.advanceTimersByTime(8000); }); // Warning shown
    expect(result.current.showWarning).toBe(true);

    act(() => { result.current.dismiss(); });
    expect(result.current.showWarning).toBe(false);
    expect(onTimeout).not.toHaveBeenCalled();
  });
});
