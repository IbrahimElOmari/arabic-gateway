import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { OfflineBanner } from '@/components/OfflineBanner';

// Mock feature flags
vi.mock('@/lib/feature-flags', () => ({
  isFeatureEnabled: (flag: string) => flag === 'OFFLINE_MODE',
  FLAGS: { OFFLINE_MODE: true, ADAPTIVE_LEARNING: true, CERTIFICATE_GENERATION: false },
}));

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
  }),
}));

describe('OfflineBanner', () => {
  const originalOnLine = navigator.onLine;

  afterEach(() => {
    Object.defineProperty(navigator, 'onLine', { value: originalOnLine, writable: true });
  });

  it('shows banner when offline and flag is enabled', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
    render(<OfflineBanner />);
    expect(screen.getByText(/offline/i)).toBeInTheDocument();
  });

  it('hides banner when online', () => {
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
    render(<OfflineBanner />);
    expect(screen.queryByText(/offline/i)).not.toBeInTheDocument();
  });

  it('responds to online/offline events', () => {
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
    render(<OfflineBanner />);

    // Go offline
    act(() => {
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
      window.dispatchEvent(new Event('offline'));
    });
    expect(screen.getByText(/offline/i)).toBeInTheDocument();

    // Go online
    act(() => {
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
      window.dispatchEvent(new Event('online'));
    });
    expect(screen.queryByText(/offline/i)).not.toBeInTheDocument();
  });
});
