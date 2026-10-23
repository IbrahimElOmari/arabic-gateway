# maak_verwacht_per_stap_N1-W03.py v1.3 — Maker-T (7T) · P3/P4 N1-W03 · = maak_verwacht_per_stap_N1-W02.py v1.2, maar alles uit
# BLOKKEN_MANIFEST.tsv (9T V2, V5): standbepaling per week, per blok de verwachte uitkomst van elke stap, de terugdraaivolgorde over de
# weken heen, en de slotcontrole (tellingen uit de NA-bestanden, met slot_tellingen_N1-W03.sql).
# Gebruik: python3 -I maak_verwacht_per_stap_N1-W03.py <sql-root> <NA_W03.tsv> <NA_W02.tsv> <NA_W01.tsv> <VOOR_W03.tsv> <VOOR_W02.tsv> <VOOR_W01.tsv>
import sys, os, csv, json, hashlib, collections
csv.field_size_limit(10**9)
B = sys.argv[1]; NAP = dict(zip((3, 2, 1), sys.argv[2:5])); VOP = dict(zip((3, 2, 1), sys.argv[5:8]))
M = [dict(zip(("volgorde", "week", "blok", "map", "md5_verwacht", "week_voor", "week_na"), l.rstrip("\n").split("\t"))) for l in list(open(f"{B}/BLOKKEN_MANIFEST.tsv", encoding="utf-8"))[1:]]
for r in M: assert hashlib.md5(open(f"{B}/{r['map']}/verwacht.txt", "rb").read()).hexdigest() == r["md5_verwacht"], r["map"]
VW = {r["blok"]: dict(l.rstrip("\n").split("\t", 1) for l in open(f"{B}/{r['map']}/verwacht.txt", encoding="utf-8")) for r in M}
def tel(p):
    R = list(csv.DictReader(open(p, encoding="utf-8", newline=""), delimiter="\t")); mp = lambda r: json.loads(r["media_production"])
    return dict(items=len(R), b25=sum(1 for r in R if r["strict_tashkeel"] == "true" and r["correct_answer"] not in json.loads(r["options"] or "[]")),
                needs_image=sum("beeld" in mp(r) for r in R), strict=sum(r["strict_tashkeel"] == "true" for r in R), punten=sum(int(r["points"]) for r in R),
                ns_audio=sum("NS-audio" in mp(r) for r in R), student_opname=sum("student-opname" in mp(r) for r in R),
                vlaggen=sum(r["review_flag"] != "" for r in R), gepubliceerd=sum(r["is_published"] == "true" for r in R),
                typen="|".join(f"{k}:{v}" for k, v in sorted(collections.Counter(r["exercise_type"] for r in R).items())))
SLOT_NA = {w: tel(NAP[w]) for w in (3, 2, 1)}; SLOT_VOOR = {w: tel(VOP[w]) for w in (3, 2, 1)}
L = ["# N1-W03 · SQL v4.4 · verwachte uitkomsten per stap (uit BLOKKEN_MANIFEST.tsv)",
     f"Gemaakt door `scripts/w03/maak_verwacht_per_stap_N1-W03.py` v1.3 uit het manifest (md5 `{hashlib.md5(open(f'{B}/BLOKKEN_MANIFEST.tsv','rb').read()).hexdigest()}`) en de bestanden `verwacht.txt` (md5 per blok in het manifest). "
     f"Volgorde in P4: {' → '.join(r['blok'] for r in M)}. Terugdraaien (alleen op opdracht van Ibra, V-B): {' → '.join(r['blok'] for r in reversed(M))}, tot en met het betrokken blok. "
     "Alle vingerafdrukken zijn `aantal|md5` over `item_id|vingerafdruk` (27 kolommen, gesorteerd COLLATE \"C\"). Apply, rollback en 4b lopen in REPEATABLE READ en geven één rij `n|md5|isolatie`. "
     "De grendels per rij dwingen de blokvolgorde niet af; daarom is `7_vinger_aggregaat.sql` vóór elke apply en elke rollback een harde STOP, en controleert `p4_stap_N1-W03.py` (manifest) elke uitkomst (exit 2 = STOP).", "",
     "**Na elke fout of afwijking** (in 3, 4, 4b of 8, ook een serialisatiefout, \"current transaction is aborted\" of een toolfout zonder resultaatrij): niets herhalen. Eerst één losse aanroep `ROLLBACK;`, daarna `7_vinger_aggregaat.sql` en de standbepaling; dan Ibra inlichten.", "",
     "## Standbepaling per week", ""]
for wk in dict.fromkeys(r["week"] for r in M):
    rs = [r for r in M if r["week"] == wk]
    L += [f"### {wk}", "| week-vingerafdruk | betekenis | volgende stap |", "|---|---|---|"]
    keten = [rs[0]["week_voor"]] + [r["week_na"] for r in rs]
    for k, f in enumerate(keten):
        bet = "niets toegepast (= back-up)" if k == 0 else (" + ".join(r["blok"] for r in rs[:k]) + " toegepast" + (" (= NA)" if k == len(rs) else ""))
        vlg = f"blok {rs[k]['blok']}" if k < len(rs) else "week klaar → volgend blok in het manifest"
        L.append(f"| `{f}` | {bet} | {vlg} |")
    L.append("")
for r in M:
    v = VW[r["blok"]]; d = f"{B}/{r['map']}"
    sz = {f: os.path.getsize(f"{d}/{f}") for f in ("3_apply.sql", "4_rollback.sql", "8_generale_repetitie.sql", "9_grootte_probe.sql", "2_droogloop.sql", "7_vinger_aggregaat.sql")}
    L += [f"## {r['volgorde']}. {r['week']} · blok {r['blok']} · {v['items_blok']} items · {v['gewijzigd']} gewijzigd · {v['paren']} velden", "",
          "| stap | bestand (bytes) | verwacht |", "|---|---|---|",
          f"| leescontrole in P3 (live = back-up) | `2_droogloop.sql` ({sz['2_droogloop.sql']}) | `{v['droogloop_p3']}` |",
          f"| leescontrole in P3: probe v2 | `9_grootte_probe.sql` ({sz['9_grootte_probe.sql']}) | `{v['probe_voor_apply']}` |",
          f"| P4 7_vinger vóór het blok (harde STOP bij afwijking) | `7_vinger_aggregaat.sql` ({sz['7_vinger_aggregaat.sql']}) | `{v['week_voor']}|{v['blok_voor']}|{v['rest']}` |",
          f"| P4 generale repetitie + activiteit + isolatie | `8_generale_repetitie.sql` ({sz['8_generale_repetitie.sql']}) | `{v['gr_eindrij']}` + `|pogingen30|pogingen30_leerders|logins30_leerders|logins30_staf|laatste_poging` + `|repeatable read` (STOP als pogingen30_leerders > 0, logins30_leerders > 0 of isolatie ≠ repeatable read) |",
          f"| P4 apply | `3_apply.sql` ({sz['3_apply.sql']}) | `{v['apply_uitvoer']}` |",
          f"| P4 aparte controle (en V-A door de Regisseur) | `7_vinger_aggregaat.sql` | `{v['week_na']}|{v['blok_na']}|{v['rest']}` |",
          f"| terugdraaien (alleen op opdracht van Ibra; eerst 7_vinger = NA van dit blok) | `4_rollback.sql` ({sz['4_rollback.sql']}) | `{v['rollback_uitvoer']}`, daarna 7_vinger `{v['week_voor']}|{v['blok_voor']}|{v['rest']}` |", ""]
L += ["## Slotcontrole (V-A) na het laatste blok en na de rooktest", "`slot_tellingen_N1-W03.sql` (alleen lezen). Verwacht (NA; tussen haakjes de stand vóór P4):", "",
      "| week | items | B25 | needs_image | strict | punten | needs_ns_audio | needs_student_recording | vlaggen | gepubliceerd | typen |", "|---|---|---|---|---|---|---|---|---|---|---|"]
for w in (3, 2, 1):
    n, o = SLOT_NA[w], SLOT_VOOR[w]
    L.append(f"| W0{w} | " + " | ".join(f"{n[k]} ({o[k]})" for k in ("items", "b25", "needs_image", "strict", "punten", "ns_audio", "student_opname", "vlaggen", "gepubliceerd")) + f" | `{n['typen']}` (`{o['typen']}`) |")
L += ["", "Daarnaast: rijen totaal 2.299 en rijen N1 2.299 (geen rij erbij of eraf); pogingen ongewijzigd ten opzichte van de laatste telling; de week-vingerafdrukken = `week_na` van het laatste blok van elke week."]
open(f"{B}/VERWACHT_PER_STAP.md", "w", encoding="utf-8").write("\n".join(L) + "\n")
q = ["-- slot_tellingen_N1-W03 · READ ONLY · P4 N1-W03 · B25 en tellingen W03, W02, W01 (verwacht: VERWACHT_PER_STAP.md, slotcontrole)", "BEGIN TRANSACTION READ ONLY;"]
cols = []
for w in (3, 2, 1):
    cols += [f"(SELECT count(*) FROM public.curriculum_items WHERE week = {w}) AS items_w0{w}",
             f"(SELECT count(*) FROM public.curriculum_items WHERE week = {w} AND strict_tashkeel AND NOT (options ? correct_answer)) AS b25_w0{w}",
             f"(SELECT count(*) FROM public.curriculum_items WHERE week = {w} AND needs_image) AS needs_image_w0{w}",
             f"(SELECT count(*) FROM public.curriculum_items WHERE week = {w} AND strict_tashkeel) AS strict_w0{w}",
             f"(SELECT sum(points) FROM public.curriculum_items WHERE week = {w}) AS punten_w0{w}",
             f"(SELECT count(*) FROM public.curriculum_items WHERE week = {w} AND needs_ns_audio) AS ns_audio_w0{w}",
             f"(SELECT count(*) FROM public.curriculum_items WHERE week = {w} AND needs_student_recording) AS student_opname_w0{w}",
             f"(SELECT count(*) FROM public.curriculum_items WHERE week = {w} AND review_flag <> '') AS vlaggen_w0{w}",
             f"(SELECT count(*) FROM public.curriculum_items WHERE week = {w} AND is_published) AS gepubliceerd_w0{w}",
             f"(SELECT string_agg(t || ':' || n, '|' ORDER BY t COLLATE \"C\") FROM (SELECT exercise_type::text AS t, count(*)::text AS n FROM public.curriculum_items WHERE week = {w} GROUP BY 1) x) AS typen_w0{w}"]
cols += ["(SELECT count(*) FROM public.curriculum_items) AS rijen_totaal", "(SELECT count(*) FROM public.curriculum_items WHERE week BETWEEN 1 AND 25) AS rijen_n1", "(SELECT count(*) FROM public.curriculum_item_attempts) AS pogingen_totaal"]
q += ["SELECT " + ", ".join(cols) + ";", "ROLLBACK;"]
open(f"{B}/slot_tellingen_N1-W03.sql", "w", encoding="utf-8").write("\n".join(q) + "\n")
json.dump({f"W0{w}": SLOT_NA[w] for w in (3, 2, 1)}, open(f"{B}/slot_verwacht_N1-W03.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
for n in ("VERWACHT_PER_STAP.md", "slot_tellingen_N1-W03.sql", "slot_verwacht_N1-W03.json"): print(n, "md5", hashlib.md5(open(f"{B}/{n}", "rb").read()).hexdigest())
for w in (3, 2, 1): print(f"W0{w} NA", SLOT_NA[w])
