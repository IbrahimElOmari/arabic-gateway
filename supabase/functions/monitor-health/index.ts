/**
 * Periodic health monitor. Pings the `health` edge function and a handful of
 * critical tables; on failure (or slow response > SLO) it inserts a row into
 * public.cron_alerts so the existing cron-alert-dispatcher fans it out to admins
 * as in-app notifications. When VITE_ERROR_MONITOR_DSN-style SENTRY_DSN secret
 * is set, the failure is also forwarded to Sentry via its public ingest API.
 *
 * Secrets (optional):
 *   SENTRY_DSN              – when set, failures are forwarded to Sentry
 *   HEALTH_SLO_MS           – override latency budget (default 1500)
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Probe {
  name: string;
  ok: boolean;
  latency_ms: number;
  detail?: string;
}

async function forwardToSentry(message: string, extra: Record<string, unknown>) {
  const dsn = Deno.env.get("SENTRY_DSN");
  if (!dsn) return;
  try {
    // Parse DSN: https://<key>@o<org>.ingest.sentry.io/<project>
    const u = new URL(dsn);
    const projectId = u.pathname.replace(/^\//, "");
    const key = u.username;
    const endpoint = `${u.protocol}//${u.host}/api/${projectId}/store/`;
    const auth = [
      "Sentry sentry_version=7",
      `sentry_client=hva-monitor/1.0`,
      `sentry_key=${key}`,
    ].join(", ");
    await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Sentry-Auth": auth },
      body: JSON.stringify({
        message,
        level: "error",
        platform: "javascript",
        environment: Deno.env.get("ENVIRONMENT") ?? "production",
        timestamp: new Date().toISOString(),
        extra,
      }),
    });
  } catch (e) {
    console.error("sentry forward failed", e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
  const sloMs = Number(Deno.env.get("HEALTH_SLO_MS") ?? "1500");

  const probes: Probe[] = [];

  // 1) health edge function
  {
    const t = performance.now();
    try {
      const r = await fetch(`${url}/functions/v1/health`, {
        headers: { apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? serviceKey },
      });
      const latency = Math.round(performance.now() - t);
      const body = await r.json();
      probes.push({
        name: "edge:health",
        ok: r.ok && body.status === "ok" && latency < sloMs,
        latency_ms: latency,
        detail: r.ok ? undefined : `status=${r.status} body=${JSON.stringify(body)}`,
      });
    } catch (e) {
      probes.push({ name: "edge:health", ok: false, latency_ms: Math.round(performance.now() - t), detail: String(e) });
    }
  }

  // 2) critical tables reachable via PostgREST
  for (const table of ["levels", "profiles", "user_roles"] as const) {
    const t = performance.now();
    const { error } = await supabase.from(table).select("*", { head: true, count: "exact" }).limit(1);
    const latency = Math.round(performance.now() - t);
    probes.push({
      name: `db:${table}`,
      ok: !error && latency < sloMs,
      latency_ms: latency,
      detail: error?.message,
    });
  }

  const failed = probes.filter((p) => !p.ok);

  if (failed.length > 0) {
    const summary = failed.map((p) => `${p.name} (${p.latency_ms}ms) ${p.detail ?? ""}`).join(" | ");
    await supabase.from("cron_alerts").insert({
      jobid: 0,
      jobname: "monitor-health",
      status: "failed",
      started_at: new Date().toISOString(),
      ended_at: new Date().toISOString(),
      return_message: summary.slice(0, 1000),
    });
    await forwardToSentry(`Health probes failed: ${failed.map((p) => p.name).join(",")}`, { probes });
  }

  return new Response(JSON.stringify({ probes, failed: failed.length, slo_ms: sloMs }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: failed.length ? 503 : 200,
  });
});
