import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus } from "lucide-react";

export interface ExerciseMetadataPanelProps {
  title?: string;
  className?: string;
  questionCount: number;
  onBack: () => void;
  onAddQuestion: () => void;
}

export function ExerciseMetadataPanel({
  title,
  className,
  questionCount,
  onBack,
  onAddQuestion,
}: ExerciseMetadataPanelProps) {
  const { t } = useTranslation();

  return (
    <>
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} aria-label={t("common.back", "Back")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="text-muted-foreground">{className}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">
            {questionCount} {t("teacher.questions", "questions")}
          </span>
        </div>
        <Button onClick={onAddQuestion}>
          <Plus className="h-4 w-4 mr-2" />
          {t("teacher.addQuestion", "Add Question")}
        </Button>
      </div>
    </>
  );
}
