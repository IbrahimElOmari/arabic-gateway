import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => fallback || key }),
}));
vi.mock('react-router-dom', () => ({
  Link: ({ children, to, ...props }: any) => <a href={to} {...props}>{children}</a>,
}));

import { CookieConsent, getCookieConsent } from '@/components/CookieConsent';

describe('CookieConsent', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows banner when no consent in localStorage', () => {
    render(<CookieConsent />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('hides banner when consent already accepted', () => {
    localStorage.setItem('hva-cookie-consent', 'accepted');
    const { container } = render(<CookieConsent />);
    expect(container.innerHTML).toBe('');
  });

  it('hides banner when consent already rejected', () => {
    localStorage.setItem('hva-cookie-consent', 'rejected');
    const { container } = render(<CookieConsent />);
    expect(container.innerHTML).toBe('');
  });

  it('sets localStorage to accepted on accept click', () => {
    render(<CookieConsent />);
    fireEvent.click(screen.getByText('cookie.accept'));
    expect(localStorage.getItem('hva-cookie-consent')).toBe('accepted');
  });

  it('sets localStorage to rejected on reject click', () => {
    render(<CookieConsent />);
    fireEvent.click(screen.getByText('cookie.reject'));
    expect(localStorage.getItem('hva-cookie-consent')).toBe('rejected');
  });

  it('banner disappears after accept', () => {
    const { container } = render(<CookieConsent />);
    fireEvent.click(screen.getByText('cookie.accept'));
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('getCookieConsent returns null when no consent', () => {
    expect(getCookieConsent()).toBeNull();
  });

  it('getCookieConsent returns accepted after accept', () => {
    localStorage.setItem('hva-cookie-consent', 'accepted');
    expect(getCookieConsent()).toBe('accepted');
  });
});
