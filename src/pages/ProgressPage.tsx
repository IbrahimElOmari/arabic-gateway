import React from "react";
import { useTranslation } from "react-i18next";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BookOpenCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import config from "@/lib/app-config";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { generateCertificateHtml } from "@/lib/certificate-utils";

interface AttemptRow {
  exercise_id: string;
  passed: boolean | null;
  exercises: {
    title: string;
    class_id: string;
    classes: {
      level_id: string;
      levels: {
        name_nl: string;
        name_en: string;
        name_ar: string;
      } | null;
    } | null;
  } | null;
}

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
            class_id,
            classes (
              level_id,
              levels (
                name_nl,
                name_en,
                name_ar
              )
            )
          )
        `
        )
        .eq("student_id", user!.id)
        .order("submitted_at", { ascending: false });

      if (error) throw error;
      return data as unknown as AttemptRow[];
    },
    enabled: !!user,
  });

  const downloadCertificate = (levelId: string, levelName: string) => {
    if (!isFeatureEnabled("CERTIFICATE_GENERATION")) return;

    const html = generateCertificateHtml({
      studentName: user?.user_metadata?.full_name || "Student",
      levelName,
      completionDate: new Date().toLocaleDateString(),
      institutionName: config.appName,
      certificateId: `CERT-${levelId}-${Date.now()}`,
    });

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `certificate-${levelId}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getLevelName = (attempt: AttemptRow) =>
    attempt.exercises?.classes?.levels?.name_nl ?? "";

  const getLevelId = (attempt: AttemptRow) =>
    attempt.exercises?.classes?.level_id ?? "";

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
                {isFeatureEnabled("CERTIFICATE_GENERATION") &&
                  attemptsDetailed &&
                  attemptsDetailed.length > 0 && (
                    <Card className="col-span-full">
                      <CardHeader>
                        <CardTitle>{t("progress.certificates", "Certificaten")}</CardTitle>
                        <CardDescription>
                          {t("progress.downloadCertificates", "Download hier je behaalde certificaten.")}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {attemptsDetailed.map((attempt, index) => {
                          const levelName = getLevelName(attempt);
                          if (!levelName) return null;
                          return (
                            <div key={index} className="mb-4">
                              <p>
                                {t("progress.level", "Niveau")}: {levelName}
                              </p>
                              <button
                                onClick={() => downloadCertificate(getLevelId(attempt), levelName)}
                              >
                                {t("progress.downloadCertificate", "Download Certificaat")}
                              </button>
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>
                  )}

                {attemptsDetailed?.map((attempt) => (
                  <Card key={attempt.exercise_id}>
                    <CardHeader>
                      <CardTitle>{attempt.exercises?.title}</CardTitle>
                      <CardDescription>
                        {t("progress.level", "Niveau")}: {getLevelName(attempt)}
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
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}
