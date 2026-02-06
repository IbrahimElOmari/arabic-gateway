import React from 'react';
import { useTranslation } from 'react-i18next';
import { Header } from './Header';
import { Footer } from './Footer';

interface MainLayoutProps {
  children: React.ReactNode;
  showFooter?: boolean;
}

export function MainLayout({ children, showFooter = true }: MainLayoutProps) {
  const { t } = useTranslation();
  
  return (
    <div className="flex min-h-screen flex-col">
      {/* Skip to main content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-4 focus:left-4 focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-md focus:shadow-lg"
      >
        {t('accessibility.skipToMain', 'Skip to main content')}
      </a>
      <Header />
      <main id="main-content" className="flex-1" tabIndex={-1}>
        {children}
      </main>
      {showFooter && <Footer />}
    </div>
  );
}
