/**
 * Shared token-bucket rate limiter for edge functions.
 * Backed by public.consume_rate_limit() in the database.
 *
 * Usage:
 *   const rl = await checkRateLimit(supabase, {
 *     identifier: ip,
 *     action: "login",
 *     capacity: 10,
 *     refillPerSec: 0.2, // 12 tokens/min
 *   });
 *   if (!rl.allowed) return tooManyRequests(rl.retryAfterSeconds);
 */
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface RateLimitOptions {
  identifier: string;
  action: string;
  capacity: number;
  refillPerSec: number;
  cost?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export async function checkRateLimit(
  supabase: SupabaseClient,
  opts: RateLimitOptions
): Promise<RateLimitResult> {
  const { data, error } = await supabase.rpc("consume_rate_limit", {
    p_identifier: opts.identifier,
    p_action: opts.action,
    p_capacity: opts.capacity,
    p_refill_per_sec: opts.refillPerSec,
    p_cost: opts.cost ?? 1,
  });

  // Fail-open on infrastructure errors to avoid locking out users when DB is unhealthy.
  if (error || !data) {
    console.warn("rate-limit check failed, allowing request", error?.message);
    return { allowed: true, remaining: -1, retryAfterSeconds: 0 };
  }

  const d = data as { allowed: boolean; remaining: number; retry_after_seconds: number };
  return {
    allowed: d.allowed,
    remaining: d.remaining,
    retryAfterSeconds: d.retry_after_seconds,
  };
}

/** Extract a best-effort client identifier from the request. */
export function clientIdentifier(req: Request, userId?: string): string {
  if (userId) return `user:${userId}`;
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  const ip = fwd.split(",")[0]?.trim() || req.headers.get("cf-connecting-ip") || "unknown";
  return `ip:${ip}`;
}

export function tooManyRequestsResponse(retryAfter: number, corsHeaders: Record<string, string>) {
  return new Response(
    JSON.stringify({
      error: "rate_limited",
      message: "Too many requests. Please slow down.",
      retry_after_seconds: retryAfter,
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Retry-After": String(Math.max(1, Math.ceil(retryAfter))),
      },
    }
  );
}
