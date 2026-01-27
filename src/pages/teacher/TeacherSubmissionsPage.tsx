import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileCheck, Loader2, CheckCircle, XCircle, Play, FileText } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

export default function TeacherSubmissionsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [feedback, setFeedback] = useState("");
  const [score, setScore] = useState("");

  // Get teacher's classes
  const { data: classes } = useQuery({
    queryKey: ["teacher-classes", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("id")
        .eq("teacher_id", user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const classIds = classes?.map(c => c.id) || [];

  // Get pending submissions
  const { data: pendingSubmissions, isLoading: pendingLoading } = useQuery({
    queryKey: ["pending-submissions", classIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_answers")
        .select(`
          *,
          student:profiles!student_answers_student_id_fkey(full_name),
          question:questions(
            question_text,
            points,
            type,
            exercise:exercises(title, class_id, class:classes(name))
          )
        `)
        .is("reviewed_at", null);
      if (error) throw error;
      // Filter by teacher's classes
      return data.filter((s: any) => classIds.includes(s.question?.exercise?.class_id));
    },
    enabled: classIds.length > 0,
  });

  // Get reviewed submissions
  const { data: reviewedSubmissions, isLoading: reviewedLoading } = useQuery({
    queryKey: ["reviewed-submissions", classIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_answers")
        .select(`
          *,
          student:profiles!student_answers_student_id_fkey(full_name),
          question:questions(
            question_text,
            points,
            type,
            exercise:exercises(title, class_id, class:classes(name))
          )
        `)
        .not("reviewed_at", "is", null)
        .order("reviewed_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data.filter((s: any) => classIds.includes(s.question?.exercise?.class_id));
    },
    enabled: classIds.length > 0,
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, score, feedback, isCorrect }: { id: string; score: number; feedback: string; isCorrect: boolean }) => {
      const { error } = await supabase.from("student_answers").update({
        score,
        feedback,
        is_correct: isCorrect,
        reviewed_by: user!.id,
        reviewed_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["reviewed-submissions"] });
      setSelectedSubmission(null);
      setFeedback("");
      setScore("");
      toast({ title: t("teacher.submissionReviewed", "Submission reviewed") });
    },
  });

  const handleReview = (isCorrect: boolean) => {
    if (!selectedSubmission) return;
    const maxPoints = selectedSubmission.question?.points || 1;
    const finalScore = isCorrect ? maxPoints : parseFloat(score) || 0;
    
    reviewMutation.mutate({
      id: selectedSubmission.id,
      score: finalScore,
      feedback,
      isCorrect,
    });
  };

  const getQuestionText = (question: any) => {
    if (!question?.question_text) return "";
    const text = question.question_text;
    if (typeof text === "object") {
      return text.en || text.nl || text.ar || JSON.stringify(text);
    }
    return text;
  };

  const renderSubmissionCard = (submission: any, showStatus = false) => (
    <Card key={submission.id} className="cursor-pointer hover:bg-accent/50" onClick={() => {
      setSelectedSubmission(submission);
      setFeedback(submission.feedback || "");
      setScore(submission.score?.toString() || "");
    }}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{submission.student?.full_name}</CardTitle>
            <CardDescription>
              {submission.question?.exercise?.title} · {submission.question?.exercise?.class?.name}
            </CardDescription>
          </div>
          {showStatus && (
            <Badge variant={submission.is_correct ? "default" : "destructive"}>
              {submission.is_correct ? t("teacher.correct", "Correct") : t("teacher.incorrect", "Incorrect")}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {submission.answer_text || (submission.file_url ? t("teacher.fileSubmission", "File submission") : "—")}
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          {format(new Date(submission.submitted_at), "PPP 'at' p")}
        </p>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("teacher.submissions", "Submissions")}</h1>
        <p className="text-muted-foreground">{t("teacher.reviewStudentWork", "Review student work and provide feedback")}</p>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            {t("teacher.pending", "Pending")}
            {(pendingSubmissions?.length || 0) > 0 && (
              <span className="ml-2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                {pendingSubmissions?.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="reviewed">{t("teacher.reviewed", "Reviewed")}</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          {pendingLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : pendingSubmissions && pendingSubmissions.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pendingSubmissions.map((submission) => renderSubmissionCard(submission))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                <h3 className="text-lg font-semibold">{t("teacher.allReviewed", "All caught up!")}</h3>
                <p className="text-muted-foreground">{t("teacher.noPendingSubmissions", "No pending submissions to review")}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="reviewed" className="mt-6">
          {reviewedLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : reviewedSubmissions && reviewedSubmissions.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {reviewedSubmissions.map((submission) => renderSubmissionCard(submission, true))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <FileCheck className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">{t("teacher.noReviewed", "No reviewed submissions")}</h3>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Review Dialog */}
      <Dialog open={!!selectedSubmission} onOpenChange={(open) => !open && setSelectedSubmission(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("teacher.reviewSubmission", "Review Submission")}</DialogTitle>
          </DialogHeader>
          
          {selectedSubmission && (
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">{t("teacher.student", "Student")}</Label>
                <p className="font-medium">{selectedSubmission.student?.full_name}</p>
              </div>

              <div>
                <Label className="text-muted-foreground">{t("teacher.question", "Question")}</Label>
                <p>{getQuestionText(selectedSubmission.question)}</p>
              </div>

              <div>
                <Label className="text-muted-foreground">{t("teacher.answer", "Answer")}</Label>
                {selectedSubmission.answer_text ? (
                  <p className="p-3 bg-muted rounded-lg">{selectedSubmission.answer_text}</p>
                ) : selectedSubmission.file_url ? (
                  <div className="flex gap-2">
                    <Button variant="outline" asChild>
                      <a href={selectedSubmission.file_url} target="_blank" rel="noopener noreferrer">
                        {selectedSubmission.question?.type?.includes("audio") ? (
                          <Play className="h-4 w-4 mr-2" />
                        ) : (
                          <FileText className="h-4 w-4 mr-2" />
                        )}
                        {t("teacher.viewFile", "View File")}
                      </a>
                    </Button>
                  </div>
                ) : (
                  <p className="text-muted-foreground">{t("teacher.noAnswer", "No answer provided")}</p>
                )}
              </div>

              {!selectedSubmission.reviewed_at && (
                <>
                  <div>
                    <Label>{t("teacher.feedback", "Feedback")}</Label>
                    <Textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder={t("teacher.feedbackPlaceholder", "Provide feedback to the student...")}
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label>{t("teacher.partialScore", "Partial Score (optional)")}</Label>
                    <Input
                      type="number"
                      value={score}
                      onChange={(e) => setScore(e.target.value)}
                      placeholder={`Max: ${selectedSubmission.question?.points || 1}`}
                      min={0}
                      max={selectedSubmission.question?.points || 1}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleReview(false)}
                      disabled={reviewMutation.isPending}
                    >
                      <XCircle className="h-4 w-4 mr-2 text-destructive" />
                      {t("teacher.markIncorrect", "Mark Incorrect")}
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => handleReview(true)}
                      disabled={reviewMutation.isPending}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {t("teacher.markCorrect", "Mark Correct")}
                    </Button>
                  </div>
                </>
              )}

              {selectedSubmission.reviewed_at && (
                <div className="space-y-2 p-4 bg-muted rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t("teacher.score", "Score")}</span>
                    <Badge variant={selectedSubmission.is_correct ? "default" : "destructive"}>
                      {selectedSubmission.score} / {selectedSubmission.question?.points || 1}
                    </Badge>
                  </div>
                  {selectedSubmission.feedback && (
                    <div>
                      <span className="text-sm text-muted-foreground">{t("teacher.feedback", "Feedback")}</span>
                      <p className="mt-1">{selectedSubmission.feedback}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
