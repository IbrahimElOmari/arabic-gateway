import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { apiQuery } from "@/lib/supabase-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertTriangle, Pencil } from "lucide-react";
import { CurriculumItemEditDialog, type EditableItem } from "@/components/curriculum/CurriculumItemEditDialog";

export default function CurriculumReviewPage() {
  const { t } = useTranslation();
  const [unitFilter, setUnitFilter] = useState<string>("all");
  const [skillFilter, setSkillFilter] = useState<string>("all");
  const [onlyFlagged, setOnlyFlagged] = useState<boolean>(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<EditableItem | null>(null);

  const { data: items, isLoading } = useQuery({
    queryKey: ["curriculum-review", unitFilter, skillFilter, onlyFlagged],
    queryFn: () =>
      apiQuery<EditableItem[]>("curriculum_items", (q) => {
        let qq = q.select("*").order("item_id", { ascending: true }).limit(500);
        if (unitFilter !== "all") qq = qq.eq("unit_code", unitFilter);
        if (skillFilter !== "all") qq = qq.eq("skill", skillFilter);
        if (onlyFlagged) qq = qq.or("review_flag.ilike.%CONTROLEER%,review_flag.ilike.%ONTBREEKT%");
        return qq;
      }),
  });

  const { data: units } = useQuery({
    queryKey: ["curriculum-units-list"],
    queryFn: () =>
      apiQuery<{ code: string }[]>("curriculum_units", (q) =>
        q.select("code").order("display_order")
      ),
  });

  const filtered = useMemo(() => {
    const list = items ?? [];
    if (!search) return list;
    const s = search.toLowerCase();
    return list.filter(
      (i) =>
        i.item_id.toLowerCase().includes(s) ||
        (i.instruction_nl ?? "").toLowerCase().includes(s) ||
        (i.input_arabic ?? "").includes(search)
    );
  }, [items, search]);

  const skills = ["lezen", "schrijven", "luisteren", "spreken", "grammatica", "woordenschat"];

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-2">{t("curriculum.reviewTitle", "Curriculum NS-review")}</h1>
      <p className="text-muted-foreground mb-6">
        {t("curriculum.reviewSubtitle", "Bewerk en controleer items met ⚠️ CONTROLEER of ⚠️ ONTBREEKT.")}
      </p>

      <Card className="mb-4">
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <Select value={unitFilter} onValueChange={setUnitFilter}>
            <SelectTrigger><SelectValue placeholder="Unit" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.allUnits", "Alle units")}</SelectItem>
              {(units ?? []).map((u) => (
                <SelectItem key={u.code} value={u.code}>{u.code}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={skillFilter} onValueChange={setSkillFilter}>
            <SelectTrigger><SelectValue placeholder="Skill" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.allSkills", "Alle skills")}</SelectItem>
              {skills.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant={onlyFlagged ? "default" : "outline"}
            onClick={() => setOnlyFlagged((v) => !v)}
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            {onlyFlagged ? t("curriculum.flaggedOnly", "Alleen review-items") : t("curriculum.allItems", "Alle items")}
          </Button>
          <Input
            placeholder={t("common.search", "Zoeken...")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {filtered.length} {t("curriculum.itemsFound", "items")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {filtered.map((it) => (
                <div key={it.id} className="p-3 flex items-start gap-3 hover:bg-muted/30">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge variant="outline" className="text-xs">{it.item_id}</Badge>
                      <Badge variant="secondary" className="text-xs">{it.skill}</Badge>
                      <Badge variant="outline" className="text-xs">{it.exercise_type}</Badge>
                      {it.review_flag && /CONTROLEER|ONTBREEKT/i.test(it.review_flag) && (
                        <Badge variant="destructive" className="text-xs gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {it.review_flag.length > 40 ? it.review_flag.slice(0, 40) + "…" : it.review_flag}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm truncate">{it.instruction_nl || it.question}</p>
                    {it.input_arabic && (
                      <p dir="rtl" lang="ar" className="text-lg truncate" style={{ fontFamily: '"Amiri", "Noto Naskh Arabic", serif' }}>
                        {it.input_arabic}
                      </p>
                    )}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setEditing(it)}>
                    <Pencil className="h-3 w-3 mr-1" />
                    {t("common.edit", "Wijzigen")}
                  </Button>
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="py-12 text-center text-muted-foreground">
                  {t("curriculum.noReviewItems", "Geen items gevonden.")}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <CurriculumItemEditDialog
        item={editing}
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
      />
    </div>
  );
}
