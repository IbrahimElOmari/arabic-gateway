import { describe, it, expect } from 'vitest';
import { sanitizeHtml } from '@/lib/sanitize';

describe('sanitizeHtml', () => {
  it('removes script tags', () => {
    const dirty = '<p>Hello</p><script>alert("xss")</script>';
    const result = sanitizeHtml(dirty);
    expect(result).not.toContain('<script>');
    expect(result).toContain('<p>Hello</p>');
  });

  it('removes onerror attributes', () => {
    const dirty = '<img src="x" onerror="alert(1)" />';
    const result = sanitizeHtml(dirty);
    expect(result).not.toContain('onerror');
  });

  it('preserves safe HTML', () => {
    const safe = '<p>Hello <strong>World</strong></p>';
    const result = sanitizeHtml(safe);
    expect(result).toBe(safe);
  });

  it('removes javascript: URLs', () => {
    const dirty = '<a href="javascript:alert(1)">Click</a>';
    const result = sanitizeHtml(dirty);
    expect(result).not.toContain('javascript:');
  });
});
