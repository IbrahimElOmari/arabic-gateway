import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}));

vi.mock('@/components/layout/MainLayout', () => ({
  MainLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('react-router-dom', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
}));

import ForgotPasswordPage from '@/pages/ForgotPasswordPage';

describe('ForgotPasswordPage', () => {
  it('renders the forgot password form', () => {
    render(<ForgotPasswordPage />);
    expect(screen.getByText('auth.forgotPassword')).toBeInTheDocument();
    expect(screen.getByText('Send reset link')).toBeInTheDocument();
  });

  it('sends reset email on submit', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    render(<ForgotPasswordPage />);

    const emailInput = screen.getByPlaceholderText('email@example.com');
    await userEvent.type(emailInput, 'user@test.com');

    const submitButton = screen.getByText('Send reset link');
    fireEvent.click(submitButton);

    expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
      'user@test.com',
      expect.objectContaining({ redirectTo: expect.stringContaining('/reset-password') })
    );
  });

  it('shows success message after sending', async () => {
    render(<ForgotPasswordPage />);

    const emailInput = screen.getByPlaceholderText('email@example.com');
    await userEvent.type(emailInput, 'user@test.com');

    fireEvent.click(screen.getByText('Send reset link'));

    // After successful send, the confirmation UI should appear
    await screen.findByText('Check your email for a password reset link. It may take a few minutes.');
  });
});
