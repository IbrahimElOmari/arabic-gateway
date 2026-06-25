import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Unit = {
  code: string;
  display_order: number | null;
};

type Item = { unit_code: string; skill: string };

type ProgressRow = {
  unit_code: string;
  skill: string;
  items_correct: number | null;
};

export default function CurriculumMapData() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notLoggedIn, setNotLoggedIn] = useState(false);
  const [empty, setEmpty] = useState(false);
  const [units, setUnits] = useState<Unit[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) { setNotLoggedIn(true); setLoading(false); }
        return;
      }

      const [{ data: unitsData, error: unitsErr }, { data: progressData, error: progErr }] =
        await Promise.all([
          supabase.from("curriculum_units").select("code, display_order"),
          supabase
            .from("curriculum_progress_by_skill")
            .select("unit_code, skill, items_correct")
            .eq("student_id", user.id),
        ]);

      let fetchedItems: Item[] = [];
      let itemsErr: any = null;
      const PAGE_SIZE = 1000; // gelijk aan het server-maximum per verzoek
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from('curriculum_items')
          .select('unit_code, skill')
          .eq('is_published', true)
          .order('id', { ascending: true })
          .range(from, from + PAGE_SIZE - 1);
        if (error) { itemsErr = error; break; }
        fetchedItems = fetchedItems.concat(data as Item[]);
        if (data.length < PAGE_SIZE) break; // laatste pagina bereikt
        from += PAGE_SIZE;
      }

      if (cancelled) return;

      if (unitsErr || itemsErr || progErr) {
        setError("Fout bij ophalen: " + (unitsErr?.message || itemsErr?.message || progErr?.message));
        setLoading(false);
        return;
      }

      if (!fetchedItems || fetchedItems.length === 0) {
        setEmpty(true);
        setLoading(false);
        return;
      }

      setUnits((unitsData || []).map((u: any) => ({ code: u.code, display_order: u.display_order ?? null })));
      setItems(fetchedItems);
      setProgress((progressData || []).map((p: any) => ({
        unit_code: p.unit_code,
        skill: p.skill,
        items_correct: p.items_correct,
      })));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="p-6">Laden…</div>;
  if (notLoggedIn) return <div className="p-6">Niet ingelogd.</div>;
  if (error) return <div className="p-6 text-destructive">{error}</div>;
  if (empty) return <div className="p-6">Je hebt nog geen toegang tot het curriculum.</div>;

  // B1 — vorm de data tot stippen (zelfstandig)
  const groups = new Map(); // "unit\u0000skill" -> { unit_code, skill, items_total }
  items.forEach((it) => {
    const k = it.unit_code + '\u0000' + it.skill;
    let g = groups.get(k);
    if (!g) { g = { unit_code: it.unit_code, skill: it.skill, items_total: 0 }; groups.set(k, g); }
    g.items_total += 1;
  });
  const progByKey = new Map();
  progress.forEach((p) => { progByKey.set(p.unit_code + '\u0000' + p.skill, p); });
  const stippen = [...groups.values()].map((g) => {
    const pr = progByKey.get(g.unit_code + '\u0000' + g.skill);
    return {
      unit_code: g.unit_code,
      skill: g.skill,
      items_total: Number(g.items_total),
      items_correct: Number(pr ? pr.items_correct : 0),
    };
  });

  // B2 — afgeleide waarden
  const orderOf: Record<string, number> = {};
  units.forEach((u) => { orderOf[u.code] = u.display_order ?? 999999; });

  const weeksSorted = [...new Set(stippen.map((s) => s.unit_code))].sort((a, b) => {
    const da = orderOf[a] ?? 999999, db = orderOf[b] ?? 999999;
    return da - db || (a < b ? -1 : a > b ? 1 : 0);
  });
  const skillsSorted = [...new Set(stippen.map((s) => s.skill))].sort();

  const T = 0.8;
  const ratioOf = (s: { items_correct: number; items_total: number }) => Math.min(s.items_correct / s.items_total, 1);
  const ignited = stippen.filter((s) => ratioOf(s) >= T)
    .map((s) => `${s.unit_code} ${s.skill}`).sort();

  // B3 — vaste layout-constanten
  const cellW = 26, cellH = 30, originX = 40, originY = 40;
  const numWeeks = weeksSorted.length, numSkills = skillsSorted.length;
  const width  = originX + (numWeeks  - 1) * cellW + 60;
  const height = originY + (numSkills - 1) * cellH + 56;
  const xOf = (wi: number) => originX + (numWeeks - 1 - wi) * cellW;
  const yOf = (si: number) => originY + si * cellH;
  const labelY = originY + (numSkills - 1) * cellH + 30;

  // B4 — één ster (Optie A: helderheid groeit mee; goud bij ratio ≥ 0,8)
  const keyOf = (s: { unit_code: string; skill: string }) => s.unit_code + '\u0000' + s.skill;

  const renderStar = (s: typeof stippen[number], i: number) => {
    const wi = weeksSorted.indexOf(s.unit_code);
    const si = skillsSorted.indexOf(s.skill);
    if (wi < 0 || si < 0) return null;
    const cx = xOf(wi), cy = yOf(si);
    const r = ratioOf(s);
    const k = keyOf(s);
    const title = `${s.unit_code} · ${s.skill} · ${s.items_correct}/${s.items_total}`;
    const onEnter = () => setHovered(k);
    const onLeave = () => setHovered((h) => (h === k ? null : h));
    if (r >= T) {
      return (
        <g key={i} onMouseEnter={onEnter} onMouseLeave={onLeave}>
          <title>{title}</title>
          <circle cx={cx} cy={cy} r={10}  fill="#f3c969" opacity={0.10} />
          <circle cx={cx} cy={cy} r={6.5} fill="#f3c969" opacity={0.20} />
          <circle cx={cx} cy={cy} r={4}   fill="#ffdd8a" opacity={0.45} />
          <line x1={cx - 7} y1={cy} x2={cx + 7} y2={cy} stroke="#ffe9a8" strokeWidth={0.8} opacity={0.55} />
          <line x1={cx} y1={cy - 7} x2={cx} y2={cy + 7} stroke="#ffe9a8" strokeWidth={0.8} opacity={0.55} />
          <circle cx={cx} cy={cy} r={2.6} fill="#fff5d6" opacity={1} />
          <circle cx={cx} cy={cy} r={11} fill="transparent" pointerEvents="all" />
        </g>
      );
    }
    const t = r / T;
    const op = 0.12 + 0.60 * t;
    const rad = 2.2 + 1.6 * t;
    return (
      <g key={i} onMouseEnter={onEnter} onMouseLeave={onLeave}>
        <title>{title}</title>
        {t > 0.45 && <circle cx={cx} cy={cy} r={rad * 2.2} fill="#aebfe0" opacity={op * 0.30} />}
        <circle cx={cx} cy={cy} r={rad} fill="#cdd8f2" opacity={op} />
        <circle cx={cx} cy={cy} r={11} fill="transparent" pointerEvents="all" />
      </g>
    );
  };

  // B5 — label-helper
  const labelW = (skill: string) => skill.length * 6.6 + 12;

  const renderLabel = (s: typeof stippen[number], idKey: string, gold: boolean) => {
    const wi = weeksSorted.indexOf(s.unit_code);
    const si = skillsSorted.indexOf(s.skill);
    if (wi < 0 || si < 0) return null;
    const cx = xOf(wi), cy = yOf(si);
    const w = labelW(s.skill), h = 16, gap = 13;
    const fitsLeft = (cx - gap - w) >= 2;
    const rectX = fitsLeft ? (cx - gap - w) : (cx + gap);
    const textX = fitsLeft ? (cx - gap) : (cx + gap);
    const anchor = fitsLeft ? 'end' : 'start';
    const textFill = gold ? '#f0c45f' : '#dbe4fb';
    const bgFill   = gold ? '#1a1330' : '#10204a';
    return (
      <g key={idKey} pointerEvents="none">
        <rect x={rectX} y={cy - h / 2} width={w} height={h} rx={4} fill={bgFill} opacity={0.9} />
        <text x={textX} y={cy + 4} textAnchor={anchor} fontSize={11} fill={textFill}>{s.skill}</text>
      </g>
    );
  };

  const hoveredStip = hovered ? stippen.find((s) => keyOf(s) === hovered) : null;
  const hoveredIsGold = hoveredStip ? ratioOf(hoveredStip) >= T : false;

  // B6 — weergave
  return (
    <div className="p-6">
      {stippen.length > 0 && (
        <svg width="100%" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Sterrenkaart voortgang">
          <rect x={0} y={0} width={width} height={height} rx={12} fill="#0b1124" />
          {stippen.map(renderStar)}
          {weeksSorted.map((code, i) => (
            <text key={code} x={xOf(i)} y={labelY} textAnchor="middle" fontSize={12} fill="#6f7ea6">{code}</text>
          ))}
          {stippen.filter((s) => ratioOf(s) >= T).map((s) => renderLabel(s, 'gold-' + keyOf(s), true))}
          {hoveredStip && !hoveredIsGold && renderLabel(hoveredStip, 'hover', false)}
        </svg>
      )}
      <p style={{ marginTop: 12 }}>
        Ontvlamd (≥80%): {ignited.length ? ignited.join(', ') : 'nog geen'}
      </p>
      <p>
        weken={numWeeks} stippen={stippen.length} gepubliceerde_items={items.length} voortgangsrijen={progress.length}
      </p>
    </div>
  );
}
