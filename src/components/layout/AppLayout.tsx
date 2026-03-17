import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppSidebar } from './AppSidebar';
import { OfflineBanner } from '@/components/OfflineBanner';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { Menu } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background">
        {/* Skip to main content */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-4 focus:left-4 focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-md focus:shadow-lg"
        >
          {t('accessibility.skipToMain', 'Skip to main content')}
        </a>

        <OfflineBanner />

        {/* Mobile top bar */}
        <div className="fixed top-0 left-0 right-0 z-40 h-14 border-b bg-card flex items-center px-4 gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(true)}
            aria-label={t('accessibility.openMenu', 'Open menu')}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Logo size="sm" showText />
        </div>

        {/* Mobile sidebar sheet */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="p-0 w-64 [&>button]:hidden">
            <AppSidebar
              collapsed={false}
              onToggle={() => setMobileOpen(false)}
              mobile
              onNavigate={() => setMobileOpen(false)}
            />
          </SheetContent>
        </Sheet>

        <main
          id="main-content"
          className="min-h-screen pt-14"
          tabIndex={-1}
        >
          {children}
        </main>
      </div>
    );
  }

  // Desktop layout
  return (
    <div className="min-h-screen bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-4 focus:left-4 focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-md focus:shadow-lg"
      >
        {t('accessibility.skipToMain', 'Skip to main content')}
      </a>
      <OfflineBanner />
      <AppSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <main
        id="main-content"
        className={cn(
          'min-h-screen transition-all duration-300',
          sidebarCollapsed ? 'ms-16' : 'ms-64'
        )}
        tabIndex={-1}
      >
        {children}
      </main>
    </div>
  );
}
