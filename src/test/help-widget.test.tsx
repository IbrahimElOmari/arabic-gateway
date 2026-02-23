import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

const mockNavigate = vi.fn();
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => fallback || key }),
}));
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

import { HelpWidget } from '@/components/HelpWidget';

describe('HelpWidget', () => {
  it('renders floating button', () => {
    render(<HelpWidget />);
    expect(screen.getByLabelText('Help openen')).toBeInTheDocument();
  });

  it('opens menu on click', () => {
    render(<HelpWidget />);
    fireEvent.click(screen.getByLabelText('Help openen'));
    expect(screen.getByText('FAQ / Kennisbank')).toBeInTheDocument();
    expect(screen.getByText('Contact Support')).toBeInTheDocument();
  });

  it('navigates to FAQ on click', () => {
    render(<HelpWidget />);
    fireEvent.click(screen.getByLabelText('Help openen'));
    fireEvent.click(screen.getByText('FAQ / Kennisbank'));
    expect(mockNavigate).toHaveBeenCalledWith('/faq');
  });

  it('navigates to helpdesk on click', () => {
    render(<HelpWidget />);
    fireEvent.click(screen.getByLabelText('Help openen'));
    fireEvent.click(screen.getByText('Contact Support'));
    expect(mockNavigate).toHaveBeenCalledWith('/helpdesk');
  });

  it('closes menu after navigation', () => {
    render(<HelpWidget />);
    fireEvent.click(screen.getByLabelText('Help openen'));
    fireEvent.click(screen.getByText('FAQ / Kennisbank'));
    // Menu should be closed
    expect(screen.queryByText('FAQ / Kennisbank')).not.toBeInTheDocument();
  });
});
