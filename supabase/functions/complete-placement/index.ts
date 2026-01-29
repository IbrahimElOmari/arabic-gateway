import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CompletePlacementRequest {
  placement_test_id: string;
  assigned_level_id: string;
  assessment_notes?: string;
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

    const { placement_test_id, assigned_level_id, assessment_notes }: CompletePlacementRequest = await req.json();

    if (!placement_test_id || !assigned_level_id) {
      return new Response(
        JSON.stringify({ error: "placement_test_id and assigned_level_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the placement test
    const { data: placementTest, error: fetchError } = await supabase
      .from("placement_tests")
      .select("*")
      .eq("id", placement_test_id)
      .single();

    if (fetchError || !placementTest) {
      throw new Error("Placement test not found");
    }

    // Update placement test
    const { error: updateError } = await supabase
      .from("placement_tests")
      .update({
        status: "completed",
        assigned_level_id: assigned_level_id,
        assessed_by: user.id,
        assessment_notes: assessment_notes || null,
      })
      .eq("id", placement_test_id);

    if (updateError) throw updateError;

    // Get level info
    const { data: level } = await supabase
      .from("levels")
      .select("id, name, name_nl, name_en, name_ar")
      .eq("id", assigned_level_id)
      .single();

    // Find a starter class for this level
    const { data: starterClass } = await supabase
      .from("classes")
      .select("id, name")
      .eq("level_id", assigned_level_id)
      .eq("is_active", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    // Auto-enroll in starter class if available
    let enrollmentCreated = false;
    if (starterClass) {
      // Check current enrollment count
      const { count } = await supabase
        .from("class_enrollments")
        .select("*", { count: "exact", head: true })
        .eq("class_id", starterClass.id)
        .eq("status", "enrolled");

      // Get max students
      const { data: classData } = await supabase
        .from("classes")
        .select("max_students")
        .eq("id", starterClass.id)
        .single();

      const maxStudents = classData?.max_students || 50;

      if ((count || 0) < maxStudents) {
        const { error: enrollError } = await supabase
          .from("class_enrollments")
          .insert({
            class_id: starterClass.id,
            student_id: placementTest.user_id,
            status: "enrolled",
          });

        if (!enrollError) {
          enrollmentCreated = true;
          
          // Cancel any pending deletion
          await supabase.rpc("cancel_user_deletion", { p_user_id: placementTest.user_id });
        }
      }
    }

    // Get student profile for notification
    const { data: studentProfile } = await supabase
      .from("profiles")
      .select("email, full_name, preferred_language")
      .eq("user_id", placementTest.user_id)
      .single();

    // Send email notification
    if (studentProfile?.email) {
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (resendKey) {
        const lang = studentProfile.preferred_language || "nl";
        const levelName = lang === "ar" ? level?.name_ar : 
                          lang === "en" ? level?.name_en : level?.name_nl;

        try {
          await fetch(`${supabaseUrl}/functions/v1/send-email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              type: "placement_completed",
              to: studentProfile.email,
              language: lang,
              data: {
                name: studentProfile.full_name,
                levelName: levelName,
                className: enrollmentCreated ? starterClass?.name : null,
                dashboardUrl: `${Deno.env.get("SITE_URL") || "https://huisvanhetarabisch.nl"}/dashboard`,
              },
            }),
          });
        } catch (emailError) {
          console.error("Failed to send placement completed email:", emailError);
        }
      }
    }

    console.log(`Completed placement ${placement_test_id}, assigned level ${assigned_level_id}, enrolled: ${enrollmentCreated}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        assignedLevel: level,
        enrolledInClass: enrollmentCreated ? starterClass : null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Complete placement error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
