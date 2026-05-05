import { describe, it, expect } from 'vitest';
import { pickMissing, chunk, mergeTranslations, AI_PREFIX } from '../../scripts/ai-fill-i18n.mjs';

describe('ai-fill-i18n helpers', () => {
  describe('pickMissing', () => {
    it('returns only keys missing from target', () => {
      const src = { 'a.b': 'hi', 'a.c': 'bye', 'd': 'x' };
      const tgt = { 'a.b': 'hello' };
      expect(pickMissing(src, tgt)).toEqual({ 'a.c': 'bye', d: 'x' });
    });
    it('respects limit', () => {
      const src = { a: '1', b: '2', c: '3' };
      expect(Object.keys(pickMissing(src, {}, 2))).toHaveLength(2);
    });
    it('skips non-string source values', () => {
      const src = { a: 'ok', b: 42 };
      expect(pickMissing(src, {})).toEqual({ a: 'ok' });
    });
  });

  describe('chunk', () => {
    it('splits into batches of given size', () => {
      const obj = { a: 1, b: 2, c: 3, d: 4, e: 5 };
      const batches = chunk(obj, 2);
      expect(batches).toHaveLength(3);
      expect(batches[0]).toEqual({ a: 1, b: 2 });
      expect(batches[2]).toEqual({ e: 5 });
    });
    it('returns empty array for empty input', () => {
      expect(chunk({}, 10)).toEqual([]);
    });
  });

  describe('mergeTranslations', () => {
    it('adds AI prefix to new keys', () => {
      const { result, added } = mergeTranslations({}, { a: 'Hello' });
      expect(result.a).toBe(`${AI_PREFIX}Hello`);
      expect(added).toEqual(['a']);
    });
    it('never overwrites existing target values', () => {
      const tgt = { a: 'Existing' };
      const { result, added } = mergeTranslations(tgt, { a: 'New', b: 'Other' });
      expect(result.a).toBe('Existing');
      expect(result.b).toBe(`${AI_PREFIX}Other`);
      expect(added).toEqual(['b']);
    });
    it('supports custom prefix', () => {
      const { result } = mergeTranslations({}, { x: 'y' }, '[ai] ');
      expect(result.x).toBe('[ai] y');
    });
  });
});
