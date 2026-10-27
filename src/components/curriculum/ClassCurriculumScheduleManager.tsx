import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiMutate, apiQuery, apiRpc } from "@/lib/supabase-api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, ChevronDown, ChevronUp, FastForward, Loader2, Palmtree } from "lucide-react";

interface Row {
  unit_code: string;
  is_unlocked: boolean;
  unlock_date: string | null;
}
interface UnitMeta {
  code: string;
  display_order: number;
  title_nl: string | null;
}

const isOpen = (r: Row) => r.is_unlocked || (!!r.unlock_date && new Date(r.unlock_date) <= new Date());

export function ClassCurriculumScheduleManager({ classId }: { classId: string }) {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const key = ["class-schedule", classId];
  const { data, isLoading } = useQuery({
    queryKey: key,
    enabled: open,
    queryFn: async () => {
      const [rows, units, cls] = await Promise.all([
        apiQuery<Row[]>("class_curriculum_schedules", (q) =>
          q.select("unit_code,is_unlocked,unlock_date").eq("class_id", classId)
        ),
        apiQuery<UnitMeta[]>("curriculum_units", (q) => q.select("code,display_order,title_nl").order("display_order")),
        apiQuery<{ curriculum_all_unlocked: boolean }>("classes", (q) =>
          q.select("curriculum_all_unlocked").eq("id", classId).maybeSingle()
        ),
      ]);
      const meta = new Map(units.map((u) => [u.code, u]));
      const sorted = rows
        .filter((r) => meta.has(r.unit_code))
        .sort((a, b) => meta.get(a.unit_code)!.display_order - meta.get(b.unit_code)!.display_order);
      return { rows: sorted, meta, allUnlocked: !!cls?.curriculum_all_unlocked };
    },
  });

  const run = async (fn: () => Promise<unknown>, okMsg: string) => {
    setBusy(true);
    try {
      await fn();
      toast({ title: okMsg });
      qc.invalidateQueries({ queryKey: key });
    } catch (e: any) {
      toast({ title: t("common.error", "Fout"), description: e?.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const updateRow = (unit_code: string, patch: Partial<Row>) =>
    run(
      () => apiMutate("class_curriculum_schedules", (q) => q.update(patch).eq("class_id", classId).eq("unit_code", unit_code)),
      t("schedule.saved", "Planning opgeslagen")
    );

  const rows = data?.rows ?? [];
  const currentIdx = rows.reduce((acc, r, i) => (isOpen(r) ? i : acc), -1);
  const current = currentIdx >= 0 ? rows[currentIdx] : null;

  return (
    <div className="mt-4 border-t pt-4">
      <Button variant="outline" size="sm" onClick={() => setOpen((o) => !o)}>
        <CalendarClock className="h-4 w-4 me-2" />
        {t("schedule.title", "Weekplanning zelfstudie")}
        {open ? <ChevronUp className="h-4 w-4 ms-2" /> : <ChevronDown className="h-4 w-4 ms-2" />}
      </Button>

      {open && (
        <div className="mt-4 space-y-4">
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("schedule.empty", "Voor het niveau van deze klas is nog geen zelfstudie-inhoud.")}
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="secondary">
                  {t("schedule.current", "Huidige week")}: {current ? currentIdx + 1 : "—"} / {rows.length}
                </Badge>
                <Button
                  size="sm"
                  disabled={busy || data?.allUnlocked}
                  onClick={() =>
                    run(() => apiRpc("unlock_next_class_unit", { _class_id: classId }), t("schedule.nextDone", "Volgende week vrijgegeven"))
                  }
                >
                  <FastForward className="h-4 w-4 me-2" />
                  {t("schedule.next", "+1 week vrijgeven")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy || data?.allUnlocked}
                  onClick={() =>
                    run(() => apiRpc("shift_class_schedule", { _class_id: classId, _days: 7 }), t("schedule.shiftDone", "Toekomstige weken 7 dagen opgeschoven"))
                  }
                >
                  <Palmtree className="h-4 w-4 me-2" />
                  {t("schedule.holiday", "Vakantieweek invoegen")}
                </Button>
                <label className="flex items-center gap-2 text-sm ms-auto">
                  <Switch
                    checked={!!data?.allUnlocked}
                    disabled={busy}
                    onCheckedChange={(v) =>
                      run(
                        () => apiMutate("classes", (q) => q.update({ curriculum_all_unlocked: v }).eq("id", classId)),
                        t("schedule.saved", "Planning opgeslagen")
                      )
                    }
                  />
                  {t("schedule.allOpen", "Alle weken direct open")}
                </label>
              </div>

              <ul className="divide-y rounded-md border">
                {rows.map((r, i) => {
                  const m = data!.meta.get(r.unit_code)!;
                  const openNow = data!.allUnlocked || isOpen(r);
                  return (
                    <li key={r.unit_code} className="flex flex-wrap items-center gap-3 p-2 text-sm">
                      <span className="w-20 font-medium">
                        {t("selfStudy.week", "Week")} {i + 1}
                      </span>
                      <span className="flex-1 min-w-32 truncate">
                        {r.unit_code} · {m.title_nl ?? ""}
                      </span>
                      <Badge variant={openNow ? "default" : "outline"}>
                        {openNow ? t("schedule.open", "Open") : t("schedule.locked", "Op slot")}
                      </Badge>
                      <Input
                        type="date"
                        className="w-40"
                        disabled={busy}
                        defaultValue={r.unlock_date ? r.unlock_date.slice(0, 10) : ""}
                        aria-label={t("schedule.date", "Openingsdatum")}
                        onBlur={(e) => {
                          const v = e.target.value;
                          const prev = r.unlock_date ? r.unlock_date.slice(0, 10) : "";
                          if (v !== prev) updateRow(r.unit_code, { unlock_date: v ? new Date(v + "T00:00:00").toISOString() : null });
                        }}
                      />
                      <label className="flex items-center gap-2">
                        <Switch
                          checked={r.is_unlocked}
                          disabled={busy}
                          onCheckedChange={(v) => updateRow(r.unit_code, { is_unlocked: v })}
                        />
                        {t("schedule.manualOpen", "Nu open")}
                      </label>
                    </li>
                  );
                })}
              </ul>
              <p className="text-xs text-muted-foreground">
                {t("schedule.hint", "Een week opent automatisch op de datum, of meteen met 'Nu open'. Leerlingen houden altijd toegang tot weken waarin ze al gewerkt hebben.")}{" "}
                {new Date().toLocaleDateString(i18n.language)}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
