import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import nl from './locales/nl.json';
import en from './locales/en.json';
import ar from './locales/ar.json';

const resources = {
  nl: { translation: nl },
  en: { translation: en },
  ar: { translation: ar },
};

const applyLanguageDirection = (lng: string) => {
  const dir = lng === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.dir = dir;
  document.documentElement.lang = lng;
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'nl',
    supportedLngs: ['nl', 'en', 'ar'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
  }).then(() => {
    applyLanguageDirection(i18n.resolvedLanguage || i18n.language || 'nl');
  });

// Update document direction based on language
i18n.on('languageChanged', (lng) => {
  applyLanguageDirection(lng);
});

export default i18n;
