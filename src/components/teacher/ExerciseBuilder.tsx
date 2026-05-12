import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiQuery, apiMutate } from "@/lib/supabase-api";
import { useToast } from "@/hooks/use-toast";
import { ExerciseMetadataPanel } from "./ExerciseMetadataPanel";
import { QuestionListPanel } from "./QuestionListPanel";
import { QuestionFormDialog } from "./QuestionFormDialog";

interface ExerciseBuilderProps {
  exerciseId: string;
  onBack: () => void;
}

type QuestionType =
  | "multiple_choice"
  | "checkbox"
  | "open_text"
  | "audio_upload"
  | "video_upload"
  | "file_upload"
  | "ordering";

const emptyForm = {
  type: "multiple_choice" as QuestionType,
  question_text: { nl: "", en: "", ar: "" },
  options: [
    { nl: "", en: "", ar: "" },
    { nl: "", en: "", ar: "" },
    { nl: "", en: "", ar: "" },
    { nl: "", en: "", ar: "" },
  ],
  correct_answer: 0,
  correct_answers: [] as number[],
  points: 1,
  explanation: "",
  time_limit_seconds: null as number | null,
  requires_manual_grading: false,
  media_url: null as string | null,
};

export function ExerciseBuilder({ exerciseId, onBack }: ExerciseBuilderProps) {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showQuestionDialog, setShowQuestionDialog] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  const [questionForm, setQuestionForm] = useState(emptyForm);

  const { data: exercise } = useQuery({
    queryKey: ["exercise", exerciseId],
    queryFn: () => apiQuery<any>("exercises", (q) =>
      q.select("*, class:classes(name)").eq("id", exerciseId).single()
    ),
  });

  const { data: questions, isLoading } = useQuery({
    queryKey: ["exercise-questions", exerciseId],
    queryFn: () => apiQuery<any[]>("questions", (q) =>
      q.select("*").eq("exercise_id", exerciseId).order("display_order", { ascending: true })
    ),
  });

  const normalizeOrderingOptions = (options: any[]) =>
    options.map((o, i) => ({
      ...o,
      label: o.en || o.nl || o.ar || `item-${i + 1}`,
      value: `item-${i + 1}`,
      order: i,
    }));

  const validateOrderingItems = (options: any[]): string | null => {
    if (options.length < 2) return t("teacher.orderingMinItems", "At least 2 items are required.");
    if (options.some((o) => !o.nl && !o.en && !o.ar))
      return t("teacher.orderingEmptyItem", "Each item must have text in at least one language.");
    return null;
  };

  const prepareFormData = (form: typeof questionForm) => {
    let correctAnswer;
    let options = form.options;
    if (form.type === "ordering") {
      options = normalizeOrderingOptions(form.options);
      correctAnswer = options.map((o: any) => o.value);
    } else if (form.type === "multiple_choice") {
      correctAnswer = form.correct_answer;
    } else if (form.type === "checkbox") {
      correctAnswer = form.correct_answers;
    } else {
      correctAnswer = null;
    }
    const hasOptions = ["multiple_choice", "checkbox", "ordering"].includes(form.type);
    return { options: hasOptions ? options : null, correctAnswer };
  };

  const createQuestionMutation = useMutation({
    mutationFn: async (form: typeof questionForm) => {
      if (form.type === "ordering") {
        const validationError = validateOrderingItems(form.options);
        if (validationError) throw new Error(validationError);
      }
      const displayOrder = (questions?.length || 0) + 1;
      const { options, correctAnswer } = prepareFormData(form);
      await apiMutate("questions", (q) => q.insert({
        exercise_id: exerciseId,
        type: form.type,
        question_text: form.question_text,
        options,
        correct_answer: correctAnswer,
        points: form.points,
        explanation: form.explanation || null,
        display_order: displayOrder,
        time_limit_seconds: form.time_limit_seconds,
        media_url: form.media_url,
      }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercise-questions", exerciseId] });
      setShowQuestionDialog(false);
      resetForm();
      toast({ title: t("teacher.questionAdded", "Question Added") });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: t("common.error", "Error"),
        description: error.message || t("teacher.questionAddError", "Failed to add question."),
      });
    },
  });

  const updateQuestionMutation = useMutation({
    mutationFn: async ({ id, form }: { id: string; form: typeof questionForm }) => {
      if (form.type === "ordering") {
        const validationError = validateOrderingItems(form.options);
        if (validationError) throw new Error(validationError);
      }
      const { options, correctAnswer } = prepareFormData(form);
      await apiMutate("questions", (q) => q.update({
        type: form.type,
        question_text: form.question_text,
        options,
        correct_answer: correctAnswer,
        points: form.points,
        explanation: form.explanation || null,
        time_limit_seconds: form.time_limit_seconds,
        media_url: form.media_url,
      }).eq("id", id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercise-questions", exerciseId] });
      setShowQuestionDialog(false);
      setEditingQuestion(null);
      resetForm();
      toast({ title: t("teacher.questionUpdated", "Question Updated") });
    },
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: (id: string) => apiMutate("questions", (q) => q.delete().eq("id", id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercise-questions", exerciseId] });
      toast({ title: t("teacher.questionDeleted", "Question Deleted") });
    },
  });

  const resetForm = () => setQuestionForm(emptyForm);

  const openEditDialog = (question: any) => {
    setEditingQuestion(question);
    setQuestionForm({
      type: question.type as QuestionType,
      question_text: question.question_text || { nl: "", en: "", ar: "" },
      options: question.options || [
        { nl: "", en: "", ar: "" },
        { nl: "", en: "", ar: "" },
        { nl: "", en: "", ar: "" },
        { nl: "", en: "", ar: "" },
      ],
      correct_answer: typeof question.correct_answer === "number" ? question.correct_answer : 0,
      correct_answers: Array.isArray(question.correct_answer) ? question.correct_answer : [],
      points: question.points,
      explanation: question.explanation || "",
      time_limit_seconds: question.time_limit_seconds || null,
      requires_manual_grading: ["open_text", "audio_upload", "video_upload", "file_upload"].includes(question.type),
      media_url: question.media_url || null,
    });
    setShowQuestionDialog(true);
  };

  const handleSubmit = () => {
    if (editingQuestion) {
      updateQuestionMutation.mutate({ id: editingQuestion.id, form: questionForm });
    } else {
      createQuestionMutation.mutate(questionForm);
    }
  };

  return (
    <div className="space-y-6">
      <ExerciseMetadataPanel
        title={exercise?.title}
        className={exercise?.class?.name}
        questionCount={questions?.length || 0}
        onBack={onBack}
        onAddQuestion={() => { resetForm(); setEditingQuestion(null); setShowQuestionDialog(true); }}
      />

      <QuestionListPanel
        questions={questions}
        isLoading={isLoading}
        language={i18n.language}
        onAddFirst={() => { resetForm(); setShowQuestionDialog(true); }}
        onEdit={openEditDialog}
        onDelete={(id) => deleteQuestionMutation.mutate(id)}
      />

      <QuestionFormDialog
        open={showQuestionDialog}
        onOpenChange={setShowQuestionDialog}
        editingQuestion={editingQuestion}
        questionForm={questionForm}
        setQuestionForm={setQuestionForm}
        onSubmit={handleSubmit}
        isSubmitting={createQuestionMutation.isPending || updateQuestionMutation.isPending}
        exerciseId={exerciseId}
      />
    </div>
  );
}
