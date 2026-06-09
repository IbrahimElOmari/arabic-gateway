/**
 * Cloudflare Turnstile captcha verification.
 * Frontend calls this with the token from the widget; server verifies with Cloudflare.
 *
 * Required secret: TURNSTILE_SECRET_KEY
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, clientIdentifier, tooManyRequestsResponse } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TurnstileResponse {
  success: boolean;
  "error-codes"?: string[];
  challenge_ts?: string;
  hostname?: string;
  action?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Rate limit by IP — 30 attempts/min
  const identifier = clientIdentifier(req);
  const rl = await checkRateLimit(supabase, {
    identifier,
    action: "verify-captcha",
    capacity: 30,
    refillPerSec: 0.5,
  });
  if (!rl.allowed) return tooManyRequestsResponse(rl.retryAfterSeconds, corsHeaders);

  let token: string;
  let action: string | undefined;
  try {
    const body = await req.json();
    token = body.token;
    action = body.action;
    if (!token || typeof token !== "string") throw new Error("missing token");
  } catch {
    return new Response(JSON.stringify({ success: false, error: "invalid_body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (!secret) {
    console.error("TURNSTILE_SECRET_KEY not configured");
    // Fail-open in dev: captcha is supplementary, not the only security layer.
    return new Response(JSON.stringify({ success: true, dev_bypass: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const form = new FormData();
  form.append("secret", secret);
  form.append("response", token);
  if (ip) form.append("remoteip", ip);

  const verifyRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: form,
  });
  const result: TurnstileResponse = await verifyRes.json();

  if (!result.success) {
    return new Response(
      JSON.stringify({ success: false, errors: result["error-codes"] ?? [] }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (action && result.action && result.action !== action) {
    return new Response(
      JSON.stringify({ success: false, error: "action_mismatch" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(JSON.stringify({ success: true, hostname: result.hostname }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
