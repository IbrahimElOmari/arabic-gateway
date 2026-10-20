# p4_stap_N1-W02.py v1.1 — Maker-T / Controleur-T · P4 N1-W02 · vergelijkt de uitkomst van één P4-stap met verwacht.txt (SQL v4.3.1) en zegt
# wat de volgende stap is. Zo vergelijkt niemand met het oog, ook een subagent niet (9T V1 en V3). Leest alleen.
# Stappen:  stand        uitkomst van 7_vinger_aggregaat (week|blok|rest): bepaalt welk blok aan de beurt is (keten uit verwacht.txt)
#           vinger_voor  7_vinger vóór het blok           → verwacht week_voor|blok_voor|rest
#           gr           8_generale_repetitie            → verwacht gr_eindrij|activiteit(5)|isolatie; STOP bij leerderspogingen of -logins (30 d)
#                                                          of isolatie ≠ repeatable read
#           apply        3_apply                         → verwacht apply_uitvoer (n|md5|repeatable read)
#           vinger_na    7_vinger na de apply            → verwacht week_na|blok_na|rest
#           rollback     4_rollback (alleen op opdracht) → verwacht rollback_uitvoer
#           vinger_terug 7_vinger na de rollback         → verwacht week_voor|blok_voor|rest
# Uitkomst = de kolommen van de ene resultaatrij, samengevoegd met '|', zoals de tool ze teruggeeft (lege kolom = leeg veld).
# Exit 0 = ✓ (ga door), 2 = STOP. Gebruik: python3 -I p4_stap_N1-W02.py <map p4/sql> <blok 1_L1|2_L2|3_R1|4_R2|1_W01> <stap> "<uitkomst>"
import sys
SQL, BLOK, STAP, UIT = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4].strip()
W02 = ["1_L1", "2_L2", "3_R1", "4_R2"]
def vw(b): return dict(l.rstrip("\n").split("\t", 1) for l in open(f"{SQL}/{'N1-W01' if b == '1_W01' else 'N1-W02'}/{b}/verwacht.txt", encoding="utf-8"))
V = vw(BLOK)
def stop(reden): print(f"✗ STOP · {BLOK} · {STAP}: {reden}\n  kreeg:    {UIT}\n  daarna:   niets herhalen; één losse aanroep ROLLBACK; → 7_vinger_aggregaat.sql (stand) → Ibra inlichten"); sys.exit(2)
def goed(volgende): print(f"✓ {BLOK} · {STAP} · {UIT[:80]}{'…' if len(UIT) > 80 else ''}\n  volgende: {volgende}"); sys.exit(0)
if STAP == "stand":
    week = "|".join(UIT.split("|")[:2])
    if BLOK == "1_W01":
        if week == V["week_voor"]: goed("W01 is nog niet toegepast → blok 1_W01 (vinger_voor, gr, apply, vinger_na)")
        if week == V["week_na"]: goed("W01 is al toegepast → niets doen; naar de controles na de apply (B25, rooktest)")
        stop(f"W01-week {week} is geen verwachte waarde ({V['week_voor']} of {V['week_na']})")
    keten = [vw(W02[0])["week_voor"]] + [vw(b)["week_na"] for b in W02]
    if week not in keten: stop(f"week {week} is geen van de vijf verwachte ketenwaarden → niets uitvoeren, Ibra inlichten")
    k = keten.index(week)
    goed(f"{k} van 4 W02-blokken toegepast → " + (f"blok {W02[k]}" if k < 4 else "W02 klaar → W01-blok (stand met 1_W01)"))
verwacht = {"vinger_voor": f"{V['week_voor']}|{V['blok_voor']}|{V['rest']}", "apply": V["apply_uitvoer"],
            "vinger_na": f"{V['week_na']}|{V['blok_na']}|{V['rest']}", "rollback": V["rollback_uitvoer"],
            "vinger_terug": f"{V['week_voor']}|{V['blok_voor']}|{V['rest']}"}
volgende = {"vinger_voor": "8_generale_repetitie.sql (gr)", "apply": "7_vinger_aggregaat.sql (vinger_na)",
            "vinger_na": "volgend blok: eerst 7_vinger (stand/vinger_voor)", "rollback": "7_vinger_aggregaat.sql (vinger_terug)",
            "vinger_terug": "blok staat terug op de stand ervóór; verder alleen op opdracht van Ibra"}
if STAP == "gr":
    d = UIT.split("|")
    if len(d) != 16: stop(f"{len(d)} velden in plaats van 16 (5 × n|md5, 5 × activiteit, isolatie)")
    if "|".join(d[:10]) != V["gr_eindrij"]: stop(f"generale repetitie ≠ verwacht {V['gr_eindrij']}")
    p30, p30l, l30l, l30s, laatste, iso = d[10:16]
    if not (p30l.isdigit() and l30l.isdigit()) or int(p30l) > 0 or int(l30l) > 0: stop(f"activiteit: pogingen30_leerders={p30l}, logins30_leerders={l30l} → eerst Ibra (B17)")
    if iso != "repeatable read": stop(f"isolatie '{iso}' ≠ repeatable read → V2 niet gewaarborgd, geen apply")
    goed(f"3_apply.sql (apply) · activiteit: pogingen30={p30}, staf-logins30={l30s}, laatste poging {laatste or '—'}")
if STAP not in verwacht: stop(f"onbekende stap '{STAP}'")
if STAP == "apply" and UIT == V["leeg_uitvoer"]: stop("apply gaf 0 rijen → 7_vinger draaien en de stand bepalen; niet herhalen")
if UIT != verwacht[STAP]: stop(f"≠ verwacht {verwacht[STAP]}")
goed(volgende[STAP])
