import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiQuery } from "@/lib/supabase-api";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, BookOpen } from "lucide-react";

interface Unit {
  code: string;
  display_order: number;
  week_start: number | null;
  title_nl: string | null;
  title_ar: string | null;
  cefr_from: string | null;
}

interface ProgressRow {
  unit_code: string;
  items_completed: number;
  items_correct: number;
  total_points: number;
}

export default function SelfStudyPage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const { data: units, isLoading: unitsLoading } = useQuery({
    queryKey: ["curriculum-units"],
    queryFn: () =>
      apiQuery<Unit[]>("curriculum_units", (q) =>
        q.select("code, display_order, week_start, title_nl, title_ar, cefr_from").order("display_order")
      ),
  });

  const unitCodes = (units ?? []).map((u) => u.code);

  const { data: countsByUnit, isLoading: countsLoading } = useQuery({
    queryKey: ["curriculum-item-counts", unitCodes],
    enabled: unitCodes.length > 0,
    queryFn: async () => {
      const entries = await Promise.all(
        unitCodes.map(async (code) => {
          const { count, error } = await supabase
            .from("curriculum_items")
            .select("*", { count: "exact", head: true })
            .eq("unit_code", code);
          if (error) throw error;
          return [code, count ?? 0] as const;
        })
      );
      return Object.fromEntries(entries) as Record<string, number>;
    },
  });

  const { data: progress } = useQuery({
    queryKey: ["curriculum-progress", user?.id],
    queryFn: () =>
      apiQuery<ProgressRow[]>("curriculum_progress", (q) =>
        q.select("unit_code, items_completed, items_correct, total_points").eq("student_id", user!.id)
      ),
    enabled: !!user,
  });

  const progressByUnit = (progress ?? []).reduce<Record<string, ProgressRow>>((acc, r) => {
    acc[r.unit_code] = r;
    return acc;
  }, {});

  const isLoading = unitsLoading || (unitCodes.length > 0 && countsLoading);
  const visibleUnits = (units ?? []).filter((u) => (countsByUnit?.[u.code] ?? 0) > 0);

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{t("selfStudy.title", "Zelfstudie")}</h1>
        <p className="text-muted-foreground">
          {t("selfStudy.unitsDescription", "Kies een unit om met de oefeningen te beginnen.")}
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {visibleUnits.map((u) => {
            const total = countsByUnit?.[u.code] ?? 0;
            const p = progressByUnit[u.code];
            const pct = total > 0 && p ? Math.round((p.items_completed / total) * 100) : 0;
            const title = u.title_nl?.trim() || `Unit ${u.week_start ?? u.display_order}`;
            return (
              <Link key={u.code} to={`/self-study/unit/${u.code}`}>
                <Card className="h-full transition-all hover:shadow-lg hover:border-primary/50">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <CardTitle className="text-lg">
                          {u.code} · {title}
                        </CardTitle>
                        {u.title_ar && (
                          <p className="text-base mt-1 font-arabic" dir="rtl" lang="ar">
                            {u.title_ar}
                          </p>
                        )}
                        <CardDescription className="mt-1">
                          {t("selfStudy.week", "Week")} {u.week_start ?? u.display_order}
                          {total > 0 && ` · ${total} ${t("selfStudy.exercises", "oefeningen")}`}
                        </CardDescription>
                      </div>
                      {u.cefr_from && (
                        <Badge variant="secondary" className="shrink-0">
                          {u.cefr_from}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {t("selfStudy.progress", "Voortgang")}
                        </span>
                        <span className="font-medium">
                          {p?.items_completed ?? 0}/{total}
                        </span>
                      </div>
                      <Progress value={pct} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {!isLoading && (!units || units.length === 0) && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">{t("selfStudy.noUnits", "Nog geen units beschikbaar")}</h3>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
