/**
 * Simple feature flag module.
 * Flags can be toggled here or loaded from a database in a multi-tenant setup.
 */

export const FLAGS = {
  OFFLINE_MODE: false,
  ADAPTIVE_LEARNING: true,
  CERTIFICATE_GENERATION: true,
} as const;

export type FeatureFlag = keyof typeof FLAGS;

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return FLAGS[flag] ?? false;
}
