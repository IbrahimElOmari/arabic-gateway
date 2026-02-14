import { useTranslation } from "react-i18next";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Video, Loader2, Play } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

export default function RecordingsPage() {
  const { t } = useTranslation();
  const { user, isAdmin, isTeacher } = useAuth();
  const isStaff = isAdmin || isTeacher;

  // Get enrolled class IDs for students
  const { data: enrolledClassIds } = useQuery({
    queryKey: ["enrolled-class-ids", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("class_enrollments")
        .select("class_id")
        .eq("student_id", user!.id)
        .eq("status", "enrolled");
      if (error) throw error;
      return data.map((e) => e.class_id);
    },
    enabled: !!user && !isStaff,
  });

  const { data: recordings, isLoading } = useQuery({
    queryKey: ["lesson-recordings", user?.id, isStaff, enrolledClassIds],
    queryFn: async () => {
      // Staff sees all recordings; students see only enrolled class recordings
      // RLS already enforces this, but we add explicit filtering for clarity
      const { data, error } = await supabase
        .from("lesson_recordings")
        .select("*, lesson:lessons(title, description, class_id)")
        .order("created_at", { ascending: false });
      if (error) throw error;

      if (isStaff) return data;

      // Filter by enrolled classes
      return data.filter((r: any) =>
        enrolledClassIds?.includes(r.lesson?.class_id)
      );
    },
    enabled: !!user && (isStaff || (enrolledClassIds !== undefined)),
  });

  return (
    <MainLayout>
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            {t("lessons.recordings", "Recordings")}
          </h1>
          <p className="text-muted-foreground">
            {t("lessons.recordingsDescription", "Watch past lesson recordings")}
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : recordings && recordings.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recordings.map((recording) => (
              <Card key={recording.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{recording.lesson?.title}</CardTitle>
                  <CardDescription>{recording.lesson?.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" asChild>
                    <a href={recording.video_url} target="_blank" rel="noopener noreferrer">
                      <Play className="h-4 w-4 mr-2" />
                      {t("lessons.watchRecording", "Watch Recording")}
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Video className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">{t("lessons.noRecordings", "No recordings available")}</h3>
              <p className="text-muted-foreground">{t("lessons.recordingsComingSoon", "Recordings will appear here after live sessions")}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}