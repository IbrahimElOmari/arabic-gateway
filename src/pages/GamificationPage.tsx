import React from 'react';
import { useTranslation } from 'react-i18next';
import { MainLayout } from '@/components/layout/MainLayout';
import { GamificationDashboard } from '@/components/gamification/GamificationDashboard';

export default function GamificationPage() {
  const { t } = useTranslation();

  return (
    <MainLayout>
      <div className="container py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{t('gamification.title')}</h1>
          <p className="text-muted-foreground">{t('gamification.subtitle')}</p>
        </div>
        <GamificationDashboard />
      </div>
    </MainLayout>
  );
}
