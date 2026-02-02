import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate, Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, ArrowRight, Clock, Send, Loader2, Trophy, Star, PartyPopper } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface FinalExamQuestion {
  id: string;
  type: string;
  question_text: { nl?: string; en?: string; ar?: string };
  options: Array<{ label: string; value: string; isCorrect?: boolean }> | null;
  correct_answer: any;
  points: number;
  display_order: number;
}

export default function FinalExamPage() {
  const { t, i18n } = useTranslation();
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [results, setResults] = useState<{ 
    score: number; 
    passed: boolean; 
    promotedToLevel: string | null;
  } | null>(null);

  // Fetch exam details
  const { data: exam } = useQuery({
    queryKey: ["final-exam", examId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("final_exams")
        .select("*, level:levels(id, name, name_nl, name_en, name_ar, display_order)")
        .eq("id", examId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!examId,
  });

  // Fetch questions
  const { data: questions, isLoading: questionsLoading } = useQuery({
    queryKey: ["final-exam-questions", examId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("final_exam_questions")
        .select("*")
        .eq("final_exam_id", examId)
        .order("display_order");
      if (error) throw error;
      return data as unknown as FinalExamQuestion[];
    },
    enabled: !!examId,
  });

  // Check existing attempts
  const { data: existingAttempts } = useQuery({
    queryKey: ["final-exam-attempts", examId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("final_exam_attempts")
        .select("*")
        .eq("final_exam_id", examId)
        .eq("student_id", user!.id)
        .order("attempt_number", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!examId && !!user,
  });

  // Create attempt on mount
  useEffect(() => {
    const createAttempt = async () => {
      if (!user || !examId || attemptId || !exam) return;
      
      const maxAttempts = exam.max_attempts || 3;
      const currentAttemptCount = existingAttempts?.length || 0;
      
      if (currentAttemptCount >= maxAttempts) {
        toast({
          variant: "destructive",
          title: t("finalExam.noAttemptsLeft", "No Attempts Left"),
          description: t("finalExam.maxAttemptsReached", "You have reached the maximum number of attempts."),
        });
        navigate("/dashboard");
        return;
      }

      const { data, error } = await supabase
        .from("final_exam_attempts")
        .insert({
          final_exam_id: examId,
          student_id: user.id,
          attempt_number: currentAttemptCount + 1,
        })
        .select()
        .single();

      if (error) {
        console.error("Failed to create attempt:", error);
        return;
      }

      setAttemptId(data.id);

      if (exam.time_limit_seconds) {
        setTimeLeft(exam.time_limit_seconds);
      }
    };

    if (existingAttempts !== undefined) {
      createAttempt();
    }
  }, [user, examId, exam, existingAttempts, attemptId]);

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

  const getLevelName = (level: any) => {
    const lang = i18n.language;
    if (lang === "nl") return level?.name_nl || level?.name;
    if (lang === "ar") return level?.name_ar || level?.name;
    return level?.name_en || level?.name;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleAnswerChange = (questionId: string, answer: any) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = async () => {
    if (!attemptId || !questions || isSubmitting || !exam) return;

    setIsSubmitting(true);

    try {
      let totalScore = 0;
      let maxScore = 0;

      for (const question of questions) {
        maxScore += question.points;
        const answer = answers[question.id];

        if (question.type === "multiple_choice" && answer !== undefined) {
          if (answer === question.correct_answer) {
            totalScore += question.points;
          }
        } else if (question.type === "checkbox" && Array.isArray(answer)) {
          const correctAnswers = Array.isArray(question.correct_answer) 
            ? question.correct_answer 
            : [];
          if (
            correctAnswers.length === answer.length &&
            correctAnswers.every((v: number) => answer.includes(v))
          ) {
            totalScore += question.points;
          }
        }
      }

      const scorePercent = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
      const passed = scorePercent >= (exam.passing_score || 70);

      let promotedToLevelId = null;

      if (passed) {
        // Call the promotion function
        const { data: nextLevelId, error: promoteError } = await supabase
          .rpc("promote_student_to_next_level", {
            p_student_id: user!.id,
            p_current_level_id: exam.level_id,
            p_exam_attempt_id: attemptId,
          });

        if (!promoteError && nextLevelId) {
          promotedToLevelId = nextLevelId;
        }
      }

      // Update attempt
      await supabase
        .from("final_exam_attempts")
        .update({
          submitted_at: new Date().toISOString(),
          total_score: scorePercent,
          passed,
          promoted_to_level_id: promotedToLevelId,
        })
        .eq("id", attemptId);

      // Get next level name if promoted
      let promotedLevelName = null;
      if (promotedToLevelId) {
        const { data: nextLevel } = await supabase
          .from("levels")
          .select("*")
          .eq("id", promotedToLevelId)
          .single();
        if (nextLevel) {
          promotedLevelName = getLevelName(nextLevel);
        }
      }

      setResults({ 
        score: scorePercent, 
        passed,
        promotedToLevel: promotedLevelName,
      });
      setIsCompleted(true);

      queryClient.invalidateQueries({ queryKey: ["final-exam-attempts"] });
      queryClient.invalidateQueries({ queryKey: ["class-enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["user-points"] });
    } catch (error) {
      console.error("Submit error:", error);
      toast({
        variant: "destructive",
        title: t("common.error", "Error"),
        description: t("finalExam.submitError", "Failed to submit exam."),
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
                  results.passed 
                    ? "bg-green-100 dark:bg-green-900/20" 
                    : "bg-amber-100 dark:bg-amber-900/20"
                }`}
              >
                {results.passed ? (
                  <PartyPopper className="h-12 w-12 text-green-600" />
                ) : (
                  <Trophy className="h-12 w-12 text-amber-600" />
                )}
              </div>
              <CardTitle className="text-2xl mt-4">
                {results.passed
                  ? t("finalExam.congratulations", "Congratulations!")
                  : t("finalExam.keepTrying", "Keep Trying!")}
              </CardTitle>
              {results.passed && results.promotedToLevel && (
                <CardDescription className="text-lg mt-2">
                  <span className="flex items-center justify-center gap-2">
                    <Star className="h-5 w-5 text-primary" />
                    {t("finalExam.promotedTo", "You've been promoted to")} {results.promotedToLevel}!
                  </span>
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="text-4xl font-bold text-foreground">
                {results.score.toFixed(0)}%
              </div>
              <p className="text-muted-foreground">
                {results.passed
                  ? t("finalExam.passedDescription", "You have successfully completed the final exam and earned 500 points!")
                  : t("finalExam.notPassedDescription", "You need {{score}}% to pass. Try again!", {
                      score: exam?.passing_score || 70,
                    })}
              </p>
              
              {results.passed && (
                <div className="p-4 bg-primary/10 rounded-lg">
                  <p className="text-sm font-medium text-primary">
                    +500 {t("gamification.points", "points")}
                  </p>
                </div>
              )}

              <div className="flex gap-4 justify-center pt-4">
                <Link to="/dashboard">
                  <Button variant="outline">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    {t("nav.dashboard", "Dashboard")}
                  </Button>
                </Link>
                {results.passed && results.promotedToLevel && (
                  <Link to="/self-study">
                    <Button>
                      {t("selfStudy.title", "Self Study")}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-8 max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{exam?.title}</h1>
            <p className="text-muted-foreground">
              {t("finalExam.levelExam", "Level Final Exam")}: {getLevelName(exam?.level)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {t("exercises.question", "Question")} {currentQuestionIndex + 1} {t("common.of", "of")} {totalQuestions}
            </p>
          </div>
          {timeLeft !== null && (
            <div
              className={`flex items-center gap-2 text-lg font-mono ${
                timeLeft < 60 ? "text-destructive" : "text-foreground"
              }`}
            >
              <Clock className="h-5 w-5" />
              {formatTime(timeLeft)}
            </div>
          )}
        </div>

        {/* Progress */}
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
              {currentQuestion.type === "multiple_choice" && currentQuestion.options && (
                <RadioGroup
                  value={answers[currentQuestion.id]?.toString()}
                  onValueChange={(value) => handleAnswerChange(currentQuestion.id, parseInt(value))}
                >
                  {currentQuestion.options.map((option, index) => (
                    <div key={index} className="flex items-center space-x-3 py-2">
                      <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                      <Label htmlFor={`option-${index}`} className="cursor-pointer flex-1">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}

              {currentQuestion.type === "checkbox" && currentQuestion.options && (
                <div className="space-y-3">
                  {currentQuestion.options.map((option, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <Checkbox
                        id={`checkbox-${index}`}
                        checked={(answers[currentQuestion.id] || []).includes(index)}
                        onCheckedChange={(checked) => {
                          const current = answers[currentQuestion.id] || [];
                          if (checked) {
                            handleAnswerChange(currentQuestion.id, [...current, index]);
                          } else {
                            handleAnswerChange(
                              currentQuestion.id,
                              current.filter((i: number) => i !== index)
                            );
                          }
                        }}
                      />
                      <Label htmlFor={`checkbox-${index}`} className="cursor-pointer">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentQuestionIndex((prev) => prev - 1)}
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
            <Button onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}>
              {t("common.next", "Next")}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
