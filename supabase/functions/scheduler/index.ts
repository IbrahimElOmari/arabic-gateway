import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { createLogger } from "../_shared/logger.ts";

/**
 * Scheduler edge function — acts as a cron fallback when pg_cron is unavailable.
 * Invokes release-exercises and send-lesson-reminders sequentially.
 * 
 * Can be triggered:
 *   - Via HTTP POST (manual or external cron service)
 *   - Via Supabase scheduled invocations
 */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  const logger = createLogger("scheduler", req);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const results: Record<string, { status: number; message: string }> = {};

    // 1. Invoke release-exercises
    try {
      const releaseResp = await fetch(`${supabaseUrl}/functions/v1/release-exercises`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ triggered_by: "scheduler", time: new Date().toISOString() }),
      });
      const releaseBody = await releaseResp.text();
      results["release-exercises"] = { status: releaseResp.status, message: releaseBody };
      logger.info("release-exercises completed", { status: releaseResp.status });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results["release-exercises"] = { status: 500, message: msg };
      logger.error("release-exercises failed", { error: msg });
    }

    // 2. Invoke send-lesson-reminders
    try {
      const reminderResp = await fetch(`${supabaseUrl}/functions/v1/send-lesson-reminders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ triggered_by: "scheduler", time: new Date().toISOString() }),
      });
      const reminderBody = await reminderResp.text();
      results["send-lesson-reminders"] = { status: reminderResp.status, message: reminderBody };
      logger.info("send-lesson-reminders completed", { status: reminderResp.status });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results["send-lesson-reminders"] = { status: 500, message: msg };
      logger.error("send-lesson-reminders failed", { error: msg });
    }

    // 3. Log scheduler run
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      await supabase.from("admin_activity_log").insert({
        admin_id: "00000000-0000-0000-0000-000000000000",
        action: "scheduler_run",
        target_table: "system",
        details: { results, triggered_at: new Date().toISOString() },
      });
    } catch {
      // Non-critical — log failure silently
    }

    return new Response(
      JSON.stringify({ message: "Scheduler completed", results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    logger.error("Scheduler error", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
