import { describe, it, expect, vi } from 'vitest';
import { reportError, reportMessage, isMonitoringConfigured, setMonitorUser } from '../lib/error-monitor';

describe('Error Monitor', () => {
  it('reportError handles Error objects', () => {
    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    expect(() => reportError(new Error('test error'))).not.toThrow();
    consoleSpy.mockRestore();
  });

  it('reportError handles string errors', () => {
    expect(() => reportError('string error')).not.toThrow();
  });

  it('reportError handles unknown error types', () => {
    expect(() => reportError({ code: 500 })).not.toThrow();
    expect(() => reportError(null)).not.toThrow();
    expect(() => reportError(undefined)).not.toThrow();
  });

  it('reportError accepts context', () => {
    expect(() => reportError(new Error('x'), { page: '/admin', userId: '123' })).not.toThrow();
  });

  it('reportMessage does not throw', () => {
    expect(() => reportMessage('test message', 'info')).not.toThrow();
    expect(() => reportMessage('warning', 'warning', { detail: 'abc' })).not.toThrow();
    expect(() => reportMessage('error', 'error')).not.toThrow();
  });

  it('setMonitorUser does not throw', () => {
    expect(() => setMonitorUser({ id: 'user-1', email: 'test@test.com' })).not.toThrow();
    expect(() => setMonitorUser(null)).not.toThrow();
  });

  it('isMonitoringConfigured returns false without DSN', () => {
    // In test environment, VITE_ERROR_MONITOR_DSN is not set
    expect(isMonitoringConfigured()).toBe(false);
  });
});
