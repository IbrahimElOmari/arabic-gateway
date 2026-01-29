import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ScheduleRequest {
  user_id: string;
  scheduled_at: string;
  meet_link: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify caller is admin or teacher
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!roleData || !["admin", "teacher"].includes(roleData.role)) {
      return new Response(
        JSON.stringify({ error: "Insufficient permissions" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { user_id, scheduled_at, meet_link }: ScheduleRequest = await req.json();

    if (!user_id || !scheduled_at || !meet_link) {
      return new Response(
        JSON.stringify({ error: "user_id, scheduled_at, and meet_link are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update placement test
    const { data: placement, error: updateError } = await supabase
      .from("placement_tests")
      .update({
        scheduled_at: scheduled_at,
        meet_link: meet_link,
        status: "scheduled",
      })
      .eq("user_id", user_id)
      .eq("status", "pending")
      .select()
      .single();

    if (updateError) {
      console.error("Error updating placement test:", updateError);
      throw new Error("Failed to schedule placement test");
    }

    // Get student profile for notification
    const { data: studentProfile } = await supabase
      .from("profiles")
      .select("email, full_name, preferred_language")
      .eq("user_id", user_id)
      .single();

    // Send email notification
    if (studentProfile?.email) {
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (resendKey) {
        try {
          await fetch(`${supabaseUrl}/functions/v1/send-email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              type: "placement_scheduled",
              to: studentProfile.email,
              language: studentProfile.preferred_language || "nl",
              data: {
                name: studentProfile.full_name,
                scheduledAt: new Date(scheduled_at).toLocaleString(
                  studentProfile.preferred_language === "ar" ? "ar-SA" : 
                  studentProfile.preferred_language === "en" ? "en-US" : "nl-NL",
                  { dateStyle: "full", timeStyle: "short" }
                ),
                meetLink: meet_link,
              },
            }),
          });
        } catch (emailError) {
          console.error("Failed to send placement scheduled email:", emailError);
        }
      }
    }

    console.log(`Scheduled placement test for user ${user_id} at ${scheduled_at}`);

    return new Response(
      JSON.stringify({ success: true, placement }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Schedule placement error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
