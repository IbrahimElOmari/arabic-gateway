// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MAX_ATTEMPTS = 3;

/**
 * Polls public.cron_alerts for unnotified failures, fans them out as
 * in-app notifications to every admin, and moves alerts that exceed
 * MAX_ATTEMPTS to public.cron_dead_letter.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // ── Cron-poort: alleen aanroepen met de service-role-sleutel mogen deze functie triggeren ──
  const authHeader = req.headers.get("Authorization") ?? "";

  if (authHeader !== `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }


  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  const result = { processed: 0, notified: 0, dead_lettered: 0, errors: [] as string[] };

  try {
    const { data: alerts, error } = await supabase
      .from("cron_alerts")
      .select("*")
      .is("acknowledged_at", null)
      .is("notified_at", null)
      .order("created_at", { ascending: true })
      .limit(50);

    if (error) throw error;

    const { data: admins, error: adminErr } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");
    if (adminErr) throw adminErr;
    const adminIds = (admins ?? []).map((r: any) => r.user_id);

    for (const alert of alerts ?? []) {
      result.processed += 1;
      const attempts = (alert.notification_attempts ?? 0) + 1;

      try {
        if (adminIds.length === 0) throw new Error("no admins to notify");

        const rows = adminIds.map((uid) => ({
          user_id: uid,
          type: "cron_failure",
          title: `Cron job failed: ${alert.jobname}`,
          message:
            alert.return_message?.slice(0, 280) ??
            `Status: ${alert.status}`,
          data: {
            alert_id: alert.id,
            jobid: alert.jobid,
            jobname: alert.jobname,
            status: alert.status,
            started_at: alert.started_at,
            ended_at: alert.ended_at,
          },
        }));

        const { error: insErr } = await supabase
          .from("notifications")
          .insert(rows);
        if (insErr) throw insErr;

        await supabase
          .from("cron_alerts")
          .update({
            notified_at: new Date().toISOString(),
            notification_attempts: attempts,
            last_notification_error: null,
          })
          .eq("id", alert.id);

        result.notified += 1;
      } catch (e: any) {
        const msg = e?.message ?? String(e);
        result.errors.push(`${alert.id}: ${msg}`);

        if (attempts >= MAX_ATTEMPTS) {
          await supabase.from("cron_dead_letter").insert({
            alert_id: alert.id,
            jobid: alert.jobid,
            jobname: alert.jobname,
            status: alert.status,
            return_message: alert.return_message,
            started_at: alert.started_at,
            ended_at: alert.ended_at,
            attempts,
            last_error: msg,
          });
          // Mark alert as notified so it stops looping; acknowledged stays null.
          await supabase
            .from("cron_alerts")
            .update({
              notified_at: new Date().toISOString(),
              notification_attempts: attempts,
              last_notification_error: msg,
            })
            .eq("id", alert.id);
          result.dead_lettered += 1;
        } else {
          await supabase
            .from("cron_alerts")
            .update({
              notification_attempts: attempts,
              last_notification_error: msg,
            })
            .eq("id", alert.id);
        }
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e?.message ?? String(e), ...result }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
