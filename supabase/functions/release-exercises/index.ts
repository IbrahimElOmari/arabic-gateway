import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find exercises that should be released
    const { data: exercisesToRelease, error: fetchError } = await supabase
      .from("exercises")
      .select(`
        id,
        title,
        class_id,
        classes (
          id,
          name,
          class_enrollments (
            student_id,
            profiles:student_id (
              email,
              full_name,
              preferred_language
            )
          )
        )
      `)
      .eq("is_published", false)
      .lte("release_date", new Date().toISOString());

    if (fetchError) {
      console.error("Error fetching exercises:", fetchError);
      throw fetchError;
    }

    if (!exercisesToRelease || exercisesToRelease.length === 0) {
      console.log("No exercises to release");
      return new Response(
        JSON.stringify({ message: "No exercises to release", count: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update exercises to published
    const exerciseIds = exercisesToRelease.map(e => e.id);
    const { error: updateError } = await supabase
      .from("exercises")
      .update({ is_published: true })
      .in("id", exerciseIds);

    if (updateError) {
      console.error("Error updating exercises:", updateError);
      throw updateError;
    }

    // Collect unique students to notify
    const studentsToNotify: Map<string, { email: string; name: string; language: string; exercises: string[] }> = new Map();

    for (const exercise of exercisesToRelease) {
      const classData = exercise.classes as any;
      if (!classData?.class_enrollments) continue;

      for (const enrollment of classData.class_enrollments) {
        const profile = enrollment.profiles;
        if (!profile?.email) continue;

        const studentId = enrollment.student_id;
        const existing = studentsToNotify.get(studentId);
        
        if (existing) {
          existing.exercises.push(exercise.title);
        } else {
          studentsToNotify.set(studentId, {
            email: profile.email,
            name: profile.full_name || "Student",
            language: profile.preferred_language || "nl",
            exercises: [exercise.title]
          });
        }
      }
    }

    // Send email notifications
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (resendKey && studentsToNotify.size > 0) {
      for (const [_, student] of studentsToNotify) {
        try {
          await fetch(`${supabaseUrl}/functions/v1/send-email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              type: "exercise_released",
              to: student.email,
              language: student.language,
              data: {
                name: student.name,
                exercises: student.exercises,
                dashboardUrl: `${Deno.env.get("SITE_URL") || "https://huisvanhetarabisch.nl"}/self-study`,
              },
            }),
          });
        } catch (emailError) {
          console.error(`Failed to send email to ${student.email}:`, emailError);
        }
      }
    }

    console.log(`Released ${exerciseIds.length} exercises, notified ${studentsToNotify.size} students`);

    return new Response(
      JSON.stringify({ 
        message: "Exercises released successfully", 
        count: exerciseIds.length,
        notified: studentsToNotify.size
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Release exercises error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
