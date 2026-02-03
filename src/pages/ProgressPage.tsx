import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExportButtons } from "@/components/export/ExportButtons";
import {
  BookOpen,
  CheckCircle,
  Calendar,
  Clock,
  TrendingUp,
  Trophy,
  Target,
  Flame,
  Loader2,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";

export default function ProgressPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [period, setPeriod] = useState<"week" | "month" | "all">("week");

  // Fetch exercise attempts
  const { data: attempts, isLoading: attemptsLoading } = useQuery({
    queryKey: ["my-attempts-detailed", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exercise_attempts")
        .select(`
          id,
          passed,
          total_score,
          time_spent_seconds,
          started_at,
          submitted_at,
          exercise:exercises(title, category:exercise_categories(name, name_nl, name_en, name_ar))
        `)
        .eq("student_id", user!.id)
        .not("submitted_at", "is", null)
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch lesson attendance
  const { data: attendance, isLoading: attendanceLoading } = useQuery({
    queryKey: ["my-attendance", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lesson_attendance")
        .select(`
          id,
          attended,
          joined_at,
          lesson:lessons(title, scheduled_at)
        `)
        .eq("student_id", user!.id)
        .eq("attended", true);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch user points
  const { data: userPoints } = useQuery({
    queryKey: ["my-points", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_points")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Calculate statistics
  const totalExercises = attempts?.length || 0;
  const passedExercises = attempts?.filter((a) => a.passed)?.length || 0;
  const averageScore =
    totalExercises > 0
      ? Math.round(
          (attempts?.reduce((acc, a) => acc + (a.total_score || 0), 0) || 0) / totalExercises
        )
      : 0;
  const totalStudyMinutes = Math.round(
    (attempts?.reduce((acc, a) => acc + (a.time_spent_seconds || 0), 0) || 0) / 60
  );
  const totalLessons = attendance?.length || 0;

  // Calculate category breakdown
  const categoryStats =
    attempts?.reduce(
      (acc, attempt) => {
        const category = attempt.exercise?.category?.name || "unknown";
        if (!acc[category]) {
          acc[category] = { total: 0, passed: 0, scores: [] };
        }
        acc[category].total++;
        if (attempt.passed) acc[category].passed++;
        if (attempt.total_score) acc[category].scores.push(attempt.total_score);
        return acc;
      },
      {} as Record<string, { total: number; passed: number; scores: number[] }>
    ) || {};

  // Prepare chart data
  const last7Days = eachDayOfInterval({
    start: subDays(new Date(), 6),
    end: new Date(),
  });

  const dailyProgress = last7Days.map((day) => {
    const dayStr = format(day, "yyyy-MM-dd");
    const dayAttempts = attempts?.filter(
      (a) => a.submitted_at && format(new Date(a.submitted_at), "yyyy-MM-dd") === dayStr
    );
    return {
      date: format(day, "EEE"),
      fullDate: dayStr,
      exercises: dayAttempts?.length || 0,
      score: dayAttempts?.length
        ? Math.round(
            (dayAttempts.reduce((acc, a) => acc + (a.total_score || 0), 0) /
              dayAttempts.length)
          )
        : 0,
    };
  });

  // Export data preparation
  const exportData = attempts?.map((a) => ({
    exercise: a.exercise?.title || "Unknown",
    category: a.exercise?.category?.name_en || "Unknown",
    score: a.total_score || 0,
    passed: a.passed ? "Yes" : "No",
    timeSpent: Math.round((a.time_spent_seconds || 0) / 60),
    date: a.submitted_at ? format(new Date(a.submitted_at), "yyyy-MM-dd HH:mm") : "",
  })) || [];

  const exportHeaders = {
    exercise: t("teacher.exercise", "Exercise"),
    category: t("common.category", "Category"),
    score: t("teacher.score", "Score"),
    passed: t("common.passed", "Passed"),
    timeSpent: t("common.timeSpentMin", "Time (min)"),
    date: t("common.date", "Date"),
  };

  const isLoading = attemptsLoading || attendanceLoading;

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">{t("progress.title", "Progress Reports")}</h1>
            <p className="text-muted-foreground">
              {t("progress.subtitle", "Track your learning journey")}
            </p>
          </div>
          <ExportButtons
            data={exportData}
            filename="my-progress"
            headers={exportHeaders}
            title={t("progress.title", "Progress Report")}
          />
        </div>

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {t("progress.exercisesCompleted", "Exercises Completed")}
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {passedExercises}/{totalExercises}
              </div>
              <Progress
                value={totalExercises > 0 ? (passedExercises / totalExercises) * 100 : 0}
                className="mt-2"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {t("progress.averageScore", "Average Score")}
              </CardTitle>
              <Target className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{averageScore}%</div>
              <p className="text-xs text-muted-foreground">
                {t("common.of", "of")} {totalExercises} {t("common.exercises", "exercises")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {t("progress.lessonsAttended", "Lessons Attended")}
              </CardTitle>
              <Calendar className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalLessons}</div>
              <p className="text-xs text-muted-foreground">
                {t("common.totalLessons", "total lessons")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {t("progress.studyTime", "Study Time")}
              </CardTitle>
              <Clock className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalStudyMinutes} min</div>
              <p className="text-xs text-muted-foreground">
                {t("gamification.currentStreak", "Current streak")}: {userPoints?.current_streak || 0}{" "}
                {t("gamification.days", "days")}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>{t("progress.weeklyProgress", "Weekly Progress")}</CardTitle>
              <CardDescription>
                {t("progress.exercisesPerDay", "Exercises completed per day")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={dailyProgress}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="exercises" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("progress.scoresTrend", "Scores Trend")}</CardTitle>
              <CardDescription>
                {t("progress.averageScorePerDay", "Average score per day")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={dailyProgress}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>{t("progress.categoryBreakdown", "Category Breakdown")}</CardTitle>
            <CardDescription>
              {t("progress.performanceByCategory", "Your performance by category")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(categoryStats).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(categoryStats).map(([category, stats]) => {
                  const avgScore =
                    stats.scores.length > 0
                      ? Math.round(
                          stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length
                        )
                      : 0;
                  const passRate = Math.round((stats.passed / stats.total) * 100);

                  return (
                    <div key={category} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium capitalize">{category}</span>
                        <span className="text-muted-foreground text-sm">
                          {stats.passed}/{stats.total} {t("common.passed", "passed")} · {avgScore}%{" "}
                          {t("progress.avg", "avg")}
                        </span>
                      </div>
                      <Progress value={passRate} className="h-2" />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{t("progress.noProgressData", "No progress data yet")}</p>
                <p className="text-sm">{t("progress.startLearning", "Start learning to see your progress here")}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
