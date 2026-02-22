import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => fallback || key }),
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: { user: { id: '1' } } } }),
      updateUser: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}));
vi.mock('@/components/layout/MainLayout', () => ({
  MainLayout: ({ children }: any) => <div>{children}</div>,
}));

import ResetPasswordPage from '@/pages/ResetPasswordPage';

describe('ResetPasswordPage', () => {
  it('renders the reset password form', () => {
    render(<ResetPasswordPage />);
    expect(screen.getByText('auth.resetPassword')).toBeInTheDocument();
  });

  it('renders password inputs with minLength 8', () => {
    Object.defineProperty(window, 'location', {
      value: { ...window.location, hash: '#type=recovery' },
      writable: true,
    });
    render(<ResetPasswordPage />);
    const inputs = screen.getAllByDisplayValue('');
    const passwordInputs = inputs.filter((el) => el.getAttribute('type') === 'password');
    passwordInputs.forEach((input) => {
      expect(input.getAttribute('minlength')).toBe('8');
    });
  });
});
