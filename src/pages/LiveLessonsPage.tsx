import { useTranslation } from "react-i18next";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Video, Loader2, Plus, Palette } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Link } from "react-router-dom";

export default function LiveLessonsPage() {
  const { t } = useTranslation();
  const { user, role } = useAuth();
  
  const showManagementCTA = role === 'admin' || role === 'teacher';

  const { data: lessons, isLoading } = useQuery({
    queryKey: ["upcoming-lessons", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("*, class:classes(name)")
        .gte("scheduled_at", new Date().toISOString())
        .order("scheduled_at");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return (
    <MainLayout>
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            {t("lessons.liveClasses")}
          </h1>
          <p className="text-muted-foreground">
            {t("lessons.upcomingDescription")}
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : lessons && lessons.length > 0 ? (
          <div className="space-y-4">
            {lessons.map((lesson) => (
              <Card key={lesson.id}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>{lesson.title}</CardTitle>
                    <CardDescription>{lesson.description}</CardDescription>
                  </div>
                  <Badge>{lesson.status}</Badge>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(lesson.scheduled_at), "PPp")}
                    </span>
                    <span>{lesson.duration_minutes} {t("common.min")}</span>
                  </div>
                  {lesson.meet_link && (
                    <Button asChild>
                      <a href={lesson.meet_link} target="_blank" rel="noopener noreferrer">
                        <Video className="h-4 w-4 mr-2" />
                        {t("lessons.joinMeet")}
                      </a>
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">{t("lessons.noUpcoming")}</h3>
              <p className="text-muted-foreground mb-4">{t("lessons.checkBack")}</p>
              
              {/* CTA buttons for admin/teacher - always visible when empty */}
              {showManagementCTA && (
                <div className="flex flex-col sm:flex-row gap-3 mt-2">
                  <Button asChild data-testid="create-lesson-cta">
                    <Link to="/teacher/lessons">
                      <Plus className="h-4 w-4 mr-2" />
                      {t("teacher.newLesson", "New Lesson")}
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to="/teacher/content-studio">
                      <Palette className="h-4 w-4 mr-2" />
                      {t("nav.contentStudio", "Content Studio")}
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
