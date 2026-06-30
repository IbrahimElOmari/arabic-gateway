import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiQuery } from "@/lib/supabase-api";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, BookOpen, PlayCircle, CheckCircle2, Clock, Hourglass, Eye } from "lucide-react";

const MANUAL_TYPES = new Set(["open_text", "audio_upload", "video_upload", "file_upload"]);

type ExerciseStatus = "unread" | "in_progress" | "answered" | "awaiting_review" | "reviewed";

interface ExerciseRow {
  id: string;
  title: string;
  description: string | null;
  class_id: string;
  category_id: string;
  max_attempts: number | null;
  passing_score: number | null;
  release_date: string | null;
  due_date: string | null;
  classes?: { name: string | null } | null;
  exercise_categories?: { name: string | null; name_nl: string | null; name_en: string | null; name_ar: string | null } | null;
}

export default function StudentExercisesPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();

  // RLS "Enrolled students can view published exercises" returns only the right rows.
  const { data: exercises, isLoading } = useQuery({
    queryKey: ["student-class-exercises", user?.id],
    queryFn: () =>
      apiQuery<ExerciseRow[]>("exercises", (q) =>
        q
          .select(
            "id, title, description, class_id, category_id, max_attempts, passing_score, release_date, due_date, classes(name), exercise_categories(name, name_nl, name_en, name_ar)"
          )
          .eq("is_published", true)
          .order("release_date", { ascending: false })
      ),
    enabled: !!user,
  });

  const exerciseIds = exercises?.map((e) => e.id) ?? [];

  const { data: attempts } = useQuery({
    queryKey: ["student-class-exercise-attempts", user?.id, exerciseIds],
    queryFn: () =>
      apiQuery<any[]>("exercise_attempts", (q) =>
        q
          .select("id, exercise_id, attempt_number, started_at, submitted_at")
          .eq("student_id", user!.id)
          .in("exercise_id", exerciseIds)
          .order("attempt_number", { ascending: false })
      ),
    enabled: !!user && exerciseIds.length > 0,
  });

  const attemptIds = attempts?.map((a) => a.id) ?? [];

  const { data: answers } = useQuery({
    queryKey: ["student-class-exercise-answers", user?.id, attemptIds],
    queryFn: () =>
      apiQuery<any[]>("student_answers", (q) =>
        q
          .select("id, exercise_attempt_id, is_correct, reviewed_at, question_id, questions(type)")
          .in("exercise_attempt_id", attemptIds)
      ),
    enabled: attemptIds.length > 0,
  });

  const statusFor = (exerciseId: string): { status: ExerciseStatus; attemptCount: number; latestAttemptId: string | null } => {
    const exAttempts = (attempts ?? []).filter((a) => a.exercise_id === exerciseId);
    if (exAttempts.length === 0) return { status: "unread", attemptCount: 0, latestAttemptId: null };
    const latest = exAttempts[0]; // sorted desc
    if (!latest.submitted_at) return { status: "in_progress", attemptCount: exAttempts.length, latestAttemptId: latest.id };
    const ans = (answers ?? []).filter((a) => a.exercise_attempt_id === latest.id);
    const manual = ans.filter((a) => MANUAL_TYPES.has(a.questions?.type ?? ""));
    if (manual.length === 0) return { status: "answered", attemptCount: exAttempts.length, latestAttemptId: latest.id };
    const pending = manual.some((m) => !m.reviewed_at);
    return {
      status: pending ? "awaiting_review" : "reviewed",
      attemptCount: exAttempts.length,
      latestAttemptId: latest.id,
    };
  };

  const getCategoryName = (ex: ExerciseRow) => {
    const c = ex.exercise_categories;
    if (!c) return "";
    const lang = i18n.language;
    return (c as any)[`name_${lang}`] || c.name_en || c.name_nl || c.name || "";
  };

  const statusMeta: Record<ExerciseStatus, { label: string; icon: any; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    unread: { label: t("studentExercises.status.unread", "Ongelezen"), icon: BookOpen, variant: "secondary" },
    in_progress: { label: t("studentExercises.status.inProgress", "Bezig"), icon: PlayCircle, variant: "default" },
    answered: { label: t("studentExercises.status.answered", "Beantwoord"), icon: CheckCircle2, variant: "default" },
    awaiting_review: { label: t("studentExercises.status.awaiting", "Wacht op verbetering"), icon: Hourglass, variant: "outline" },
    reviewed: { label: t("studentExercises.status.reviewed", "Verbeterd"), icon: CheckCircle2, variant: "default" },
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">{t("studentExercises.title", "Oefeningen")}</h1>
        <p className="text-muted-foreground mt-1">
          {t("studentExercises.subtitle", "Je klas-oefeningen die op dit moment beschikbaar zijn.")}
        </p>
      </header>

      {(!exercises || exercises.length === 0) ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t("studentExercises.empty", "Er staan momenteel geen oefeningen voor je klaar.")}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {exercises.map((ex) => {
            const { status, attemptCount, latestAttemptId } = statusFor(ex.id);
            const max = ex.max_attempts ?? 0;
            const canRetake = max === 0 || attemptCount < max;
            const isSubmitted = status === "answered" || status === "awaiting_review" || status === "reviewed";
            const StatusIcon = statusMeta[status].icon;
            const categoryName = ex.exercise_categories?.name || "";

            return (
              <Card key={ex.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg">{ex.title}</CardTitle>
                    <Badge variant={statusMeta[status].variant} className="shrink-0">
                      <StatusIcon className="h-3 w-3 me-1" aria-hidden="true" />
                      {statusMeta[status].label}
                    </Badge>
                  </div>
                  <CardDescription className="flex flex-wrap gap-2 text-xs">
                    {ex.classes?.name && <span>{ex.classes.name}</span>}
                    {categoryName && (
                      <>
                        <span aria-hidden="true">•</span>
                        <span>{getCategoryName(ex)}</span>
                      </>
                    )}
                    {ex.due_date && (
                      <>
                        <span aria-hidden="true">•</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" aria-hidden="true" />
                          {new Date(ex.due_date).toLocaleDateString(i18n.language)}
                        </span>
                      </>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="mt-auto flex items-center justify-between gap-2">
                  <div className="text-xs text-muted-foreground">
                    {max > 0
                      ? t("studentExercises.attemptsUsed", "Pogingen: {{used}}/{{max}}", { used: attemptCount, max })
                      : t("studentExercises.attemptsUsedUnlimited", "Pogingen: {{used}}", { used: attemptCount })}
                  </div>
                  <div className="flex gap-2">
                    {isSubmitted && latestAttemptId && (
                      <Button asChild size="sm" variant="outline">
                        <Link to={`/exercises/${ex.id}/result`}>
                          <Eye className="h-4 w-4 me-1" aria-hidden="true" />
                          {t("studentExercises.viewResult", "Resultaat")}
                        </Link>
                      </Button>
                    )}
                    {canRetake && categoryName && (
                      <Button asChild size="sm">
                        <Link to={`/self-study/${encodeURIComponent(categoryName)}/${ex.id}`}>
                          <PlayCircle className="h-4 w-4 me-1" aria-hidden="true" />
                          {status === "in_progress"
                            ? t("studentExercises.continue", "Verder")
                            : isSubmitted
                              ? t("studentExercises.retake", "Opnieuw")
                              : t("studentExercises.start", "Start")}
                        </Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
