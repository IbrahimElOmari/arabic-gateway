import { apiQuery, apiMutate } from "@/lib/supabase-api";

/**
 * Recomputes total_score (percentage 0-100) and passed for an exercise_attempt,
 * based on the sum of student_answers.score divided by sum of questions.points
 * for that attempt. Uses the same rule the student-side submit uses.
 */
export async function recomputeExerciseAttempt(attemptId: string): Promise<void> {
  const attempt = await apiQuery<any>("exercise_attempts", (q) =>
    q
      .select("id, exercise_id, exercise:exercises(passing_score)")
      .eq("id", attemptId)
      .maybeSingle()
  );
  if (!attempt) return;

  const answers = await apiQuery<any[]>("student_answers", (q) =>
    q
      .select("score, question:questions(points)")
      .eq("exercise_attempt_id", attemptId)
  );

  let earned = 0;
  let max = 0;
  for (const a of answers || []) {
    const pts = Number(a.question?.points ?? 1);
    max += pts;
    earned += Number(a.score ?? 0);
  }

  const pct = max > 0 ? Math.round((earned / max) * 10000) / 100 : 0;
  const passingScore = Number(attempt.exercise?.passing_score ?? 60);
  const passed = pct >= passingScore;

  await apiMutate("exercise_attempts", (q) =>
    q.update({ total_score: pct, passed }).eq("id", attemptId)
  );
}
