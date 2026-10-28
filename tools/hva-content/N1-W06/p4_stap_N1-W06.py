# p4_stap_N1-W06.py v1.6.1 (9T P3 F2/V1: de 9e manifestkolom md5_sql moet gelijk zijn aan de regels van het blok in SQL_MANIFEST.tsv; anders STOP) · v1.6 — Maker-T / Controleur-T · P3/P4 N1-W06 · = p4_stap_N1-W05.py v1.5 voor W06 + W05/W04-nazorg, met insertblokken (architectuur T v1.1 §2–§3, 9T P2 F4):
#  - het manifest heeft een 8e kolom `soort` (insert | update; ontbreekt = update). Een insertblok kent de stappen stand · vinger_voor · gr · apply ·
#    vinger_na en `bestand`; rollback, noodrollback en vinger_terug = STOP (terugdraaien = niet nodig: de nieuwe rijen blijven onzichtbaar, nooit DELETE;
#    het updateblok dat ze publiceert, zet ze in zijn eigen rollback terug op false). De gr van een insertblok heeft ook 16 velden:
#    start|insert|na_insert|tweede insert (0, grendel dicht)|na_tweede + activiteit + isolatie.
#  - vinger_voor = de NA van dit blok → «al uitgevoerd»: het blok niet opnieuw draaien; dezelfde uitvoer als `stand` vastleggen (geen incident);
#    de stand zet het log op het volgende blok.
#  - slot: de weken W06, W05, W04 (slot_verwacht_N1-W06.json), het leerderszicht generiek uit slot_verwacht (zicht_voor/zicht_na).
# Basis: p4_stap_N1-W05.py v1.5 (= v1.4.1 voor vier weken en twee gedepubliceerde items) — Maker-T / Controleur-T · P4 N1-W05 · = p4_stap_N1-W02.py v1.1, maar alles komt uit BLOKKEN_MANIFEST.tsv
# (P1-18, 9T V2; tegenrapport T P2, V5): geen vaste bloklijst en geen vaste weekmappen meer.
#  - zonder manifest in <sql-root> = STOP (een andere bundel, bv. die van W02, wordt zo geweigerd);
#  - de md5 van elke verwacht.txt moet gelijk zijn aan het manifest (anders STOP: bundel gewijzigd of gemengd);
#  - het blok moet in het manifest staan; "stand" bepaalt binnen de week van dat blok welk blok aan de beurt is (keten uit het manifest)
#    en noemt bij een afgewerkte week het volgende blok uit het manifest.
# Stappen en verwachtingen verder zoals v1.1: stand · vinger_voor · gr · apply · vinger_na · rollback · vinger_terug.
# v1.3 (8T C-T02, C-T04, C-T05): stap `bestand` (uitkomst = het pad van het SQL-bestand, relatief t.o.v. de SQL-root): het bestand moet in
#   de map van dit blok staan en zijn md5 moet gelijk zijn aan SQL_MANIFEST.tsv van de week → zo wordt elk bestand vóór het plakken
#   gebonden; stap `noodrollback` (4b; verwacht = rollback_uitvoer); een uitkomst met spaties of regeleinden aan begin of eind = STOP.
#   De volgorde over de weken heen bewaakt p4_log_stap_N1-W05.py v1.2 (uit het P4-log).
# v1.4 (9T P3 V1, V3, V4): blok `slot` met de stappen slot_ref (VOOR-tellingen vlak vóór blok 1), slot (NA-tellingen, pogingen ≥ --ref <n>),
#   zicht_voor en zicht_na (leerderszicht: policies, RLS, gepubliceerd per week, U3-luisteren-08), elk tegen slot_verwacht_N1-W05.json; de
#   uitkomst is dan de JSON-rij. `bestand` voor het blok slot bindt aan de md5 in slot_verwacht. gr met `--activiteit-akkoord`: activiteit van
#   leerders geeft dan ✓ met een melding (alleen op het letterlijke akkoord van Ibra, vastgelegd door p4_log_stap); eindrij en isolatie nooit.
# Uitkomst = de kolommen van de ene resultaatrij, samengevoegd met '|'. Exit 0 = ✓ (ga door), 2 = STOP. Leest alleen.
# Gebruik: python3 -I p4_stap_N1-W05.py <sql-root met BLOKKEN_MANIFEST.tsv> <blok, bv. 1_L1 of 6_W02n> <stap> "<uitkomst>"
import sys, os, hashlib, json
SQL, BLOK, STAP, UIT = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]; EXTRA = sys.argv[5:]
def stop(reden): print(f"✗ STOP · {BLOK} · {STAP}: {reden}\n  kreeg:    {UIT}\n  daarna:   niets herhalen; één losse aanroep ROLLBACK; → 7_vinger_aggregaat.sql (stand) → Ibra inlichten"); sys.exit(2)
def goed(volgende): print(f"✓ {BLOK} · {STAP} · {UIT[:80]}{'…' if len(UIT) > 80 else ''}\n  volgende: {volgende}"); sys.exit(0)
if UIT != UIT.strip(): stop("uitkomst met spaties of regeleinden aan begin of eind (8T C-T05)")
MP = os.path.join(SQL, "BLOKKEN_MANIFEST.tsv")
if not os.path.exists(MP): stop(f"geen BLOKKEN_MANIFEST.tsv in {SQL}: dit is niet de bundel van N1-W06")
M = [dict(zip(("volgorde", "week", "blok", "map", "md5_verwacht", "week_voor", "week_na", "soort", "md5_sql"), l.rstrip("\n").split("\t"))) for l in list(open(MP, encoding="utf-8"))[1:]]
for r in M: r.setdefault("soort", "update")
for r in M:
    p = os.path.join(SQL, r["map"], "verwacht.txt")
    if not os.path.exists(p) or hashlib.md5(open(p, "rb").read()).hexdigest() != r["md5_verwacht"]: stop(f"verwacht.txt van {r['map']} ontbreekt of wijkt af van het manifest")
    _sm = os.path.join(SQL, r["week"], "SQL_MANIFEST.tsv")   # v1.6.1: het manifest bindt ook de SQL (9T P3 F2)
    if r.get("md5_sql") is None: stop("BLOKKEN_MANIFEST.tsv zonder kolom md5_sql (bundel van vóór v1.2)")
    if not os.path.exists(_sm) or hashlib.md5("".join(l for l in open(_sm, encoding="utf-8") if l.split("\t")[0] == r["blok"]).encode("utf-8")).hexdigest() != r["md5_sql"]: stop(f"SQL_MANIFEST.tsv van {r['week']} past niet bij het manifest voor blok {r['blok']} (gemengde of gewijzigde bundel)")
if BLOK == "slot":   # v1.4: slotstappen (9T P3 V3, V4)
    SVP = os.path.join(SQL, "slot_verwacht_N1-W06.json")
    if not os.path.exists(SVP): stop("geen slot_verwacht_N1-W06.json in de bundel")
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
        verw = {f"{k}_{w.lower()}": bron[w][k] for w in SV["weken"] for k in SV["sleutels"]}
        verw.update(rijen_totaal=bron.get("rijen_totaal", SV["rijen_totaal"]), rijen_n1=bron.get("rijen_n1", SV["rijen_n1"])); fout = verschil(verw)   # v1.6: VOOR 2299, NA 2323 (24 nieuwe rijen)
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
        goed(f"leerderszicht = {'VOOR' if STAP == 'zicht_voor' else 'NA'} ({len(SV[STAP])} waarden): " + ", ".join(f"{k} {U[k]}" for k in SV[STAP] if k != "policies") + " · policies ongewijzigd")
    stop(f"onbekende slotstap '{STAP}' (slot_ref · zicht_voor · slot · zicht_na · bestand)")
idx = {r["blok"]: r for r in M}
if BLOK not in idx: stop(f"blok '{BLOK}' staat niet in het manifest ({', '.join(r['blok'] for r in M)})")
R = idx[BLOK]; INS = R["soort"] == "insert"
V = dict(l.rstrip("\n").split("\t", 1) for l in open(os.path.join(SQL, R["map"], "verwacht.txt"), encoding="utf-8"))
if V["week_voor"] != R["week_voor"] or V["week_na"] != R["week_na"]: stop("verwacht.txt en manifest spreken elkaar tegen")
def na_dit(r):
    k = int(r["volgorde"])
    return next((x for x in M if int(x["volgorde"]) == k + 1), None)
BESTAND = {"stand": "7_vinger_aggregaat.sql", "vinger_voor": "7_vinger_aggregaat.sql", "vinger_na": "7_vinger_aggregaat.sql", "vinger_terug": "7_vinger_aggregaat.sql",
           "gr": "8_generale_repetitie.sql", "apply": "3_apply.sql", "rollback": "4_rollback.sql", "noodrollback": "4b_noodrollback.sql"}
if INS and STAP in ("rollback", "noodrollback", "vinger_terug"):
    stop(f"{BLOK} is een insertblok: geen {STAP} (de nieuwe rijen blijven onzichtbaar met is_published = false; nooit DELETE, N2-10). Terugdraaien stopt bij het eerste updateblok.")
if STAP == "bestand":
    pad = os.path.normpath(UIT); naam = os.path.basename(pad)
    if os.path.dirname(pad) != os.path.normpath(R["map"]): stop(f"{UIT} staat niet in de map van blok {BLOK} ({R['map']})")
    if naam not in set(BESTAND.values()): stop(f"{naam} is geen bestand van het P4-draaiboek")
    if INS and naam in ("4_rollback.sql", "4b_noodrollback.sql"): stop(f"{naam} bestaat niet voor het insertblok {BLOK}")
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
    if k < len(wk): goed(f"{R['week']}: {k} van {len(wk)} blokken toegepast" + (f" ({', '.join(x['blok'] for x in wk[:k])})" if k else "") + f" → blok {wk[k]['blok']} (volgorde {wk[k]['volgorde']} in het manifest)"
                         + (" · de insertblokken blijven staan; terugdraaien stopt hier" if k and all(x["soort"] == "insert" for x in wk[:k]) and wk[k]["soort"] == "update" else ""))
    vlg = na_dit(wk[-1])
    goed(f"{R['week']} klaar ({len(wk)} van {len(wk)}) → " + (f"volgend blok in het manifest: {vlg['blok']} ({vlg['week']}; eerst stand met dat blok)" if vlg else "alle blokken van het manifest toegepast → slotcontrole"))
verwacht = {"vinger_voor": f"{V['week_voor']}|{V['blok_voor']}|{V['rest']}", "apply": V["apply_uitvoer"], "noodrollback": V["rollback_uitvoer"],
            "vinger_na": f"{V['week_na']}|{V['blok_na']}|{V['rest']}", "rollback": V["rollback_uitvoer"],
            "vinger_terug": f"{V['week_voor']}|{V['blok_voor']}|{V['rest']}"}
if INS: del verwacht["noodrollback"], verwacht["rollback"], verwacht["vinger_terug"]
vlg = na_dit(R)
volgende = {"vinger_voor": "8_generale_repetitie.sql (gr)", "apply": "7_vinger_aggregaat.sql (vinger_na)",
            "vinger_na": (f"volgend blok in het manifest: {vlg['blok']} ({vlg['week']}); eerst 7_vinger (stand/vinger_voor)" if vlg else "laatste blok van het manifest → slotcontrole (V-A)"),
            "rollback": "7_vinger_aggregaat.sql (vinger_terug)", "noodrollback": "7_vinger_aggregaat.sql (vinger_terug)", "vinger_terug": "blok staat terug op de stand ervóór; verder alleen op opdracht van Ibra"}
if STAP == "gr":
    d = UIT.split("|")
    if len(d) != 16: stop(f"{len(d)} velden in plaats van 16 (5 × n|md5, 5 × activiteit, isolatie)")
    if "|".join(d[:10]) != V["gr_eindrij"]: stop(f"generale repetitie ≠ verwacht {V['gr_eindrij']}" + (" (insertblok: start|insert|na_insert|tweede insert = 0|na_tweede)" if INS else ""))
    p30, p30l, l30l, l30s, laatste, iso = d[10:16]
    if iso != "repeatable read": stop(f"isolatie '{iso}' ≠ repeatable read → V2 niet gewaarborgd, geen apply")
    if not (p30l.isdigit() and l30l.isdigit()): stop(f"activiteit onleesbaar: pogingen30_leerders={p30l}, logins30_leerders={l30l}")
    if int(p30l) > 0 or int(l30l) > 0:
        if "--activiteit-akkoord" not in EXTRA: stop(f"activiteit: pogingen30_leerders={p30l}, logins30_leerders={l30l} → eerst Ibra (B17)")
        goed(f"3_apply.sql (apply) · ⚠ activiteit van leerders (pogingen30_leerders={p30l}, logins30_leerders={l30l}) aanvaard op het akkoord van Ibra · pogingen30={p30}, staf-logins30={l30s}, laatste poging {laatste or '—'}")
    goed(f"3_apply.sql (apply) · activiteit: pogingen30={p30}, staf-logins30={l30s}, laatste poging {laatste or '—'}")
if STAP not in verwacht: stop(f"onbekende stap '{STAP}'")
if STAP == "apply" and UIT == V["leeg_uitvoer"]: stop("apply gaf 0 rijen (grendel dicht) → 7_vinger draaien en de stand bepalen; niet herhalen" + (" (insertblok: misschien al uitgevoerd; de stand zegt het)" if INS else ""))
if STAP == "vinger_voor" and UIT == f"{V['week_na']}|{V['blok_na']}|{V['rest']}":
    stop(f"↷ al uitgevoerd (vingerafdruk = NA van {BLOK}): het blok NIET opnieuw draaien. Geen incident: dezelfde uitvoer vastleggen als `stand`; het log gaat dan verder met het volgende blok")
if UIT != verwacht[STAP]: stop(f"≠ verwacht {verwacht[STAP]}")
goed(volgende[STAP])
