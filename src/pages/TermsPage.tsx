import React from 'react';
import { useTranslation } from 'react-i18next';

export default function TermsPage() {
  const { t } = useTranslation();

  return (
    <div className="container max-w-3xl py-12">
      <h1 className="text-3xl font-bold mb-6">{t('terms.title')}</h1>
      <p className="text-muted-foreground mb-8">{t('terms.intro')}</p>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">{t('terms.accountRules')}</h2>
        <p className="text-muted-foreground">{t('terms.accountRulesText')}</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">{t('terms.acceptableUse')}</h2>
        <p className="text-muted-foreground">{t('terms.acceptableUseText')}</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">{t('terms.payments')}</h2>
        <p className="text-muted-foreground">{t('terms.paymentsText')}</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">{t('terms.intellectualProperty')}</h2>
        <p className="text-muted-foreground">{t('terms.intellectualPropertyText')}</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">{t('terms.termination')}</h2>
        <p className="text-muted-foreground">{t('terms.terminationText')}</p>
      </section>

      <p className="text-sm text-muted-foreground italic">{t('terms.lastUpdated')}</p>
    </div>
  );
}
