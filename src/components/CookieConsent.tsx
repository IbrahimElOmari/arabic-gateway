import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Cookie } from 'lucide-react';

const COOKIE_CONSENT_KEY = 'hva-cookie-consent';

export type CookieConsentValue = 'accepted' | 'rejected' | null;

export function getCookieConsent(): CookieConsentValue {
  return localStorage.getItem(COOKIE_CONSENT_KEY) as CookieConsentValue;
}

export function CookieConsent() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = getCookieConsent();
    if (!consent) {
      setVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
    setVisible(false);
  };

  const handleReject = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'rejected');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-4" role="dialog" aria-label={t('cookie.title')}>
      <div className="container max-w-2xl mx-auto">
        <div className="bg-card border rounded-lg shadow-lg p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Cookie className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium">{t('cookie.title')}</p>
            <p className="text-sm text-muted-foreground">
              {t('cookie.description')}{' '}
              {t('cookie.learnMore')}{' '}
              <Link to="/privacy" className="text-primary hover:underline">
                {t('footer.privacyPolicy')}
              </Link>.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={handleReject}>
              {t('cookie.reject')}
            </Button>
            <Button size="sm" onClick={handleAccept}>
              {t('cookie.accept')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
