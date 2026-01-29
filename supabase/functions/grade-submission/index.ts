import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GradeRequest {
  exercise_attempt_id: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { exercise_attempt_id }: GradeRequest = await req.json();

    if (!exercise_attempt_id) {
      return new Response(
        JSON.stringify({ error: "exercise_attempt_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the attempt with exercise details
    const { data: attempt, error: attemptError } = await supabase
      .from("exercise_attempts")
      .select(`
        *,
        exercises (
          id,
          title,
          passing_score,
          class_id,
          classes (
            teacher_id
          )
        )
      `)
      .eq("id", exercise_attempt_id)
      .single();

    if (attemptError || !attempt) {
      throw new Error("Attempt not found");
    }

    // Get all questions for this exercise
    const { data: questions, error: questionsError } = await supabase
      .from("questions")
      .select("*")
      .eq("exercise_id", attempt.exercise_id)
      .order("display_order");

    if (questionsError) throw questionsError;

    // Get student answers for this attempt
    const { data: studentAnswers, error: answersError } = await supabase
      .from("student_answers")
      .select("*")
      .eq("exercise_attempt_id", exercise_attempt_id);

    if (answersError) throw answersError;

    let totalPoints = 0;
    let earnedPoints = 0;
    let hasManualQuestions = false;

    // Grade each question
    for (const question of questions || []) {
      totalPoints += question.points;
      
      const studentAnswer = studentAnswers?.find(a => a.question_id === question.id);
      if (!studentAnswer) continue;

      const isAutoGradable = ["multiple_choice", "checkbox"].includes(question.type);

      if (isAutoGradable && question.correct_answer) {
        // Compare answers
        const isCorrect = JSON.stringify(studentAnswer.answer_data) === JSON.stringify(question.correct_answer);
        
        const score = isCorrect ? question.points : 0;
        earnedPoints += score;

        // Update student answer
        await supabase
          .from("student_answers")
          .update({
            is_correct: isCorrect,
            score: score,
          })
          .eq("id", studentAnswer.id);
      } else {
        // Manual grading required
        hasManualQuestions = true;
        await supabase
          .from("student_answers")
          .update({
            is_correct: null,
            score: null,
          })
          .eq("id", studentAnswer.id);
      }
    }

    // Calculate percentage score
    const percentageScore = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    const exercise = attempt.exercises as any;
    const passed = !hasManualQuestions && percentageScore >= (exercise?.passing_score || 60);

    // Update attempt
    const { error: updateError } = await supabase
      .from("exercise_attempts")
      .update({
        total_score: hasManualQuestions ? null : percentageScore,
        passed: hasManualQuestions ? null : passed,
        submitted_at: new Date().toISOString(),
      })
      .eq("id", exercise_attempt_id);

    if (updateError) throw updateError;

    // Get student profile for notification
    const { data: studentProfile } = await supabase
      .from("profiles")
      .select("email, full_name, preferred_language")
      .eq("user_id", attempt.student_id)
      .single();

    // Send email notification to student (if auto-graded)
    if (!hasManualQuestions && studentProfile?.email) {
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
              type: "submission_feedback",
              to: studentProfile.email,
              language: studentProfile.preferred_language || "nl",
              data: {
                name: studentProfile.full_name,
                exerciseTitle: exercise?.title,
                score: percentageScore,
                passed: passed,
                reviewUrl: `${Deno.env.get("SITE_URL") || "https://huisvanhetarabisch.nl"}/self-study`,
              },
            }),
          });
        } catch (emailError) {
          console.error("Failed to send student notification:", emailError);
        }
      }
    }

    // Notify teacher if manual grading required
    if (hasManualQuestions) {
      const teacherId = exercise?.classes?.teacher_id;
      if (teacherId) {
        const { data: teacherProfile } = await supabase
          .from("profiles")
          .select("email, preferred_language")
          .eq("user_id", teacherId)
          .single();

        if (teacherProfile?.email) {
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
                  type: "teacher_review_needed",
                  to: teacherProfile.email,
                  language: teacherProfile.preferred_language || "nl",
                  data: {
                    studentName: studentProfile?.full_name,
                    exerciseTitle: exercise?.title,
                    reviewUrl: `${Deno.env.get("SITE_URL") || "https://huisvanhetarabisch.nl"}/teacher/submissions`,
                  },
                }),
              });
            } catch (emailError) {
              console.error("Failed to send teacher notification:", emailError);
            }
          }
        }
      }
    }

    console.log(`Graded attempt ${exercise_attempt_id}: ${percentageScore}%, passed: ${passed}, manual: ${hasManualQuestions}`);

    return new Response(
      JSON.stringify({
        success: true,
        score: percentageScore,
        passed: passed,
        requiresManualReview: hasManualQuestions,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Grade submission error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
