import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiQuery } from "@/lib/supabase-api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, AlertTriangle, CheckCircle2, Pencil, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { CurriculumItemEditDialog, type EditableItem } from "@/components/curriculum/CurriculumItemEditDialog";
import { CurriculumItemCreateDialog } from "@/components/curriculum/CurriculumItemCreateDialog";

const SKILLS = ["lezen", "schrijven", "luisteren", "spreken", "grammatica", "woordenschat"] as const;

interface Item {
  id: string;
  item_id: string;
  week: number;
  skill: string;
  exercise_type: string;
  instruction_nl: string;
  question: string;
  points: number | null;
  review_flag: string | null;
}

interface Unit {
  code: string;
  title_nl: string | null;
  title_ar: string | null;
  cefr_from: string | null;
  week_start: number | null;
  display_order: number;
}

export default function CurriculumUnitPage() {
  const { unitCode } = useParams<{ unitCode: string }>();
  const { t } = useTranslation();
  const { user, isAdmin, isTeacher } = useAuth();
  const canEdit = isAdmin || isTeacher;
  const [skillFilter, setSkillFilter] = useState<string>("all");
  const [editing, setEditing] = useState<EditableItem | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: unit } = useQuery({
    queryKey: ["curriculum-unit", unitCode],
    queryFn: () =>
      apiQuery<Unit>("curriculum_units", (q) =>
        q.select("*").eq("code", unitCode).maybeSingle()
      ),
    enabled: !!unitCode,
  });

  const { data: items, isLoading } = useQuery({
    queryKey: ["curriculum-items", unitCode, canEdit],
    queryFn: () =>
      apiQuery<Item[]>("curriculum_items", (q) =>
        q
          .select(canEdit ? "*" : "id, item_id, week, skill, exercise_type, instruction_nl, question, points, review_flag")
          .eq("unit_code", unitCode!)
          .order("item_id", { ascending: true })
      ),
    enabled: !!unitCode,
  });

  const { data: attempts } = useQuery({
    queryKey: ["unit-attempts", unitCode, user?.id],
    queryFn: async () => {
      const itemIds = (items ?? []).map((i) => i.id);
      if (!itemIds.length || !user) return [];
      return apiQuery<{ item_id: string; is_correct: boolean }[]>(
        "curriculum_item_attempts",
        (q) => q.select("item_id, is_correct").eq("student_id", user.id).in("item_id", itemIds)
      );
    },
    enabled: !!user && !!items?.length,
  });

  const attemptByItem = useMemo(() => {
    const map = new Map<string, boolean>();
    (attempts ?? []).forEach((a) => {
      if (!map.has(a.item_id) || a.is_correct) map.set(a.item_id, a.is_correct);
    });
    return map;
  }, [attempts]);

  const filtered = useMemo(() => {
    if (skillFilter === "all") return items ?? [];
    return (items ?? []).filter((i) => i.skill === skillFilter);
  }, [items, skillFilter]);

  const title = unit?.title_nl?.trim() || `Unit ${unit?.week_start ?? unit?.display_order ?? unitCode}`;
  const skillsPresent = Array.from(new Set((items ?? []).map((i) => i.skill)));

  return (
    <div className="container py-8">
      <Button variant="ghost" asChild className="mb-4">
        <Link to="/self-study">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("common.back", "Terug")}
        </Link>
      </Button>

      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold">
              {unitCode} · {title}
            </h1>
            {unit?.cefr_from && <Badge variant="secondary">{unit.cefr_from}</Badge>}
          </div>
          {unit?.title_ar && (
            <p className="text-xl mt-1 text-muted-foreground" dir="rtl" lang="ar">
              {unit.title_ar}
            </p>
          )}
        </div>
        {canEdit && (
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t("curriculum.newItem", "Nieuwe oefening")}
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <Button
          size="sm"
          variant={skillFilter === "all" ? "default" : "outline"}
          onClick={() => setSkillFilter("all")}
        >
          {t("common.all", "Alle")} ({items?.length ?? 0})
        </Button>
        {SKILLS.filter((s) => skillsPresent.includes(s)).map((s) => (
          <Button
            key={s}
            size="sm"
            variant={skillFilter === s ? "default" : "outline"}
            onClick={() => setSkillFilter(s)}
          >
            {t(`skills.${s}`, s)}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((item) => {
            const status = attemptByItem.get(item.id);
            const needsReview = /CONTROLEER|ONTBREEKT/i.test(item.review_flag ?? "");
            return (
              <Card key={item.id} className="relative transition-all hover:border-primary/50 hover:shadow-sm">
                <Link to={`/self-study/item/${item.id}`} className="block">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {item.item_id}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {t(`skills.${item.skill}`, item.skill)}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {t(`exerciseTypes.${item.exercise_type}`, item.exercise_type)}
                        </Badge>
                        {needsReview && (
                          <Badge variant="destructive" className="text-xs gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {t("curriculum.inReview", "in review")}
                          </Badge>
                        )}
                      </div>
                      <p className="font-medium truncate">{item.instruction_nl || item.question}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm text-muted-foreground">{item.points ?? 0} pt</span>
                      {status === true && <CheckCircle2 className="h-5 w-5 text-success" />}
                    </div>
                  </CardContent>
                </Link>
                {canEdit && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute top-2 right-2 z-10"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setEditing(item as unknown as EditableItem);
                    }}
                  >
                    <Pencil className="h-3 w-3 mr-1" />
                    {t("common.edit", "Wijzigen")}
                  </Button>
                )}
              </Card>
            );
          })}
          {filtered.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                {t("curriculum.noItems", "Geen oefeningen in deze selectie.")}
              </CardContent>
            </Card>
          )}
        </div>
      )}
      <CurriculumItemEditDialog
        item={editing}
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
      />
    </div>
  );
}
