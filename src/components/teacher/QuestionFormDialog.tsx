import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Loader2, FileText, X, FileUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { validateUpload } from "@/lib/upload-validation";

type QuestionType =
  | "multiple_choice"
  | "checkbox"
  | "open_text"
  | "audio_upload"
  | "video_upload"
  | "file_upload"
  | "ordering";

function getMediaType(url: string): "image" | "audio" | "video" | "file" {
  const ext = url.split(".").pop()?.toLowerCase() || "";
  if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) return "image";
  if (["mp3", "wav", "ogg", "webm", "m4a"].includes(ext)) return "audio";
  if (["mp4", "webm", "mov", "avi"].includes(ext)) return "video";
  return "file";
}

interface QuestionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingQuestion: any | null;
  questionForm: any;
  setQuestionForm: (updater: any) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  exerciseId: string;
}

export function QuestionFormDialog({
  open,
  onOpenChange,
  editingQuestion,
  questionForm,
  setQuestionForm,
  onSubmit,
  isSubmitting,
  exerciseId,
}: QuestionFormDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateOption = (index: number, lang: string, value: string) => {
    const newOptions = [...questionForm.options];
    newOptions[index] = { ...newOptions[index], [lang]: value };
    setQuestionForm({ ...questionForm, options: newOptions });
  };

  const toggleCorrectAnswer = (index: number) => {
    if (questionForm.correct_answers.includes(index)) {
      setQuestionForm({
        ...questionForm,
        correct_answers: questionForm.correct_answers.filter((i: number) => i !== index),
      });
    } else {
      setQuestionForm({
        ...questionForm,
        correct_answers: [...questionForm.correct_answers, index],
      });
    }
  };

  const handleMediaUpload = async (file: File) => {
    const validation = validateUpload(file, "exercise-media");
    if (!validation.valid) {
      toast({ variant: "destructive", title: t("common.error", "Error"), description: validation.error });
      return;
    }
    try {
      const timestamp = Date.now();
      const filePath = `${exerciseId}/${timestamp}-${file.name}`;
      const { error } = await supabase.storage.from("exercise-media").upload(filePath, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("exercise-media").getPublicUrl(filePath);
      setQuestionForm({ ...questionForm, media_url: urlData.publicUrl });
      toast({ title: t("teacher.mediaUploaded", "Media uploaded") });
    } catch (error) {
      console.error("Media upload error:", error);
      toast({ variant: "destructive", title: t("common.error", "Error"), description: t("teacher.mediaUploadError", "Failed to upload media.") });
    }
  };

  const handleRemoveMedia = () => {
    setQuestionForm({ ...questionForm, media_url: null });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-auto">
        <DialogHeader>
          <DialogTitle>
            {editingQuestion ? t("teacher.editQuestion", "Edit Question") : t("teacher.addQuestion", "Add Question")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t("teacher.questionType", "Question Type")}</Label>
              <Select
                value={questionForm.type}
                onValueChange={(v: QuestionType) => setQuestionForm({ ...questionForm, type: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="multiple_choice">{t("questionTypes.multiple_choice", "Multiple Choice")}</SelectItem>
                  <SelectItem value="checkbox">{t("questionTypes.checkbox", "Checkbox (Multiple Answers)")}</SelectItem>
                  <SelectItem value="open_text">{t("questionTypes.open_text", "Open Text")}</SelectItem>
                  <SelectItem value="audio_upload">{t("questionTypes.audio_upload", "Audio Recording")}</SelectItem>
                  <SelectItem value="video_upload">{t("questionTypes.video_upload", "Video Recording")}</SelectItem>
                  <SelectItem value="file_upload">{t("questionTypes.file_upload", "File Upload")}</SelectItem>
                  <SelectItem value="ordering">{t("questionTypes.ordering", "Ordering (Drag & Drop)")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("common.points", "Points")}</Label>
              <Input
                type="number"
                value={questionForm.points}
                onChange={(e) => setQuestionForm({ ...questionForm, points: parseInt(e.target.value) || 1 })}
              />
            </div>
          </div>

          <Tabs defaultValue="en" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="en">English</TabsTrigger>
              <TabsTrigger value="nl">Nederlands</TabsTrigger>
              <TabsTrigger value="ar">العربية</TabsTrigger>
            </TabsList>

            {["en", "nl", "ar"].map((lang) => (
              <TabsContent key={lang} value={lang} className="space-y-4" dir={lang === "ar" ? "rtl" : "ltr"}>
                <div>
                  <Label>{t("teacher.questionText", "Question Text")} ({lang.toUpperCase()})</Label>
                  <Textarea
                    value={questionForm.question_text[lang]}
                    onChange={(e) =>
                      setQuestionForm({
                        ...questionForm,
                        question_text: { ...questionForm.question_text, [lang]: e.target.value },
                      })
                    }
                    rows={2}
                  />
                </div>

                {(questionForm.type === "multiple_choice" || questionForm.type === "checkbox") && (
                  <div className="space-y-2">
                    <Label>{t("teacher.answerOptions", "Answer Options")} ({lang.toUpperCase()})</Label>
                    {questionForm.options.map((option: any, index: number) => (
                      <div key={index} className="flex items-center gap-2">
                        {questionForm.type === "multiple_choice" ? (
                          <input
                            type="radio"
                            name={`correct-${lang}`}
                            checked={questionForm.correct_answer === index}
                            onChange={() => setQuestionForm({ ...questionForm, correct_answer: index })}
                            className="h-4 w-4"
                          />
                        ) : (
                          <input
                            type="checkbox"
                            checked={questionForm.correct_answers.includes(index)}
                            onChange={() => toggleCorrectAnswer(index)}
                            className="h-4 w-4"
                          />
                        )}
                        <Input
                          value={option[lang]}
                          onChange={(e) => updateOption(index, lang, e.target.value)}
                          placeholder={`${t("teacher.option", "Option")} ${index + 1}`}
                        />
                      </div>
                    ))}
                    <p className="text-xs text-muted-foreground">
                      {questionForm.type === "multiple_choice"
                        ? t("teacher.selectCorrectAnswer", "Select the correct answer")
                        : t("teacher.selectCorrectAnswers", "Select all correct answers")}
                    </p>
                  </div>
                )}

                {questionForm.type === "ordering" && (
                  <div className="space-y-2">
                    <Label>{t("teacher.orderItems", "Items in Correct Order")} ({lang.toUpperCase()})</Label>
                    <p className="text-xs text-muted-foreground">
                      {t("teacher.orderingDescription", "Enter items in the correct order. Students will see them shuffled.")}
                    </p>
                    {questionForm.options.map((option: any, index: number) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="text-sm font-mono text-muted-foreground w-6 text-center shrink-0">{index + 1}</span>
                        <Input
                          value={option[lang] || ""}
                          onChange={(e) => updateOption(index, lang, e.target.value)}
                          placeholder={`${t("teacher.item", "Item")} ${index + 1}`}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="shrink-0"
                          onClick={() => {
                            const newOptions = questionForm.options.filter((_: any, i: number) => i !== index);
                            setQuestionForm({ ...questionForm, options: newOptions });
                          }}
                          disabled={questionForm.options.length <= 2}
                        >
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setQuestionForm({
                          ...questionForm,
                          options: [...questionForm.options, { nl: "", en: "", ar: "" }],
                        });
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      {t("teacher.addOrderItem", "Add Item")}
                    </Button>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>

          <div>
            <Label>{t("teacher.referenceMedia", "Reference Media")} ({t("common.optional", "optional")})</Label>
            <p className="text-xs text-muted-foreground mb-2">
              {t("teacher.referenceMediaHint", "Attach an image, audio, video, or PDF that students will see with this question.")}
            </p>
            {questionForm.media_url ? (
              <div className="border rounded-lg p-3 bg-muted/30 space-y-2">
                {(() => {
                  const type = getMediaType(questionForm.media_url);
                  if (type === "image") return <img src={questionForm.media_url} alt="" className="max-h-40 rounded object-contain" />;
                  if (type === "audio") return <audio controls src={questionForm.media_url} className="w-full" />;
                  if (type === "video") return <video controls src={questionForm.media_url} className="max-h-40 rounded" />;
                  return (
                    <a href={questionForm.media_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary underline">
                      <FileText className="h-4 w-4" /> {t("teacher.viewFile", "View file")}
                    </a>
                  );
                })()}
                <Button type="button" variant="ghost" size="sm" onClick={handleRemoveMedia} className="text-destructive">
                  <X className="h-4 w-4 mr-1" /> {t("teacher.removeMedia", "Remove")}
                </Button>
              </div>
            ) : (
              <div
                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <FileUp className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {t("teacher.clickToUpload", "Click to upload")} — max 50MB
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*,audio/*,video/*,application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleMediaUpload(file);
                    e.target.value = "";
                  }}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t("teacher.timeLimit", "Time Limit per Question")} ({t("common.seconds", "seconds")})</Label>
              <Input
                type="number"
                min={0}
                value={questionForm.time_limit_seconds || ""}
                onChange={(e) => setQuestionForm({
                  ...questionForm,
                  time_limit_seconds: e.target.value ? parseInt(e.target.value) : null,
                })}
                placeholder={t("teacher.noTimeLimit", "No limit")}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t("teacher.timeLimitHint", "Leave empty for no time limit")}
              </p>
            </div>
            <div>
              <Label>{t("teacher.correctionType", "Correction Type")}</Label>
              <Select
                value={questionForm.requires_manual_grading ? "manual" : "auto"}
                onValueChange={(v) => setQuestionForm({
                  ...questionForm,
                  requires_manual_grading: v === "manual",
                })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">{t("teacher.autoCorrection", "Automatic")}</SelectItem>
                  <SelectItem value="manual">{t("teacher.manualCorrection", "Manual by Teacher")}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {questionForm.requires_manual_grading
                  ? t("teacher.manualCorrectionHint", "Teacher will review and grade")
                  : t("teacher.autoCorrectionHint", "System grades automatically")}
              </p>
            </div>
          </div>

          <div>
            <Label>{t("teacher.explanation", "Explanation (shown after answer)")}</Label>
            <Textarea
              value={questionForm.explanation}
              onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })}
              rows={2}
              placeholder={t("teacher.explanationPlaceholder", "Optional explanation for the correct answer...")}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel", "Cancel")}
          </Button>
          <Button onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {editingQuestion ? t("common.save", "Save") : t("common.add", "Add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
