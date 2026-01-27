import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate, Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ArrowLeft, ArrowRight, Clock, Send, Loader2, CheckCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

// Question components
import { MultipleChoiceQuestion } from "@/components/exercises/questions/MultipleChoiceQuestion";
import { CheckboxQuestion } from "@/components/exercises/questions/CheckboxQuestion";
import { OpenTextQuestion } from "@/components/exercises/questions/OpenTextQuestion";

interface Question {
  id: string;
  type: string;
  question_text: { nl?: string; en?: string; ar?: string };
  options: Array<{ label: string; value: string; isCorrect?: boolean }> | null;
  points: number;
  display_order: number;
  media_url: string | null;
}

export default function ExercisePage() {
  const { t, i18n } = useTranslation();
  const { category, exerciseId } = useParams<{ category: string; exerciseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [results, setResults] = useState<{ score: number; passed: boolean } | null>(null);

  // Fetch exercise
  const { data: exercise } = useQuery({
    queryKey: ["exercise", exerciseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exercises")
        .select("*")
        .eq("id", exerciseId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!exerciseId,
  });

  // Fetch questions
  const { data: questions, isLoading: questionsLoading } = useQuery({
    queryKey: ["questions", exerciseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("questions")
        .select("*")
        .eq("exercise_id", exerciseId as string)
        .order("display_order");
      if (error) throw error;
      return data as unknown as Question[];
    },
    enabled: !!exerciseId,
  });

  // Create attempt on mount
  useEffect(() => {
    const createAttempt = async () => {
      if (!user || !exerciseId || attemptId) return;

      // Check existing attempts
      const { data: existingAttempts } = await supabase
        .from("exercise_attempts")
        .select("attempt_number")
        .eq("exercise_id", exerciseId)
        .eq("student_id", user.id)
        .order("attempt_number", { ascending: false })
        .limit(1);

      const attemptNumber = (existingAttempts?.[0]?.attempt_number || 0) + 1;

      const { data, error } = await supabase
        .from("exercise_attempts")
        .insert({
          exercise_id: exerciseId,
          student_id: user.id,
          attempt_number: attemptNumber,
        })
        .select()
        .single();

      if (error) {
        console.error("Failed to create attempt:", error);
        return;
      }

      setAttemptId(data.id);

      // Set timer if time limit exists
      if (exercise?.time_limit_seconds) {
        setTimeLeft(exercise.time_limit_seconds);
      }
    };

    createAttempt();
  }, [user, exerciseId, exercise, attemptId]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || isCompleted) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isCompleted]);

  const currentQuestion = questions?.[currentQuestionIndex];
  const totalQuestions = questions?.length || 0;
  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;

  const getLocalizedText = (text: { nl?: string; en?: string; ar?: string }) => {
    const lang = i18n.language;
    return text[lang as keyof typeof text] || text.en || text.nl || "";
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleAnswerChange = (questionId: string, answer: string | string[]) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!attemptId || !questions || isSubmitting) return;

    setIsSubmitting(true);

    try {
      // Calculate score for auto-gradable questions
      let totalScore = 0;
      let maxScore = 0;

      for (const question of questions) {
        maxScore += question.points;
        const answer = answers[question.id];

        if (question.type === "multiple_choice" && answer && question.options) {
          const correctOption = question.options.find((o) => o.isCorrect);
          if (correctOption && answer === correctOption.value) {
            totalScore += question.points;
          }
        } else if (question.type === "checkbox" && answer && question.options) {
          const correctValues = question.options.filter((o) => o.isCorrect).map((o) => o.value);
          const answerArray = Array.isArray(answer) ? answer : [answer];
          if (
            correctValues.length === answerArray.length &&
            correctValues.every((v) => answerArray.includes(v))
          ) {
            totalScore += question.points;
          }
        }
        // Open text, audio, video questions need teacher review
      }

      const scorePercent = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
      const passed = scorePercent >= (exercise?.passing_score || 60);

      // Save answers
      const answersToInsert = questions.map((q) => ({
        question_id: q.id,
        student_id: user!.id,
        exercise_attempt_id: attemptId,
        answer_text: typeof answers[q.id] === "string" ? (answers[q.id] as string) : null,
        answer_data: Array.isArray(answers[q.id]) ? { selected: answers[q.id] } : null,
        is_correct:
          q.type === "multiple_choice" || q.type === "checkbox"
            ? (() => {
                const ans = answers[q.id];
                if (!ans || !q.options) return false;
                if (q.type === "multiple_choice") {
                  return q.options.find((o) => o.isCorrect)?.value === ans;
                }
                const correctValues = q.options.filter((o) => o.isCorrect).map((o) => o.value);
                const ansArray = Array.isArray(ans) ? ans : [ans];
                return (
                  correctValues.length === ansArray.length &&
                  correctValues.every((v) => ansArray.includes(v))
                );
              })()
            : null,
      }));

      await supabase.from("student_answers").insert(answersToInsert);

      // Update attempt
      await supabase
        .from("exercise_attempts")
        .update({
          submitted_at: new Date().toISOString(),
          total_score: scorePercent,
          passed,
        })
        .eq("id", attemptId);

      setResults({ score: scorePercent, passed });
      setIsCompleted(true);

      toast({
        title: t("exercises.submitted", "Exercise Submitted"),
        description: passed
          ? t("exercises.passedMessage", "Congratulations! You passed the exercise.")
          : t("exercises.notPassedMessage", "Keep practicing to improve your score."),
      });

      queryClient.invalidateQueries({ queryKey: ["exercise-attempts"] });
      queryClient.invalidateQueries({ queryKey: ["student-progress"] });
    } catch (error) {
      console.error("Submit error:", error);
      toast({
        variant: "destructive",
        title: t("common.error", "Error"),
        description: t("exercises.submitError", "Failed to submit exercise."),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (questionsLoading) {
    return (
      <MainLayout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (isCompleted && results) {
    return (
      <MainLayout>
        <div className="container py-8">
          <Card className="max-w-lg mx-auto">
            <CardHeader className="text-center">
              <div
                className={`mx-auto rounded-full p-6 ${
                  results.passed ? "bg-green-100 dark:bg-green-900/20" : "bg-red-100 dark:bg-red-900/20"
                }`}
              >
                <CheckCircle
                  className={`h-12 w-12 ${results.passed ? "text-green-600" : "text-red-600"}`}
                />
              </div>
              <CardTitle className="text-2xl mt-4">
                {results.passed
                  ? t("exercises.congratulations", "Congratulations!")
                  : t("exercises.keepPracticing", "Keep Practicing!")}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="text-4xl font-bold text-foreground">
                {results.score.toFixed(0)}%
              </div>
              <p className="text-muted-foreground">
                {results.passed
                  ? t("exercises.passedDescription", "You have successfully passed this exercise.")
                  : t("exercises.notPassedDescription", "You need {{score}}% to pass.", {
                      score: exercise?.passing_score || 60,
                    })}
              </p>
              <div className="flex gap-4 justify-center pt-4">
                <Link to={`/self-study/${category}`}>
                  <Button variant="outline">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    {t("common.backToCategory", "Back to Category")}
                  </Button>
                </Link>
                <Link to="/self-study">
                  <Button>
                    {t("selfStudy.title", "Self Study")}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-8">
        {/* Breadcrumb */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/self-study">{t("selfStudy.title", "Self Study")}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to={`/self-study/${category}`}>{category}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{exercise?.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header with timer */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{exercise?.title}</h1>
            <p className="text-muted-foreground">
              {t("exercises.question", "Question")} {currentQuestionIndex + 1} {t("common.of", "of")}{" "}
              {totalQuestions}
            </p>
          </div>
          {timeLeft !== null && (
            <div
              className={`flex items-center gap-2 text-lg font-mono ${
                timeLeft < 60 ? "text-red-600" : "text-foreground"
              }`}
            >
              <Clock className="h-5 w-5" />
              {formatTime(timeLeft)}
            </div>
          )}
        </div>

        {/* Progress bar */}
        <Progress value={progress} className="h-2 mb-8" />

        {/* Question */}
        {currentQuestion && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">
                {getLocalizedText(currentQuestion.question_text)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentQuestion.type === "multiple_choice" && (
                <MultipleChoiceQuestion
                  options={currentQuestion.options || []}
                  value={answers[currentQuestion.id] as string}
                  onChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                />
              )}
              {currentQuestion.type === "checkbox" && (
                <CheckboxQuestion
                  options={currentQuestion.options || []}
                  value={(answers[currentQuestion.id] as string[]) || []}
                  onChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                />
              )}
              {(currentQuestion.type === "open_text" ||
                currentQuestion.type === "audio_upload" ||
                currentQuestion.type === "video_upload" ||
                currentQuestion.type === "file_upload") && (
                <OpenTextQuestion
                  value={answers[currentQuestion.id] as string}
                  onChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                  placeholder={t("exercises.typeAnswer", "Type your answer here...")}
                />
              )}
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("common.previous", "Previous")}
          </Button>

          {currentQuestionIndex === totalQuestions - 1 ? (
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              {t("exercises.submit", "Submit")}
            </Button>
          ) : (
            <Button onClick={handleNext}>
              {t("common.next", "Next")}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
