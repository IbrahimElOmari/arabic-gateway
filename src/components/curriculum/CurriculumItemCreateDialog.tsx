import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiQuery, apiMutate } from "@/lib/supabase-api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { CurriculumItemMediaPanel } from "./CurriculumItemMediaPanel";

const SKILLS = ["lezen", "schrijven", "luisteren", "spreken", "grammatica", "woordenschat"] as const;
const TYPES = [
  "meerkeuze",
  "meerdere-antwoorden",
  "open-tekst",
  "gatentekst",
  "bestand-upload",
  "audio-opname",
  "rangschikken",
  "koppelen",
] as const;

const arabicFont = { fontFamily: '"Amiri", "Noto Naskh Arabic", serif' };

interface Props {
  unitCode: string;
  week: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CurriculumItemCreateDialog({ unitCode, week, open, onOpenChange }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [skill, setSkill] = useState<string>("woordenschat");
  const [exerciseType, setExerciseType] = useState<string>("meerkeuze");
  const [exerciseSubtype, setExerciseSubtype] = useState("");
  const [instructionNl, setInstructionNl] = useState("");
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [correctOptions, setCorrectOptions] = useState<string[]>([]);
  const [feedbackCorrect, setFeedbackCorrect] = useState("");
  const [feedbackIncorrect, setFeedbackIncorrect] = useState("");
  const [inputArabic, setInputArabic] = useState("");
  const [inputTranslit, setInputTranslit] = useState("");
  const [inputNl, setInputNl] = useState("");
  const [points, setPoints] = useState<number>(1);
  const [isPublished, setIsPublished] = useState(true);

  const [createdItemId, setCreatedItemId] = useState<string | null>(null);

  function reset() {
    setSkill("woordenschat");
    setExerciseType("meerkeuze");
    setExerciseSubtype("");
    setInstructionNl("");
    setQuestion("");
    setOptions(["", ""]);
    setCorrectAnswer("");
    setCorrectOptions([]);
    setFeedbackCorrect("");
    setFeedbackIncorrect("");
    setInputArabic("");
    setInputTranslit("");
    setInputNl("");
    setPoints(1);
    setIsPublished(true);
    setCreatedItemId(null);
  }

  const create = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("not authenticated");
      // Compute display_order = max(unit)+1
      const existing = await apiQuery<{ display_order: number }[]>(
        "curriculum_items",
        (q) =>
          q
            .select("display_order")
            .eq("unit_code", unitCode)
            .order("display_order", { ascending: false })
            .limit(1)
      );
      const nextOrder = ((existing?.[0]?.display_order ?? 0) as number) + 1;
      const itemId = `${unitCode}-custom-${crypto.randomUUID().slice(0, 8)}`;

      const cleanOptions = options.map((o) => o.trim()).filter(Boolean);

      const payload: any = {
        item_id: itemId,
        unit_code: unitCode,
        week,
        skill,
        exercise_type: exerciseType,
        exercise_subtype: exerciseSubtype,
        display_order: nextOrder,
        instruction_nl: instructionNl,
        question,
        options: ["meerkeuze", "meerdere-antwoorden", "rangschikken", "koppelen"].includes(exerciseType) ? cleanOptions : [],
        correct_answer: correctAnswer,
        correct_options: exerciseType === "meerdere-antwoorden" ? correctOptions : null,
        feedback_correct: feedbackCorrect,
        feedback_incorrect: feedbackIncorrect,
        input_arabic: inputArabic,
        input_transliteration: inputTranslit,
        input_translation_nl: inputNl,
        points,
        is_published: isPublished,
        created_by: user.id,
      };

      const rows = await apiMutate<any[]>("curriculum_items", (q) => q.insert(payload).select("id"));
      const newId = Array.isArray(rows) ? rows[0]?.id : null;
      return newId as string;
    },
    onSuccess: (newId) => {
      toast({ title: t("curriculum.created", "Oefening aangemaakt") });
      qc.invalidateQueries({ queryKey: ["curriculum-items", unitCode] });
      setCreatedItemId(newId);
    },
    onError: (e: any) => toast({ variant: "destructive", title: t("common.error", "Fout"), description: e?.message }),
  });

  function close() {
    onOpenChange(false);
    setTimeout(reset, 200);
  }

  const showOptions = ["meerkeuze", "meerdere-antwoorden", "rangschikken", "koppelen"].includes(exerciseType);

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(o) : close())}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t("curriculum.newItem", "Nieuwe oefening")} · {unitCode} · week {week}
          </DialogTitle>
        </DialogHeader>

        {!createdItemId ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("curriculum.skill", "Skill")}</Label>
                <Select value={skill} onValueChange={setSkill}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SKILLS.map((s) => (
                      <SelectItem key={s} value={s}>{t(`skills.${s}`, s)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("curriculum.type", "Type")}</Label>
                <Select value={exerciseType} onValueChange={setExerciseType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TYPES.map((s) => (
                      <SelectItem key={s} value={s}>{t(`exerciseTypes.${s}`, s)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Label>{t("curriculum.subtype", "Subtype")}</Label>
                <Input value={exerciseSubtype} onChange={(e) => setExerciseSubtype(e.target.value)} />
              </div>
              <div>
                <Label>{t("curriculum.points", "Punten")}</Label>
                <Input
                  type="number"
                  min={1}
                  value={points}
                  onChange={(e) => setPoints(Math.max(1, parseInt(e.target.value) || 1))}
                />
              </div>
            </div>

            <div>
              <Label>instruction_nl</Label>
              <Textarea value={instructionNl} onChange={(e) => setInstructionNl(e.target.value)} rows={2} />
            </div>

            <div>
              <Label>question</Label>
              <Textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={2} />
            </div>

            <div className="border rounded-md p-3 space-y-3 bg-muted/30">
              <p className="text-sm font-semibold">{t("curriculum.arabicInput", "Arabische bron-tekst")}</p>
              <Textarea
                dir="rtl"
                lang="ar"
                style={{ ...arabicFont, fontSize: "1.4rem", lineHeight: 2 }}
                placeholder="input_arabic (tashkīl)"
                value={inputArabic}
                onChange={(e) => setInputArabic(e.target.value)}
                rows={3}
              />
              <Input
                placeholder="input_transliteration"
                value={inputTranslit}
                onChange={(e) => setInputTranslit(e.target.value)}
              />
              <Input
                placeholder="input_translation_nl"
                value={inputNl}
                onChange={(e) => setInputNl(e.target.value)}
              />
            </div>

            {showOptions && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>
                    {exerciseType === "koppelen"
                      ? t("curriculum.leftItems", "Linker items (paren via correct_answer L=R|L=R)")
                      : exerciseType === "rangschikken"
                      ? t("curriculum.itemsToOrder", "Items om te rangschikken")
                      : "options"}
                  </Label>
                  <Button size="sm" variant="outline" onClick={() => setOptions([...options, ""])}>
                    <Plus className="h-3 w-3 mr-1" /> {t("common.add", "Toevoegen")}
                  </Button>
                </div>
                {options.map((o, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs w-6 text-muted-foreground">{i + 1}.</span>
                    <Input
                      value={o}
                      onChange={(e) => {
                        const next = [...options];
                        next[i] = e.target.value;
                        setOptions(next);
                      }}
                    />
                    <Button size="icon" variant="outline" onClick={() => {
                      const j = i - 1;
                      if (j < 0) return;
                      const n = [...options]; [n[i], n[j]] = [n[j]!, n[i]!]; setOptions(n);
                    }} disabled={i === 0}><ArrowUp className="h-3 w-3" /></Button>
                    <Button size="icon" variant="outline" onClick={() => {
                      const j = i + 1;
                      if (j >= options.length) return;
                      const n = [...options]; [n[i], n[j]] = [n[j]!, n[i]!]; setOptions(n);
                    }} disabled={i === options.length - 1}><ArrowDown className="h-3 w-3" /></Button>
                    <Button size="icon" variant="outline" onClick={() => {
                      setOptions(options.filter((_, j) => j !== i));
                      setCorrectOptions(correctOptions.filter((x) => x !== o));
                    }}><Trash2 className="h-3 w-3" /></Button>
                    {exerciseType === "meerdere-antwoorden" && (
                      <label className="flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={correctOptions.includes(o)}
                          onChange={() =>
                            setCorrectOptions((prev) =>
                              prev.includes(o) ? prev.filter((x) => x !== o) : [...prev, o]
                            )
                          }
                        />
                        ✓
                      </label>
                    )}
                  </div>
                ))}
              </div>
            )}

            {exerciseType !== "audio-opname" && exerciseType !== "bestand-upload" && exerciseType !== "meerdere-antwoorden" && (
              <div>
                <Label>correct_answer</Label>
                <Textarea
                  value={correctAnswer}
                  onChange={(e) => setCorrectAnswer(e.target.value)}
                  rows={2}
                  placeholder={
                    exerciseType === "gatentekst"
                      ? "a|b|c (één antwoord per gat)"
                      : exerciseType === "rangschikken"
                      ? "item1|item2|item3 (juiste volgorde)"
                      : exerciseType === "koppelen"
                      ? "links1=rechts1|links2=rechts2"
                      : ""
                  }
                />
              </div>
            )}

            <div className="grid gap-3">
              <div>
                <Label>feedback_correct</Label>
                <Textarea value={feedbackCorrect} onChange={(e) => setFeedbackCorrect(e.target.value)} rows={2} />
              </div>
              <div>
                <Label>feedback_incorrect</Label>
                <Textarea value={feedbackIncorrect} onChange={(e) => setFeedbackIncorrect(e.target.value)} rows={2} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={isPublished} onCheckedChange={setIsPublished} />
              <Label>{t("curriculum.published", "Gepubliceerd")}</Label>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("curriculum.itemCreatedAddMedia", "Oefening aangemaakt. Voeg desgewenst media toe en sluit dit venster.")}
            </p>
            <CurriculumItemMediaPanel itemId={createdItemId} />
          </div>
        )}

        <DialogFooter>
          {!createdItemId ? (
            <>
              <Button variant="outline" onClick={close}>{t("common.cancel", "Annuleren")}</Button>
              <Button onClick={() => create.mutate()} disabled={create.isPending || !instructionNl.trim()}>
                {create.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {t("curriculum.create", "Aanmaken")}
              </Button>
            </>
          ) : (
            <Button onClick={close}>{t("common.done", "Klaar")}</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
