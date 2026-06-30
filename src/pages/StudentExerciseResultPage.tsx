import { useTranslation } from "react-i18next";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiQuery } from "@/lib/supabase-api";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, CheckCircle2, XCircle, Hourglass, MessageSquare } from "lucide-react";

const MANUAL_TYPES = new Set(["open_text", "audio_upload", "video_upload", "file_upload"]);

export default function StudentExerciseResultPage() {
  const { t, i18n } = useTranslation();
  const { exerciseId } = useParams<{ exerciseId: string }>();
  const { user } = useAuth();

  const { data: exercise } = useQuery({
    queryKey: ["exercise-result-meta", exerciseId],
    queryFn: () =>
      apiQuery<any>("exercises", (q) =>
        q.select("id, title, description, passing_score").eq("id", exerciseId).maybeSingle()
      ),
    enabled: !!exerciseId,
  });

  const { data: latestAttempt, isLoading: attemptLoading } = useQuery({
    queryKey: ["exercise-result-attempt", exerciseId, user?.id],
    queryFn: async () => {
      const rows = await apiQuery<any[]>("exercise_attempts", (q) =>
        q
          .select("*")
          .eq("exercise_id", exerciseId)
          .eq("student_id", user!.id)
          .order("attempt_number", { ascending: false })
          .limit(1)
      );
      return rows?.[0] ?? null;
    },
    enabled: !!user && !!exerciseId,
  });

  const { data: questions } = useQuery({
    queryKey: ["exercise-result-questions", exerciseId],
    queryFn: () =>
      apiQuery<any[]>("questions", (q) =>
        q.select("*").eq("exercise_id", exerciseId).order("display_order")
      ),
    enabled: !!exerciseId,
  });

  const { data: answers } = useQuery({
    queryKey: ["exercise-result-answers", latestAttempt?.id],
    queryFn: () =>
      apiQuery<any[]>("student_answers", (q) =>
        q.select("*").eq("exercise_attempt_id", latestAttempt!.id)
      ),
    enabled: !!latestAttempt?.id,
  });

  const { data: feedbacks } = useQuery({
    queryKey: ["exercise-result-feedback", answers?.map((a) => a.id).join(",")],
    queryFn: () =>
      apiQuery<any[]>("submission_feedback", (q) =>
        q.select("*").in("student_answer_id", answers!.map((a) => a.id))
      ),
    enabled: !!answers && answers.length > 0,
  });

  const getLocalizedText = (text: any) => {
    if (!text || typeof text !== "object") return text ?? "";
    return text[i18n.language] || text.en || text.nl || text.ar || "";
  };

  if (attemptLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!latestAttempt || !latestAttempt.submitted_at) {
    return (
      <div className="container py-8">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link to="/exercises">
            <ArrowLeft className="h-4 w-4 me-1" aria-hidden="true" />
            {t("studentExercises.back", "Terug naar oefeningen")}
          </Link>
        </Button>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t("studentExercises.noSubmission", "Je hebt deze oefening nog niet ingeleverd.")}
          </CardContent>
        </Card>
      </div>
    );
  }

  const answersByQid: Record<string, any> = {};
  (answers ?? []).forEach((a) => {
    answersByQid[a.question_id] = a;
  });
  const fbByAnswerId: Record<string, any[]> = {};
  (feedbacks ?? []).forEach((f) => {
    (fbByAnswerId[f.student_answer_id] ||= []).push(f);
  });

  const pendingManual = (answers ?? []).some((a) => {
    const q = questions?.find((qq) => qq.id === a.question_id);
    return q && MANUAL_TYPES.has(q.type) && !a.reviewed_at;
  });

  const passingScore = exercise?.passing_score ?? 60;
  const totalScore = Number(latestAttempt.total_score ?? 0);
  const passed = !!latestAttempt.passed;

  return (
    <div className="container py-8">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link to="/exercises">
          <ArrowLeft className="h-4 w-4 me-1" aria-hidden="true" />
          {t("studentExercises.back", "Terug naar oefeningen")}
        </Link>
      </Button>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-2xl">{exercise?.title}</CardTitle>
          <CardDescription>
            {t("studentExercises.submittedAt", "Ingeleverd op")}{" "}
            {new Date(latestAttempt.submitted_at).toLocaleString(i18n.language)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-4xl font-bold text-foreground">{totalScore.toFixed(0)}%</div>
            {pendingManual ? (
              <Badge variant="outline" className="text-sm">
                <Hourglass className="h-3 w-3 me-1" aria-hidden="true" />
                {t("studentExercises.pendingTeacher", "Wacht nog op nakijk door de leerkracht")}
              </Badge>
            ) : passed ? (
              <Badge className="text-sm">
                <CheckCircle2 className="h-3 w-3 me-1" aria-hidden="true" />
                {t("studentExercises.passed", "Geslaagd")}
              </Badge>
            ) : (
              <Badge variant="destructive" className="text-sm">
                <XCircle className="h-3 w-3 me-1" aria-hidden="true" />
                {t("studentExercises.notPassed", "Niet geslaagd")}
              </Badge>
            )}
            <span className="text-sm text-muted-foreground">
              {t("studentExercises.passingScore", "Slaaggrens: {{p}}%", { p: passingScore })}
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {(questions ?? []).map((q, idx) => {
          const a = answersByQid[q.id];
          const isManual = MANUAL_TYPES.has(q.type);
          const isAr = i18n.language === "ar";
          const fbs = a ? fbByAnswerId[a.id] ?? [] : [];

          return (
            <Card key={q.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">
                    {t("exercises.question", "Vraag")} {idx + 1}: {getLocalizedText(q.question_text)}
                  </CardTitle>
                  {!isManual && a && (
                    a.is_correct ? (
                      <Badge>
                        <CheckCircle2 className="h-3 w-3 me-1" aria-hidden="true" />
                        {t("studentExercises.correct", "Goed")}
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <XCircle className="h-3 w-3 me-1" aria-hidden="true" />
                        {t("studentExercises.incorrect", "Fout")}
                      </Badge>
                    )
                  )}
                  {isManual && a && !a.reviewed_at && (
                    <Badge variant="outline">
                      <Hourglass className="h-3 w-3 me-1" aria-hidden="true" />
                      {t("studentExercises.pendingReview", "In nakijk")}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3" dir={isAr ? "rtl" : undefined}>
                <div>
                  <div className="text-xs font-semibold text-muted-foreground mb-1">
                    {t("studentExercises.yourAnswer", "Jouw antwoord")}
                  </div>
                  <div className="text-sm whitespace-pre-wrap break-words">
                    {a?.file_url ? (
                      <a href={a.file_url} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                        {t("studentExercises.viewUpload", "Bekijk upload")}
                      </a>
                    ) : a?.answer_data ? (
                      JSON.stringify(a.answer_data.selected ?? a.answer_data)
                    ) : a?.answer_text ? (
                      a.answer_text
                    ) : (
                      <span className="text-muted-foreground italic">{t("studentExercises.noAnswer", "Geen antwoord")}</span>
                    )}
                  </div>
                </div>

                {!isManual && (
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground mb-1">
                      {t("studentExercises.correctAnswer", "Juiste antwoord")}
                    </div>
                    <div className="text-sm whitespace-pre-wrap break-words">
                      {q.type === "multiple_choice" && Array.isArray(q.options)
                        ? q.options.find((o: any) => o.isCorrect)?.label ?? "—"
                        : q.type === "checkbox" && Array.isArray(q.options)
                          ? q.options.filter((o: any) => o.isCorrect).map((o: any) => o.label).join(", ")
                          : q.type === "ordering" && Array.isArray(q.options)
                            ? [...q.options].sort((x: any, y: any) => (x.order ?? 0) - (y.order ?? 0)).map((o: any) => o.label).join(" → ")
                            : q.correct_answer
                              ? typeof q.correct_answer === "string"
                                ? q.correct_answer
                                : JSON.stringify(q.correct_answer)
                              : "—"}
                    </div>
                  </div>
                )}

                {q.explanation && (
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground mb-1">
                      {t("studentExercises.explanation", "Uitleg")}
                    </div>
                    <div className="text-sm whitespace-pre-wrap">{q.explanation}</div>
                  </div>
                )}

                {a?.feedback && (
                  <div className="rounded-md bg-muted/50 p-3">
                    <div className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" aria-hidden="true" />
                      {t("studentExercises.teacherFeedback", "Leerkracht-feedback")}
                    </div>
                    <div className="text-sm whitespace-pre-wrap">{a.feedback}</div>
                  </div>
                )}

                {fbs.map((f) => (
                  <div key={f.id} className="rounded-md bg-muted/50 p-3">
                    <div className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" aria-hidden="true" />
                      {t("studentExercises.teacherFeedback", "Leerkracht-feedback")}
                    </div>
                    <div className="text-sm whitespace-pre-wrap">{f.feedback_text}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
