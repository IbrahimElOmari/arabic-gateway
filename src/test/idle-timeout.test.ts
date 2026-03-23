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

  it('calls onTimeout when time expires', () => {
    const onTimeout = vi.fn();
    renderHook(() => useIdleTimeout(5000, 1000, onTimeout));

    act(() => { vi.advanceTimersByTime(5100); });
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it('does not call onTimeout before time expires', () => {
    const onTimeout = vi.fn();
    renderHook(() => useIdleTimeout(10000, 2000, onTimeout));

    act(() => { vi.advanceTimersByTime(5000); });
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it('provides dismiss function', () => {
    const onTimeout = vi.fn();
    const { result } = renderHook(() => useIdleTimeout(5000, 1000, onTimeout));
    expect(typeof result.current.dismiss).toBe('function');
  });

  it('showWarning is initially false', () => {
    const { result } = renderHook(() => useIdleTimeout(10000, 2000));
    expect(result.current.showWarning).toBe(false);
  });
});
