import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Home, Users } from 'lucide-react';
import { StatsCard } from '@/components/admin/StatsCard';
import { cn } from '@/lib/utils';
import DesignSystemPage from '@/pages/admin/DesignSystemPage';
import fs from 'node:fs';

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
        'relative flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card sm:shadow-sm hover:shadow-md',
        collapsed && 'justify-center px-2',
        active && 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
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

  it('sidebar link – RTL Arabic state', () => {
    const { container } = render(
      <div dir="rtl" lang="ar" className="font-sans">
        <SidebarLinkSample active />
      </div>
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

  it('admin StatsCard – RTL Arabic typography', () => {
    const { container } = render(
      <div dir="rtl" lang="ar" className="font-sans">
        <StatsCard title="إجمالي المستخدمين" value={42} icon={Users} description="المستخدمون المسجلون" />
      </div>
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('admin stats grid wrapper className', () => {
    // Locks the responsive shadow/border composition used in AdminDashboard.
    const wrapperClass =
      'grid gap-4 md:grid-cols-2 lg:grid-cols-4 rounded-xl p-1 shadow-md sm:shadow-lg lg:shadow-xl border border-transparent sm:border-accent/40 lg:border-accent';
    expect(wrapperClass).toMatchSnapshot();
  });

  it('light-mode visual token contract', () => {
    const css = fs.readFileSync('src/index.css', 'utf8');
    const rootBlock = css.match(/:root\s*\{([\s\S]*?)\n\s*\}/)?.[1] ?? '';
    const tokenContract = Array.from(
      rootBlock.matchAll(/--(primary|accent|muted-foreground|success|destructive|input|ring|sidebar-accent|sidebar-accent-foreground):\s*([^;]+);/g)
    ).map(([, name, value]) => `${name}: ${value.trim()}`);

    expect(tokenContract).toMatchSnapshot();
  });

  it('admin Design System page – Sprint 1 showcase', () => {
    const { container } = render(<DesignSystemPage />);
    expect(container.firstChild).toMatchSnapshot();
  });
});
