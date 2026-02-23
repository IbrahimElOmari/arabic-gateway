import { describe, it, expect } from 'vitest';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/format-utils';

describe('formatCurrency', () => {
  it('formats EUR in nl', () => {
    const result = formatCurrency(1234.5, 'EUR', 'nl');
    expect(result).toContain('1.234');
    expect(result).toContain('€');
  });

  it('formats EUR in en', () => {
    const result = formatCurrency(1234.5, 'EUR', 'en');
    expect(result).toContain('€');
  });

  it('formats EUR in ar', () => {
    const result = formatCurrency(100, 'EUR', 'ar');
    expect(result).toBeTruthy();
  });
});

describe('formatNumber', () => {
  it('formats number in nl', () => {
    const result = formatNumber(1234567, 'nl');
    expect(result).toContain('1.234.567');
  });

  it('formats number in en', () => {
    const result = formatNumber(1234567, 'en');
    expect(result).toContain('1,234,567');
  });
});

describe('formatPercent', () => {
  it('formats percentage in nl', () => {
    const result = formatPercent(0.85, 'nl');
    expect(result).toContain('85');
    expect(result).toContain('%');
  });

  it('formats percentage in en', () => {
    const result = formatPercent(0.5, 'en');
    expect(result).toContain('50');
  });
});
