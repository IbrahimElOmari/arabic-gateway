import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

export function Footer() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-muted/50">
      <div className="container py-8 md:py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center space-x-2">
              <span className="text-xl font-bold text-primary">HVA</span>
            </Link>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('app.tagline')}
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold mb-3">{t('nav.selfStudy')}</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/self-study/reading" className="hover:text-foreground">
                  {t('categories.reading')}
                </Link>
              </li>
              <li>
                <Link to="/self-study/writing" className="hover:text-foreground">
                  {t('categories.writing')}
                </Link>
              </li>
              <li>
                <Link to="/self-study/listening" className="hover:text-foreground">
                  {t('categories.listening')}
                </Link>
              </li>
              <li>
                <Link to="/self-study/speaking" className="hover:text-foreground">
                  {t('categories.speaking')}
                </Link>
              </li>
              <li>
                <Link to="/self-study/grammar" className="hover:text-foreground">
                  {t('categories.grammar')}
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold mb-3">{t('nav.home')}</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/about" className="hover:text-foreground">
                  {t('footer.about')}
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-foreground">
                  {t('footer.contact')}
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-foreground">
                  {t('footer.privacyPolicy')}
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-foreground">
                  {t('footer.termsOfService')}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-3">{t('settings.language')}</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>🇳🇱 Nederlands</li>
              <li>🇬🇧 English</li>
              <li>🇸🇦 العربية</li>
            </ul>
          </div>
        </div>
        
        <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>{t('footer.copyright', { year: currentYear })}</p>
        </div>
      </div>
    </footer>
  );
}
