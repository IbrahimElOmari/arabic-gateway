# p4_stap_N1-W03.py v1.4.1 — Maker-T / Controleur-T · P4 N1-W03 · = p4_stap_N1-W02.py v1.1, maar alles komt uit BLOKKEN_MANIFEST.tsv
# (P1-18, 9T V2; tegenrapport T P2, V5): geen vaste bloklijst en geen vaste weekmappen meer.
#  - zonder manifest in <sql-root> = STOP (een andere bundel, bv. die van W02, wordt zo geweigerd);
#  - de md5 van elke verwacht.txt moet gelijk zijn aan het manifest (anders STOP: bundel gewijzigd of gemengd);
#  - het blok moet in het manifest staan; "stand" bepaalt binnen de week van dat blok welk blok aan de beurt is (keten uit het manifest)
#    en noemt bij een afgewerkte week het volgende blok uit het manifest.
# Stappen en verwachtingen verder zoals v1.1: stand · vinger_voor · gr · apply · vinger_na · rollback · vinger_terug.
# v1.3 (8T C-T02, C-T04, C-T05): stap `bestand` (uitkomst = het pad van het SQL-bestand, relatief t.o.v. de SQL-root): het bestand moet in
#   de map van dit blok staan en zijn md5 moet gelijk zijn aan SQL_MANIFEST.tsv van de week → zo wordt elk bestand vóór het plakken
#   gebonden; stap `noodrollback` (4b; verwacht = rollback_uitvoer); een uitkomst met spaties of regeleinden aan begin of eind = STOP.
#   De volgorde over de weken heen bewaakt p4_log_stap_N1-W03.py v1.2 (uit het P4-log).
# v1.4 (9T P3 V1, V3, V4): blok `slot` met de stappen slot_ref (VOOR-tellingen vlak vóór blok 1), slot (NA-tellingen, pogingen ≥ --ref <n>),
#   zicht_voor en zicht_na (leerderszicht: policies, RLS, gepubliceerd per week, U3-luisteren-08), elk tegen slot_verwacht_N1-W03.json; de
#   uitkomst is dan de JSON-rij. `bestand` voor het blok slot bindt aan de md5 in slot_verwacht. gr met `--activiteit-akkoord`: activiteit van
#   leerders geeft dan ✓ met een melding (alleen op het letterlijke akkoord van Ibra, vastgelegd door p4_log_stap); eindrij en isolatie nooit.
# Uitkomst = de kolommen van de ene resultaatrij, samengevoegd met '|'. Exit 0 = ✓ (ga door), 2 = STOP. Leest alleen.
# Gebruik: python3 -I p4_stap_N1-W03.py <sql-root met BLOKKEN_MANIFEST.tsv> <blok, bv. 1_L1 of 6_W02n> <stap> "<uitkomst>"
import sys, os, hashlib, json
SQL, BLOK, STAP, UIT = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]; EXTRA = sys.argv[5:]
def stop(reden): print(f"✗ STOP · {BLOK} · {STAP}: {reden}\n  kreeg:    {UIT}\n  daarna:   niets herhalen; één losse aanroep ROLLBACK; → 7_vinger_aggregaat.sql (stand) → Ibra inlichten"); sys.exit(2)
def goed(volgende): print(f"✓ {BLOK} · {STAP} · {UIT[:80]}{'…' if len(UIT) > 80 else ''}\n  volgende: {volgende}"); sys.exit(0)
if UIT != UIT.strip(): stop("uitkomst met spaties of regeleinden aan begin of eind (8T C-T05)")
MP = os.path.join(SQL, "BLOKKEN_MANIFEST.tsv")
if not os.path.exists(MP): stop(f"geen BLOKKEN_MANIFEST.tsv in {SQL}: dit is niet de bundel van N1-W03")
M = [dict(zip(("volgorde", "week", "blok", "map", "md5_verwacht", "week_voor", "week_na"), l.rstrip("\n").split("\t"))) for l in list(open(MP, encoding="utf-8"))[1:]]
for r in M:
    p = os.path.join(SQL, r["map"], "verwacht.txt")
    if not os.path.exists(p) or hashlib.md5(open(p, "rb").read()).hexdigest() != r["md5_verwacht"]: stop(f"verwacht.txt van {r['map']} ontbreekt of wijkt af van het manifest")
if BLOK == "slot":   # v1.4: slotstappen (9T P3 V3, V4)
    SVP = os.path.join(SQL, "slot_verwacht_N1-W03.json")
    if not os.path.exists(SVP): stop("geen slot_verwacht_N1-W03.json in de bundel")
    SV = json.load(open(SVP, encoding="utf-8")); SVM = hashlib.md5(open(SVP, "rb").read()).hexdigest()[:8]
    if STAP == "bestand":
        naam = os.path.normpath(UIT)
        if naam not in SV.get("md5", {}): stop(f"{UIT} is geen slotbestand ({', '.join(SV.get('md5', {}))})")
        if not os.path.exists(os.path.join(SQL, naam)) or hashlib.md5(open(os.path.join(SQL, naam), "rb").read()).hexdigest() != SV["md5"][naam]: stop(f"md5 van {UIT} ≠ slot_verwacht: niet plakken")
        goed(f"bestand gebonden (md5 = slot_verwacht {SVM}) → nu precies dit bestand plakken")
    try:
        U = json.loads(UIT); assert isinstance(U, dict)
    except Exception: stop("de uitkomst van een slotstap is de JSON-rij van de tool")
    def verschil(verw): return [f"{k}: {U.get(k)} ≠ {v}" for k, v in verw.items() if str(U.get(k)) != str(v)] + [f"kolom {k} onverwacht" for k in U if k not in verw and k != "pogingen_totaal"]
    if STAP in ("slot_ref", "slot"):
        bron = SV["voor"] if STAP == "slot_ref" else SV
        verw = {f"{k}_{w.lower()}": bron[w][k] for w in ("W03", "W02", "W01") for k in ("items", "b25", "needs_image", "strict", "punten", "ns_audio", "student_opname", "vlaggen", "gepubliceerd", "typen")}
        verw.update(rijen_totaal=SV["rijen_totaal"], rijen_n1=SV["rijen_n1"]); fout = verschil(verw)
        pog = str(U.get("pogingen_totaal"))
        if not pog.isdigit(): fout.append(f"pogingen_totaal '{pog}' is geen getal")
        if STAP == "slot":
            if "--ref" not in EXTRA: stop("slot zonder referentie (--ref <pogingen van slot_ref>)")
            ref = EXTRA[EXTRA.index("--ref") + 1]
            if pog.isdigit() and int(pog) < int(ref): fout.append(f"pogingen_totaal {pog} < referentie {ref}")
        if fout: stop(f"{len(fout)} afwijking(en) t.o.v. slot_verwacht {SVM}: " + "; ".join(fout))
        if STAP == "slot_ref": goed(f"{len(verw)} waarden = VOOR (slot_verwacht {SVM}) · referentie pogingen_totaal = {pog} → zicht_voor, daarna blok 1")
        goed(f"{len(verw)} waarden = NA (slot_verwacht {SVM}) · pogingen_totaal {pog} (referentie {ref}, +{int(pog) - int(ref)}: in het verslag)")
    if STAP in ("zicht_voor", "zicht_na"):
        fout = verschil(SV[STAP])
        if "pogingen_totaal" in U: fout.append("kolom pogingen_totaal onverwacht")
        if fout: stop(f"{len(fout)} afwijking(en) t.o.v. slot_verwacht {SVM}: " + "; ".join(fout))
        goed(f"leerderszicht = {'VOOR' if STAP == 'zicht_voor' else 'NA'}: {U['zichtbaar_w03']}/{U['zichtbaar_w02']}/{U['zichtbaar_w01']} gepubliceerd (W03/W02/W01), U3-luisteren-08 {U['luisteren08']}, policies ongewijzigd, RLS {U['rls']}; als leerder (RLS): {U['als_leerder_w03']}/{U['als_leerder_w02']}/{U['als_leerder_w01']}, W25 {U['als_leerder_w25']}, U3-luisteren-08 {U['als_leerder_luisteren08']}")
    stop(f"onbekende slotstap '{STAP}' (slot_ref · zicht_voor · slot · zicht_na · bestand)")
idx = {r["blok"]: r for r in M}
if BLOK not in idx: stop(f"blok '{BLOK}' staat niet in het manifest ({', '.join(r['blok'] for r in M)})")
R = idx[BLOK]
V = dict(l.rstrip("\n").split("\t", 1) for l in open(os.path.join(SQL, R["map"], "verwacht.txt"), encoding="utf-8"))
if V["week_voor"] != R["week_voor"] or V["week_na"] != R["week_na"]: stop("verwacht.txt en manifest spreken elkaar tegen")
def na_dit(r):
    k = int(r["volgorde"])
    return next((x for x in M if int(x["volgorde"]) == k + 1), None)
BESTAND = {"stand": "7_vinger_aggregaat.sql", "vinger_voor": "7_vinger_aggregaat.sql", "vinger_na": "7_vinger_aggregaat.sql", "vinger_terug": "7_vinger_aggregaat.sql",
           "gr": "8_generale_repetitie.sql", "apply": "3_apply.sql", "rollback": "4_rollback.sql", "noodrollback": "4b_noodrollback.sql"}
if STAP == "bestand":
    pad = os.path.normpath(UIT); naam = os.path.basename(pad)
    if os.path.dirname(pad) != os.path.normpath(R["map"]): stop(f"{UIT} staat niet in de map van blok {BLOK} ({R['map']})")
    if naam not in set(BESTAND.values()): stop(f"{naam} is geen bestand van het P4-draaiboek")
    sm = {l.split("\t")[1]: l.split("\t")[3] for l in open(os.path.join(SQL, R["week"], "SQL_MANIFEST.tsv"), encoding="utf-8") if l.split("\t")[0] == BLOK}
    if naam not in sm: stop(f"{naam} staat niet in SQL_MANIFEST.tsv van {R['week']}")
    if not os.path.exists(os.path.join(SQL, pad)) or hashlib.md5(open(os.path.join(SQL, pad), "rb").read()).hexdigest() != sm[naam]: stop(f"md5 van {UIT} ≠ SQL_MANIFEST.tsv: niet plakken")
    goed(f"bestand gebonden (md5 = SQL_MANIFEST) → nu precies dit bestand plakken")
if STAP == "stand":
    d = UIT.split("|")   # v1.3.1 (C-T05): volledige vorm week|blok|rest = 3 × aantal|md5
    if len(d) != 6 or not all(d[i].isdigit() and ((len(d[i + 1]) == 32 and all(c in "0123456789abcdef" for c in d[i + 1])) or (d[i] == "0" and d[i + 1] == "")) for i in (0, 2, 4)):
        stop("geen geldige uitkomst van 7_vinger_aggregaat.sql (verwacht 3 × aantal|md5; bij aantal 0 een lege md5)")
    week = "|".join(d[:2])
    wk = [r for r in M if r["week"] == R["week"]]
    keten = [wk[0]["week_voor"]] + [r["week_na"] for r in wk]
    if week not in keten: stop(f"{R['week']}: vingerafdruk {week} is geen van de {len(keten)} verwachte ketenwaarden → niets uitvoeren, Ibra inlichten")
    k = keten.index(week)
    if k < len(wk): goed(f"{R['week']}: {k} van {len(wk)} blokken toegepast → blok {wk[k]['blok']} (volgorde {wk[k]['volgorde']} in het manifest)")
    vlg = na_dit(wk[-1])
    goed(f"{R['week']} klaar ({len(wk)} van {len(wk)}) → " + (f"volgend blok in het manifest: {vlg['blok']} ({vlg['week']}; eerst stand met dat blok)" if vlg else "alle blokken van het manifest toegepast → slotcontrole"))
verwacht = {"vinger_voor": f"{V['week_voor']}|{V['blok_voor']}|{V['rest']}", "apply": V["apply_uitvoer"], "noodrollback": V["rollback_uitvoer"],
            "vinger_na": f"{V['week_na']}|{V['blok_na']}|{V['rest']}", "rollback": V["rollback_uitvoer"],
            "vinger_terug": f"{V['week_voor']}|{V['blok_voor']}|{V['rest']}"}
vlg = na_dit(R)
volgende = {"vinger_voor": "8_generale_repetitie.sql (gr)", "apply": "7_vinger_aggregaat.sql (vinger_na)",
            "vinger_na": (f"volgend blok in het manifest: {vlg['blok']} ({vlg['week']}); eerst 7_vinger (stand/vinger_voor)" if vlg else "laatste blok van het manifest → slotcontrole (V-A)"),
            "rollback": "7_vinger_aggregaat.sql (vinger_terug)", "noodrollback": "7_vinger_aggregaat.sql (vinger_terug)", "vinger_terug": "blok staat terug op de stand ervóór; verder alleen op opdracht van Ibra"}
if STAP == "gr":
    d = UIT.split("|")
    if len(d) != 16: stop(f"{len(d)} velden in plaats van 16 (5 × n|md5, 5 × activiteit, isolatie)")
    if "|".join(d[:10]) != V["gr_eindrij"]: stop(f"generale repetitie ≠ verwacht {V['gr_eindrij']}")
    p30, p30l, l30l, l30s, laatste, iso = d[10:16]
    if iso != "repeatable read": stop(f"isolatie '{iso}' ≠ repeatable read → V2 niet gewaarborgd, geen apply")
    if not (p30l.isdigit() and l30l.isdigit()): stop(f"activiteit onleesbaar: pogingen30_leerders={p30l}, logins30_leerders={l30l}")
    if int(p30l) > 0 or int(l30l) > 0:
        if "--activiteit-akkoord" not in EXTRA: stop(f"activiteit: pogingen30_leerders={p30l}, logins30_leerders={l30l} → eerst Ibra (B17)")
        goed(f"3_apply.sql (apply) · ⚠ activiteit van leerders (pogingen30_leerders={p30l}, logins30_leerders={l30l}) aanvaard op het akkoord van Ibra · pogingen30={p30}, staf-logins30={l30s}, laatste poging {laatste or '—'}")
    goed(f"3_apply.sql (apply) · activiteit: pogingen30={p30}, staf-logins30={l30s}, laatste poging {laatste or '—'}")
if STAP not in verwacht: stop(f"onbekende stap '{STAP}'")
if STAP == "apply" and UIT == V["leeg_uitvoer"]: stop("apply gaf 0 rijen → 7_vinger draaien en de stand bepalen; niet herhalen")
if UIT != verwacht[STAP]: stop(f"≠ verwacht {verwacht[STAP]}")
goed(volgende[STAP])
