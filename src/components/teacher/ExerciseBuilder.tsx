import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { 
  ArrowLeft, 
  Plus, 
  Edit, 
  Trash2, 
  GripVertical, 
  Loader2,
  ListChecks,
  CheckSquare,
  FileText,
  Upload,
  Mic,
  Video
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ExerciseBuilderProps {
  exerciseId: string;
  onBack: () => void;
}

type QuestionType = "multiple_choice" | "checkbox" | "open_text" | "audio_upload" | "video_upload" | "file_upload";

const questionTypeIcons: Record<QuestionType, React.ElementType> = {
  multiple_choice: ListChecks,
  checkbox: CheckSquare,
  open_text: FileText,
  audio_upload: Mic,
  video_upload: Video,
  file_upload: Upload,
};

export function ExerciseBuilder({ exerciseId, onBack }: ExerciseBuilderProps) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showQuestionDialog, setShowQuestionDialog] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  const [questionForm, setQuestionForm] = useState({
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
  });

  // Get exercise details
  const { data: exercise } = useQuery({
    queryKey: ["exercise", exerciseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exercises")
        .select("*, class:classes(name)")
        .eq("id", exerciseId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Get questions for this exercise
  const { data: questions, isLoading } = useQuery({
    queryKey: ["exercise-questions", exerciseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("questions")
        .select("*")
        .eq("exercise_id", exerciseId)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const createQuestionMutation = useMutation({
    mutationFn: async (form: typeof questionForm) => {
      const displayOrder = (questions?.length || 0) + 1;
      
      let correctAnswer;
      if (form.type === "multiple_choice") {
        correctAnswer = form.correct_answer;
      } else if (form.type === "checkbox") {
        correctAnswer = form.correct_answers;
      } else {
        correctAnswer = null;
      }

      const { error } = await supabase.from("questions").insert({
        exercise_id: exerciseId,
        type: form.type,
        question_text: form.question_text,
        options: form.type === "multiple_choice" || form.type === "checkbox" ? form.options : null,
        correct_answer: correctAnswer,
        points: form.points,
        explanation: form.explanation || null,
        display_order: displayOrder,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercise-questions", exerciseId] });
      setShowQuestionDialog(false);
      resetForm();
      toast({
        title: t("teacher.questionAdded", "Question Added"),
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: t("common.error", "Error"),
        description: t("teacher.questionAddError", "Failed to add question."),
      });
    },
  });

  const updateQuestionMutation = useMutation({
    mutationFn: async ({ id, form }: { id: string; form: typeof questionForm }) => {
      let correctAnswer;
      if (form.type === "multiple_choice") {
        correctAnswer = form.correct_answer;
      } else if (form.type === "checkbox") {
        correctAnswer = form.correct_answers;
      } else {
        correctAnswer = null;
      }

      const { error } = await supabase
        .from("questions")
        .update({
          type: form.type,
          question_text: form.question_text,
          options: form.type === "multiple_choice" || form.type === "checkbox" ? form.options : null,
          correct_answer: correctAnswer,
          points: form.points,
          explanation: form.explanation || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercise-questions", exerciseId] });
      setShowQuestionDialog(false);
      setEditingQuestion(null);
      resetForm();
      toast({
        title: t("teacher.questionUpdated", "Question Updated"),
      });
    },
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("questions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercise-questions", exerciseId] });
      toast({
        title: t("teacher.questionDeleted", "Question Deleted"),
      });
    },
  });

  const resetForm = () => {
    setQuestionForm({
      type: "multiple_choice",
      question_text: { nl: "", en: "", ar: "" },
      options: [
        { nl: "", en: "", ar: "" },
        { nl: "", en: "", ar: "" },
        { nl: "", en: "", ar: "" },
        { nl: "", en: "", ar: "" },
      ],
      correct_answer: 0,
      correct_answers: [],
      points: 1,
      explanation: "",
    });
  };

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

  const updateOption = (index: number, lang: string, value: string) => {
    const newOptions = [...questionForm.options];
    newOptions[index] = { ...newOptions[index], [lang]: value };
    setQuestionForm({ ...questionForm, options: newOptions });
  };

  const getQuestionText = (question: any) => {
    const lang = i18n.language;
    const text = question.question_text;
    if (lang === "nl") return text?.nl || text?.en;
    if (lang === "ar") return text?.ar || text?.en;
    return text?.en || text?.nl;
  };

  const toggleCorrectAnswer = (index: number) => {
    if (questionForm.correct_answers.includes(index)) {
      setQuestionForm({
        ...questionForm,
        correct_answers: questionForm.correct_answers.filter((i) => i !== index),
      });
    } else {
      setQuestionForm({
        ...questionForm,
        correct_answers: [...questionForm.correct_answers, index],
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{exercise?.title}</h1>
          <p className="text-muted-foreground">{exercise?.class?.name}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">
            {questions?.length || 0} {t("teacher.questions", "questions")}
          </span>
        </div>
        <Button onClick={() => { resetForm(); setEditingQuestion(null); setShowQuestionDialog(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          {t("teacher.addQuestion", "Add Question")}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : questions && questions.length > 0 ? (
        <div className="space-y-4">
          {questions.map((question, index) => {
            const Icon = questionTypeIcons[question.type as QuestionType] || FileText;
            return (
              <Card key={question.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <GripVertical className="h-5 w-5 cursor-grab" />
                      <span className="font-mono text-sm">{index + 1}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="h-4 w-4 text-primary" />
                        <span className="text-xs text-muted-foreground uppercase">
                          {t(`questionTypes.${question.type}`, question.type)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          • {question.points} {t("common.points", "points")}
                        </span>
                      </div>
                      <p className="font-medium">{getQuestionText(question)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(question)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteQuestionMutation.mutate(question.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <ListChecks className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">{t("teacher.noQuestions", "No questions yet")}</h3>
            <p className="text-muted-foreground mb-4">
              {t("teacher.noQuestionsDescription", "Add questions to your exercise to get started.")}
            </p>
            <Button onClick={() => { resetForm(); setShowQuestionDialog(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              {t("teacher.addFirstQuestion", "Add First Question")}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Question Dialog */}
      <Dialog open={showQuestionDialog} onOpenChange={setShowQuestionDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="multiple_choice">{t("questionTypes.multiple_choice", "Multiple Choice")}</SelectItem>
                    <SelectItem value="checkbox">{t("questionTypes.checkbox", "Checkbox (Multiple Answers)")}</SelectItem>
                    <SelectItem value="open_text">{t("questionTypes.open_text", "Open Text")}</SelectItem>
                    <SelectItem value="audio_upload">{t("questionTypes.audio_upload", "Audio Recording")}</SelectItem>
                    <SelectItem value="video_upload">{t("questionTypes.video_upload", "Video Recording")}</SelectItem>
                    <SelectItem value="file_upload">{t("questionTypes.file_upload", "File Upload")}</SelectItem>
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
                      value={questionForm.question_text[lang as keyof typeof questionForm.question_text]}
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
                      {questionForm.options.map((option, index) => (
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
                            value={option[lang as keyof typeof option]}
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
                </TabsContent>
              ))}
            </Tabs>

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
            <Button variant="outline" onClick={() => setShowQuestionDialog(false)}>
              {t("common.cancel", "Cancel")}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createQuestionMutation.isPending || updateQuestionMutation.isPending}
            >
              {(createQuestionMutation.isPending || updateQuestionMutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingQuestion ? t("common.save", "Save") : t("common.add", "Add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
