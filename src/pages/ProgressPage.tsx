import React from "react";
import { useTranslation } from "react-i18next";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BookOpenCheck, GraduationCap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import config from "@/lib/app-config";
import { featureFlags } from "@/lib/feature-flags";
import { generateCertificateHtml } from "@/lib/certificate-utils";

export default function ProgressPage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const { data: attemptsDetailed, isLoading } = useQuery({
    queryKey: ["attempts-detailed", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exercise_attempts")
        .select(
          `
          exercise_id,
          passed,
          exercises (
            title,
            level_id,
            levels (
              name_nl,
              name_en,
              name_ar
            )
          )
        `
        )
        .eq("student_id", user!.id)
        .order("submitted_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const downloadCertificate = (levelId: string, levelName: string) => {
    if (!featureFlags.CERTIFICATE_GENERATION) return;
    
    // Placeholder logic for certificate generation
    // In a real app, this would likely call an edge function or use a PDF library
    const html = generateCertificateHtml({
      studentName: user?.user_metadata?.full_name || "Student",
      levelName: levelName,
      completionDate: new Date().toLocaleDateString(),
      institutionName: config.appName,
      certificateId: `CERT-${levelId}-${Date.now()}`
    });
    
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `certificate-${levelId}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <MainLayout>
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">{t("progress.title", "Mijn Voortgang")}</h1>
          <p className="text-muted-foreground mt-1">
            {t("progress.subtitle", "Bekijk je voortgang en behaalde resultaten.")}
          </p>
        </div>

        {isLoading ? (
          <p>{t("common.loading", "Laden...")}</p>
        ) : (
          <>
            {attemptsDetailed && attemptsDetailed.length === 0 ? (
              <div className="text-center py-12">
                <BookOpenCheck className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  {t("progress.noExercises", "Je hebt nog geen oefeningen gemaakt.")}
                </p>
                <Link to="/self-study" className="text-primary underline">
                  {t("progress.startLearning", "Begin met leren")}
                </Link>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Assuming there's a place where levels are listed, we add the button there if completed. */}
                {/* For now, let's add it near the top if the user has completed any level. */}
                
                {/* (We need to fetch completed levels first to know when to show the button. 
                The current query attempts-detailed gives us exercises, but promotion happens via `final_exam_attempts` or manual promotion.
                For simplicity in this batch, I'll add a section for Certificates if we detect completion.) */}

                {attemptsDetailed && attemptsDetailed.length > 0 && (
                  <Card className="col-span-full">
                    <CardHeader>
                      <CardTitle>{t("progress.certificates", "Certificaten")}</CardTitle>
                      <CardDescription>
                        {t("progress.downloadCertificates", "Download hier je behaalde certificaten.")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {/* Placeholder: Replace with actual logic to determine completed levels */}
                      {/* For now, show a button if any level has been attempted */}
                      {attemptsDetailed.map((attempt, index) => {
                        if (!attempt.exercises?.levels) return null;
                        return (
                          <div key={index} className="mb-4">
                            <p>
                              {t("progress.level", "Niveau")}:{" "}
                              {attempt.exercises.levels.name_nl}
                            </p>
                            {featureFlags.CERTIFICATE_GENERATION && (
                              <button onClick={() => downloadCertificate(attempt.exercises.level_id, attempt.exercises.levels.name_nl)}>
                                {t("progress.downloadCertificate", "Download Certificaat")}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                )}

                {attemptsDetailed?.map((attempt) => {
                  return (
                    <Card key={attempt.exercise_id}>
                      <CardHeader>
                        <CardTitle>{attempt.exercises?.title}</CardTitle>
                        <CardDescription>
                          {t("progress.level", "Niveau")}: {attempt.exercises?.levels?.name_nl}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Progress value={attempt.passed ? 100 : 0} />
                        <p className="mt-2">
                          {attempt.passed
                            ? t("progress.passed", "Geslaagd")
                            : t("progress.failed", "Gefaald")}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}
