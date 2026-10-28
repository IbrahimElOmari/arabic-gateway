# maak_verwacht_per_stap_N1-W06.py v1.9.2 (9T P3 F1/F3: herstel met variant, wissel A → B, activiteit-akkoord, vaste C7-vorm, FOR SHARE) · v1.9.1 (variant B zonder apart blok C7t, 9D P3 R1) · v1.9 — Maker-T (7T) · P3 N1-W06 · = maak_verwacht_per_stap_N1-W05.py v1.8 voor W06 + nazorg W05/W04, met
# insertblokken (architectuur T v1.1 §2, §3, §5; 9T P1 V6, 9T P2 F4) en één SQL-root per variant (A = met C7, B = terugval C7).
#  - Standbepaling per week met de nieuwe standen: «insertblok k binnen» (nieuwe rijen onzichtbaar), «al uitgevoerd» (vinger_voor = NA van het
#    blok: niet opnieuw draaien; de stand zet het log verder) en «teruggedraaid» (= de stand na de insertblokken: de bestaande rijen = back-up,
#    de nieuwe rijen staan er onzichtbaar bij; leerderszicht = de back-up). Na een terugdraaiing geen tweede insert (de grendel weigert).
#  - Per blok de verwachte uitkomst van elke stap; insertblokken zonder rollback/4b/6/9.
#  - Slottellingen per week (W06, W05, W04) met de controles van §5: B25 alleen voor meerkeuze; meerdere-antwoorden: elk element van
#    correct_options staat in options; koppelen (gepubliceerd): options = de linkerkanten van de sleutel in volgorde, precies één '=' per paar,
#    geen dubbele rechterkant; reeks: per macro-rij met subitems zijn de subitems gelijk en is de macro-rij het omgekeerde (nooit een halve
#    reeks, nooit macro + subitems samen zichtbaar); daarnaast de tellingen over de gepubliceerde rijen (punten, typen, vlaggen, NS-audio, strict).
#  - rijen_totaal/rijen_n1: VOOR = --rijen-voor (live bij P3), NA = VOOR + het aantal nieuwe rijen.
#  - Leerderszicht v4: policies, RLS, gepubliceerd per week, de ongepubliceerde item_id's per week (lijst), en ALS LEERDER (rol authenticated,
#    jwt van een bestaande leerder met toegang tot de unit van de week volgens curriculum_unit_accessible, zonder staf-rol): zichtbaar per week,
#    W25, en het aantal zichtbare ongepubliceerde rijen (0).
# Gebruik: python3 -I maak_verwacht_per_stap_N1-W06.py <sql-root> <NA_W06> <NA_W05> <NA_W04> <VOOR_W06> <VOOR_W05> <VOOR_W04> --rijen-voor 2299
#          --variant A|B [--zicht <live JSON van P3>] [--ref-p3 <live slot_ref JSON van P3>]
import sys, os, csv, json, hashlib, collections
csv.field_size_limit(10**9)
B = sys.argv[1]; WEKEN = (6, 5, 4); NAP = dict(zip(WEKEN, sys.argv[2:5])); VOP = dict(zip(WEKEN, sys.argv[5:8]))
opt = lambda n: sys.argv[sys.argv.index(n) + 1] if n in sys.argv else None
RIJEN_VOOR = int(opt("--rijen-voor")); VARIANT = opt("--variant"); assert VARIANT in ("A", "B"), "--variant A|B"
ZICHT = json.load(open(opt("--zicht"), encoding="utf-8"))["rows"][0] if opt("--zicht") else None
REFP3 = json.load(open(opt("--ref-p3"), encoding="utf-8"))["rows"][0]["pogingen_totaal"] if opt("--ref-p3") else None
VERSIE = "v1.9.2"
M = [dict(zip(("volgorde", "week", "blok", "map", "md5_verwacht", "week_voor", "week_na", "soort"), l.rstrip("\n").split("\t"))) for l in list(open(f"{B}/BLOKKEN_MANIFEST.tsv", encoding="utf-8"))[1:]]
for r in M: assert hashlib.md5(open(f"{B}/{r['map']}/verwacht.txt", "rb").read()).hexdigest() == r["md5_verwacht"], r["map"]
VW = {r["blok"]: dict(l.rstrip("\n").split("\t", 1) for l in open(f"{B}/{r['map']}/verwacht.txt", encoding="utf-8")) for r in M}
def lees(p): return list(csv.DictReader(open(p, encoding="utf-8", newline=""), delimiter="\t"))
def subitems(ids, m): return [s for s in ids if s.startswith(m + "-") and len(s) == len(m) + 2 and s[-1] in "123456789"]
SLEUTELS = ("items", "b25", "needs_image", "strict", "punten", "ns_audio", "student_opname", "vlaggen", "gepubliceerd", "typen",
            "punten_gep", "typen_gep", "vlaggen_gep", "ns_audio_gep", "strict_gep", "ma_fout", "koppelen_fout", "reeks_fout")
def tel(p):
    R = lees(p); G = [r for r in R if r["is_published"] == "true"]; mp = lambda r: json.loads(r["media_production"]); ids = {r["item_id"]: r for r in R}
    def kfout(r):
        paren = r["correct_answer"].split("|"); opts = json.loads(r["options"])
        return not (all(p.count("=") == 1 for p in paren) and opts == [p.split("=", 1)[0] for p in paren] and len({p.split("=")[1] for p in paren if "=" in p}) == len(paren))
    def mafout(r):
        co = json.loads(r["correct_options"]) if r["correct_options"] else None; opts = json.loads(r["options"])
        return not (co and all(x in opts for x in co))
    def reeksfout(m):
        s = [ids[x]["is_published"] for x in subitems(ids, m)]
        return not (len(set(s)) == 1 and s[0] != ids[m]["is_published"])
    typen = lambda X: "|".join(f"{k}:{v}" for k, v in sorted(collections.Counter(r["exercise_type"] for r in X).items()))
    return dict(items=len(R), b25=sum(1 for r in R if r["exercise_type"] == "meerkeuze" and r["strict_tashkeel"] == "true" and r["correct_answer"] not in json.loads(r["options"] or "[]")),
                needs_image=sum("beeld" in mp(r) for r in R), strict=sum(r["strict_tashkeel"] == "true" for r in R), punten=sum(int(r["points"]) for r in R),
                ns_audio=sum("NS-audio" in mp(r) for r in R), student_opname=sum("student-opname" in mp(r) for r in R),
                vlaggen=sum(r["review_flag"] != "" for r in R), gepubliceerd=len(G), typen=typen(R),
                punten_gep=sum(int(r["points"]) for r in G), typen_gep=typen(G), vlaggen_gep=sum(r["review_flag"] != "" for r in G),
                ns_audio_gep=sum("NS-audio" in mp(r) for r in G), strict_gep=sum(r["strict_tashkeel"] == "true" for r in G),
                ma_fout=sum(mafout(r) for r in G if r["exercise_type"] == "meerdere-antwoorden"), koppelen_fout=sum(kfout(r) for r in G if r["exercise_type"] == "koppelen"),
                reeks_fout=sum(reeksfout(m) for m in ids if subitems(ids, m)))
SLOT_NA = {w: tel(NAP[w]) for w in WEKEN}; SLOT_VOOR = {w: tel(VOP[w]) for w in WEKEN}
NIEUW_N = sum(SLOT_NA[w]["items"] - SLOT_VOOR[w]["items"] for w in WEKEN); RIJEN_NA = RIJEN_VOOR + NIEUW_N
for w in WEKEN:
    for k in ("b25", "ma_fout", "koppelen_fout", "reeks_fout"): assert SLOT_NA[w][k] == 0, f"W0{w} NA: {k} = {SLOT_NA[w][k]} (moet 0 zijn)"
def verborgen(p): return ",".join(sorted((r["item_id"] for r in lees(p) if r["is_published"] != "true"), key=lambda x: x.encode()))
weken_md = " → ".join(dict.fromkeys(r["week"] for r in M))
L = [f"# N1-W06 · SQL v4.6 · variant {VARIANT} · verwachte uitkomsten per stap (uit BLOKKEN_MANIFEST.tsv)",
     f"Gemaakt door `scripts/maak_verwacht_per_stap_N1-W06.py` {VERSIE} uit het manifest (md5 `{hashlib.md5(open(f'{B}/BLOKKEN_MANIFEST.tsv','rb').read()).hexdigest()}`) en de bestanden `verwacht.txt` (md5 per blok in het manifest). "
     f"Variant **{VARIANT}** ({'met C7: de zes koppelen-items blijven gepubliceerd; alleen na «PR #8 akkoord», merge, bijgewerkte gepubliceerde site en een geslaagde C7-voorcontrole op productie' if VARIANT == 'A' else 'zonder C7: elk koppelen-item wordt in zijn eigen weekblok gedepubliceerd met een B12-vlag (4_L2, 5_R1, 7_G1), zodat er nooit een extra crashend koppelen-item zichtbaar is (9D P3 R1)'}). "
     f"Volgorde in P4: {' → '.join(r['blok'] for r in M)}. Terugdraaien (alleen op opdracht van Ibra, V-B): {' → '.join(r['blok'] for r in reversed(M) if r['soort'] == 'update')}, tot en met het betrokken blok; "
     "de insertblokken worden nooit teruggedraaid (nooit DELETE, N2-10): hun rijen blijven onzichtbaar (`is_published = false`). "
     "Alle vingerafdrukken zijn `aantal|md5` over `item_id|vingerafdruk` (27 kolommen, gesorteerd COLLATE \"C\"). Apply, rollback en 4b lopen in REPEATABLE READ en geven één rij `n|md5|isolatie`. "
     "De grendels per rij dwingen de blokvolgorde niet af; daarom is `7_vinger_aggregaat.sql` vóór elke apply en elke rollback een harde STOP, en controleert `p4_stap_N1-W06.py` (manifest) elke uitkomst (exit 2 = STOP).", "",
     "**Na elke fout of afwijking** (in 3, 4, 4b of 8, ook een serialisatiefout, \"current transaction is aborted\", een fout `invalid input syntax for type integer: \"STOP: RETURNING …\"` of een toolfout zonder resultaatrij): niets herhalen. Eerst één losse aanroep `ROLLBACK;`, daarna `7_vinger_aggregaat.sql` en de standbepaling; dan Ibra inlichten.", "",
     "## Standbepaling per week", "",
     "Een **✓ stand** zet de toestand van de hele week in het log. **«Al uitgevoerd»**: geeft `7_vinger` vóór een blok de NA van dat blok (bv. na een toolfout tijdens de apply die toch gecommit heeft), dan wordt dat blok niet opnieuw gedraaid. `p4_stap` geeft dan exit 2 (STOP van deze stap) met «↷ al uitgevoerd»; het vaste herstel is: dezelfde uitvoer als `stand` vastleggen, waarna de stand het volgende blok noemt. Dat is geen incident, maar komt wel in het verslag (8T P3 C-T04). "
     "**«Teruggedraaid»** (W06): na het terugdraaien van alle updateblokken staat W06 op de stand na de insertblokken (de 27 bestaande rijen = back-up, de 24 nieuwe rijen onzichtbaar); dat is de rij «insertblokken binnen» hieronder. Een nieuwe insert kan dan niet meer (de grendel weigert: de id's bestaan al en de week-vingerafdruk is anders).", ""]
for wk in dict.fromkeys(r["week"] for r in M):
    rs = [r for r in M if r["week"] == wk]
    L += [f"### {wk}", "| week-vingerafdruk | betekenis | volgende stap |", "|---|---|---|"]
    keten = [rs[0]["week_voor"]] + [r["week_na"] for r in rs]
    for k, f in enumerate(keten):
        if k == 0: bet = "niets toegepast (= back-up)"
        else:
            bet = " + ".join(r["blok"] for r in rs[:k]) + " toegepast" + (" (= NA)" if k == len(rs) else "")
            if all(r["soort"] == "insert" for r in rs[:k]):
                bet += " · nieuwe rijen onzichtbaar" + (" · = «teruggedraaid» na een volledige terugdraaiing" if k < len(rs) and rs[k]["soort"] == "update" else "")
        vlg = f"blok {rs[k]['blok']}" if k < len(rs) else "week klaar → volgend blok in het manifest"
        L.append(f"| `{f}` | {bet} | {vlg} |")
    L.append("")
for r in M:
    v = VW[r["blok"]]; d = f"{B}/{r['map']}"
    if r["soort"] == "insert":
        sz = {f: os.path.getsize(f"{d}/{f}") for f in ("3_apply.sql", "8_generale_repetitie.sql", "2_droogloop.sql", "7_vinger_aggregaat.sql")}
        L += [f"## {r['volgorde']}. {r['week']} · insertblok {r['blok']} · {v['items_blok']} nieuwe rijen (`is_published = false`) · {v['paren']} kolommen", "",
              "| stap | bestand (bytes) | verwacht |", "|---|---|---|",
              f"| leescontrole in P3 (live = back-up) | `2_droogloop.sql` ({sz['2_droogloop.sql']}) | `{v['droogloop_p3']}` (n|inhoud_ok|bestaand|rijen|week|blok|rest) |",
              f"| P4 droogloop vlak vóór het blok (facultatief) | `2_droogloop.sql` | `{v['droogloop']}` |",
              f"| P4 7_vinger vóór het blok (harde STOP bij afwijking; = NA → «al uitgevoerd») | `7_vinger_aggregaat.sql` ({sz['7_vinger_aggregaat.sql']}) | `{v['week_voor']}|{v['blok_voor']}|{v['rest']}` |",
              f"| P4 generale repetitie + activiteit + isolatie | `8_generale_repetitie.sql` ({sz['8_generale_repetitie.sql']}) | `{v['gr_eindrij']}` (start|insert|na_insert|tweede insert = 0|na_tweede) + `|pogingen30|pogingen30_leerders|logins30_leerders|logins30_staf|laatste_poging` + `|repeatable read` |",
              f"| P4 apply (INSERT; RETURNING-controle in hetzelfde statement) | `3_apply.sql` ({sz['3_apply.sql']}) | `{v['apply_uitvoer']}` · `0||repeatable read` = grendel dicht → stand |",
              f"| P4 aparte controle (en V-A door de Regisseur) | `7_vinger_aggregaat.sql` | `{v['week_na']}|{v['blok_na']}|{v['rest']}` |",
              "| terugdraaien | — | niet van toepassing: de rijen blijven onzichtbaar (nooit DELETE); `p4_stap`/`p4_log_stap` weigeren rollback, 4b en vinger_terug |", ""]
        continue
    sz = {f: os.path.getsize(f"{d}/{f}") for f in ("3_apply.sql", "4_rollback.sql", "8_generale_repetitie.sql", "9_grootte_probe.sql", "2_droogloop.sql", "7_vinger_aggregaat.sql")}
    L += [f"## {r['volgorde']}. {r['week']} · blok {r['blok']} · {v['items_blok']} items · {v['gewijzigd']} gewijzigd · {v['paren']} velden", "",
          "| stap | bestand (bytes) | verwacht |", "|---|---|---|",
          f"| leescontrole in P3 (live = back-up) | `2_droogloop.sql` ({sz['2_droogloop.sql']}) | `{v['droogloop_p3']}` |",
          f"| leescontrole in P3: probe v2 | `9_grootte_probe.sql` ({sz['9_grootte_probe.sql']}) | `{v['probe_p3']}` |",
          f"| P4 7_vinger vóór het blok (harde STOP bij afwijking; = NA → «al uitgevoerd») | `7_vinger_aggregaat.sql` ({sz['7_vinger_aggregaat.sql']}) | `{v['week_voor']}|{v['blok_voor']}|{v['rest']}` |",
          f"| P4 generale repetitie + activiteit + isolatie | `8_generale_repetitie.sql` ({sz['8_generale_repetitie.sql']}) | `{v['gr_eindrij']}` + `|pogingen30|pogingen30_leerders|logins30_leerders|logins30_staf|laatste_poging` + `|repeatable read` (STOP als pogingen30_leerders > 0, logins30_leerders > 0 of isolatie ≠ repeatable read) |",
          f"| P4 apply | `3_apply.sql` ({sz['3_apply.sql']}) | `{v['apply_uitvoer']}` |",
          f"| P4 aparte controle (en V-A door de Regisseur) | `7_vinger_aggregaat.sql` | `{v['week_na']}|{v['blok_na']}|{v['rest']}` |",
          f"| terugdraaien (alleen op opdracht van Ibra; eerst 7_vinger = NA van dit blok) | `4_rollback.sql` ({sz['4_rollback.sql']}) | `{v['rollback_uitvoer']}`, daarna 7_vinger `{v['week_voor']}|{v['blok_voor']}|{v['rest']}` |", ""]
KOPT = ["items", "b25", "needs_image", "strict", "punten", "ns_audio", "student_opname", "vlaggen", "gepubliceerd"]
L += ["## Slotcontrole (V-A) na het laatste blok en na de rooktest", "`slot_tellingen_N1-W06.sql` (alleen lezen). Verwacht (NA; tussen haakjes de stand vóór P4):", "",
      "| week | " + " | ".join(KOPT) + " | typen |", "|---|" + "---|" * (len(KOPT) + 1)]
for w in WEKEN:
    n, o = SLOT_NA[w], SLOT_VOOR[w]
    L.append(f"| W0{w} | " + " | ".join(f"{n[k]} ({o[k]})" for k in KOPT) + f" | `{n['typen']}` (`{o['typen']}`) |")
L += ["", "Over de gepubliceerde rijen en de inhoudscontroles (§5):", "", "| week | punten_gep | strict_gep | vlaggen_gep | ns_audio_gep | typen_gep | ma_fout | koppelen_fout | reeks_fout |", "|---|---|---|---|---|---|---|---|---|"]
for w in WEKEN:
    n, o = SLOT_NA[w], SLOT_VOOR[w]
    L.append(f"| W0{w} | {n['punten_gep']} ({o['punten_gep']}) | {n['strict_gep']} ({o['strict_gep']}) | {n['vlaggen_gep']} ({o['vlaggen_gep']}) | {n['ns_audio_gep']} ({o['ns_audio_gep']}) | `{n['typen_gep']}` (`{o['typen_gep']}`) | {n['ma_fout']} ({o['ma_fout']}) | {n['koppelen_fout']} ({o['koppelen_fout']}) | {n['reeks_fout']} ({o['reeks_fout']}) |")
L += ["", f"Daarnaast: rijen_totaal en rijen_n1 = {RIJEN_NA} na P4 ({RIJEN_VOOR} vóór P4 + {NIEUW_N} nieuwe rijen; live telling bij P3); pogingen_totaal = de telling vlak vóór blok 1 (P4), een stijging tijdens P4 meldt de Regisseur aan Ibra (de rooktest telt mee); de week-vingerafdrukken = `week_na` van het laatste blok van elke week."]
for (w, k) in ((6, "verborgen"),):
    pass
ZV_VERB = {w: verborgen(VOP[w]) for w in WEKEN}; ZN_VERB = {w: verborgen(NAP[w]) for w in WEKEN}
L += ["", "## Slotstappen (9T P3 V3, V4) · blok `slot` in `p4_log_stap`", "",
      "Eerst, vóór alles (8T P3 C-T02, 9T P3 V4/V5): bij variant A `c7_voorcontrole` met de uitkomst in de vaste vorm `ok: url=<de URL van de klas> sha=<commit> item=U6-lezen-06 open✓ indienen✓ opnieuw✓ volgende✓ desktop✓ gsm✓` (openen, «Indienen» → «Nog niet juist» met «Juist antwoord», «Opnieuw», «Volgende», telkens zonder foutscherm; **geen «Juist!» verwachten vóór 5_R1**: de bestaande koppelen-items zijn tot dan misvormd), daarna `variant` met `--variant A|B` en het letterlijke akkoord van Ibra (`--akkoord-ibra`; bij A precies «PR #8 akkoord»). Zonder ✓ variant weigert `p4_log_stap` elke andere stap. Het leerderszicht is een **RLS-zicht (bovengrens)**: wat elke leerder met `can_access_curriculum` via de databank kan lezen; of hij U6 in de app ziet, beslist de unit-toegang buiten RLS (8T P3 C-T05). Vindt de query geen leerder met U6-toegang, dan is dat een terechte STOP (fail-closed), geen fout in de bundel.", "",
      "| moment | stap | bestand | verwacht |", "|---|---|---|---|",
      f"| vlak vóór blok 1 (alle blokken open) | `slot_ref` | `slot_tellingen_N1-W06.sql` | de VOOR-tellingen per week (tussen haakjes hierboven), rijen {RIJEN_VOOR}/{RIJEN_VOOR}; `pogingen_totaal` wordt de referentie |",
      f"| vlak vóór blok 1 | `zicht_voor` | `leerderszicht_N1-W06.sql` | policies = live P3 (6 policies), RLS true, gepubliceerd W06 {SLOT_VOOR[6]['gepubliceerd']} · W05 {SLOT_VOOR[5]['gepubliceerd']} · W04 {SLOT_VOOR[4]['gepubliceerd']}; ongepubliceerd W06 «{ZV_VERB[6]}» · W05 «{ZV_VERB[5]}» · W04 «{ZV_VERB[4]}»; als leerder met toegang tot U6: W06 {SLOT_VOOR[6]['gepubliceerd']} · W05 {SLOT_VOOR[5]['gepubliceerd']} · W04 {SLOT_VOOR[4]['gepubliceerd']} · W25 0 · ongepubliceerd zichtbaar 0 |",
      f"| na het laatste blok en opnieuw na de rooktest (alle blokken toegepast) | `slot` | `slot_tellingen_N1-W06.sql` | de NA-tellingen hierboven, rijen {RIJEN_NA}/{RIJEN_NA}, pogingen ≥ referentie (het verschil komt in het verslag) |",
      f"| na de rooktest | `zicht_na` | `leerderszicht_N1-W06.sql` | policies ongewijzigd, RLS true, gepubliceerd W06 {SLOT_NA[6]['gepubliceerd']} · W05 {SLOT_NA[5]['gepubliceerd']} · W04 {SLOT_NA[4]['gepubliceerd']}; ongepubliceerd W06 «{ZN_VERB[6]}» · W04 «{ZN_VERB[4]}»; als leerder: W06 {SLOT_NA[6]['gepubliceerd']} · W05 {SLOT_NA[5]['gepubliceerd']} · W04 {SLOT_NA[4]['gepubliceerd']} · W25 0 · ongepubliceerd zichtbaar 0 |", "",
      "## Herstel na een toolfout of een STOP (9T P3 V2)",
      "0. Elke exit ≠ 0 van `p4_log_stap` is een STOP. De ruwe uitvoer gaat altijd via een bestand: `cat > p4/uitvoering/ruw/<nr>.json <<'RUW'` … `RUW`, daarna `p4_log_stap … --uit p4/uitvoering/ruw/<nr>.json`.",
      "1. Niets herhalen. Eén losse aanroep `ROLLBACK;` (`p4_log_stap … rollback_los - --uit <bestand>`).",
      "2. `7_vinger_aggregaat.sql` van het betrokken blok als **stand** (`p4_log_stap <wie> <blok> stand <7_vinger> …`). Een ✓ stand zet de toestand van de hele week in het log volgens de vingerafdruk (k blokken toegepast, de rest open).",
      "3. Is het blok volgens de stand **toegepast** (de apply heeft toch gecommit: «al uitgevoerd»): verder met het volgende blok (eerst `vinger_voor`). Staat het **open** (niets gecommit): opnieuw vanaf `vinger_voor`, met een nieuwe generale repetitie vóór de apply. Een insertblok dat 0 rijen gaf, is volgens de stand open (grendel dicht door een andere wijziging: STOP, Ibra) of al toegepast.",
      "4. Is de vingerafdruk geen ketenwaarde: STOP, niets uitvoeren, Ibra inlichten (4b alleen met een apart akkoord; insertblokken hebben geen 4b).",
      "5. Een nieuwe chat (deel 3 of later): het P4-log gaat mee (md5, regeltelling en laatste ketenhash in de overdracht). Ontbreekt het, dan begint een nieuw log met `c7_voorcontrole` (alleen A) en `variant` (met het oorspronkelijke letterlijke akkoord), daarna een **stand** per week (W06, W05, W04); die bepaalt de toestand. `slot` gebruikt dan de P3-referentie voor de pogingen (`pogingen_ref_p3`; V4).",
      "5c. **Wissel van A naar B** kan alleen zolang W06 hoogstens tot en met `3_L1` toegepast is (alleen die ketenwaarden zijn gedeeld). Valt C7 later weg: A terugdraaien tot en met `4_L2`, een nieuw log met `variant B`, dan stand (9T P3 F3).",
      "5b. Een stand die niet klopt met wat het log al weet (een toegepast blok staat open of omgekeerd) = STOP (V2). Dan is er buiten P4 iets gebeurd: niets uitvoeren, een read-only export van de week vergelijken met de back-up en de NA, en Ibra kiest.",
      "6. Activiteit van leerders in de generale repetitie = STOP. Doorgaan kan alleen met het letterlijke akkoord van Ibra: `p4_log_stap … gr … --akkoord-ibra \"<tekst van Ibra>\"` (komt in het log); een andere eindrij of isolatie nooit. U6 is open, dus waarschijnlijk bij elke gr: Ibra geeft vooraf één letterlijke tekst die bij elke gr wordt meegegeven (9T P3 F3).",
      "6b. De weekgrendel van een insertblok leest FOR SHARE (8T P3 C-T03); dat kan niet READ ONLY getest worden, dus de eerste live uitvoering is de gr van het eerste insertblok. Een serialisatiefout of een lange lockwacht is een STOP (losse ROLLBACK, stand).",
      "7. «Hele week publiceren» in U6 is verboden tijdens en na P4 (de knop zou de gedepubliceerde macro-rijen — en vóór het weekblok de onzichtbare nieuwe rijen — publiceren; C8-kandidaat); Content Studio blijft dicht."]
open(f"{B}/VERWACHT_PER_STAP.md", "w", encoding="utf-8").write("\n".join(L) + "\n")
q = ["-- slot_tellingen_N1-W06 v2 · READ ONLY · P4 N1-W06 · tellingen W06, W05, W04 met B25 (meerkeuze), meerdere-antwoorden ⊂ opties, koppelen (gepubliceerd), reeksen (verwacht: VERWACHT_PER_STAP.md, slotcontrole)", "BEGIN TRANSACTION READ ONLY;"]
cols = []
for w in WEKEN:
    W = f"week = {w}"; S = f"s.week = {w} AND s.item_id ~ ('^' || m.item_id || '-[1-9]$')"
    cols += [f"(SELECT count(*) FROM public.curriculum_items WHERE {W}) AS items_w0{w}",
             f"(SELECT count(*) FROM public.curriculum_items WHERE {W} AND exercise_type = 'meerkeuze' AND strict_tashkeel AND NOT (options ? correct_answer)) AS b25_w0{w}",
             f"(SELECT count(*) FROM public.curriculum_items WHERE {W} AND needs_image) AS needs_image_w0{w}",
             f"(SELECT count(*) FROM public.curriculum_items WHERE {W} AND strict_tashkeel) AS strict_w0{w}",
             f"(SELECT sum(points) FROM public.curriculum_items WHERE {W}) AS punten_w0{w}",
             f"(SELECT count(*) FROM public.curriculum_items WHERE {W} AND needs_ns_audio) AS ns_audio_w0{w}",
             f"(SELECT count(*) FROM public.curriculum_items WHERE {W} AND needs_student_recording) AS student_opname_w0{w}",
             f"(SELECT count(*) FROM public.curriculum_items WHERE {W} AND review_flag <> '') AS vlaggen_w0{w}",
             f"(SELECT count(*) FROM public.curriculum_items WHERE {W} AND is_published) AS gepubliceerd_w0{w}",
             f"(SELECT string_agg(t || ':' || n, '|' ORDER BY t COLLATE \"C\") FROM (SELECT exercise_type::text AS t, count(*)::text AS n FROM public.curriculum_items WHERE {W} GROUP BY 1) x) AS typen_w0{w}",
             f"(SELECT coalesce(sum(points), 0) FROM public.curriculum_items WHERE {W} AND is_published) AS punten_gep_w0{w}",
             f"(SELECT string_agg(t || ':' || n, '|' ORDER BY t COLLATE \"C\") FROM (SELECT exercise_type::text AS t, count(*)::text AS n FROM public.curriculum_items WHERE {W} AND is_published GROUP BY 1) x) AS typen_gep_w0{w}",
             f"(SELECT count(*) FROM public.curriculum_items WHERE {W} AND is_published AND review_flag <> '') AS vlaggen_gep_w0{w}",
             f"(SELECT count(*) FROM public.curriculum_items WHERE {W} AND is_published AND needs_ns_audio) AS ns_audio_gep_w0{w}",
             f"(SELECT count(*) FROM public.curriculum_items WHERE {W} AND is_published AND strict_tashkeel) AS strict_gep_w0{w}",
             f"(SELECT count(*) FROM public.curriculum_items WHERE {W} AND is_published AND exercise_type = 'meerdere-antwoorden' AND NOT coalesce(jsonb_array_length(correct_options) >= 1 AND options @> correct_options, false)) AS ma_fout_w0{w}",
             f"(SELECT count(*) FROM public.curriculum_items c WHERE c.{W} AND c.is_published AND c.exercise_type = 'koppelen' AND NOT coalesce("
             f"c.options = (SELECT jsonb_agg(split_part(p, '=', 1) ORDER BY o) FROM unnest(string_to_array(c.correct_answer, '|')) WITH ORDINALITY AS t(p, o)) AND "
             f"(SELECT bool_and(length(p) - length(replace(p, '=', '')) = 1) AND count(DISTINCT split_part(p, '=', 2)) = count(*) FROM unnest(string_to_array(c.correct_answer, '|')) AS t(p)), false)) AS koppelen_fout_w0{w}",
             f"(SELECT count(*) FROM public.curriculum_items m WHERE m.{W} AND EXISTS (SELECT 1 FROM public.curriculum_items s WHERE {S}) AND NOT "
             f"(SELECT bool_and(s.is_published) = bool_or(s.is_published) AND bool_and(s.is_published) <> m.is_published FROM public.curriculum_items s WHERE {S})) AS reeks_fout_w0{w}"]
cols += ["(SELECT count(*) FROM public.curriculum_items) AS rijen_totaal", "(SELECT count(*) FROM public.curriculum_items WHERE week BETWEEN 1 AND 25) AS rijen_n1", "(SELECT count(*) FROM public.curriculum_item_attempts) AS pogingen_totaal"]
q += ["SELECT " + ",\n ".join(cols) + ";", "ROLLBACK;"]
open(f"{B}/slot_tellingen_N1-W06.sql", "w", encoding="utf-8").write("\n".join(q) + "\n")
ver = lambda w: f"(SELECT coalesce(string_agg(item_id, ',' ORDER BY item_id COLLATE \"C\"), '') FROM public.curriculum_items WHERE week = {w} AND NOT is_published)"
z = ["-- leerderszicht_N1-W06 v4 · READ ONLY · P4 N1-W06 · B12 (2): policies op curriculum_items, RLS, gepubliceerde items per week (W06, W05, W04) en de lijst van de ongepubliceerde item_id's per week (als postgres),",
     "-- daarna ALS LEERDER (SET LOCAL ROLE authenticated + jwt-claims van een bestaande leerder met toegang tot U6 volgens curriculum_unit_accessible en can_access_curriculum, zonder admin- of docentrol; het id komt niet in de uitvoer):",
     "-- wat de RLS-policy 'Toegang tot curriculum-items' (is_published AND can_access_curriculum(auth.uid())) echt toont. Vóór blok 1 (zicht_voor) en na de rooktest (zicht_na). De unit-toegang zelf is serverlogica buiten RLS (ADR-W06-5).",
     "BEGIN TRANSACTION READ ONLY;",
     "SELECT set_config('hva.policies', (SELECT string_agg(policyname::text || ':' || cmd::text || ':' || array_to_string(roles, ',') || ':' || coalesce(qual, '') || ':' || coalesce(with_check, ''), ' # ' ORDER BY policyname) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'curriculum_items'), true) AS p, "
     "set_config('hva.rls', (SELECT relrowsecurity::text FROM pg_class WHERE oid = 'public.curriculum_items'::regclass), true) AS r, "
     "set_config('hva.gep', concat_ws('|', (SELECT count(*) FROM public.curriculum_items WHERE week = 6 AND is_published), (SELECT count(*) FROM public.curriculum_items WHERE week = 5 AND is_published), (SELECT count(*) FROM public.curriculum_items WHERE week = 4 AND is_published)), true) AS g, "
     f"set_config('hva.verb6', {ver(6)}, true) AS v6, set_config('hva.verb5', {ver(5)}, true) AS v5, set_config('hva.verb4', {ver(4)}, true) AS v4, "
     "set_config('hva.leerder', coalesce((SELECT u.id::text FROM auth.users u WHERE public.can_access_curriculum(u.id) AND public.curriculum_unit_accessible(u.id, 'U6') AND NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id AND r.role::text IN ('admin', 'teacher')) ORDER BY u.id LIMIT 1), ''), true) AS l;",
     "SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('hva.leerder'), 'role', 'authenticated')::text, true) AS c;",
     "SET LOCAL ROLE authenticated;",
     "SELECT current_setting('hva.policies') AS policies, current_setting('hva.rls') AS rls, split_part(current_setting('hva.gep'), '|', 1) AS zichtbaar_w06, split_part(current_setting('hva.gep'), '|', 2) AS zichtbaar_w05, split_part(current_setting('hva.gep'), '|', 3) AS zichtbaar_w04, "
     "current_setting('hva.verb6') AS verborgen_w06, current_setting('hva.verb5') AS verborgen_w05, current_setting('hva.verb4') AS verborgen_w04, (current_setting('hva.leerder') <> '')::text AS leerder_u6_gevonden, current_user::text AS rol, "
     "(SELECT count(*) FROM public.curriculum_items WHERE week = 6) AS als_leerder_w06, (SELECT count(*) FROM public.curriculum_items WHERE week = 5) AS als_leerder_w05, (SELECT count(*) FROM public.curriculum_items WHERE week = 4) AS als_leerder_w04, "
     "(SELECT count(*) FROM public.curriculum_items WHERE week = 25) AS als_leerder_w25, (SELECT count(*) FROM public.curriculum_items WHERE week IN (4, 5, 6) AND NOT is_published) AS als_leerder_verborgen;", "ROLLBACK;"]
open(f"{B}/leerderszicht_N1-W06.sql", "w", encoding="utf-8").write("\n".join(z) + "\n")
def zicht(S, VB):
    return {"policies": ZICHT["policies"] if ZICHT else "(live P3)", "rls": "true", "zichtbaar_w06": S[6]["gepubliceerd"], "zichtbaar_w05": S[5]["gepubliceerd"], "zichtbaar_w04": S[4]["gepubliceerd"],
            "verborgen_w06": VB[6], "verborgen_w05": VB[5], "verborgen_w04": VB[4], "leerder_u6_gevonden": "true", "rol": "authenticated",
            "als_leerder_w06": S[6]["gepubliceerd"], "als_leerder_w05": S[5]["gepubliceerd"], "als_leerder_w04": S[4]["gepubliceerd"], "als_leerder_w25": 0, "als_leerder_verborgen": 0}
ZV, ZN = zicht(SLOT_VOOR, ZV_VERB), zicht(SLOT_NA, ZN_VERB)
if ZICHT:
    afw = [k for k in ZV if k != "policies" and str(ZV[k]) != str(ZICHT.get(k))]
    assert not afw, f"live P3 ≠ VOOR: {[(k, ZV[k], ZICHT.get(k)) for k in afw]}"
md5 = lambda n: hashlib.md5(open(f"{B}/{n}", "rb").read()).hexdigest()
json.dump({**{f"W0{w}": SLOT_NA[w] for w in WEKEN}, "weken": [f"W0{w}" for w in WEKEN], "sleutels": list(SLEUTELS), "variant": VARIANT,
           "rijen_totaal": RIJEN_NA, "rijen_n1": RIJEN_NA, "pogingen_totaal": "≥ de referentie van slot_ref (vlak vóór blok 1)",
           "voor": {**{f"W0{w}": SLOT_VOOR[w] for w in WEKEN}, "rijen_totaal": RIJEN_VOOR, "rijen_n1": RIJEN_VOOR}, "zicht_voor": ZV, "zicht_na": ZN, "pogingen_ref_p3": REFP3,
           "md5": {"slot_tellingen_N1-W06.sql": md5("slot_tellingen_N1-W06.sql"), "leerderszicht_N1-W06.sql": md5("leerderszicht_N1-W06.sql")}},
          open(f"{B}/slot_verwacht_N1-W06.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
for n in ("VERWACHT_PER_STAP.md", "slot_tellingen_N1-W06.sql", "leerderszicht_N1-W06.sql", "slot_verwacht_N1-W06.json"): print(n, "md5", hashlib.md5(open(f"{B}/{n}", "rb").read()).hexdigest())
for w in WEKEN: print(f"W0{w} NA", SLOT_NA[w])
