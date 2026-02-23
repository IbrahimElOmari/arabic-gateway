import { describe, it, expect } from 'vitest';
import { FLAGS, isFeatureEnabled } from '@/lib/feature-flags';

describe('feature-flags', () => {
  it('FLAGS has expected keys', () => {
    expect(FLAGS).toHaveProperty('OFFLINE_MODE');
    expect(FLAGS).toHaveProperty('ADAPTIVE_LEARNING');
    expect(FLAGS).toHaveProperty('CERTIFICATE_GENERATION');
  });

  it('isFeatureEnabled returns correct value for OFFLINE_MODE', () => {
    expect(isFeatureEnabled('OFFLINE_MODE')).toBe(false);
  });

  it('isFeatureEnabled returns correct value for ADAPTIVE_LEARNING', () => {
    expect(isFeatureEnabled('ADAPTIVE_LEARNING')).toBe(true);
  });

  it('isFeatureEnabled returns correct value for CERTIFICATE_GENERATION', () => {
    expect(isFeatureEnabled('CERTIFICATE_GENERATION')).toBe(false);
  });
});
