import { describe, expect, it } from 'vitest';
import nl from '@/i18n/locales/nl.json';
import en from '@/i18n/locales/en.json';
import ar from '@/i18n/locales/ar.json';

type TranslationTree = Record<string, unknown>;

function flattenKeys(tree: TranslationTree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([key, value]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return flattenKeys(value as TranslationTree, fullKey);
    }
    return [fullKey];
  });
}

describe('i18n locale consistency', () => {
  it('keeps nl, en, and ar translation keysets identical', () => {
    const localeKeys = {
      nl: flattenKeys(nl).sort(),
      en: flattenKeys(en).sort(),
      ar: flattenKeys(ar).sort(),
    };

    expect(localeKeys.en).toEqual(localeKeys.nl);
    expect(localeKeys.ar).toEqual(localeKeys.nl);
  });

  it('does not contain empty translation values', () => {
    for (const [locale, keys] of Object.entries({ nl, en, ar })) {
      const emptyKeys = flattenKeys(keys).filter((key) => {
        const value = key.split('.').reduce<unknown>((acc, part) => {
          if (acc && typeof acc === 'object') return (acc as TranslationTree)[part];
          return undefined;
        }, keys);

        return value === null || value === undefined || String(value).trim() === '';
      });

      expect(emptyKeys, `${locale} has empty translations`).toEqual([]);
    }
  });
});
