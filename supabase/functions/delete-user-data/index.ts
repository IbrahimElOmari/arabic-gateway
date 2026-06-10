// GDPR Art. 17 — Right to erasure.
// Deletes the authenticated user's profile data and auth record.
// FK cascades on `profiles.user_id` and friends remove related rows;
// storage objects under `<bucket>/<userId>/...` are removed best-effort.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLogger } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-request-id",
};

const STORAGE_BUCKETS = ["avatars", "user-uploads", "lesson-recordings"];

async function purgeBucket(supabase: ReturnType<typeof createClient>, bucket: string, userId: string) {
  try {
    const { data, error } = await supabase.storage.from(bucket).list(userId, { limit: 1000 });
    if (error || !data?.length) return;
    const paths = data.map((f) => `${userId}/${f.name}`);
    await supabase.storage.from(bucket).remove(paths);
  } catch (_) {
    // Best-effort; ignore individual bucket errors.
  }
}

Deno.serve(async (req) => {
  const logger = createLogger("delete-user-data", req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    if (body?.confirm !== "DELETE") {
      return new Response(JSON.stringify({ error: "Missing confirmation" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logger.setUserId(user.id);
    logger.info("User-initiated account deletion requested");

    // Audit trail before deletion.
    await supabase.from("data_retention_log").insert({
      user_id: user.id,
      action: "account_deletion",
      details: { email: user.email, ip: req.headers.get("x-forwarded-for") || "unknown" },
    });

    // Best-effort storage cleanup.
    await Promise.all(STORAGE_BUCKETS.map((b) => purgeBucket(supabase, b, user.id)));

    // Delete auth user. FK cascades drop related public.* rows.
    const { error: delError } = await supabase.auth.admin.deleteUser(user.id);
    if (delError) {
      logger.error("auth.admin.deleteUser failed", { error: delError.message });
      return new Response(JSON.stringify({ error: "Account deletion failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logger.info("Account deleted");
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    logger.error("Delete error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
