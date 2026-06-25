import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Unit = {
  code: string;
  display_order: number | null;
  title_nl: string | null;
  title_ar: string | null;
  cefr_from: string | null;
  week_start: string | null;
};

type Item = { unit_code: string; skill: string };

type ProgressRow = {
  unit_code: string;
  skill: string;
  items_correct: number | null;
  items_attempted: number | null;
  points_total: number | null;
};

type Dot = {
  unit_code: string;
  skill: string;
  items_total: number;
  items_correct: number;
  items_attempted: number;
  points_total: number;
  display_order: number;
  title_nl: string | null;
};

export default function CurriculumMapData() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notLoggedIn, setNotLoggedIn] = useState(false);
  const [empty, setEmpty] = useState(false);
  const [dots, setDots] = useState<Dot[]>([]);
  const [progressCount, setProgressCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) { setNotLoggedIn(true); setLoading(false); }
        return;
      }

      const [{ data: units, error: unitsErr }, { data: items, error: itemsErr }, { data: progress, error: progErr }] =
        await Promise.all([
          supabase.from("curriculum_units").select("code, display_order, title_nl, title_ar, cefr_from, week_start"),
          supabase.from("curriculum_items").select("unit_code, skill").eq("is_published", true),
          supabase
            .from("curriculum_progress_by_skill")
            .select("unit_code, skill, items_correct, items_attempted, points_total")
            .eq("student_id", user.id),
        ]);

      if (cancelled) return;

      if (unitsErr || itemsErr || progErr) {
        setError("Fout bij ophalen: " + (unitsErr?.message || itemsErr?.message || progErr?.message));
        setLoading(false);
        return;
      }

      if (!items || items.length === 0) {
        setEmpty(true);
        setLoading(false);
        return;
      }

      const unitByCode = new Map<string, Unit>();
      (units || []).forEach((u: any) => unitByCode.set(u.code, {
        code: u.code,
        display_order: u.display_order ?? null,
        title_nl: u.title_nl ?? null,
        title_ar: u.title_ar ?? null,
        cefr_from: u.cefr_from ?? null,
        week_start: u.week_start != null ? String(u.week_start) : null,
      }));

      const itemsTotal = new Map<string, number>();
      (items as Item[]).forEach((it) => {
        const k = `${it.unit_code}|${it.skill}`;
        itemsTotal.set(k, (itemsTotal.get(k) || 0) + 1);
      });

      const progressByKey = new Map<string, ProgressRow>();
      (progress || []).forEach((p: any) => {
        if (!p.unit_code || !p.skill) return;
        progressByKey.set(`${p.unit_code}|${p.skill}`, {
          unit_code: p.unit_code,
          skill: p.skill,
          items_correct: p.items_correct,
          items_attempted: p.items_attempted,
          points_total: p.points_total,
        });
      });

      const builtDots: Dot[] = [];
      itemsTotal.forEach((total, key) => {
        const [unit_code = "", skill = ""] = key.split("|");
        const p = progressByKey.get(key);
        const u = unitByCode.get(unit_code);
        builtDots.push({
          unit_code,
          skill,
          items_total: total,
          items_correct: p?.items_correct ?? 0,
          items_attempted: p?.items_attempted ?? 0,
          points_total: p?.points_total ?? 0,
          display_order: u?.display_order ?? 999999,
          title_nl: u ? u.title_nl : null,
        });
      });

      setDots(builtDots);
      setProgressCount((progress || []).length);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="p-6">Laden…</div>;
  if (notLoggedIn) return <div className="p-6">Niet ingelogd.</div>;
  if (error) return <div className="p-6 text-destructive">{error}</div>;
  if (empty) return <div className="p-6">Je hebt nog geen toegang tot het curriculum.</div>;

  // Group by week
  const weekMap = new Map<string, Dot[]>();
  dots.forEach((d) => {
    const arr = weekMap.get(d.unit_code) || [];
    arr.push(d);
    weekMap.set(d.unit_code, arr);
  });

  const weeks = Array.from(weekMap.keys()).sort((a, b) => {
    const da = weekMap.get(a)?.[0]?.display_order ?? 999999;
    const db = weekMap.get(b)?.[0]?.display_order ?? 999999;
    if (da !== db) return da - db;
    return a.localeCompare(b);
  });

  const totalItems = dots.reduce((s, d) => s + d.items_total, 0);

  return (
    <div className="p-6 space-y-6">
      {weeks.map((code) => {
        const rows = [...weekMap.get(code)!].sort((a, b) => a.skill.localeCompare(b.skill));
        const title = rows[0].title_nl;
        return (
          <section key={code}>
            <h2 className="text-lg font-semibold mb-2">
              {title ? `${code} — ${title}` : code}
            </h2>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">skill</th>
                  <th className="text-left p-2">items_total</th>
                  <th className="text-left p-2">items_correct</th>
                  <th className="text-left p-2">items_attempted</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.skill} className="border-b">
                    <td className="p-2">{r.skill}</td>
                    <td className="p-2">{r.items_total}</td>
                    <td className="p-2">{r.items_correct}</td>
                    <td className="p-2">{r.items_attempted}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        );
      })}

      <pre className="mt-8 p-4 bg-muted rounded text-xs">
{`weken=${weeks.length}
stippen=${dots.length}
gepubliceerde_items=${totalItems}
voortgangsrijen=${progressCount}`}
      </pre>
    </div>
  );
}
