import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => fallback || key }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id' },
    profile: { full_name: 'Test User', email: 'test@example.com', phone: '', address: '', avatar_url: null },
    loading: false,
  }),
}));
vi.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', setTheme: vi.fn(), themeStyle: 'professional', setThemeStyle: vi.fn() }),
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@tanstack/react-query', () => ({
  useMutation: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({ update: () => ({ eq: () => Promise.resolve({ error: null }) }) }),
    auth: { updateUser: vi.fn(), getSession: () => Promise.resolve({ data: { session: { access_token: 'x' } } }) },
    storage: { from: () => ({ upload: () => Promise.resolve({ error: null }), getPublicUrl: () => ({ data: { publicUrl: '' } }) }) },
    functions: { invoke: () => Promise.resolve({ data: {}, error: null }) },
  },
}));
vi.mock('@/components/layout/MainLayout', () => ({ MainLayout: ({ children }: any) => <div>{children}</div> }));
vi.mock('@/components/security/TwoFactorSetup', () => ({ TwoFactorSetup: () => <div>2FA</div> }));

import SettingsPage from '@/pages/SettingsPage';

describe('SettingsPage', () => {
  it('renders profile tab with user data', () => {
    render(<SettingsPage />);
    expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
  });

  it('renders export data button', () => {
    render(<SettingsPage />);
    expect(screen.getByText('Export my data')).toBeInTheDocument();
  });

  it('renders all four tabs', () => {
    render(<SettingsPage />);
    expect(screen.getByRole('tab', { name: /profile/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /security/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /notification/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /appearance/i })).toBeInTheDocument();
  });
});
