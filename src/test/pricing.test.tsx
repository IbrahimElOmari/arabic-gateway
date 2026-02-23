import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
    i18n: { language: 'nl' },
  }),
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
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: () => ({ select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) }) }) },
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
    // Loader2 renders with animate-spin class
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
