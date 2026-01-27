import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BookOpen, PenTool, Headphones, Mic, BookText, Loader2 } from "lucide-react";

const categoryIcons: Record<string, React.ElementType> = {
  reading: BookOpen,
  writing: PenTool,
  listening: Headphones,
  speaking: Mic,
  grammar: BookText,
};

export default function SelfStudyPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();

  // Fetch exercise categories
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ["exercise-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exercise_categories")
        .select("*")
        .order("display_order");
      if (error) throw error;
      return data;
    },
  });

  // Fetch user's progress per category
  const { data: progress } = useQuery({
    queryKey: ["student-progress", user?.id],
    queryFn: async () => {
      if (!user) return {};
      const { data, error } = await supabase
        .from("student_progress")
        .select("*")
        .eq("student_id", user.id);
      if (error) throw error;
      
      // Convert to a map by category_id
      const progressMap: Record<string, { completed: number; total: number; score: number }> = {};
      data?.forEach((p) => {
        progressMap[p.category_id] = {
          completed: p.exercises_completed,
          total: p.exercises_total,
          score: p.average_score,
        };
      });
      return progressMap;
    },
    enabled: !!user,
  });

  const getLocalizedName = (category: { name_nl: string; name_en: string; name_ar: string }) => {
    const lang = i18n.language;
    if (lang === "nl") return category.name_nl;
    if (lang === "ar") return category.name_ar;
    return category.name_en;
  };

  return (
    <MainLayout>
      <div className="container py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            {t("selfStudy.title", "Self Study")}
          </h1>
          <p className="text-muted-foreground">
            {t("selfStudy.description", "Practice and improve your Arabic skills at your own pace")}
          </p>
        </div>

        {/* Categories Grid */}
        {categoriesLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {categories?.map((category) => {
              const Icon = categoryIcons[category.name] || BookOpen;
              const categoryProgress = progress?.[category.id];
              const progressPercent = categoryProgress
                ? (categoryProgress.completed / Math.max(categoryProgress.total, 1)) * 100
                : 0;

              return (
                <Link key={category.id} to={`/self-study/${category.name}`}>
                  <Card className="h-full transition-all hover:shadow-lg hover:border-primary/50">
                    <CardHeader>
                      <div className="flex items-center gap-4">
                        <div className="rounded-full bg-primary/10 p-4">
                          <Icon className="h-8 w-8 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-xl">
                            {getLocalizedName(category)}
                          </CardTitle>
                          <CardDescription>
                            {category.description}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            {t("selfStudy.progress", "Progress")}
                          </span>
                          <span className="font-medium">
                            {categoryProgress?.completed || 0}/{categoryProgress?.total || 0}
                          </span>
                        </div>
                        <Progress value={progressPercent} className="h-2" />
                        {categoryProgress?.score !== undefined && categoryProgress.score > 0 && (
                          <p className="text-sm text-muted-foreground">
                            {t("selfStudy.averageScore", "Average score")}: {categoryProgress.score.toFixed(0)}%
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}

        {/* Empty state if no categories */}
        {!categoriesLoading && (!categories || categories.length === 0) && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground">
                {t("selfStudy.noExercises", "No exercises available yet")}
              </h3>
              <p className="text-muted-foreground">
                {t("selfStudy.checkBack", "Check back soon for new exercises!")}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
