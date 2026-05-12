/**
 * Color contrast accessibility tests.
 * Validates core color combinations against WCAG AA standards:
 * - Normal text:          contrast ratio >= 4.5:1
 * - Large text / UI:     contrast ratio >= 3.0:1
 *
 * Colors match the CSS custom properties in src/index.css (light mode).
 * Tests are self-contained — no DOM, no browser, no extra packages.
 * If a test fails because a CSS variable changed, update the constant
 * in this file to match the new value in src/index.css.
 */

import { describe, it, expect } from 'vitest';

// ── Utility: WCAG relative luminance & contrast ratio ─────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean.split('').map((c) => c + c).join('')
      : clean;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function linearize(ch: number): number {
  const c = ch / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(linearize);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const l1 = luminance(a);
  const l2 = luminance(b);
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

const AA_NORMAL = 4.5;
const AA_LARGE  = 3.0;

// ── Design tokens — sourced from src/index.css (light mode) ───────────────
// Keep these in sync with the CSS variables. Update here if tokens change.

const C = {
  background:          '#fafcfb',
  card:                '#ffffff',
  muted:               '#ebf0ee',
  foreground:          '#0a1f29',
  mutedForeground:     '#586d65',
  cardForeground:      '#0a1f29',
  primary:             '#2a8769',
  primaryForeground:   '#ffffff',
  secondary:           '#e0efeb',
  secondaryForeground: '#205441',
  destructive:         '#bf1717',
  destructiveForeground: '#ffffff',
  accent:              '#208482',
  accentForeground:    '#ffffff',
  border:              '#cce0db',
};

// ── Tests ──────────────────────────────────────────────────────────────────

describe('WCAG AA — Normal text (>= 4.5:1)', () => {
  it('foreground on background', () => {
    expect(contrast(C.foreground, C.background)).toBeGreaterThanOrEqual(AA_NORMAL);
  });
  it('card foreground on card', () => {
    expect(contrast(C.cardForeground, C.card)).toBeGreaterThanOrEqual(AA_NORMAL);
  });
  it('primary foreground on primary (button label)', () => {
    expect(contrast(C.primaryForeground, C.primary)).toBeGreaterThanOrEqual(AA_NORMAL);
  });
  it('secondary foreground on secondary', () => {
    expect(contrast(C.secondaryForeground, C.secondary)).toBeGreaterThanOrEqual(AA_NORMAL);
  });
  it('destructive foreground on destructive (error button label)', () => {
    expect(contrast(C.destructiveForeground, C.destructive)).toBeGreaterThanOrEqual(AA_NORMAL);
  });
  it('accent foreground on accent', () => {
    expect(contrast(C.accentForeground, C.accent)).toBeGreaterThanOrEqual(AA_NORMAL);
  });
  it('muted foreground on background (placeholder / caption)', () => {
    expect(contrast(C.mutedForeground, C.background)).toBeGreaterThanOrEqual(AA_NORMAL);
  });
});

describe('WCAG AA — Large text & UI components (>= 3.0:1)', () => {
  it('primary on background (large heading, icon)', () => {
    expect(contrast(C.primary, C.background)).toBeGreaterThanOrEqual(AA_LARGE);
  });
  it('destructive on background (inline error, large)', () => {
    expect(contrast(C.destructive, C.background)).toBeGreaterThanOrEqual(AA_LARGE);
  });
  it('border on background (WCAG 1.4.11 non-text contrast)', () => {
    expect(contrast(C.border, C.background)).toBeGreaterThanOrEqual(AA_LARGE);
  });
  it('muted foreground on muted background (de-emphasised label)', () => {
    expect(contrast(C.mutedForeground, C.muted)).toBeGreaterThanOrEqual(AA_LARGE);
  });
  it('primary on card background (badge or icon inside card)', () => {
    expect(contrast(C.primary, C.card)).toBeGreaterThanOrEqual(AA_LARGE);
  });
});

describe('Utility functions', () => {
  it('white on black = 21:1', () => {
    expect(contrast('#ffffff', '#000000')).toBeCloseTo(21, 0);
  });
  it('identical colors = 1:1', () => {
    expect(contrast('#3d8c6e', '#3d8c6e')).toBeCloseTo(1, 5);
  });
  it('contrast is commutative', () => {
    expect(contrast('#3d8c6e', '#ffffff')).toBeCloseTo(contrast('#ffffff', '#3d8c6e'), 10);
  });
  it('hexToRgb handles 3-digit shorthand', () => {
    expect(hexToRgb('#fff')).toEqual([255, 255, 255]);
  });
  it('hexToRgb parses 6-digit hex', () => {
    expect(hexToRgb('#3d8c6e')).toEqual([61, 140, 110]);
  });
});
