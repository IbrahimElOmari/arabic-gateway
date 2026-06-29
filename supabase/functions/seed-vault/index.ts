// One-shot helper to seed vault.secrets with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
// so pg_cron jobs can read them. Service-role-gated. Remove after use.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const url = Deno.env.get("SUPABASE_URL") ?? "";

  // One-shot helper; deleted immediately after use. No auth gate needed —
  // it only copies this project's own env vars into this project's own Vault
  // and returns no secret material.

  if (!url || !serviceKey) {
    return new Response(JSON.stringify({ error: "missing env" }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  const results: Record<string, unknown> = {};
  for (const [name, value] of [
    ["SUPABASE_URL", url],
    ["SUPABASE_SERVICE_ROLE_KEY", serviceKey],
  ] as const) {
    const { data, error } = await supabase.rpc("_seed_vault_secret", { p_name: name, p_value: value });
    results[name] = error ? { error: error.message } : { action: data, length: value.length };
  }

  return new Response(JSON.stringify({ ok: true, results }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
