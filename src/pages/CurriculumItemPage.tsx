import { useState, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiQuery, apiMutate } from "@/lib/supabase-api";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, CheckCircle2, XCircle, AlertTriangle, Mic, Square, Upload, GripVertical, Pencil } from "lucide-react";
import { CurriculumItemEditDialog, type EditableItem } from "@/components/curriculum/CurriculumItemEditDialog";
import { CurriculumItemMediaView } from "@/components/curriculum/CurriculumItemMediaView";

interface Item {
  id: string;
  item_id: string;
  unit_code: string;
  week: number;
  skill: string;
  exercise_type: string;
  exercise_subtype: string | null;
  instruction_nl: string;
  question: string;
  options: any;
  correct_answer: string;
  correct_options: any;
  feedback_correct: string;
  feedback_incorrect: string;
  input_arabic: string;
  input_transliteration: string;
  input_translation_nl: string;
  points: number | null;
  review_flag: string | null;
  audio_url: string | null;
  image_url: string | null;
  needs_ns_audio: boolean;
  needs_image: boolean;
  needs_student_recording: boolean;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i] as T;
    a[i] = a[j] as T;
    a[j] = tmp;
  }
  return a;
}

function normalize(s: string): string {
  return (s || "").trim().toLowerCase().replace(/\s+/g, " ");
}

export default function CurriculumItemPage() {
  const { itemId } = useParams<{ itemId: string }>();
  const { t } = useTranslation();
  const { user, isAdmin, isTeacher } = useAuth();
  const canEdit = isAdmin || isTeacher;
  const [editing, setEditing] = useState<EditableItem | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: item, isLoading } = useQuery({
    queryKey: ["curriculum-item", itemId],
    queryFn: () =>
      apiQuery<Item>("curriculum_items", (q) =>
        q.select("*").eq("id", itemId).maybeSingle()
      ),
    enabled: !!itemId,
  });

  const [answer, setAnswer] = useState<any>(null);
  const [submitted, setSubmitted] = useState<null | { correct: boolean; feedback: string }>(null);

  // Audio recording
  const [recording, setRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Ordering
  const shuffledOptions = useMemo(() => {
    if (!item || item.exercise_type !== "rangschikken") return [];
    const opts = Array.isArray(item.options) ? (item.options as string[]) : [];
    return shuffle(opts);
  }, [item]);

  const [orderingState, setOrderingState] = useState<string[] | null>(null);
  const currentOrder = orderingState ?? shuffledOptions;

  const submitAttempt = useMutation({
    mutationFn: async (payload: { is_correct: boolean; answer_text: string; answer_json: any; upload_path?: string | null; score: number }) => {
      if (!user || !item) throw new Error("not ready");
      return apiMutate("curriculum_item_attempts", (q) =>
        q.insert({
          student_id: user.id,
          item_id: item.id,
          answer_text: payload.answer_text,
          answer_json: payload.answer_json,
          upload_path: payload.upload_path ?? null,
          is_correct: payload.is_correct,
          score: payload.score,
          max_score: item.points ?? 1,
          attempt_number: 1,
        })
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["unit-attempts"] });
      qc.invalidateQueries({ queryKey: ["curriculum-progress"] });
    },
  });

  if (isLoading || !item) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  const cur: Item = item;

  const opts: string[] = Array.isArray(cur.options) ? cur.options : [];
  const correctOpts: string[] = Array.isArray(cur.correct_options) ? cur.correct_options : [];
  const needsReview = /CONTROLEER|ONTBREEKT/i.test(cur.review_flag ?? "");

  // --- Submission handlers per type ---
  async function handleSubmit() {
    let isCorrect = false;
    let answerText = "";
    let answerJson: any = null;
    let uploadPath: string | null = null;

    switch (cur.exercise_type) {
      case "meerkeuze":
        answerText = String(answer ?? "");
        isCorrect = normalize(answerText) === normalize(cur.correct_answer);
        break;
      case "meerdere-antwoorden": {
        const sel: string[] = Array.isArray(answer) ? answer : [];
        answerJson = sel;
        answerText = sel.join(" | ");
        const expected = correctOpts.map(normalize).sort();
        const got = sel.map(normalize).sort();
        isCorrect = expected.length === got.length && expected.every((v, i) => v === got[i]);
        break;
      }
      case "open-tekst":
        answerText = String(answer ?? "");
        isCorrect = normalize(answerText) === normalize(cur.correct_answer);
        break;
      case "gatentekst": {
        const fills: string[] = Array.isArray(answer) ? answer : [];
        answerJson = fills;
        answerText = fills.join(" | ");
        const expected = (cur.correct_answer ?? "").split("|").map(normalize);
        isCorrect = fills.length === expected.length && fills.every((v, i) => normalize(v) === expected[i]);
        break;
      }
      case "rangschikken": {
        const order = currentOrder;
        answerJson = order;
        answerText = order.join(" | ");
        const expected = (cur.correct_answer ?? "").split("|").map(normalize);
        if (expected.length === order.length) {
          isCorrect = order.every((v, i) => normalize(v) === expected[i]);
        } else {
          // Fallback: correct order = original options array
          isCorrect = opts.every((v, i) => normalize(v) === normalize(order[i] ?? ""));
        }
        break;
      }
      case "koppelen": {
        const pairs: Record<string, string> = (answer ?? {}) as Record<string, string>;
        answerJson = pairs;
        answerText = JSON.stringify(pairs);
        const expectedPairs = (cur.correct_answer ?? "").split("|");
        const expected: Record<string, string> = {};
        expectedPairs.forEach((p) => {
          const [l, r] = (p ?? "").split("=");
          if (l && r) expected[normalize(l)] = normalize(r);
        });
        const keys = Object.keys(expected);
        isCorrect =
          keys.length > 0 &&
          keys.every((k) => normalize(pairs[k] ?? "") === expected[k]);
        break;
      }
      case "bestand-upload":
      case "audio-opname": {
        if (!recordedBlob && !(answer instanceof File)) {
          toast({ variant: "destructive", title: t("curriculum.uploadRequired", "Upload of opname vereist") });
          return;
        }
        const blob: Blob = recordedBlob ?? (answer as File);
        const ext = cur.exercise_type === "audio-opname" ? "webm" : (answer instanceof File ? answer.name.split(".").pop() : "bin");
        const path = `${user!.id}/${cur.id}/${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from("student-uploads").upload(path, blob, { upsert: false });
        if (error) {
          toast({ variant: "destructive", title: t("common.error", "Fout"), description: error.message });
          return;
        }
        uploadPath = path;
        answerText = path;
        isCorrect = true; // Manual review; mark as submitted/correct for progress tracking
        break;
      }
    }

    try {
      await submitAttempt.mutateAsync({
        is_correct: isCorrect,
        answer_text: answerText,
        answer_json: answerJson,
        upload_path: uploadPath,
        score: isCorrect ? cur.points ?? 1 : 0,
      });
      setSubmitted({
        correct: isCorrect,
        feedback: isCorrect ? cur.feedback_correct : cur.feedback_incorrect,
      });
    } catch (e: any) {
      toast({ variant: "destructive", title: t("common.error", "Fout"), description: e?.message });
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      mr.onstop = () => {
        setRecordedBlob(new Blob(chunksRef.current, { type: "audio/webm" }));
        stream.getTracks().forEach((tr) => tr.stop());
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Microfoon", description: e?.message });
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  function moveOrder(idx: number, dir: -1 | 1) {
    const next = [...currentOrder];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j] as string, next[idx] as string];
    setOrderingState(next);
  }

  // --- Render per type ---
  function renderInteraction() {
    if (submitted) return null;
    switch (cur.exercise_type) {
      case "meerkeuze":
        return (
          <RadioGroup value={answer ?? ""} onValueChange={setAnswer} className="space-y-2">
            {opts.map((o, i) => (
              <div key={i} className="flex items-center gap-3 border rounded-md p-3 hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value={o} id={`o-${i}`} />
                <Label htmlFor={`o-${i}`} className="flex-1 cursor-pointer">{o}</Label>
              </div>
            ))}
          </RadioGroup>
        );
      case "meerdere-antwoorden": {
        const sel: string[] = Array.isArray(answer) ? answer : [];
        return (
          <div className="space-y-2">
            {opts.map((o, i) => (
              <div key={i} className="flex items-center gap-3 border rounded-md p-3 hover:bg-muted/50">
                <Checkbox
                  id={`c-${i}`}
                  checked={sel.includes(o)}
                  onCheckedChange={(v) =>
                    setAnswer(v ? [...sel, o] : sel.filter((x) => x !== o))
                  }
                />
                <Label htmlFor={`c-${i}`} className="flex-1 cursor-pointer">{o}</Label>
              </div>
            ))}
          </div>
        );
      }
      case "open-tekst":
        return (
          <Textarea
            value={answer ?? ""}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder={t("curriculum.typeAnswer", "Typ je antwoord...")}
            rows={4}
          />
        );
      case "gatentekst": {
        const blanks = (cur.correct_answer ?? "").split("|");
        const fills: string[] = Array.isArray(answer) ? answer : blanks.map(() => "");
        return (
          <div className="space-y-3">
            {cur.question && <p className="text-muted-foreground">{cur.question}</p>}
            {blanks.map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Label className="w-16">#{i + 1}</Label>
                <Input
                  value={fills[i] ?? ""}
                  onChange={(e) => {
                    const next = [...fills];
                    next[i] = e.target.value;
                    setAnswer(next);
                  }}
                />
              </div>
            ))}
          </div>
        );
      }
      case "rangschikken":
        return (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {t("curriculum.orderHint", "Zet de items in de juiste volgorde.")}
            </p>
            {currentOrder.map((o, i) => (
              <div key={`${o}-${i}`} className="flex items-center gap-2 border rounded-md p-3">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1">{o}</span>
                <Button size="sm" variant="outline" onClick={() => moveOrder(i, -1)} disabled={i === 0}>↑</Button>
                <Button size="sm" variant="outline" onClick={() => moveOrder(i, 1)} disabled={i === currentOrder.length - 1}>↓</Button>
              </div>
            ))}
          </div>
        );
      case "koppelen": {
        const lefts = opts;
        const expectedPairs = (cur.correct_answer ?? "").split("|");
        const rights = expectedPairs.map((p) => (p ?? "").split("=")[1]).filter(Boolean) as string[];
        const shuffledRights = useMemoShuffle(rights, cur.id);
        const pairs: Record<string, string> = (answer ?? {}) as Record<string, string>;
        return (
          <div className="space-y-2">
            {lefts.map((l, i) => (
              <div key={i} className="flex items-center gap-3 border rounded-md p-3">
                <span className="flex-1 font-medium">{l}</span>
                <select
                  className="border rounded-md px-3 py-2 bg-background"
                  value={pairs[l] ?? ""}
                  onChange={(e) => setAnswer({ ...pairs, [l]: e.target.value })}
                >
                  <option value="">—</option>
                  {shuffledRights.map((r, j) => (
                    <option key={j} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        );
      }
      case "audio-opname":
        return (
          <div className="space-y-3">
            {!recording && !recordedBlob && (
              <Button onClick={startRecording} variant="default">
                <Mic className="h-4 w-4 mr-2" />
                {t("curriculum.startRecording", "Start opname")}
              </Button>
            )}
            {recording && (
              <Button onClick={stopRecording} variant="destructive">
                <Square className="h-4 w-4 mr-2" />
                {t("curriculum.stopRecording", "Stop opname")}
              </Button>
            )}
            {recordedBlob && (
              <div className="space-y-2">
                <audio controls src={URL.createObjectURL(recordedBlob)} className="w-full" />
                <Button variant="outline" size="sm" onClick={() => setRecordedBlob(null)}>
                  {t("curriculum.recordAgain", "Opnieuw opnemen")}
                </Button>
              </div>
            )}
          </div>
        );
      case "bestand-upload":
        return (
          <div className="space-y-2">
            <label className="flex items-center gap-2 border-2 border-dashed rounded-md p-6 cursor-pointer hover:bg-muted/50">
              <Upload className="h-5 w-5" />
              <span>{answer instanceof File ? answer.name : t("curriculum.chooseFile", "Kies bestand")}</span>
              <input
                type="file"
                className="hidden"
                onChange={(e) => setAnswer(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
        );
      default:
        return <p className="text-muted-foreground">{t("curriculum.unknownType", "Onbekend oefentype")}: {cur.exercise_type}</p>;
    }
  }

  return (
    <div className="container py-8 max-w-3xl">
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" asChild>
          <Link to={`/self-study/unit/${cur.unit_code}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("common.back", "Terug")}
          </Link>
        </Button>
        {canEdit && (
          <Button variant="outline" onClick={() => setEditing(cur as unknown as EditableItem)}>
            <Pencil className="h-4 w-4 mr-2" />
            {t("common.edit", "Wijzigen")}
          </Button>
        )}
      </div>


      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <Badge variant="outline">{cur.item_id}</Badge>
            <Badge variant="secondary">{t(`skills.${cur.skill}`, cur.skill)}</Badge>
            <Badge variant="outline">{t(`exerciseTypes.${cur.exercise_type}`, cur.exercise_type)}</Badge>
            <Badge variant="outline">{cur.points ?? 0} pt</Badge>
            {needsReview && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                {t("curriculum.inReview", "in review")}
              </Badge>
            )}
          </div>
          <CardTitle className="text-xl">{cur.instruction_nl}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Arabic input */}
          {cur.input_arabic && (
            <div className="bg-muted/50 rounded-md p-4 space-y-2">
              <p
                dir="rtl"
                lang="ar"
                className="text-2xl leading-loose font-arabic"
                style={{ fontFamily: '"Amiri", "Noto Naskh Arabic", serif' }}
              >
                {cur.input_arabic}
              </p>
              {cur.input_transliteration && (
                <p className="text-sm italic text-muted-foreground">{cur.input_transliteration}</p>
              )}
              {cur.input_translation_nl && (
                <p className="text-sm text-muted-foreground">{cur.input_translation_nl}</p>
              )}
            </div>
          )}

          {/* Media */}
          {cur.needs_ns_audio && (
            cur.audio_url ? (
              <audio controls src={cur.audio_url} className="w-full" />
            ) : (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                🎧 {t("curriculum.audioPending", "Audio nog niet beschikbaar.")}
              </div>
            )
          )}
          {cur.needs_image && (
            cur.image_url ? (
              <img src={cur.image_url} alt={cur.question || cur.instruction_nl} className="rounded-md max-w-full" />
            ) : (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                🖼️ {t("curriculum.imagePending", "Afbeelding nog niet beschikbaar.")}
              </div>
            )
          )}

          {/* Attached media (image/audio/video/file/url) */}
          <CurriculumItemMediaView itemId={cur.id} alt={cur.question || cur.instruction_nl} />


          {/* Question */}
          {cur.question && cur.exercise_type !== "gatentekst" && (
            <p className="font-medium">{cur.question}</p>
          )}

          {/* Interaction */}
          {renderInteraction()}

          {/* Result */}
          {submitted && (
            <div
              className={`rounded-md p-4 border ${
                submitted.correct ? "border-success bg-success/10" : "border-destructive bg-destructive/10"
              }`}
            >
              <div className="flex items-center gap-2 font-semibold mb-2">
                {submitted.correct ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-success" />
                    {t("curriculum.correct", "Juist!")}
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-destructive" />
                    {t("curriculum.incorrect", "Nog niet juist")}
                  </>
                )}
              </div>
              {submitted.feedback && <p className="text-sm">{submitted.feedback}</p>}
              {!submitted.correct && cur.correct_answer && (
                <p className="text-sm mt-2">
                  <span className="font-medium">{t("curriculum.correctAnswer", "Juist antwoord")}: </span>
                  {cur.correct_answer}
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            {!submitted ? (
              <Button onClick={handleSubmit} disabled={submitAttempt.isPending}>
                {submitAttempt.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {t("curriculum.submit", "Indienen")}
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => { setSubmitted(null); setAnswer(null); setRecordedBlob(null); setOrderingState(null); }}>
                  {t("curriculum.tryAgain", "Opnieuw")}
                </Button>
                <Button onClick={() => navigate(`/self-study/unit/${cur.unit_code}`)}>
                  {t("curriculum.next", "Volgende")}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
      <CurriculumItemEditDialog
        item={editing}
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
      />
    </div>
  );
}

// Stable shuffle keyed by item id
function useMemoShuffle(arr: string[], key: string): string[] {
  return useMemo(() => shuffle(arr), [key, arr.length]);
}
