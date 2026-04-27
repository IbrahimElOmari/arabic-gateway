import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard } from "@/components/admin/StatsCard";
import { useQuery } from "@tanstack/react-query";
import { apiQuery } from "@/lib/supabase-api";
import { useAuth } from "@/contexts/AuthContext";
import { Calendar, Users, Video, FileCheck, BookOpen, MessageCircle, AlertTriangle, Upload } from "lucide-react";
import { formatDate } from "@/lib/date-utils";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { RoleOnboardingChecklist } from "@/components/onboarding/RoleOnboardingChecklist";

export default function TeacherDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const { data: classes } = useQuery({
    queryKey: ["teacher-classes", user?.id],
    queryFn: () =>
      apiQuery<any[]>("classes", (q) =>
        q.select("id, name").eq("teacher_id", user!.id)
      ),
    enabled: !!user,
  });

  const classIds = classes?.map(c => c.id) || [];

  const { data: upcomingLessons } = useQuery({
    queryKey: ["teacher-upcoming-lessons", classIds],
    queryFn: () =>
      apiQuery<any[]>("lessons", (q) =>
        q.select("*, class:classes(name)")
          .in("class_id", classIds)
          .gte("scheduled_at", new Date().toISOString())
          .order("scheduled_at", { ascending: true })
          .limit(5)
      ),
    enabled: classIds.length > 0,
  });

  const { data: studentCount } = useQuery({
    queryKey: ["teacher-student-count", classIds],
    queryFn: async () => {
      const data = await apiQuery<any[]>("class_enrollments", (q) =>
        q.select("id", { count: "exact", head: true }).in("class_id", classIds)
      );
      return Array.isArray(data) ? data.length : 0;
    },
    enabled: classIds.length > 0,
  });

  const { data: pendingSubmissions } = useQuery({
    queryKey: ["teacher-pending-submissions", classIds],
    queryFn: async () => {
      const data = await apiQuery<any[]>("student_answers", (q) =>
        q.select(`id, question:questions(exercise:exercises(class_id))`)
          .is("reviewed_at", null)
          .not("answer_text", "is", null)
      );
      return data.filter((s: any) => classIds.includes(s.question?.exercise?.class_id));
    },
    enabled: classIds.length > 0,
  });

  const { data: recordingsCount } = useQuery({
    queryKey: ["teacher-recordings-count", user?.id],
    queryFn: async () => {
      const data = await apiQuery<any[]>("lesson_recordings", (q) =>
        q.select("id", { count: "exact", head: true }).eq("uploaded_by", user!.id)
      );
      return Array.isArray(data) ? data.length : 0;
    },
    enabled: !!user,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("teacher.dashboard", "Teacher Dashboard")}</h1>
        <p className="text-muted-foreground">{t("teacher.dashboardDescription", "Manage your classes and students")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard title={t("teacher.totalStudents", "Total Students")} value={studentCount || 0} icon={Users} />
        <StatsCard title={t("teacher.classes", "Classes")} value={classes?.length || 0} icon={BookOpen} />
        <StatsCard title={t("teacher.pendingReviews", "Pending Reviews")} value={pendingSubmissions?.length || 0} icon={FileCheck} />
        <StatsCard title={t("teacher.recordings", "Recordings")} value={recordingsCount || 0} icon={Video} />
      </div>

      <RoleOnboardingChecklist role="teacher" classCount={classes?.length || 0} pendingCount={pendingSubmissions?.length || 0} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-primary" />
            {t("teacher.actionCenter", "Actiecentrum")}
          </CardTitle>
          <CardDescription>{t("teacher.actionCenterDesc", "De belangrijkste docentacties voor vandaag.")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <Button variant="outline" className="h-auto justify-start py-4 text-start" asChild>
            <Link to="/teacher/submissions"><FileCheck className="h-4 w-4" />{t("teacher.pendingReviews", "Pending Reviews")} ({pendingSubmissions?.length || 0})</Link>
          </Button>
          <Button variant="outline" className="h-auto justify-start py-4 text-start" asChild>
            <Link to="/teacher/content-studio"><BookOpen className="h-4 w-4" />{t("teacher.contentStudio", "Content Studio")}</Link>
          </Button>
          <Button variant="outline" className="h-auto justify-start py-4 text-start" asChild>
            <Link to="/teacher/materials"><Upload className="h-4 w-4" />{t("teacher.uploadMaterials", "Materiaal uploaden")}</Link>
          </Button>
          <Button variant="outline" className="h-auto justify-start py-4 text-start" asChild>
            <Link to="/chat"><MessageCircle className="h-4 w-4" />{t("teacher.messageStudents", "Bericht sturen")}</Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {t("teacher.upcomingLessons", "Upcoming Lessons")}
            </CardTitle>
            <CardDescription>{t("teacher.nextScheduledLessons", "Your next scheduled lessons")}</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingLessons && upcomingLessons.length > 0 ? (
              <div className="space-y-3">
                {upcomingLessons.map((lesson) => (
                  <div key={lesson.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                    <div>
                      <p className="font-medium">{lesson.title}</p>
                      <p className="text-sm text-muted-foreground">{lesson.class?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatDate(lesson.scheduled_at, "MMM d, yyyy")}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(lesson.scheduled_at, "HH:mm")}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">{t("teacher.noUpcomingLessons", "No upcoming lessons")}</p>
            )}
            <Button variant="outline" className="w-full mt-4" asChild>
              <Link to="/teacher/lessons">{t("teacher.manageAllLessons", "Manage All Lessons")}</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("teacher.quickActions", "Quick Actions")}</CardTitle>
            <CardDescription>{t("teacher.commonTasks", "Common tasks and shortcuts")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/teacher/lessons"><Calendar className="h-4 w-4 mr-2" />{t("teacher.scheduleLesson", "Schedule New Lesson")}</Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/teacher/recordings"><Video className="h-4 w-4 mr-2" />{t("teacher.uploadRecording", "Upload Recording")}</Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/teacher/submissions">
                <FileCheck className="h-4 w-4 mr-2" />{t("teacher.reviewSubmissions", "Review Submissions")}
                {(pendingSubmissions?.length || 0) > 0 && (
                  <span className="ml-auto bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">{pendingSubmissions?.length}</span>
                )}
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/teacher/exercises"><BookOpen className="h-4 w-4 mr-2" />{t("teacher.createExercise", "Create Exercise")}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
