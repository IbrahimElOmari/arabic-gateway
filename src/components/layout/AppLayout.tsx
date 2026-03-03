import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppSidebar } from './AppSidebar';
import { OfflineBanner } from '@/components/OfflineBanner';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { t } = useTranslation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Skip to main content link for accessibility */}
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
