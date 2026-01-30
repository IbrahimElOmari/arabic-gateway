import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TrackEventRequest {
  action: "track_event";
  eventType: string;
  eventName: string;
  pagePath?: string;
  referrer?: string;
  properties?: Record<string, any>;
  deviceType?: string;
  browser?: string;
  os?: string;
}

interface GetDashboardRequest {
  action: "get_dashboard";
  startDate: string;
  endDate: string;
  classId?: string;
  levelId?: string;
}

interface GetStudentAnalyticsRequest {
  action: "get_student_analytics";
  userId: string;
  weeks?: number;
}

interface UpdateDailyStatsRequest {
  action: "update_daily_stats";
  date: string;
}

type AnalyticsRequest = TrackEventRequest | GetDashboardRequest | GetStudentAnalyticsRequest | UpdateDailyStatsRequest;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user if authenticated
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    const body: AnalyticsRequest = await req.json();

    switch (body.action) {
      case "track_event": {
        const sessionId = crypto.randomUUID();

        await supabase
          .from("analytics_events")
          .insert({
            user_id: userId,
            session_id: sessionId,
            event_type: body.eventType,
            event_name: body.eventName,
            page_path: body.pagePath,
            referrer: body.referrer,
            properties: body.properties || {},
            device_type: body.deviceType,
            browser: body.browser,
            os: body.os,
          });

        // Update feature usage
        if (body.eventType === "feature_use") {
          const today = new Date().toISOString().split("T")[0];
          
          const { data: existing } = await supabase
            .from("feature_usage")
            .select("*")
            .eq("feature_name", body.eventName)
            .eq("usage_date", today)
            .single();

          if (existing) {
            await supabase
              .from("feature_usage")
              .update({ 
                usage_count: existing.usage_count + 1,
                unique_users: userId && !existing.unique_users_list?.includes(userId) 
                  ? existing.unique_users + 1 
                  : existing.unique_users
              })
              .eq("id", existing.id);
          } else {
            await supabase
              .from("feature_usage")
              .insert({
                feature_name: body.eventName,
                usage_date: today,
                usage_count: 1,
                unique_users: userId ? 1 : 0,
              });
          }
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "get_dashboard": {
        // Check admin role
        if (!userId) {
          return new Response(
            JSON.stringify({ error: "Unauthorized" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: role } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .single();

        if (role?.role !== "admin") {
          return new Response(
            JSON.stringify({ error: "Forbidden" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Get daily stats
        let statsQuery = supabase
          .from("analytics_daily_stats")
          .select("*")
          .gte("stat_date", body.startDate)
          .lte("stat_date", body.endDate)
          .order("stat_date", { ascending: true });

        if (body.classId) statsQuery = statsQuery.eq("class_id", body.classId);
        if (body.levelId) statsQuery = statsQuery.eq("level_id", body.levelId);

        const { data: dailyStats } = await statsQuery;

        // Get total users
        const { count: totalUsers } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true });

        // Get active users (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const { data: activeEvents } = await supabase
          .from("analytics_events")
          .select("user_id")
          .gte("created_at", sevenDaysAgo.toISOString())
          .not("user_id", "is", null);

        const activeUsers = new Set(activeEvents?.map(e => e.user_id) || []).size;

        // Get top features
        const { data: topFeatures } = await supabase
          .from("feature_usage")
          .select("*")
          .gte("usage_date", body.startDate)
          .lte("usage_date", body.endDate)
          .order("usage_count", { ascending: false })
          .limit(10);

        // Get enrollment stats
        const { count: totalEnrollments } = await supabase
          .from("class_enrollments")
          .select("*", { count: "exact", head: true })
          .eq("status", "enrolled");

        // Get exercise completion stats
        const { data: exerciseStats } = await supabase
          .from("exercise_attempts")
          .select("passed")
          .gte("submitted_at", body.startDate)
          .lte("submitted_at", body.endDate);

        const passedExercises = exerciseStats?.filter(e => e.passed).length || 0;
        const totalAttempts = exerciseStats?.length || 0;

        return new Response(
          JSON.stringify({
            success: true,
            dashboard: {
              dailyStats,
              summary: {
                totalUsers,
                activeUsers,
                totalEnrollments,
                exercisePassRate: totalAttempts > 0 ? (passedExercises / totalAttempts * 100).toFixed(1) : 0,
              },
              topFeatures,
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "get_student_analytics": {
        const weeks = body.weeks || 4;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - (weeks * 7));

        const { data: analytics } = await supabase
          .from("student_analytics")
          .select(`
            *,
            strongest_category:exercise_categories!student_analytics_strongest_category_fkey (name_nl, name_en, name_ar),
            weakest_category:exercise_categories!student_analytics_weakest_category_fkey (name_nl, name_en, name_ar)
          `)
          .eq("user_id", body.userId)
          .gte("week_start", startDate.toISOString().split("T")[0])
          .order("week_start", { ascending: false });

        const { data: points } = await supabase
          .from("user_points")
          .select("*")
          .eq("user_id", body.userId)
          .single();

        const { data: badges } = await supabase
          .from("user_badges")
          .select(`
            *,
            badge:badges (*)
          `)
          .eq("user_id", body.userId)
          .order("earned_at", { ascending: false });

        const { data: progress } = await supabase
          .from("student_progress")
          .select(`
            *,
            category:exercise_categories (name_nl, name_en, name_ar, icon)
          `)
          .eq("student_id", body.userId);

        return new Response(
          JSON.stringify({
            success: true,
            analytics: {
              weeklyData: analytics,
              points,
              badges,
              progress,
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "update_daily_stats": {
        // This would typically be called by a cron job
        const statDate = body.date || new Date().toISOString().split("T")[0];
        
        // Calculate daily stats
        const startOfDay = new Date(statDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(statDate);
        endOfDay.setHours(23, 59, 59, 999);

        // Get unique active users
        const { data: events } = await supabase
          .from("analytics_events")
          .select("user_id, session_id")
          .gte("created_at", startOfDay.toISOString())
          .lte("created_at", endOfDay.toISOString());

        const activeUsers = new Set(events?.filter(e => e.user_id).map(e => e.user_id) || []).size;
        const totalSessions = new Set(events?.map(e => e.session_id) || []).size;
        const pageViews = events?.length || 0;

        // Get new users
        const { count: newUsers } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .gte("created_at", startOfDay.toISOString())
          .lte("created_at", endOfDay.toISOString());

        // Get total users
        const { count: totalUsers } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .lte("created_at", endOfDay.toISOString());

        // Get exercise stats
        const { data: exercises } = await supabase
          .from("exercise_attempts")
          .select("submitted_at")
          .gte("started_at", startOfDay.toISOString())
          .lte("started_at", endOfDay.toISOString());

        const exercisesStarted = exercises?.length || 0;
        const exercisesCompleted = exercises?.filter(e => e.submitted_at).length || 0;

        // Get lesson attendance
        const { count: lessonsAttended } = await supabase
          .from("lesson_attendance")
          .select("*", { count: "exact", head: true })
          .eq("attended", true)
          .gte("created_at", startOfDay.toISOString())
          .lte("created_at", endOfDay.toISOString());

        // Upsert daily stats
        await supabase
          .from("analytics_daily_stats")
          .upsert({
            stat_date: statDate,
            total_users: totalUsers || 0,
            active_users: activeUsers,
            new_users: newUsers || 0,
            total_sessions: totalSessions,
            exercises_started: exercisesStarted,
            exercises_completed: exercisesCompleted,
            lessons_attended: lessonsAttended || 0,
            page_views: pageViews,
          }, {
            onConflict: "stat_date",
          });

        return new Response(
          JSON.stringify({ success: true, date: statDate }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("Analytics error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
