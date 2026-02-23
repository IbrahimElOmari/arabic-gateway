/**
 * Locale-aware number, currency, and percentage formatting utilities.
 */
import i18n from '@/i18n';

function getLocaleString(locale?: string): string {
  const lang = locale || i18n.language;
  if (lang === 'ar') return 'ar-SA';
  if (lang === 'en') return 'en-US';
  return 'nl-NL';
}

export function formatNumber(value: number, locale?: string): string {
  return new Intl.NumberFormat(getLocaleString(locale)).format(value);
}

export function formatCurrency(value: number, currency: string = 'EUR', locale?: string): string {
  return new Intl.NumberFormat(getLocaleString(locale), {
    style: 'currency',
    currency,
  }).format(value);
}

export function formatPercent(value: number, locale?: string): string {
  return new Intl.NumberFormat(getLocaleString(locale), {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value / 100);
}
