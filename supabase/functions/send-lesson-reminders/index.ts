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

    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    // Find lessons starting in the next 1-2 hours
    const { data: upcomingLessons, error: fetchError } = await supabase
      .from("lessons")
      .select(`
        id,
        title,
        scheduled_at,
        meet_link,
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
      .eq("status", "scheduled")
      .gte("scheduled_at", oneHourFromNow.toISOString())
      .lte("scheduled_at", twoHoursFromNow.toISOString());

    if (fetchError) {
      console.error("Error fetching lessons:", fetchError);
      throw fetchError;
    }

    if (!upcomingLessons || upcomingLessons.length === 0) {
      console.log("No lessons starting in the next hour");
      return new Response(
        JSON.stringify({ message: "No lessons to remind about", count: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let remindersSent = 0;
    const resendKey = Deno.env.get("RESEND_API_KEY");

    if (!resendKey) {
      console.log("RESEND_API_KEY not configured, skipping email notifications");
      return new Response(
        JSON.stringify({ message: "Email not configured", count: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    for (const lesson of upcomingLessons) {
      const classData = lesson.classes as any;
      if (!classData?.class_enrollments) continue;

      const lessonDate = new Date(lesson.scheduled_at);
      const minutesBefore = Math.round((lessonDate.getTime() - now.getTime()) / (1000 * 60));

      for (const enrollment of classData.class_enrollments) {
        const profile = enrollment.profiles;
        if (!profile?.email) continue;

        const lang = profile.preferred_language || "nl";
        const scheduledTime = lessonDate.toLocaleString(
          lang === "ar" ? "ar-SA" : lang === "en" ? "en-US" : "nl-NL",
          { dateStyle: "short", timeStyle: "short" }
        );

        try {
          await fetch(`${supabaseUrl}/functions/v1/send-email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              type: "lesson_reminder",
              to: profile.email,
              language: lang,
              data: {
                name: profile.full_name,
                lessonTitle: lesson.title,
                className: classData.name,
                scheduledTime: scheduledTime,
                minutesBefore: minutesBefore,
                meetLink: lesson.meet_link,
              },
            }),
          });
          remindersSent++;
        } catch (emailError) {
          console.error(`Failed to send reminder to ${profile.email}:`, emailError);
        }
      }
    }

    console.log(`Sent ${remindersSent} lesson reminders for ${upcomingLessons.length} lessons`);

    return new Response(
      JSON.stringify({ 
        message: "Reminders sent successfully", 
        lessonsProcessed: upcomingLessons.length,
        remindersSent: remindersSent
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Send lesson reminders error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
