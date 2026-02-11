import { useTranslation } from "react-i18next";
import { useParams, Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ArrowLeft, Clock, CheckCircle, PlayCircle, Lock, Loader2, Plus, Palette } from "lucide-react";

export default function CategoryPage() {
  const { t, i18n } = useTranslation();
  const { category } = useParams<{ category: string }>();
  const { user, role } = useAuth();
  
  const isStaff = role === 'admin' || role === 'teacher';

  // Fetch category info
  const { data: categoryInfo } = useQuery({
    queryKey: ["exercise-category", category],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exercise_categories")
        .select("*")
        .eq("name", category as "reading" | "writing" | "listening" | "speaking" | "grammar")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!category,
  });

  // Fetch student's enrolled class IDs (only for students)
  const { data: enrolledClassIds } = useQuery({
    queryKey: ["my-enrolled-classes", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("class_enrollments")
        .select("class_id")
        .eq("student_id", user!.id)
        .eq("status", "enrolled");
      if (error) throw error;
      return data?.map(e => e.class_id) || [];
    },
    enabled: !!user && role === 'student',
  });

  // Fetch exercises for this category, filtered by student's class
  const { data: exercises, isLoading } = useQuery({
    queryKey: ["exercises", category, enrolledClassIds, isStaff],
    queryFn: async () => {
      if (!categoryInfo) return [];
      
      let query = supabase
        .from("exercises")
        .select("*")
        .eq("category_id", categoryInfo.id)
        .eq("is_published", true)
        .lte("release_date", new Date().toISOString())
        .order("release_date", { ascending: false });
      
      // Students only see exercises from their enrolled classes
      if (!isStaff && enrolledClassIds && enrolledClassIds.length > 0) {
        query = query.in("class_id", enrolledClassIds);
      } else if (!isStaff && (!enrolledClassIds || enrolledClassIds.length === 0)) {
        return []; // Student not enrolled in any class
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!categoryInfo && (isStaff || (enrolledClassIds !== undefined)),
  });

  // Fetch user's attempts for these exercises
  const { data: attempts } = useQuery({
    queryKey: ["exercise-attempts", category, user?.id],
    queryFn: async () => {
      if (!user || !exercises) return {};
      
      const { data, error } = await supabase
        .from("exercise_attempts")
        .select("*")
        .eq("student_id", user.id)
        .in("exercise_id", exercises.map((e) => e.id));
      
      if (error) throw error;
      
      const attemptsMap: Record<string, { completed: boolean; score: number; attempts: number }> = {};
      data?.forEach((a) => {
        if (!attemptsMap[a.exercise_id] || a.attempt_number > attemptsMap[a.exercise_id].attempts) {
          attemptsMap[a.exercise_id] = {
            completed: !!a.submitted_at,
            score: a.total_score || 0,
            attempts: a.attempt_number,
          };
        }
      });
      return attemptsMap;
    },
    enabled: !!user && !!exercises?.length,
  });

  const getLocalizedName = () => {
    if (!categoryInfo) return category;
    const lang = i18n.language;
    if (lang === "nl") return categoryInfo.name_nl;
    if (lang === "ar") return categoryInfo.name_ar;
    return categoryInfo.name_en;
  };

  const formatTimeLimit = (seconds: number | null) => {
    if (!seconds) return null;
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m`;
  };

  return (
    <MainLayout>
      <div className="container py-8">
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/self-study">{t("selfStudy.title", "Self Study")}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{getLocalizedName()}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="mb-8 flex items-center gap-4">
          <Link to="/self-study">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{getLocalizedName()}</h1>
            <p className="text-muted-foreground">{categoryInfo?.description}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : exercises && exercises.length > 0 ? (
          <div className="space-y-4">
            {exercises.map((exercise) => {
              const attempt = attempts?.[exercise.id];
              const isCompleted = attempt?.completed;
              const isPassed = attempt && attempt.score >= exercise.passing_score;
              const canAttempt = !attempt || attempt.attempts < exercise.max_attempts;

              return (
                <Card key={exercise.id} className={isCompleted ? "border-green-500/50" : ""}>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-lg">{exercise.title}</CardTitle>
                        {isCompleted && (
                          <Badge variant={isPassed ? "default" : "destructive"} className={isPassed ? "bg-green-600" : ""}>
                            {isPassed ? (
                              <><CheckCircle className="h-3 w-3 mr-1" />{t("exercises.passed", "Passed")}</>
                            ) : t("exercises.notPassed", "Not Passed")}
                          </Badge>
                        )}
                      </div>
                      <CardDescription>{exercise.description}</CardDescription>
                    </div>
                    <div className="flex items-center gap-4">
                      {exercise.time_limit_seconds && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          {formatTimeLimit(exercise.time_limit_seconds)}
                        </div>
                      )}
                      {attempt && (
                        <span className="text-sm text-muted-foreground">
                          {t("exercises.score", "Score")}: {attempt.score.toFixed(0)}%
                        </span>
                      )}
                      <Link to={`/self-study/${category}/${exercise.id}`}>
                        <Button variant={isCompleted ? "outline" : "default"} disabled={!canAttempt && isCompleted}>
                          {!canAttempt && isCompleted ? (
                            <><Lock className="h-4 w-4 mr-2" />{t("exercises.maxAttempts", "Max attempts reached")}</>
                          ) : isCompleted ? (
                            <><PlayCircle className="h-4 w-4 mr-2" />{t("exercises.retry", "Retry")}</>
                          ) : (
                            <><PlayCircle className="h-4 w-4 mr-2" />{t("exercises.start", "Start")}</>
                          )}
                        </Button>
                      </Link>
                    </div>
                  </CardHeader>
                  {attempt && (
                    <CardContent className="pt-0">
                      <p className="text-sm text-muted-foreground">
                        {t("exercises.attempts", "Attempts")}: {attempt.attempts}/{exercise.max_attempts}
                      </p>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <h3 className="text-lg font-semibold text-foreground">
                {t("selfStudy.noExercisesInCategory", "No exercises available in this category")}
              </h3>
              <p className="text-muted-foreground mb-4">
                {!isStaff && (!enrolledClassIds || enrolledClassIds.length === 0)
                  ? t("selfStudy.enrollFirst", "Enroll in a class to see exercises.")
                  : t("selfStudy.checkBackCategory", "Check back soon for new exercises!")}
              </p>
              
              {isStaff ? (
                <div className="flex flex-col sm:flex-row gap-3 mt-2">
                  <Button asChild data-testid="create-exercise-cta">
                    <Link to="/teacher/exercises">
                      <Plus className="h-4 w-4 mr-2" />
                      {t("teacher.createExercise", "Create Exercise")}
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to="/teacher/content-studio">
                      <Palette className="h-4 w-4 mr-2" />
                      {t("nav.contentStudio", "Content Studio")}
                    </Link>
                  </Button>
                </div>
              ) : (
                <Link to="/self-study">
                  <Button variant="outline">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    {t("common.back", "Back")}
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
