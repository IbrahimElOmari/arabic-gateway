import { describe, it, expect } from 'vitest';
import { calculateTax } from '@/lib/tax-utils';

describe('calculateTax', () => {
  it('calculates 21% for NL', () => {
    const result = calculateTax(100, 'NL');
    expect(result.vatRate).toBe(0.21);
    expect(result.vatAmount).toBeCloseTo(21);
    expect(result.total).toBeCloseTo(121);
    expect(result.net).toBe(100);
  });

  it('calculates 21% for BE', () => {
    const result = calculateTax(200, 'BE');
    expect(result.vatRate).toBe(0.21);
    expect(result.vatAmount).toBeCloseTo(42);
    expect(result.total).toBeCloseTo(242);
  });

  it('calculates 19% for DE', () => {
    const result = calculateTax(100, 'DE');
    expect(result.vatRate).toBe(0.19);
    expect(result.vatAmount).toBeCloseTo(19);
    expect(result.total).toBeCloseTo(119);
  });

  it('defaults to 21% for unknown country', () => {
    const result = calculateTax(100, 'XX');
    expect(result.vatRate).toBe(0.21);
  });

  it('handles zero amount', () => {
    const result = calculateTax(0, 'NL');
    expect(result.vatAmount).toBe(0);
    expect(result.total).toBe(0);
  });
});
