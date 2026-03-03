import React from 'react';
import { useTranslation } from 'react-i18next';

export default function PrivacyPage() {
  const { t } = useTranslation();

  return (
    <div className="container max-w-3xl py-12">
      <h1 className="text-3xl font-bold mb-6">{t('privacy.title')}</h1>
      <p className="text-muted-foreground mb-8">{t('privacy.intro')}</p>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">{t('privacy.dataCollection')}</h2>
        <p className="text-muted-foreground">{t('privacy.dataCollectionText')}</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">{t('privacy.dataUse')}</h2>
        <p className="text-muted-foreground">{t('privacy.dataUseText')}</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">{t('privacy.dataRetention')}</h2>
        <p className="text-muted-foreground">{t('privacy.dataRetentionText')}</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">{t('privacy.rights')}</h2>
        <p className="text-muted-foreground">{t('privacy.rightsText')}</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">{t('privacy.contact')}</h2>
        <p className="text-muted-foreground">{t('privacy.contactText')}</p>
      </section>

      <p className="text-sm text-muted-foreground italic">{t('privacy.lastUpdated')}</p>
    </div>
  );
}
