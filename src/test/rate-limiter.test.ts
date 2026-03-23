import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRateLimiter } from '../hooks/use-rate-limiter';

describe('useRateLimiter', () => {
  it('allows first call immediately', () => {
    const fn = vi.fn(() => 'ok');
    const { result } = renderHook(() => useRateLimiter(fn, 1000));

    const returnVal = result.current.execute();
    expect(fn).toHaveBeenCalledTimes(1);
    expect(returnVal).toBe('ok');
  });

  it('blocks calls within the interval', () => {
    const fn = vi.fn(() => 'ok');
    const { result } = renderHook(() => useRateLimiter(fn, 1000));

    result.current.execute();
    const secondResult = result.current.execute();

    expect(fn).toHaveBeenCalledTimes(1);
    expect(secondResult).toBeUndefined();
  });

  it('allows calls after interval expires', () => {
    vi.useFakeTimers();
    const fn = vi.fn(() => 'ok');
    const { result } = renderHook(() => useRateLimiter(fn, 500));

    result.current.execute();
    vi.advanceTimersByTime(600);
    result.current.execute();

    expect(fn).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('passes arguments correctly', () => {
    const fn = vi.fn((a: number, b: string) => `${a}-${b}`);
    const { result } = renderHook(() => useRateLimiter(fn, 100));

    const returnVal = result.current.execute(42, 'hello');
    expect(fn).toHaveBeenCalledWith(42, 'hello');
    expect(returnVal).toBe('42-hello');
  });
});
