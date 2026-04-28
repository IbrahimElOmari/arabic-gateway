import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { createLogger } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildLessonReminderEmail(params: {
  lang: string;
  name?: string | null;
  lessonTitle: string;
  className?: string | null;
  scheduledTime: string;
  minutesBefore: number;
  meetLink?: string | null;
}) {
  const safeName = escapeHtml(params.name || (params.lang === "en" ? "student" : params.lang === "ar" ? "الطالب" : "student"));
  const safeTitle = escapeHtml(params.lessonTitle);
  const safeClass = escapeHtml(params.className || "");
  const safeTime = escapeHtml(params.scheduledTime);
  const safeMeetLink = params.meetLink ? escapeHtml(params.meetLink) : "";

  const subject = params.lang === "en"
    ? `Reminder: ${params.lessonTitle} starts soon`
    : params.lang === "ar"
      ? `تذكير: ${params.lessonTitle} سيبدأ قريباً`
      : `Herinnering: ${params.lessonTitle} start binnenkort`;

  const intro = params.lang === "en"
    ? `Your lesson starts in about ${params.minutesBefore} minutes.`
    : params.lang === "ar"
      ? `سيبدأ درسك خلال حوالي ${params.minutesBefore} دقيقة.`
      : `Je les start over ongeveer ${params.minutesBefore} minuten.`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
      <p>${params.lang === "ar" ? "مرحباً" : "Hallo"} ${safeName},</p>
      <p>${escapeHtml(intro)}</p>
      <ul>
        <li><strong>${params.lang === "en" ? "Lesson" : params.lang === "ar" ? "الدرس" : "Les"}:</strong> ${safeTitle}</li>
        ${safeClass ? `<li><strong>${params.lang === "en" ? "Class" : params.lang === "ar" ? "الصف" : "Klas"}:</strong> ${safeClass}</li>` : ""}
        <li><strong>${params.lang === "en" ? "Time" : params.lang === "ar" ? "الوقت" : "Tijd"}:</strong> ${safeTime}</li>
      </ul>
      ${safeMeetLink ? `<p><a href="${safeMeetLink}" style="color: #2563eb;">${params.lang === "en" ? "Join lesson" : params.lang === "ar" ? "انضم إلى الدرس" : "Deelnemen aan les"}</a></p>` : ""}
    </div>
  `;

  return { subject, html };
}

serve(async (req: Request) => {
  const logger = createLogger("send-lesson-reminders", req);
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
              preferred_language,
              lesson_reminders,
              email_notifications
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
    let inAppRemindersCreated = 0;
    const resendKey = Deno.env.get("RESEND_API_KEY");

    for (const lesson of upcomingLessons) {
      const classData = lesson.classes as any;
      if (!classData?.class_enrollments) continue;

      const lessonDate = new Date(lesson.scheduled_at);
      const minutesBefore = Math.round((lessonDate.getTime() - now.getTime()) / (1000 * 60));

      for (const enrollment of classData.class_enrollments) {
        const profile = enrollment.profiles;
        if (!profile?.email) continue;
        if (profile.lesson_reminders === false) continue;

        const lang = profile.preferred_language || "nl";
        const scheduledTime = lessonDate.toLocaleString(
          lang === "ar" ? "ar-SA" : lang === "en" ? "en-US" : "nl-NL",
          { dateStyle: "short", timeStyle: "short" }
        );

        const title = lang === "en" ? "Lesson starts soon" : lang === "ar" ? "سيبدأ الدرس قريباً" : "Les start binnenkort";
        const message = lang === "en"
          ? `${lesson.title} starts at ${scheduledTime}.`
          : lang === "ar"
            ? `${lesson.title} يبدأ في ${scheduledTime}.`
            : `${lesson.title} start om ${scheduledTime}.`;

        const { data: existingReminder } = await supabase
          .from("notification_events")
          .select("id")
          .eq("user_id", enrollment.student_id)
          .eq("event_type", "lesson_reminder")
          .eq("related_id", lesson.id)
          .eq("channel", "in_app")
          .maybeSingle();

        if (!existingReminder) {
          await supabase.rpc("create_notification_event", {
            p_user_id: enrollment.student_id,
            p_event_type: "lesson_reminder",
            p_channel: "in_app",
            p_title: title,
            p_message: message,
            p_related_table: "lessons",
            p_related_id: lesson.id,
            p_metadata: { lessonTitle: lesson.title, scheduledTime, meetLink: lesson.meet_link },
          });
          inAppRemindersCreated++;
        }

        if (!resendKey || profile.email_notifications === false) continue;

        try {
          const email = buildLessonReminderEmail({
            lang,
            name: profile.full_name,
            lessonTitle: lesson.title,
            className: classData.name,
            scheduledTime,
            minutesBefore,
            meetLink: lesson.meet_link,
          });

          await fetch(`${supabaseUrl}/functions/v1/send-email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              to: profile.email,
              subject: email.subject,
              html: email.html,
            }),
          });
          remindersSent++;
        } catch (emailError) {
          console.error(`Failed to send reminder to ${profile.email}:`, emailError);
        }
      }
    }

    console.log(`Created ${inAppRemindersCreated} in-app reminders and sent ${remindersSent} emails for ${upcomingLessons.length} lessons`);

    return new Response(
      JSON.stringify({ 
        message: "Reminders sent successfully", 
        lessonsProcessed: upcomingLessons.length,
        inAppRemindersCreated,
        remindersSent: remindersSent
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    logger.error("Send lesson reminders error", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
