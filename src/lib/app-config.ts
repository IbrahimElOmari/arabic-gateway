/**
 * White-label / app configuration
 * Centralises brand-specific values so they can be changed without code edits.
 * In a multi-tenant setup this could be loaded from the database instead.
 */

export interface AppConfig {
  appName: string;
  appNameShort: string;
  appNameAr: string;
  supportEmail: string;
  siteUrl: string;
  logo: {
    /** Path to logo asset (relative import or URL) */
    src: string;
    alt: string;
  };
  social: {
    twitter?: string;
    instagram?: string;
    facebook?: string;
  };
  /** Primary theme color (hex) used in manifest, meta tags, etc. */
  themeColor: string;
}

const config: AppConfig = {
  appName: "Huis van het Arabisch",
  appNameShort: "HVA",
  appNameAr: "بيت العربية",
  supportEmail: "support@huisvanhetarabisch.nl",
  siteUrl: "https://huisvanhetarabisch.nl",
  logo: {
    src: "/favicon.ico",
    alt: "Huis van het Arabisch",
  },
  social: {
    twitter: "@HuisvanhetArabisch",
    instagram: "huisvanhetarabisch",
  },
  themeColor: "#3d8c6e",
};

export default config;
