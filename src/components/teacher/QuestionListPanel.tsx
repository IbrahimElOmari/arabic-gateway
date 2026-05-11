import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
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
  Video,
} from "lucide-react";

type QuestionType =
  | "multiple_choice"
  | "checkbox"
  | "open_text"
  | "audio_upload"
  | "video_upload"
  | "file_upload"
  | "ordering";

const questionTypeIcons: Record<QuestionType, React.ElementType> = {
  multiple_choice: ListChecks,
  checkbox: CheckSquare,
  open_text: FileText,
  audio_upload: Mic,
  video_upload: Video,
  file_upload: Upload,
  ordering: GripVertical,
};

export interface QuestionListPanelProps {
  questions: any[] | undefined;
  isLoading: boolean;
  language: string;
  onAddFirst: () => void;
  onEdit: (question: any) => void;
  onDelete: (id: string) => void;
}

export function QuestionListPanel({
  questions,
  isLoading,
  language,
  onAddFirst,
  onEdit,
  onDelete,
}: QuestionListPanelProps) {
  const { t } = useTranslation();

  const getQuestionText = (question: any) => {
    const text = question.question_text;
    if (language === "nl") return text?.nl || text?.en;
    if (language === "ar") return text?.ar || text?.en;
    return text?.en || text?.nl;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (questions && questions.length > 0) {
    return (
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
                        {String(t(`questionTypes.${question.type}`, question.type))}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        • {question.points} {t("common.points", "points")}
                      </span>
                    </div>
                    <p className="font-medium">{getQuestionText(question)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(question)}
                      aria-label={t("common.edit", "Edit")}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(question.id)}
                      aria-label={t("common.delete", "Delete")}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="py-12 text-center">
        <ListChecks className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">{t("teacher.noQuestions", "No questions yet")}</h3>
        <p className="text-muted-foreground mb-4">
          {t("teacher.noQuestionsDescription", "Add questions to your exercise to get started.")}
        </p>
        <Button onClick={onAddFirst}>
          <Plus className="h-4 w-4 mr-2" />
          {t("teacher.addFirstQuestion", "Add First Question")}
        </Button>
      </CardContent>
    </Card>
  );
}
