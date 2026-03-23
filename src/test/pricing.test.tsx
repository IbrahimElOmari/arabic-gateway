import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
    i18n: { language: 'nl' },
  }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children, to, ...props }: any) => <a href={to} {...props}>{children}</a>,
}));
vi.mock('@/components/layout/MainLayout', () => ({
  MainLayout: ({ children }: any) => <div>{children}</div>,
}));

// Mock loading state
let mockLoading = true;
let mockData: any[] | undefined = undefined;

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: mockData, isLoading: mockLoading }),
  useMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: () => ({ select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) }) }) },
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, profile: null, role: null, roleStatus: 'ready', loading: false, signUp: vi.fn(), signIn: vi.fn(), signOut: vi.fn(), isAdmin: false, isTeacher: false }),
}));
vi.mock('@/lib/supabase-api', () => ({
  apiQuery: vi.fn().mockResolvedValue([]),
  apiMutate: vi.fn().mockResolvedValue({}),
}));
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

import PricingPage from '@/pages/PricingPage';

describe('PricingPage', () => {
  it('renders page title', () => {
    mockLoading = false;
    mockData = [];
    render(<PricingPage />);
    expect(screen.getByText('Prijzen & Cursussen')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockLoading = true;
    mockData = undefined;
    render(<PricingPage />);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows empty state when no classes', () => {
    mockLoading = false;
    mockData = [];
    render(<PricingPage />);
    expect(screen.getByText('Er zijn momenteel geen actieve cursussen.')).toBeInTheDocument();
  });

  it('renders subtitle i18n text', () => {
    mockLoading = false;
    mockData = [];
    render(<PricingPage />);
    expect(screen.getByText('Kies de cursus die bij je past en begin vandaag nog met Arabisch leren.')).toBeInTheDocument();
  });
});
