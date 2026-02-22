import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLogger } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  const logger = createLogger("export-user-data", req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;

    // Fetch all user data in parallel
    const [
      profileRes,
      pointsRes,
      badgesRes,
      enrollmentsRes,
      attemptsRes,
      attendanceRes,
      analyticsRes,
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("user_points").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("user_badges").select("*, badge:badges(name_nl, name_en, name_ar)").eq("user_id", userId),
      supabase.from("class_enrollments").select("*, class:classes(name)").eq("student_id", userId),
      supabase.from("exercise_attempts").select("exercise_id, attempt_number, total_score, passed, submitted_at").eq("student_id", userId).order("submitted_at", { ascending: false }).limit(100),
      supabase.from("lesson_attendance").select("lesson_id, attended, joined_at").eq("student_id", userId).limit(100),
      supabase.from("student_analytics").select("*").eq("user_id", userId).order("week_start", { ascending: false }).limit(52),
    ]);

    const exportData = {
      exported_at: new Date().toISOString(),
      user_id: userId,
      email: user.email,
      profile: profileRes.data,
      gamification: {
        points: pointsRes.data,
        badges: badgesRes.data || [],
      },
      enrollments: enrollmentsRes.data || [],
      exercise_attempts: attemptsRes.data || [],
      lesson_attendance: attendanceRes.data || [],
      weekly_analytics: analyticsRes.data || [],
    };

    return new Response(JSON.stringify(exportData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    logger.error("Export error", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});