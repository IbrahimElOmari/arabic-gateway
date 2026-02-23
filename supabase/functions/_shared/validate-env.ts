/**
 * Secret/environment variable validation for edge functions.
 * Throws a descriptive error if a required secret is missing.
 */
export function requireEnv(name: string): string {
  const val = Deno.env.get(name);
  if (!val) {
    throw new Error(`Missing required environment variable: ${name}. Please configure this secret.`);
  }
  return val;
}
