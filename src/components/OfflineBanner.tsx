import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { WifiOff } from 'lucide-react';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function OfflineBanner() {
  const { t } = useTranslation();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    if (!isFeatureEnabled('OFFLINE_MODE')) return;

    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (!isFeatureEnabled('OFFLINE_MODE') || !isOffline) return null;

  return (
    <Alert
      role="status"
      aria-live="polite"
      className="rounded-none border-x-0 border-t-0 border-destructive bg-destructive/10"
    >
      <WifiOff className="h-4 w-4" />
      <AlertDescription>
        {t('offline.banner', 'Je bent offline. Sommige functies zijn niet beschikbaar.')}
      </AlertDescription>
    </Alert>
  );
}
