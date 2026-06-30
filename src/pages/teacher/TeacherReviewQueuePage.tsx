import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, FileCheck, CheckCircle, XCircle, Play, FileText } from "lucide-react";
import { format } from "date-fns";
import { apiQuery, apiMutate } from "@/lib/supabase-api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { recomputeExerciseAttempt } from "@/lib/exercise-recompute";

// ---------- Self-study (curriculum) tab ----------
interface AttemptRow {
  id: string;
  student_id: string;
  item_id: string;
  answer_text: string | null;
  created_at: string;
}
interface ItemRow {
  id: string;
  unit_code: string | null;
  instruction_nl: string | null;
  question: string | null;
}
interface ProfileRow {
  user_id: string;
  full_name: string | null;
}
interface ReviewRow extends AttemptRow {
  item: ItemRow | null;
  studentName: string;
}

function SelfStudyTab() {
  const navigate = useNavigate();
  const { data: rows, isLoading } = useQuery({
    queryKey: ["teacher-review-queue"],
    queryFn: async (): Promise<ReviewRow[]> => {
      const attempts = await apiQuery<AttemptRow[]>("curriculum_item_attempts", (q) =>
        q
          .select("id, student_id, item_id, answer_text, created_at")
          .is("is_correct", null)
          .order("created_at", { ascending: false })
      );
      if (!attempts || attempts.length === 0) return [];
      const itemIds = Array.from(new Set(attempts.map((a) => a.item_id)));
      const studentIds = Array.from(new Set(attempts.map((a) => a.student_id)));
      const [items, profiles] = await Promise.all([
        apiQuery<ItemRow[]>("curriculum_items", (q) => q.select("id, unit_code, instruction_nl, question").in("id", itemIds)),
        apiQuery<ProfileRow[]>("profiles", (q) => q.select("user_id, full_name").in("user_id", studentIds)),
      ]);
      const itemMap = new Map((items || []).map((i) => [i.id, i]));
      const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));
      return attempts.map((a) => ({
        ...a,
        item: itemMap.get(a.item_id) || null,
        studentName: profileMap.get(a.student_id)?.full_name || "Onbekende leerling",
      }));
    },
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (!rows || rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">Geen openstaande inzendingen.</CardContent>
      </Card>
    );
  }
  return (
    <div className="space-y-3">
      {rows.map((r) => {
        const week = r.item?.unit_code || "—";
        const oef = r.item?.instruction_nl || r.item?.question || "Oefening";
        const answer = (r.answer_text || "").trim();
        const shortAnswer = answer.length > 160 ? answer.slice(0, 160) + "…" : answer;
        return (
          <Card
            key={r.id}
            className="cursor-pointer transition-colors hover:bg-accent/40"
            onClick={() => navigate(`/teacher/students/${r.student_id}`)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                navigate(`/teacher/students/${r.student_id}`);
              }
            }}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <CardTitle className="text-base">{r.studentName}</CardTitle>
                <Badge variant="secondary">{format(new Date(r.created_at), "dd-MM-yyyy HH:mm")}</Badge>
              </div>
              <CardDescription>
                <span className="font-medium">Week {week}</span> · {oef}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap break-words" dir="auto">
                {shortAnswer || <span className="italic text-muted-foreground">(geen tekst)</span>}
              </p>
              <div className="mt-3 flex justify-end">
                <Button size="sm" variant="outline">Open dossier</Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ---------- Class-exercises tab ----------
function ClassExercisesTab() {
  const { t } = useTranslation();
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<any>(null);
  const [feedback, setFeedback] = useState("");
  const [score, setScore] = useState("");
  const [fileSignedUrl, setFileSignedUrl] = useState<string>("");

  const { data: classes } = useQuery({
    queryKey: ["teacher-classes-review", user?.id, isAdmin],
    queryFn: () =>
      isAdmin
        ? apiQuery<any[]>("classes", (q) => q.select("id").eq("is_active", true))
        : apiQuery<any[]>("classes", (q) => q.select("id").eq("teacher_id", user!.id)),
    enabled: !!user,
  });
  const classIds = (classes || []).map((c: any) => c.id);

  const { data: exerciseIds } = useQuery({
    queryKey: ["teacher-class-exercise-ids", classIds],
    queryFn: async () => {
      const rows = await apiQuery<any[]>("exercises", (q) => q.select("id").in("class_id", classIds));
      return (rows || []).map((r: any) => r.id);
    },
    enabled: classIds.length > 0,
  });

  const { data: questionIds } = useQuery({
    queryKey: ["teacher-class-question-ids", exerciseIds],
    queryFn: async () => {
      // Only questions that require manual review belong in the review queue
      const MANUAL_TYPES = ["open_text", "audio_upload", "video_upload", "file_upload"];
      const rows = await apiQuery<any[]>("questions", (q) =>
        q.select("id").in("exercise_id", exerciseIds!).in("type", MANUAL_TYPES)
      );
      return (rows || []).map((r: any) => r.id);
    },
    enabled: !!exerciseIds && exerciseIds.length > 0,
  });

  const { data: pending, isLoading } = useQuery({
    queryKey: ["teacher-class-pending-review", questionIds],
    queryFn: async () => {
      const answers = await apiQuery<any[]>("student_answers", (q) =>
        q
          .select(`
            id, answer_text, file_url, answer_data, submitted_at, score, feedback, is_correct, reviewed_at,
            student_id, exercise_attempt_id, question_id,
            question:questions(question_text, points, type, exercise:exercises(id, title, passing_score, class:classes(name)))
          `)
          .is("reviewed_at", null)
          .in("question_id", questionIds!)
          .order("submitted_at", { ascending: false })
      );
      if (!answers || answers.length === 0) return [];
      const studentIds = Array.from(new Set(answers.map((a: any) => a.student_id).filter(Boolean)));
      const profiles = studentIds.length
        ? await apiQuery<any[]>("profiles", (q) =>
            q.select("user_id, full_name, email").in("user_id", studentIds)
          )
        : [];
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      return answers.map((a: any) => ({
        ...a,
        student: profileMap.get(a.student_id) || null,
      }));
    },
    enabled: !!questionIds && questionIds.length > 0,
    refetchInterval: 60000,
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, isCorrect }: { id: string; isCorrect: boolean }) => {
      const maxPts = Number(selected?.question?.points ?? 1);
      const finalScore = isCorrect ? maxPts : (parseFloat(score) || 0);
      await apiMutate("student_answers", (q) =>
        q
          .update({
            score: finalScore,
            feedback,
            is_correct: isCorrect,
            reviewed_by: user!.id,
            reviewed_at: new Date().toISOString(),
          })
          .eq("id", id)
      );
      if (selected?.exercise_attempt_id) {
        await recomputeExerciseAttempt(selected.exercise_attempt_id);
      }
      try {
        await apiMutate("notifications", (q) =>
          q.insert({
            user_id: selected.student_id,
            type: "submission_feedback",
            title: t("teacher.feedbackPublished", "Nieuwe feedback beschikbaar"),
            message: t("teacher.feedbackPublishedMessage", "Je leerkracht heeft je inzending nagekeken."),
            data: { student_answer_id: id },
          })
        );
      } catch (e) {
        console.error(e);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-class-pending-review"] });
      queryClient.invalidateQueries({ queryKey: ["pending-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["reviewed-submissions"] });
      setSelected(null);
      setFeedback("");
      setScore("");
      setFileSignedUrl("");
      toast({ title: t("teacher.submissionReviewed", "Inzending nagekeken") });
    },
    onError: (e: any) => {
      toast({ variant: "destructive", title: t("common.error", "Fout"), description: e?.message });
    },
  });

  const openSubmission = async (s: any) => {
    setSelected(s);
    setFeedback(s.feedback || "");
    setScore(s.score?.toString() || "");
    setFileSignedUrl("");
    if (s.file_url && !s.file_url.startsWith("http")) {
      const { data } = await supabase.storage.from("student-uploads").createSignedUrl(s.file_url, 3600);
      setFileSignedUrl(data?.signedUrl || "");
    } else if (s.file_url) {
      setFileSignedUrl(s.file_url);
    }
  };

  const getQuestionText = (q: any) => {
    const txt = q?.question_text;
    if (!txt) return "";
    if (typeof txt === "object") return txt.nl || txt.en || txt.ar || JSON.stringify(txt);
    return String(txt);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!pending || pending.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          {t("teacher.noPendingSubmissions", "Geen openstaande inzendingen.")}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-3 md:grid-cols-2">
        {pending.map((s: any) => (
          <Card key={s.id} className="cursor-pointer hover:bg-accent/40" onClick={() => openSubmission(s)}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <CardTitle className="text-base">{s.student?.full_name || "—"}</CardTitle>
                <Badge variant="secondary">{s.submitted_at ? format(new Date(s.submitted_at), "dd-MM-yyyy HH:mm") : "—"}</Badge>
              </div>
              <CardDescription>
                {s.question?.exercise?.title}{s.question?.exercise?.class?.name ? ` · ${s.question.exercise.class.name}` : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-2" dir="auto">
                {s.answer_text || (s.file_url ? t("teacher.fileSubmission", "Bestand-inzending") : "—")}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("teacher.reviewSubmission", "Inzending nakijken")}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">{t("teacher.student", "Leerling")}</Label>
                <p className="font-medium">{selected.student?.full_name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">{t("teacher.question", "Vraag")}</Label>
                <p dir="auto">{getQuestionText(selected.question)}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">{t("teacher.answer", "Antwoord")}</Label>
                {selected.answer_text ? (
                  <p className="p-3 bg-muted rounded-lg whitespace-pre-wrap" dir="auto">{selected.answer_text}</p>
                ) : selected.file_url ? (
                  <Button variant="outline" asChild disabled={!fileSignedUrl}>
                    <a href={fileSignedUrl || "#"} target="_blank" rel="noopener noreferrer">
                      {selected.question?.type?.includes("audio") ? <Play className="h-4 w-4 mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
                      {t("teacher.viewFile", "Bekijk bestand")}
                    </a>
                  </Button>
                ) : (
                  <p className="text-muted-foreground">{t("teacher.noAnswer", "Geen antwoord")}</p>
                )}
              </div>
              <div>
                <Label>{t("teacher.feedback", "Feedback")}</Label>
                <Textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={3} dir="auto" />
              </div>
              <div>
                <Label>{t("teacher.partialScore", "Score (optioneel)")}</Label>
                <Input
                  type="number"
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  placeholder={`Max: ${selected.question?.points ?? 1}`}
                  min={0}
                  max={selected.question?.points ?? 1}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => reviewMutation.mutate({ id: selected.id, isCorrect: false })} disabled={reviewMutation.isPending}>
                  <XCircle className="h-4 w-4 mr-2 text-destructive" />
                  {t("teacher.markIncorrect", "Markeer fout")}
                </Button>
                <Button className="flex-1" onClick={() => reviewMutation.mutate({ id: selected.id, isCorrect: true })} disabled={reviewMutation.isPending}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {t("teacher.markCorrect", "Markeer goed")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function TeacherReviewQueuePage() {
  const { t } = useTranslation();
  return (
    <div className="container mx-auto p-6 space-y-6" dir="auto">
      <div className="flex items-center gap-3">
        <FileCheck className="h-6 w-6" />
        <div>
          <h1 className="text-2xl font-bold">{t("teacher.reviewQueue", "Na te kijken")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("teacher.reviewQueueDesc", "Inzendingen die wachten op jouw beoordeling.")}
          </p>
        </div>
      </div>
      <Tabs defaultValue="selfstudy">
        <TabsList>
          <TabsTrigger value="selfstudy">{t("teacher.selfStudyTab", "Zelfstudie")}</TabsTrigger>
          <TabsTrigger value="class">{t("teacher.classExercisesTab", "Klas-oefeningen")}</TabsTrigger>
        </TabsList>
        <TabsContent value="selfstudy" className="mt-6">
          <SelfStudyTab />
        </TabsContent>
        <TabsContent value="class" className="mt-6">
          <ClassExercisesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
