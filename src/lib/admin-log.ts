import { supabase } from "@/integrations/supabase/client";

/**
 * Log an admin action to the admin_activity_log table.
 * Fire-and-forget — errors are silently logged to console.
 */
export async function logAdminAction(
  adminId: string,
  action: string,
  targetTable?: string,
  targetId?: string,
  details?: Record<string, unknown>
): Promise<void> {
  try {
    await supabase.from("admin_activity_log").insert([{
      admin_id: adminId,
      action,
      target_table: targetTable ?? null,
      target_id: targetId ?? null,
      details: (details as any) ?? null,
    }]);
  } catch (err) {
    console.error("[AdminLog] Failed to log action:", err);
  }
}
