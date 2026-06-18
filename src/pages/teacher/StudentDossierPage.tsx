import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiQuery, apiMutate, apiRpc } from "@/lib/supabase-api";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Loader2, FileText, Play, MessageCircle, Save, CheckCircle2, XCircle } from "lucide-react";
import { formatRelative } from "@/lib/date-utils";

const OPEN_TYPES = new Set(["open-tekst", "audio-opname", "bestand-upload"]);

interface Attempt {
  id: string;
  student_id: string;
  item_id: string;
  answer_text: string | null;
  answer_json: any;
  upload_path: string | null;
  is_correct: boolean | null;
  score: number | null;
  max_score: number | null;
  attempt_number: number | null;
  created_at: string;
}

interface ItemRow {
  id: string;
  item_id: string;
  unit_code: string;
  week: number | null;
  skill: string | null;
  exercise_type: string;
  question: string | null;
  instruction_nl: string | null;
  input_arabic: string | null;
  input_transliteration: string | null;
  input_translation_nl: string | null;
  options: any;
  correct_answer: string | null;
  correct_options: any;
  feedback_correct: string | null;
  feedback_incorrect: string | null;
}

interface FeedbackRow {
  id: string;
  curriculum_attempt_id: string | null;
  student_id: string;
  teacher_id: string;
  feedback_text: string;
  status: string;
  rubric_scores: any;
  created_at: string;
  updated_at: string;
}

function StudentFile({ path }: { path: string }) {
  const [url, setUrl] = useState<string>("");
  const [err, setErr] = useState<string>("");
  const { t } = useTranslation();
  useEffect(() => {
    let cancelled = false;
    supabase.storage
      .from("student-uploads")
      .createSignedUrl(path, 60 * 60)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) setErr(error.message);
        else setUrl(data?.signedUrl ?? "");
      });
    return () => {
      cancelled = true;
    };
  }, [path]);
  if (err) return <p className="text-xs text-destructive">{t("dossier.fileError", "Bestand niet beschikbaar")}: {err}</p>;
  if (!url) return <Loader2 className="h-4 w-4 animate-spin" />;
  const isAudio = /\.(webm|mp3|wav|m4a|ogg)$/i.test(path);
  const isVideo = /\.(mp4|webm|mov)$/i.test(path) && !isAudio;
  return (
    <div className="space-y-2">
      {isAudio && <audio controls src={url} className="w-full" />}
      {isVideo && <video controls src={url} className="w-full max-h-64 rounded-md" />}
      <Button variant="outline" size="sm" asChild>
        <a href={url} target="_blank" rel="noopener noreferrer">
          {isAudio ? <Play className="h-3 w-3 me-2" /> : <FileText className="h-3 w-3 me-2" />}
          {t("dossier.openFile", "Bestand openen")}
        </a>
      </Button>
    </div>
  );
}

function FeedbackEditor({
  attempt,
  studentId,
  existing,
  onSaved,
}: {
  attempt: Attempt;
  studentId: string;
  existing: FeedbackRow | undefined;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [text, setText] = useState(existing?.feedback_text ?? "");
  useEffect(() => setText(existing?.feedback_text ?? ""), [existing?.id]);

  const save = useMutation({
    mutationFn: async () => {
      if (!text.trim()) throw new Error(t("dossier.feedbackRequired", "Feedback mag niet leeg zijn."));
      if (existing) {
        await apiMutate("submission_feedback", (q) =>
          q
            .update({
              feedback_text: text,
              status: "reviewed",
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id)
        );
      } else {
        await apiMutate("submission_feedback", (q) =>
          q.insert({
            curriculum_attempt_id: attempt.id,
            student_id: studentId,
            teacher_id: user!.id,
            feedback_text: text,
            status: "reviewed",
            rubric_scores: {},
            student_answer_id: null,
          })
        );
      }
    },
    onSuccess: () => {
      toast({ title: t("dossier.feedbackSaved", "Feedback opgeslagen") });
      onSaved();
    },
    onError: (e: any) => {
      toast({ variant: "destructive", title: t("common.error", "Fout"), description: e?.message });
    },
  });

  return (
    <div className="space-y-2 border-t pt-3 mt-3">
      <p className="text-sm font-medium">{t("dossier.feedback", "Feedback")}</p>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder={t("dossier.feedbackPlaceholder", "Schrijf hier je feedback...")}
      />
      <div className="flex items-center justify-between">
        {existing && (
          <Badge variant="outline" className="text-xs">
            {t("dossier.statusReviewed", "Status")}: {existing.status}
          </Badge>
        )}
        <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : <Save className="h-4 w-4 me-2" />}
          {existing ? t("dossier.update", "Bijwerken") : t("dossier.send", "Verzenden")}
        </Button>
      </div>
    </div>
  );
}

export default function StudentDossierPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["dossier-profile", studentId],
    queryFn: () =>
      apiQuery<any>("profiles", (q) =>
        q.select("user_id,full_name,email,avatar_url").eq("user_id", studentId!).maybeSingle()
      ),
    enabled: !!studentId,
  });

  const { data: attempts, isLoading: attLoading, error: attError } = useQuery({
    queryKey: ["dossier-attempts", studentId],
    queryFn: () =>
      apiQuery<Attempt[]>("curriculum_item_attempts", (q) =>
        q.select("*").eq("student_id", studentId!).order("created_at", { ascending: false })
      ),
    enabled: !!studentId,
  });

  const itemIds = useMemo(
    () => Array.from(new Set((attempts ?? []).map((a) => a.item_id))),
    [attempts]
  );

  const { data: items } = useQuery({
    queryKey: ["dossier-items", itemIds.join(",")],
    queryFn: () =>
      apiQuery<ItemRow[]>("curriculum_items", (q) =>
        q
          .select(
            "id,item_id,unit_code,week,skill,exercise_type,question,instruction_nl,input_arabic,input_transliteration,input_translation_nl,options,correct_answer,correct_options,feedback_correct,feedback_incorrect"
          )
          .in("id", itemIds)
      ),
    enabled: itemIds.length > 0,
  });

  const itemMap = useMemo(() => {
    const m = new Map<string, ItemRow>();
    (items ?? []).forEach((i) => m.set(i.id, i));
    return m;
  }, [items]);

  const { data: feedbackList } = useQuery({
    queryKey: ["dossier-feedback", studentId],
    queryFn: () =>
      apiQuery<FeedbackRow[]>("submission_feedback", (q) =>
        q.select("*").eq("student_id", studentId!)
      ),
    enabled: !!studentId,
  });

  const feedbackByAttempt = useMemo(() => {
    const m = new Map<string, FeedbackRow>();
    (feedbackList ?? []).forEach((f) => {
      if (f.curriculum_attempt_id) m.set(f.curriculum_attempt_id, f);
    });
    return m;
  }, [feedbackList]);

  const { data: progress } = useQuery({
    queryKey: ["dossier-progress", studentId],
    queryFn: () =>
      apiQuery<any[]>("curriculum_progress", (q) =>
        q
          .select("unit_code,items_completed,items_correct,total_points,last_activity_at")
          .eq("student_id", studentId!)
          .order("last_activity_at", { ascending: false })
      ),
    enabled: !!studentId,
  });

  const { data: skillProgress } = useQuery({
    queryKey: ["dossier-skill-progress", studentId],
    queryFn: () =>
      apiQuery<any[]>("curriculum_progress_by_skill", (q) =>
        q.select("unit_code,skill,items_correct,items_attempted,points_total").eq("student_id", studentId!)
      ),
    enabled: !!studentId,
  });

  // Review queue: open-type attempts without feedback or not reviewed
  const reviewQueue = useMemo(() => {
    return (attempts ?? []).filter((a) => {
      const it = itemMap.get(a.item_id);
      if (!it || !OPEN_TYPES.has(it.exercise_type)) return false;
      const fb = feedbackByAttempt.get(a.id);
      return !fb || fb.status !== "reviewed";
    });
  }, [attempts, itemMap, feedbackByAttempt]);

  const startChat = useMutation({
    mutationFn: async () => apiRpc<string>("start_direct_chat", { _other: studentId }),
    onSuccess: (roomId) => {
      navigate(`/chat?room=${roomId}`);
    },
    onError: (e: any) =>
      toast({ variant: "destructive", title: t("common.error", "Fout"), description: e?.message }),
  });

  useEffect(() => {
    if (attError) {
      toast({
        variant: "destructive",
        title: t("common.error", "Fout"),
        description: (attError as Error).message,
      });
    }
  }, [attError, toast, t]);

  if (profileLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" asChild>
          <Link to="/teacher/workspace">
            <ArrowLeft className="h-4 w-4 me-2" />
            {t("common.back", "Terug")}
          </Link>
        </Button>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t("dossier.notFound", "Leerling niet gevonden of geen toegang.")}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" asChild className="-ms-2">
        <Link to="/teacher/workspace">
          <ArrowLeft className="h-4 w-4 me-2" />
          {t("dossier.backToWorkspace", "Terug naar werkruimte")}
        </Link>
      </Button>

      <Card>
        <CardContent className="pt-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={profile.avatar_url ?? undefined} />
              <AvatarFallback>{(profile.full_name ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-xl font-bold">{profile.full_name ?? "—"}</h1>
              <p className="text-sm text-muted-foreground">{profile.email}</p>
            </div>
          </div>
          <Button onClick={() => startChat.mutate()} disabled={startChat.isPending}>
            {startChat.isPending ? (
              <Loader2 className="h-4 w-4 me-2 animate-spin" />
            ) : (
              <MessageCircle className="h-4 w-4 me-2" />
            )}
            {t("dossier.message", "Bericht sturen")}
          </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="queue">
        <TabsList>
          <TabsTrigger value="queue">
            {t("dossier.tabQueue", "Nakijk-wachtrij")} ({reviewQueue.length})
          </TabsTrigger>
          <TabsTrigger value="attempts">
            {t("dossier.tabAttempts", "Antwoorden")} ({attempts?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="progress">{t("dossier.tabProgress", "Voortgang")}</TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="space-y-3">
          {attLoading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : reviewQueue.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                {t("dossier.queueEmpty", "Geen openstaande inzendingen.")}
              </CardContent>
            </Card>
          ) : (
            reviewQueue.map((a) => (
              <AttemptCard
                key={a.id}
                attempt={a}
                item={itemMap.get(a.item_id)}
                feedback={feedbackByAttempt.get(a.id)}
                studentId={studentId!}
                onSaved={() => qc.invalidateQueries({ queryKey: ["dossier-feedback", studentId] })}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="attempts" className="space-y-3">
          {attLoading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (attempts ?? []).length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                {t("dossier.noAttempts", "Nog geen antwoorden.")}
              </CardContent>
            </Card>
          ) : (
            (attempts ?? []).map((a) => (
              <AttemptCard
                key={a.id}
                attempt={a}
                item={itemMap.get(a.item_id)}
                feedback={feedbackByAttempt.get(a.id)}
                studentId={studentId!}
                onSaved={() => qc.invalidateQueries({ queryKey: ["dossier-feedback", studentId] })}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="progress" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("dossier.progressByUnit", "Voortgang per unit")}</CardTitle>
            </CardHeader>
            <CardContent>
              {(progress ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("dossier.noProgress", "Nog geen voortgang.")}
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-start text-muted-foreground border-b">
                      <th className="py-2 text-start">{t("dossier.unit", "Unit")}</th>
                      <th className="py-2 text-end">{t("dossier.completed", "Klaar")}</th>
                      <th className="py-2 text-end">{t("dossier.correct", "Juist")}</th>
                      <th className="py-2 text-end">{t("dossier.points", "Punten")}</th>
                      <th className="py-2 text-end">{t("dossier.lastActive", "Laatste")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(progress ?? []).map((p: any) => (
                      <tr key={p.unit_code} className="border-b last:border-0">
                        <td className="py-2">{p.unit_code}</td>
                        <td className="py-2 text-end">{p.items_completed ?? 0}</td>
                        <td className="py-2 text-end">{p.items_correct ?? 0}</td>
                        <td className="py-2 text-end">{p.total_points ?? 0}</td>
                        <td className="py-2 text-end text-xs">
                          {p.last_activity_at ? formatRelative(p.last_activity_at) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("dossier.progressBySkill", "Voortgang per skill")}</CardTitle>
            </CardHeader>
            <CardContent>
              {(skillProgress ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("dossier.noSkillProgress", "Nog geen skill-data.")}
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-start text-muted-foreground border-b">
                      <th className="py-2 text-start">{t("dossier.unit", "Unit")}</th>
                      <th className="py-2 text-start">{t("dossier.skill", "Skill")}</th>
                      <th className="py-2 text-end">{t("dossier.correct", "Juist")}</th>
                      <th className="py-2 text-end">{t("dossier.attempted", "Geprobeerd")}</th>
                      <th className="py-2 text-end">{t("dossier.points", "Punten")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(skillProgress ?? []).map((p: any, i: number) => (
                      <tr key={`${p.unit_code}-${p.skill}-${i}`} className="border-b last:border-0">
                        <td className="py-2">{p.unit_code}</td>
                        <td className="py-2">{p.skill}</td>
                        <td className="py-2 text-end">{p.items_correct ?? 0}</td>
                        <td className="py-2 text-end">{p.items_attempted ?? 0}</td>
                        <td className="py-2 text-end">{p.points_total ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AttemptCard({
  attempt,
  item,
  feedback,
  studentId,
  onSaved,
}: {
  attempt: Attempt;
  item: ItemRow | undefined;
  feedback: FeedbackRow | undefined;
  studentId: string;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const isOpen = item && OPEN_TYPES.has(item.exercise_type);
  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline">{item?.item_id ?? attempt.item_id}</Badge>
            {item?.unit_code && <Badge variant="secondary">{item.unit_code}</Badge>}
            {item?.skill && <Badge variant="outline">{item.skill}</Badge>}
            {item?.exercise_type && <Badge variant="outline">{item.exercise_type}</Badge>}
            {attempt.is_correct === true && (
              <Badge className="bg-success text-success-foreground gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {t("dossier.correctShort", "Juist")}
              </Badge>
            )}
            {attempt.is_correct === false && (
              <Badge variant="destructive" className="gap-1">
                <XCircle className="h-3 w-3" />
                {t("dossier.incorrectShort", "Onjuist")}
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {formatRelative(attempt.created_at)} · {attempt.score ?? 0}/{attempt.max_score ?? 0}
            {attempt.attempt_number ? ` · #${attempt.attempt_number}` : ""}
          </div>
        </div>

        {item?.question && <p className="text-sm font-medium">{item.question}</p>}

        {attempt.answer_text && (
          <div className="rounded-md bg-muted/50 p-3 text-sm whitespace-pre-wrap break-words">
            {attempt.answer_text}
          </div>
        )}
        {attempt.answer_json && !attempt.answer_text && (
          <pre className="rounded-md bg-muted/50 p-3 text-xs overflow-auto">
            {JSON.stringify(attempt.answer_json, null, 2)}
          </pre>
        )}

        {attempt.upload_path && <StudentFile path={attempt.upload_path} />}

        {feedback && !isOpen && (
          <div className="text-sm border-t pt-3">
            <p className="font-medium mb-1">{t("dossier.feedback", "Feedback")}</p>
            <p className="text-muted-foreground whitespace-pre-wrap">{feedback.feedback_text}</p>
          </div>
        )}

        {isOpen && (
          <FeedbackEditor
            attempt={attempt}
            studentId={studentId}
            existing={feedback}
            onSaved={onSaved}
          />
        )}
      </CardContent>
    </Card>
  );
}
