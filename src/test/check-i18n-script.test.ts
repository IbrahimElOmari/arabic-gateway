// @ts-nocheck
import { describe, it, expect } from 'vitest';
import {
  flatten,
  unflatten,
  looksLikeDutchUserFacing,
  checkLocaleParity,
  checkEmptyValues,
  checkDutchInTranslations,
  scanSourceForDutch,
  autoFixMissingKeys,
  DUTCH_WORDS,
} from '../../scripts/check-i18n.mjs';

describe('check-i18n.mjs helpers', () => {
  describe('flatten / unflatten', () => {
    it('roundtrips nested objects', () => {
      const obj = { a: { b: { c: 'x' }, d: 'y' }, e: 'z' };
      const flat = flatten(obj);
      expect(flat).toEqual({ 'a.b.c': 'x', 'a.d': 'y', e: 'z' });
      expect(unflatten(flat)).toEqual(obj);
    });
  });

  describe('looksLikeDutchUserFacing — true positives', () => {
    it.each([
      'Klik om in te loggen met je wachtwoord',
      'Oefeningen toevoegen.',
      'Verwijder deze leerling uit de klas',
      'Aanmelden mislukt!',
    ])('flags %p', (s) => {
      expect(looksLikeDutchUserFacing(s)).toBeTruthy();
    });
  });

  describe('looksLikeDutchUserFacing — false positives suppressed', () => {
    it.each([
      'klas',                      // single ambiguous word, no space/punct
      'fout',                      // ambiguous identifier
      'btn-laden-spinner',         // kebab identifier
      'https://example.com/agenda',
      'user_niveau_id',            // snake_case identifier
      'agendaItem',                // camelCase
      '#fff',                      // color
      'a',                         // too short
      '0123456789abcdef0123',      // uuid-ish
    ])('does not flag %p', (s) => {
      expect(looksLikeDutchUserFacing(s)).toBeNull();
    });
  });

  describe('locale checks', () => {
    const base = {
      nl: { app: { title: 'Hallo', sub: 'Wereld' } },
      en: { app: { title: 'Hello', sub: 'World' } },
      ar: { app: { title: 'مرحبا', sub: 'العالم' } },
    };

    it('passes when locales match', () => {
      expect(checkLocaleParity(base)).toEqual([]);
      expect(checkEmptyValues(base)).toEqual([]);
      expect(checkDutchInTranslations(base)).toEqual([]);
    });

    it('detects missing key in en/ar', () => {
      const broken = {
        nl: { a: '1', b: '2' },
        en: { a: '1' },
        ar: { a: '1', b: '2', extra: 'x' },
      };
      const errs = checkLocaleParity(broken);
      expect(errs.some((e) => e.includes('[en] missing key: b'))).toBe(true);
      expect(errs.some((e) => e.includes('[ar] extra key'))).toBe(true);
    });

    it('detects empty values', () => {
      const broken = { nl: { a: '' }, en: { a: 'x' }, ar: { a: 'y' } };
      expect(checkEmptyValues(broken)).toEqual(['[nl] empty value: a']);
    });

    it('detects Dutch word in en/ar values', () => {
      const broken = {
        nl: { greeting: 'Welkom' },
        en: { greeting: 'Welkom' },
        ar: { greeting: 'Welkom' },
      };
      const errs = checkDutchInTranslations(broken);
      // 'welkom' isn't in DUTCH_WORDS, but 'inloggen' is — verify with that:
      const broken2 = {
        nl: { x: 'a' }, en: { x: 'Please inloggen now' }, ar: { x: 'ok' },
      };
      const errs2 = checkDutchInTranslations(broken2);
      expect(errs2[0]).toContain('inloggen');
      expect(errs).toEqual([]); // welkom isn't flagged
    });
  });

  describe('scanSourceForDutch', () => {
    it('flags JSX text and string literals', () => {
      const fakeRead = () => `
        const x = "Klik om in te loggen";
        return <div>Voeg een leerling toe aan de klas</div>;
      `;
      const v = scanSourceForDutch(['/fake.tsx'], fakeRead);
      expect(v.length).toBeGreaterThanOrEqual(1);
    });

    it('respects // i18n-ignore', () => {
      const fakeRead = () => `const x = "Voeg leerling toe"; // i18n-ignore`;
      expect(scanSourceForDutch(['/fake.tsx'], fakeRead)).toEqual([]);
    });

    it('respects // i18n-ignore-file', () => {
      const fakeRead = () => `// i18n-ignore-file\nconst x = "Voeg leerling toe";`;
      expect(scanSourceForDutch(['/fake.tsx'], fakeRead)).toEqual([]);
    });

    it('skips className and other non-UI attrs', () => {
      const fakeRead = () => `<div className="agenda-klas-rooster" id="leerling">x</div>`;
      expect(scanSourceForDutch(['/fake.tsx'], fakeRead)).toEqual([]);
    });

    it('skips import lines', () => {
      const fakeRead = () => `import { leerling } from "./oefeningen";`;
      expect(scanSourceForDutch(['/fake.tsx'], fakeRead)).toEqual([]);
    });
  });

  describe('autoFixMissingKeys', () => {
    it('adds missing keys with placeholder', () => {
      const src = { 'a.b': 'Hallo', 'c': 'Wereld', 'd': 'Bestaat' };
      const tgt = { 'd': 'Exists' };
      const { added, result } = autoFixMissingKeys(src, tgt, (v) => `[TODO] ${v}`);
      expect(added.sort()).toEqual(['a.b', 'c']);
      expect(result['a.b']).toBe('[TODO] Hallo');
      expect(result['c']).toBe('[TODO] Wereld');
      expect(result['d']).toBe('Exists');
    });

    it('returns empty added when nothing missing', () => {
      const src = { a: '1' };
      const { added } = autoFixMissingKeys(src, { a: '2' }, () => 'x');
      expect(added).toEqual([]);
    });
  });

  describe('DUTCH_WORDS exported', () => {
    it('is a non-empty array of lowercase words', () => {
      expect(Array.isArray(DUTCH_WORDS)).toBe(true);
      expect(DUTCH_WORDS.length).toBeGreaterThan(10);
      for (const w of DUTCH_WORDS) expect(w).toBe(w.toLowerCase());
    });
  });
});
