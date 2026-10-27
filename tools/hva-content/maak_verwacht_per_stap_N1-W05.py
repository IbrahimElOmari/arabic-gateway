# maak_verwacht_per_stap_N1-W05.py v1.8 (= v1.7 voor vier weken W04/W03/W02/W01; twee gedepubliceerde items; --zicht/--ref-p3 optioneel voor de eerste run die alleen de SQL schrijft)
# Basis: maak_verwacht_per_stap_N1-W03.py v1.7 — Maker-T (7T) · P3/P4 N1-W03 · = maak_verwacht_per_stap_N1-W02.py v1.2, maar alles uit
# BLOKKEN_MANIFEST.tsv (9T V2, V5): standbepaling per week, per blok de verwachte uitkomst van elke stap, de terugdraaivolgorde over de
# weken heen, en de slotcontrole (tellingen uit de NA-bestanden, met slot_tellingen_N1-W03.sql).
# v1.4 (8T C-T09): de slotverwachting bevat ook rijen_totaal en rijen_n1 (--rijen, de live telling bij P3) en de regel voor de pogingen
#   (pogingen_totaal = de telling vlak vóór blok 1 in P4; een stijging tijdens P4 is een melding aan Ibra, de rooktest telt mee).
# v1.5 (9T P3 V3, V4): slot_verwacht bevat ook de VOOR-waarden (referentie vlak vóór blok 1: stap slot_ref) en de md5 van de twee slotbestanden;
#   nieuw bestand leerderszicht_N1-W03.sql (pg_policies, RLS, gepubliceerde items per week, U3-luisteren-08) met verwachting VOOR en NA
#   (--zicht <live JSON van P3>: de policies zoals ze live staan; P4 verandert geen policy). Het draaiboek krijgt de slotstappen en het
#   herstelpad na een toolfout (9T P3 V2).
# v1.6 (9D P4 1.2, B12 (2)): leerderszicht telt ook ALS LEERDER: binnen dezelfde read-only transactie SET LOCAL ROLE authenticated met de
#   jwt-claims van een bestaande leerder met toegang (can_access_curriculum, geen admin- of docentrol; het id komt niet in de uitvoer), zodat
#   de RLS-policy «Toegang tot curriculum-items» echt toegepast wordt: zichtbaar per week (W03/W02/W01), W25 (volledig ongepubliceerd: 0)
#   en U3-luisteren-08 (vóór 1, na 0).
# v1.7 (9T P4 V4, V6): `pogingen_ref_p3` (--ref-p3 <live slot_ref van P3>) als terugvalreferentie; herstelpad met --uit, stand per week vooraf.
# Gebruik: python3 -I maak_verwacht_per_stap_N1-W05.py <sql-root> <NA_W05> <NA_W04> <NA_W03> <NA_W02> <VOOR_W05> <VOOR_W04> <VOOR_W03> <VOOR_W02> --rijen 2299 [--zicht <json> --ref-p3 <json>]
import sys, os, csv, json, hashlib, collections
csv.field_size_limit(10**9)
B = sys.argv[1]; NAP = dict(zip((5, 4, 3, 2), sys.argv[2:6])); VOP = dict(zip((5, 4, 3, 2), sys.argv[6:10]))
RIJEN = int(sys.argv[sys.argv.index("--rijen") + 1]); ZICHT = json.load(open(sys.argv[sys.argv.index("--zicht") + 1], encoding="utf-8"))["rows"][0] if "--zicht" in sys.argv else None
VERSIE = "v1.8"
REFP3 = json.load(open(sys.argv[sys.argv.index("--ref-p3") + 1], encoding="utf-8"))["rows"][0]["pogingen_totaal"] if "--ref-p3" in sys.argv else None
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
SLOT_NA = {w: tel(NAP[w]) for w in (5, 4, 3, 2)}; SLOT_VOOR = {w: tel(VOP[w]) for w in (5, 4, 3, 2)}
L = ["# N1-W05 · SQL v4.5 · verwachte uitkomsten per stap (uit BLOKKEN_MANIFEST.tsv)",
     f"Gemaakt door `scripts/maak_verwacht_per_stap_N1-W05.py` {VERSIE} uit het manifest (md5 `{hashlib.md5(open(f'{B}/BLOKKEN_MANIFEST.tsv','rb').read()).hexdigest()}`) en de bestanden `verwacht.txt` (md5 per blok in het manifest). "
     f"Volgorde in P4: {' → '.join(r['blok'] for r in M)}. Terugdraaien (alleen op opdracht van Ibra, V-B): {' → '.join(r['blok'] for r in reversed(M))}, tot en met het betrokken blok. "
     "Alle vingerafdrukken zijn `aantal|md5` over `item_id|vingerafdruk` (27 kolommen, gesorteerd COLLATE \"C\"). Apply, rollback en 4b lopen in REPEATABLE READ en geven één rij `n|md5|isolatie`. "
     "De grendels per rij dwingen de blokvolgorde niet af; daarom is `7_vinger_aggregaat.sql` vóór elke apply en elke rollback een harde STOP, en controleert `p4_stap_N1-W05.py` (manifest) elke uitkomst (exit 2 = STOP).", "",
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
L += ["## Slotcontrole (V-A) na het laatste blok en na de rooktest", "`slot_tellingen_N1-W05.sql` (alleen lezen). Verwacht (NA; tussen haakjes de stand vóór P4):", "",
      "| week | items | B25 | needs_image | strict | punten | needs_ns_audio | needs_student_recording | vlaggen | gepubliceerd | typen |", "|---|---|---|---|---|---|---|---|---|---|---|"]
for w in (5, 4, 3, 2):
    n, o = SLOT_NA[w], SLOT_VOOR[w]
    L.append(f"| W0{w} | " + " | ".join(f"{n[k]} ({o[k]})" for k in ("items", "b25", "needs_image", "strict", "punten", "ns_audio", "student_opname", "vlaggen", "gepubliceerd")) + f" | `{n['typen']}` (`{o['typen']}`) |")
L += ["", f"Daarnaast: rijen_totaal = {RIJEN} en rijen_n1 = {RIJEN} (geen rij erbij of eraf; live telling bij P3); pogingen_totaal = de telling vlak vóór blok 1 (P4), een stijging tijdens P4 meldt de Regisseur aan Ibra (de rooktest telt mee); de week-vingerafdrukken = `week_na` van het laatste blok van elke week."]
L += ["", "## Slotstappen (9T P3 V3, V4) · blok `slot` in `p4_log_stap`", "",
      "| moment | stap | bestand | verwacht |", "|---|---|---|---|",
      "| vlak vóór blok 1 (alle blokken open) | `slot_ref` | `slot_tellingen_N1-W05.sql` | de VOOR-tellingen per week (tussen haakjes hierboven), rijen 2299/2299; `pogingen_totaal` wordt de referentie |",
      "| vlak vóór blok 1 | `zicht_voor` | `leerderszicht_N1-W05.sql` | policies = live P3 (6 policies), RLS true, gepubliceerd W05 82 · W04 107 · W03 99 · W02 81, `U4-luisteren-06` false, `U4-lezen-11` false; als leerder (rol authenticated): W05 82 · W04 107 · W03 99 · W02 81 · W25 0 · de twee items 0 · 0 |",
      "| na blok 9 en opnieuw na de rooktest (alle blokken toegepast) | `slot` | `slot_tellingen_N1-W05.sql` | de NA-tellingen hierboven, rijen 2299/2299, pogingen ≥ referentie (het verschil komt in het verslag) |",
      "| na de rooktest | `zicht_na` | `leerderszicht_N1-W05.sql` | policies ongewijzigd, RLS true, gepubliceerd W05 82 · W04 107 · W03 99 · W02 81, `U4-luisteren-06` false, `U4-lezen-11` false; als leerder: W05 82 · W04 107 · W03 99 · W02 81 · W25 0 · de twee items 0 · 0 |", "",
      "## Herstel na een toolfout of een STOP (9T P3 V2)",
      "0. Elke exit ≠ 0 van `p4_log_stap` is een STOP. De ruwe uitvoer gaat altijd via een bestand: `cat > p4/uitvoering/ruw/<nr>.json <<'RUW'` … `RUW`, daarna `p4_log_stap … --uit p4/uitvoering/ruw/<nr>.json`.",
      "1. Niets herhalen. Eén losse aanroep `ROLLBACK;` (`p4_log_stap … rollback_los - --uit <bestand>`).",
      "2. `7_vinger_aggregaat.sql` van het betrokken blok als **stand** (`p4_log_stap <wie> <blok> stand <7_vinger> …`). Een ✓ stand zet de toestand van de hele week in het log volgens de vingerafdruk (k blokken toegepast, de rest open).",
      "3. Is het blok volgens de stand **toegepast** (de apply heeft toch gecommit): `vinger_na` van dat blok loggen en verder met het volgende blok. Staat het **open** (niets gecommit): opnieuw vanaf `vinger_voor`, met een nieuwe generale repetitie vóór de apply.",
      "4. Is de vingerafdruk geen ketenwaarde: STOP, niets uitvoeren, Ibra inlichten (4b alleen met een apart akkoord).",
      "5. Een nieuwe chat (deel 3 of later): het P4-log gaat mee (md5, regeltelling en laatste ketenhash in de overdracht). Ontbreekt het, dan eerst een **stand** per week (W05, W04, W03, W02) in een nieuw log; die bepaalt de toestand. `slot` gebruikt dan de P3-referentie voor de pogingen (`pogingen_ref_p3`; V4).",
      "5b. Een stand die niet klopt met wat het log al weet (een toegepast blok staat open of omgekeerd) = STOP (V2). Dan is er buiten P4 iets gebeurd: niets uitvoeren, een read-only export van de week vergelijken met de back-up en de NA, en Ibra kiest.",
      "6. Activiteit van leerders in de generale repetitie = STOP. Doorgaan kan alleen met het letterlijke akkoord van Ibra: `p4_log_stap … gr … --akkoord-ibra \"<tekst van Ibra>\"` (komt in het log); een andere eindrij of isolatie nooit."]
open(f"{B}/VERWACHT_PER_STAP.md", "w", encoding="utf-8").write("\n".join(L) + "\n")
q = ["-- slot_tellingen_N1-W05 · READ ONLY · P4 N1-W05 · B25 en tellingen W05, W04, W03, W02 (verwacht: VERWACHT_PER_STAP.md, slotcontrole)", "BEGIN TRANSACTION READ ONLY;"]
cols = []
for w in (5, 4, 3, 2):
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
open(f"{B}/slot_tellingen_N1-W05.sql", "w", encoding="utf-8").write("\n".join(q) + "\n")
NA3 = {r["item_id"]: r for r in csv.DictReader(open(NAP[4], encoding="utf-8", newline=""), delimiter="\t")}; VO3 = {r["item_id"]: r for r in csv.DictReader(open(VOP[4], encoding="utf-8", newline=""), delimiter="\t")}
z = ["-- leerderszicht_N1-W05 v3 · READ ONLY · P4 N1-W05 · B12 (2): policies op curriculum_items, RLS, gepubliceerde items per week (W05, W04, W03, W02) en de twee gedepubliceerde W04-items (blijven uit) U4-luisteren-06 en U4-lezen-11 (als postgres),",
     "-- daarna ALS LEERDER (SET LOCAL ROLE authenticated + jwt-claims van een bestaande leerder met toegang, zonder admin- of docentrol; het id komt niet in de uitvoer):",
     "-- wat de RLS-policy 'Toegang tot curriculum-items' (is_published AND can_access_curriculum(auth.uid())) echt toont. Vóór blok 1 (zicht_voor) en na de rooktest (zicht_na).",
     "BEGIN TRANSACTION READ ONLY;",
     "SELECT set_config('hva.policies', (SELECT string_agg(policyname::text || ':' || cmd::text || ':' || array_to_string(roles, ',') || ':' || coalesce(qual, '') || ':' || coalesce(with_check, ''), ' # ' ORDER BY policyname) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'curriculum_items'), true) AS p, "
     "set_config('hva.rls', (SELECT relrowsecurity::text FROM pg_class WHERE oid = 'public.curriculum_items'::regclass), true) AS r, "
     "set_config('hva.gep', concat_ws('|', (SELECT count(*) FROM public.curriculum_items WHERE week = 5 AND is_published), (SELECT count(*) FROM public.curriculum_items WHERE week = 4 AND is_published), (SELECT count(*) FROM public.curriculum_items WHERE week = 3 AND is_published), (SELECT count(*) FROM public.curriculum_items WHERE week = 2 AND is_published), (SELECT is_published::text FROM public.curriculum_items WHERE item_id = 'U4-luisteren-06'), (SELECT is_published::text FROM public.curriculum_items WHERE item_id = 'U4-lezen-11')), true) AS g, "
     "set_config('hva.leerder', coalesce((SELECT u.id::text FROM auth.users u WHERE public.can_access_curriculum(u.id) AND NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id AND r.role::text IN ('admin', 'teacher')) ORDER BY u.id LIMIT 1), ''), true) AS l;",
     "SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('hva.leerder'), 'role', 'authenticated')::text, true) AS c;",
     "SET LOCAL ROLE authenticated;",
     "SELECT current_setting('hva.policies') AS policies, current_setting('hva.rls') AS rls, split_part(current_setting('hva.gep'), '|', 1) AS zichtbaar_w05, split_part(current_setting('hva.gep'), '|', 2) AS zichtbaar_w04, split_part(current_setting('hva.gep'), '|', 3) AS zichtbaar_w03, "
     "split_part(current_setting('hva.gep'), '|', 4) AS zichtbaar_w02, split_part(current_setting('hva.gep'), '|', 5) AS luisteren06, split_part(current_setting('hva.gep'), '|', 6) AS lezen11, (current_setting('hva.leerder') <> '')::text AS leerder_gevonden, current_user::text AS rol, "
     "(SELECT count(*) FROM public.curriculum_items WHERE week = 5) AS als_leerder_w05, (SELECT count(*) FROM public.curriculum_items WHERE week = 4) AS als_leerder_w04, (SELECT count(*) FROM public.curriculum_items WHERE week = 3) AS als_leerder_w03, (SELECT count(*) FROM public.curriculum_items WHERE week = 2) AS als_leerder_w02, "
     "(SELECT count(*) FROM public.curriculum_items WHERE week = 25) AS als_leerder_w25, (SELECT count(*) FROM public.curriculum_items WHERE item_id = 'U4-luisteren-06') AS als_leerder_luisteren06, (SELECT count(*) FROM public.curriculum_items WHERE item_id = 'U4-lezen-11') AS als_leerder_lezen11;", "ROLLBACK;"]
open(f"{B}/leerderszicht_N1-W05.sql", "w", encoding="utf-8").write("\n".join(z) + "\n")
def zicht(S, D4):
    g = lambda i: D4[i]["is_published"]
    return {"policies": ZICHT["policies"] if ZICHT else "(live P3)", "rls": "true", "zichtbaar_w05": S[5]["gepubliceerd"], "zichtbaar_w04": S[4]["gepubliceerd"], "zichtbaar_w03": S[3]["gepubliceerd"], "zichtbaar_w02": S[2]["gepubliceerd"],
            "luisteren06": g("U4-luisteren-06"), "lezen11": g("U4-lezen-11"), "leerder_gevonden": "true", "rol": "authenticated",
            "als_leerder_w05": S[5]["gepubliceerd"], "als_leerder_w04": S[4]["gepubliceerd"], "als_leerder_w03": S[3]["gepubliceerd"], "als_leerder_w02": S[2]["gepubliceerd"], "als_leerder_w25": 0,
            "als_leerder_luisteren06": 1 if g("U4-luisteren-06") == "true" else 0, "als_leerder_lezen11": 1 if g("U4-lezen-11") == "true" else 0}
ZV, ZN = zicht(SLOT_VOOR, VO3), zicht(SLOT_NA, NA3)
if ZICHT:
    assert str(ZV["zichtbaar_w05"]) == str(ZICHT["zichtbaar_w05"]) and str(ZV["zichtbaar_w04"]) == str(ZICHT["zichtbaar_w04"]) and ZV["luisteren06"] == ZICHT["luisteren06"] and ZV["lezen11"] == ZICHT["lezen11"] and str(ZICHT["als_leerder_w25"]) == "0", "live P3 ≠ VOOR"
md5 = lambda n: hashlib.md5(open(f"{B}/{n}", "rb").read()).hexdigest()
json.dump({**{f"W0{w}": SLOT_NA[w] for w in (5, 4, 3, 2)}, "rijen_totaal": RIJEN, "rijen_n1": RIJEN, "pogingen_totaal": "≥ de referentie van slot_ref (vlak vóór blok 1)",
           "voor": {f"W0{w}": SLOT_VOOR[w] for w in (5, 4, 3, 2)}, "zicht_voor": ZV, "zicht_na": ZN, "pogingen_ref_p3": REFP3,
           "md5": {"slot_tellingen_N1-W05.sql": md5("slot_tellingen_N1-W05.sql"), "leerderszicht_N1-W05.sql": md5("leerderszicht_N1-W05.sql")}},
          open(f"{B}/slot_verwacht_N1-W05.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
for n in ("VERWACHT_PER_STAP.md", "slot_tellingen_N1-W05.sql", "leerderszicht_N1-W05.sql", "slot_verwacht_N1-W05.json"): print(n, "md5", hashlib.md5(open(f"{B}/{n}", "rb").read()).hexdigest())
for w in (5, 4, 3, 2): print(f"W0{w} NA", SLOT_NA[w])
