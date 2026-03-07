import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { createLogger } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface AwardPointsRequest {
  action: "award_points";
  userId: string;
  pointsAction: string;
  points: number;
  referenceId?: string;
  referenceType?: string;
}

interface CheckBadgesRequest {
  action: "check_badges";
  userId: string;
}

interface UpdateStreakRequest {
  action: "update_streak";
  userId: string;
}

interface GetLeaderboardRequest {
  action: "get_leaderboard";
  period: "weekly" | "monthly" | "all_time";
  classId?: string;
  levelId?: string;
  limit?: number;
}

type GamificationRequest = AwardPointsRequest | CheckBadgesRequest | UpdateStreakRequest | GetLeaderboardRequest;

serve(async (req) => {
  const logger = createLogger("gamification", req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // ── Auth: verify caller ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const callerUserId = claimsData.claims.sub as string;

    // Service-role client for privileged operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: GamificationRequest = await req.json();

    // ── Authorization: for write actions, caller must target themselves or be admin/teacher ──
    if (body.action === "award_points" || body.action === "check_badges" || body.action === "update_streak") {
      const targetUserId = body.userId;
      if (targetUserId !== callerUserId) {
        // Check if caller is admin or teacher
        const { data: callerRole } = await supabase.rpc("get_user_role", { _user_id: callerUserId });
        if (callerRole !== "admin" && callerRole !== "teacher") {
          return new Response(
            JSON.stringify({ error: "Forbidden: cannot modify another user's gamification data" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    switch (body.action) {
      case "award_points": {
        const { data: newTotal, error } = await supabase.rpc("award_points", {
          p_user_id: body.userId,
          p_action: body.pointsAction,
          p_points: body.points,
          p_reference_id: body.referenceId || null,
          p_reference_type: body.referenceType || null,
        });

        if (error) throw error;

        await checkAndAwardBadges(supabase, body.userId);

        return new Response(
          JSON.stringify({ success: true, newTotal }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "check_badges": {
        const newBadges = await checkAndAwardBadges(supabase, body.userId);
        return new Response(
          JSON.stringify({ success: true, newBadges }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "update_streak": {
        const { data: newStreak, error } = await supabase.rpc("update_user_streak", {
          p_user_id: body.userId,
        });

        if (error) throw error;

        const { data: userPoints } = await supabase
          .from("user_points")
          .select("current_streak, longest_streak")
          .eq("user_id", body.userId)
          .single();

        const streakBadges = [];
        if (userPoints) {
          if (userPoints.current_streak >= 7) {
            const badge = await tryAwardBadge(supabase, body.userId, "streak_7");
            if (badge) streakBadges.push(badge);
          }
          if (userPoints.current_streak >= 30) {
            const badge = await tryAwardBadge(supabase, body.userId, "streak_30");
            if (badge) streakBadges.push(badge);
          }
          if (userPoints.current_streak >= 100) {
            const badge = await tryAwardBadge(supabase, body.userId, "streak_100");
            if (badge) streakBadges.push(badge);
          }
        }

        return new Response(
          JSON.stringify({ success: true, newStreak, streakBadges }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "get_leaderboard": {
        // Read-only — any authenticated user can view
        let query = supabase
          .from("leaderboards")
          .select(`
            *,
            profiles:user_id (full_name, avatar_url)
          `)
          .eq("period", body.period)
          .order("points", { ascending: false })
          .limit(body.limit || 10);

        if (body.classId) {
          query = query.eq("class_id", body.classId);
        }
        if (body.levelId) {
          query = query.eq("level_id", body.levelId);
        }

        const { data, error } = await query;

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, leaderboard: data }),
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
    logger.error("Gamification error", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function tryAwardBadge(supabase: any, userId: string, badgeType: string): Promise<any | null> {
  const { data: badge } = await supabase
    .from("badges")
    .select("*")
    .eq("badge_type", badgeType)
    .single();

  if (!badge) return null;

  const { data: existing } = await supabase
    .from("user_badges")
    .select("id")
    .eq("user_id", userId)
    .eq("badge_id", badge.id)
    .single();

  if (existing) return null;

  await supabase
    .from("user_badges")
    .insert({ user_id: userId, badge_id: badge.id });

  await supabase.rpc("award_points", {
    p_user_id: userId,
    p_action: "badge_earned",
    p_points: badge.points_value,
    p_reference_id: badge.id,
    p_reference_type: "badge",
  });

  return badge;
}

async function checkAndAwardBadges(supabase: any, userId: string): Promise<any[]> {
  const newBadges = [];

  const { data: userPoints } = await supabase
    .from("user_points")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (!userPoints) return [];

  if (userPoints.exercises_completed >= 1) {
    const badge = await tryAwardBadge(supabase, userId, "first_exercise");
    if (badge) newBadges.push(badge);
  }

  if (userPoints.lessons_attended >= 1) {
    const badge = await tryAwardBadge(supabase, userId, "first_lesson");
    if (badge) newBadges.push(badge);
  }

  if (userPoints.perfect_scores >= 1) {
    const badge = await tryAwardBadge(supabase, userId, "perfect_score");
    if (badge) newBadges.push(badge);
  }

  if (userPoints.exercises_completed >= 50) {
    const badge = await tryAwardBadge(supabase, userId, "dedication");
    if (badge) newBadges.push(badge);
  }

  const now = new Date();
  const hour = now.getHours();

  if (hour >= 0 && hour < 5) {
    const badge = await tryAwardBadge(supabase, userId, "night_owl");
    if (badge) newBadges.push(badge);
  }

  if (hour >= 5 && hour < 7) {
    const badge = await tryAwardBadge(supabase, userId, "early_bird");
    if (badge) newBadges.push(badge);
  }

  const { data: progress } = await supabase
    .from("student_progress")
    .select("category_id")
    .eq("student_id", userId)
    .gt("exercises_completed", 0);

  if (progress && progress.length >= 5) {
    const badge = await tryAwardBadge(supabase, userId, "all_categories");
    if (badge) newBadges.push(badge);
  }

  return newBadges;
}
