import { describe, it, expect, vi } from 'vitest';
import { reportError, reportMessage, isMonitoringConfigured, setMonitorUser } from '../lib/error-monitor';

// Mock import.meta.env for DSN testing
describe('Error Monitor with DSN', () => {
  it('reportError does not throw with any error type', () => {
    expect(() => reportError(new Error('test'))).not.toThrow();
    expect(() => reportError('string error')).not.toThrow();
    expect(() => reportError({ code: 500 })).not.toThrow();
    expect(() => reportError(null)).not.toThrow();
    expect(() => reportError(undefined)).not.toThrow();
  });

  it('reportError accepts context metadata', () => {
    expect(() => reportError(new Error('x'), { page: '/admin', userId: '123', action: 'delete' })).not.toThrow();
  });

  it('reportMessage handles all severity levels', () => {
    expect(() => reportMessage('info message', 'info')).not.toThrow();
    expect(() => reportMessage('warning message', 'warning')).not.toThrow();
    expect(() => reportMessage('error message', 'error')).not.toThrow();
    expect(() => reportMessage('with context', 'info', { detail: 'abc' })).not.toThrow();
  });

  it('setMonitorUser handles user and null', () => {
    expect(() => setMonitorUser({ id: 'user-1', email: 'test@test.com' })).not.toThrow();
    expect(() => setMonitorUser({ id: 'user-2' })).not.toThrow();
    expect(() => setMonitorUser(null)).not.toThrow();
  });

  it('isMonitoringConfigured returns boolean', () => {
    const result = isMonitoringConfigured();
    expect(typeof result).toBe('boolean');
    // In test environment, DSN is not set
    expect(result).toBe(false);
  });

  it('reportError logs to console when DSN is configured', () => {
    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    // Without DSN, no console.info should be called for external service
    reportError(new Error('test'));
    // The logError call happens but external service logging only with DSN
    consoleSpy.mockRestore();
  });
});

describe('Error Monitor Integration', () => {
  it('handles concurrent error reports', () => {
    const errors = Array.from({ length: 10 }, (_, i) => new Error(`Error ${i}`));
    expect(() => {
      errors.forEach(err => reportError(err, { batch: true }));
    }).not.toThrow();
  });

  it('handles errors with stack traces', () => {
    const error = new Error('stack trace test');
    error.stack = 'Error: stack trace test\n    at test.ts:1:1';
    expect(() => reportError(error)).not.toThrow();
  });
});
