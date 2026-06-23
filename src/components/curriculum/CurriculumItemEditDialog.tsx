import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiMutate } from "@/lib/supabase-api";
import { deleteCurriculumItem } from "@/lib/curriculum-admin";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Loader2, Plus, Trash2, ArrowUp, ArrowDown, X } from "lucide-react";
import { CurriculumItemMediaPanel } from "./CurriculumItemMediaPanel";

export interface EditableItem {
  id: string;
  item_id: string;
  unit_code: string;
  week: number;
  skill: string;
  exercise_type: string;
  exercise_subtype: string | null;
  instruction_nl: string | null;
  question: string | null;
  options: any;
  correct_answer: string | null;
  correct_options: any;
  feedback_correct: string | null;
  feedback_incorrect: string | null;
  input_arabic: string | null;
  input_transliteration: string | null;
  input_translation_nl: string | null;
  points: number | null;
  review_flag: string | null;
  is_published?: boolean | null;
  strict_tashkeel?: boolean | null;
}


interface Props {
  item: EditableItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: (id: string) => void;
}

const arabicFont = { fontFamily: '"Amiri", "Noto Naskh Arabic", serif' };

function isArabic(s: string): boolean {
  return /[\u0600-\u06FF]/.test(s || "");
}

export function CurriculumItemEditDialog({ item, open, onOpenChange, onDeleted }: Props) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [form, setForm] = useState<EditableItem | null>(item);
  const [options, setOptions] = useState<string[]>([]);
  const [correctOptions, setCorrectOptions] = useState<string[]>([]);

  useEffect(() => {
    setForm(item);
    setOptions(Array.isArray(item?.options) ? (item!.options as string[]) : []);
    setCorrectOptions(Array.isArray(item?.correct_options) ? (item!.correct_options as string[]) : []);
  }, [item]);

  const save = useMutation({
    mutationFn: async () => {
      if (!form) return;
      return apiMutate("curriculum_items", (q) =>
        q
          .update({
            instruction_nl: form.instruction_nl,
            question: form.question,
            options: options,
            correct_answer: form.correct_answer,
            correct_options: correctOptions,
            feedback_correct: form.feedback_correct,
            feedback_incorrect: form.feedback_incorrect,
            input_arabic: form.input_arabic,
            input_transliteration: form.input_transliteration,
            input_translation_nl: form.input_translation_nl,
            exercise_subtype: form.exercise_subtype,
            points: form.points ?? 1,
            review_flag: form.review_flag,
            is_published: form.is_published ?? true,
            strict_tashkeel: form.strict_tashkeel ?? false,
            updated_at: new Date().toISOString(),

          })
          .eq("id", form.id)
      );
    },
    onSuccess: () => {
      toast({ title: t("curriculum.saved", "Opgeslagen") });
      qc.invalidateQueries({ queryKey: ["curriculum-item"] });
      qc.invalidateQueries({ queryKey: ["curriculum-items"] });
      qc.invalidateQueries({ queryKey: ["curriculum-review"] });
      onOpenChange(false);
    },
    onError: (e: any) => {
      toast({ variant: "destructive", title: t("common.error", "Fout"), description: e?.message });
    },
  });

  const del = useMutation({
    mutationFn: async () => {
      if (!form) return;
      await deleteCurriculumItem(form.id);
    },
    onSuccess: () => {
      toast({ title: t("curriculum.deleted", "Oefening verwijderd") });
      qc.invalidateQueries({ queryKey: ["curriculum-items"] });
      qc.invalidateQueries({ queryKey: ["curriculum-review"] });
      onOpenChange(false);
      if (form) onDeleted?.(form.id);
    },
    onError: (e: any) => {
      toast({ variant: "destructive", title: t("common.error", "Fout"), description: e?.message });
    },
  });

  if (!form) return null;
  const f = form;

  function setField<K extends keyof EditableItem>(key: K, value: EditableItem[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function moveOpt(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= options.length) return;
    const next = [...options];
    [next[i], next[j]] = [next[j] as string, next[i] as string];
    setOptions(next);
  }

  function toggleCorrect(opt: string) {
    setCorrectOptions((prev) =>
      prev.includes(opt) ? prev.filter((x) => x !== opt) : [...prev, opt]
    );
  }

  function ArInput(props: { value: string | null; onChange: (v: string) => void; rows?: number; placeholder?: string }) {
    const rtl = isArabic(props.value ?? "");
    const common = {
      dir: rtl ? ("rtl" as const) : ("ltr" as const),
      lang: rtl ? "ar" : undefined,
      style: rtl ? { ...arabicFont, fontSize: "1.25rem", lineHeight: 2 } : undefined,
      value: props.value ?? "",
      onChange: (e: any) => props.onChange(e.target.value),
      placeholder: props.placeholder,
    };
    return props.rows ? <Textarea rows={props.rows} {...common} /> : <Input {...common} />;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <span>{t("curriculum.editItem", "Oefening bewerken")}</span>
            <Badge variant="outline">{f.item_id}</Badge>
            <Badge variant="secondary">{f.skill}</Badge>
            <Badge variant="outline">{f.exercise_type}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Review flag */}
          <div className="rounded-md border p-3 bg-muted/40 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                {t("curriculum.reviewFlag", "Review-markering")}
              </Label>
              {f.review_flag && (
                <Button size="sm" variant="outline" onClick={() => setField("review_flag", "")}>
                  <X className="h-3 w-3 mr-1" />
                  {t("curriculum.clearReviewFlag", "Markeer als NS-gecontroleerd")}
                </Button>
              )}
            </div>
            <Textarea
              value={f.review_flag ?? ""}
              onChange={(e) => setField("review_flag", e.target.value)}
              rows={2}
              placeholder="⚠️ CONTROLEER / ⚠️ ONTBREEKT ..."
            />
          </div>

          {/* Read-only meta */}
          <div className="grid grid-cols-4 gap-3 text-sm text-muted-foreground">
            <div><span className="font-medium">Unit:</span> {f.unit_code}</div>
            <div><span className="font-medium">Week:</span> {f.week}</div>
            <div><span className="font-medium">Skill:</span> {f.skill}</div>
            <div><span className="font-medium">Type:</span> {f.exercise_type}</div>
          </div>

          {/* Subtype + points + published */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>{t("curriculum.subtype", "Subtype")}</Label>
              <Input
                value={f.exercise_subtype ?? ""}
                onChange={(e) => setField("exercise_subtype", e.target.value)}
              />
            </div>
            <div>
              <Label>{t("curriculum.points", "Punten")}</Label>
              <Input
                type="number"
                min={1}
                value={f.points ?? 1}
                onChange={(e) => setField("points", Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
            <div className="flex items-end gap-4 flex-wrap">
              <div className="flex items-end gap-2">
                <Switch
                  checked={f.is_published ?? true}
                  onCheckedChange={(v) => setField("is_published", v)}
                />
                <Label className="mb-2">{t("curriculum.published", "Gepubliceerd")}</Label>
              </div>
              <div className="flex items-end gap-2">
                <Switch
                  checked={f.strict_tashkeel ?? false}
                  onCheckedChange={(v) => setField("strict_tashkeel", v)}
                />
                <Label className="mb-2">{t("curriculum.strictTashkeel", "Tashkīl exact laten meetellen (standaard uit)")}</Label>
              </div>
            </div>


          </div>

          {/* Instruction & question */}
          <div>
            <Label>instruction_nl</Label>
            <Textarea
              value={f.instruction_nl ?? ""}
              onChange={(e) => setField("instruction_nl", e.target.value)}
              rows={2}
            />
          </div>
          <div>
            <Label>question</Label>
            <ArInput value={f.question} onChange={(v) => setField("question", v)} rows={2} />
          </div>

          {/* Arabic input */}
          <div className="border rounded-md p-3 space-y-3 bg-muted/30">
            <p className="text-sm font-semibold">{t("curriculum.arabicInput", "Arabische bron-tekst")}</p>
            <div>
              <Label>input_arabic (RTL, tashkīl)</Label>
              <Textarea
                dir="rtl"
                lang="ar"
                style={{ ...arabicFont, fontSize: "1.5rem", lineHeight: 2 }}
                value={f.input_arabic ?? ""}
                onChange={(e) => setField("input_arabic", e.target.value)}
                rows={3}
              />
            </div>
            <div>
              <Label>input_transliteration</Label>
              <Input
                value={f.input_transliteration ?? ""}
                onChange={(e) => setField("input_transliteration", e.target.value)}
              />
            </div>
            <div>
              <Label>input_translation_nl</Label>
              <Input
                value={f.input_translation_nl ?? ""}
                onChange={(e) => setField("input_translation_nl", e.target.value)}
              />
            </div>
          </div>

          {/* Options */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>options (JSON array)</Label>
              <Button size="sm" variant="outline" onClick={() => setOptions([...options, ""])}>
                <Plus className="h-3 w-3 mr-1" /> {t("common.add", "Toevoegen")}
              </Button>
            </div>
            {options.length === 0 && (
              <p className="text-xs text-muted-foreground">{t("curriculum.noOptions", "Geen opties.")}</p>
            )}
            {options.map((o, i) => {
              const rtl = isArabic(o);
              return (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs w-6 text-muted-foreground">{i + 1}.</span>
                  <Input
                    dir={rtl ? "rtl" : "ltr"}
                    lang={rtl ? "ar" : undefined}
                    style={rtl ? arabicFont : undefined}
                    value={o}
                    onChange={(e) => {
                      const next = [...options];
                      next[i] = e.target.value;
                      setOptions(next);
                    }}
                  />
                  <Button size="icon" variant="outline" onClick={() => moveOpt(i, -1)} disabled={i === 0}>
                    <ArrowUp className="h-3 w-3" />
                  </Button>
                  <Button size="icon" variant="outline" onClick={() => moveOpt(i, 1)} disabled={i === options.length - 1}>
                    <ArrowDown className="h-3 w-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => {
                      setOptions(options.filter((_, j) => j !== i));
                      setCorrectOptions(correctOptions.filter((x) => x !== o));
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                  {f.exercise_type === "meerdere-antwoorden" && (
                    <label className="flex items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        checked={correctOptions.includes(o)}
                        onChange={() => toggleCorrect(o)}
                      />
                      ✓
                    </label>
                  )}
                </div>
              );
            })}
          </div>

          {/* Correct answer */}
          <div>
            <Label>correct_answer</Label>
            <ArInput
              value={f.correct_answer}
              onChange={(v) => setField("correct_answer", v)}
              rows={2}
              placeholder={t("curriculum.correctAnswerHint", "Gebruik | als scheidingsteken bij meerdere antwoorden")}
            />
          </div>

          {/* Feedback */}
          <div className="grid grid-cols-1 gap-3">
            <div>
              <Label>feedback_correct</Label>
              <Textarea
                value={f.feedback_correct ?? ""}
                onChange={(e) => setField("feedback_correct", e.target.value)}
                rows={2}
              />
            </div>
            <div>
              <Label>feedback_incorrect</Label>
              <Textarea
                value={f.feedback_incorrect ?? ""}
                onChange={(e) => setField("feedback_incorrect", e.target.value)}
                rows={2}
              />
            </div>
          </div>

          {/* Media panel */}
          <CurriculumItemMediaPanel itemId={f.id} />
        </div>

        <DialogFooter className="flex sm:justify-between gap-2">
          <Button
            variant="destructive"
            disabled={del.isPending}
            onClick={() => {
              if (window.confirm(t("curriculum.confirmDelete", "Weet je zeker dat je deze oefening wilt verwijderen?"))) {
                del.mutate();
              }
            }}
          >
            {del.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
            {t("common.delete", "Verwijderen")}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel", "Annuleren")}
            </Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("common.save", "Opslaan")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
