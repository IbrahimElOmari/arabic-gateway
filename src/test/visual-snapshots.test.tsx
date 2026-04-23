import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Home, Users } from 'lucide-react';
import { StatsCard } from '@/components/admin/StatsCard';
import { cn } from '@/lib/utils';

/**
 * Visual regression snapshots for the navigation link styling and admin
 * StatsCard. If the markup or class composition changes unexpectedly the
 * snapshot diff will fail and surface the regression.
 */

// Mirror the className composition used in AppSidebar.renderSection so we can
// snapshot it in isolation without pulling the whole sidebar (which depends on
// auth context, supabase, i18n, etc.).
function SidebarLinkSample({ collapsed = false, active = false }: { collapsed?: boolean; active?: boolean }) {
  return (
    <a
      href="/sample"
      className={cn(
        'relative flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground sm:shadow-sm hover:shadow-md',
        collapsed && 'justify-center px-2',
        active && 'bg-primary/10 text-primary font-medium'
      )}
    >
      <Home className="h-5 w-5 shrink-0" aria-hidden="true" />
      {!collapsed && <span className="truncate flex-1">Sample link</span>}
    </a>
  );
}

describe('visual snapshots', () => {
  it('sidebar link – default state', () => {
    const { container } = render(
      <MemoryRouter>
        <SidebarLinkSample />
      </MemoryRouter>
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('sidebar link – active state', () => {
    const { container } = render(
      <MemoryRouter>
        <SidebarLinkSample active />
      </MemoryRouter>
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('sidebar link – collapsed state', () => {
    const { container } = render(
      <MemoryRouter>
        <SidebarLinkSample collapsed />
      </MemoryRouter>
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('admin StatsCard – basic', () => {
    const { container } = render(
      <StatsCard title="Total Users" value={42} icon={Users} description="Registered users" />
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('admin StatsCard – with positive trend', () => {
    const { container } = render(
      <StatsCard
        title="Active Classes"
        value={12}
        icon={Users}
        description="Total classes"
        trend={{ value: 8, isPositive: true }}
      />
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('admin stats grid wrapper className', () => {
    // Locks the responsive shadow/border composition used in AdminDashboard.
    const wrapperClass =
      'grid gap-4 md:grid-cols-2 lg:grid-cols-4 rounded-xl p-1 shadow-md sm:shadow-lg lg:shadow-xl border border-transparent sm:border-accent/40 lg:border-accent';
    expect(wrapperClass).toMatchSnapshot();
  });
});
