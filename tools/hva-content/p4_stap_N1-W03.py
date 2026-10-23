# p4_stap_N1-W03.py v1.2 — Maker-T / Controleur-T · P4 N1-W03 · = p4_stap_N1-W02.py v1.1, maar alles komt uit BLOKKEN_MANIFEST.tsv
# (P1-18, 9T V2; tegenrapport T P2, V5): geen vaste bloklijst en geen vaste weekmappen meer.
#  - zonder manifest in <sql-root> = STOP (een andere bundel, bv. die van W02, wordt zo geweigerd);
#  - de md5 van elke verwacht.txt moet gelijk zijn aan het manifest (anders STOP: bundel gewijzigd of gemengd);
#  - het blok moet in het manifest staan; "stand" bepaalt binnen de week van dat blok welk blok aan de beurt is (keten uit het manifest)
#    en noemt bij een afgewerkte week het volgende blok uit het manifest.
# Stappen en verwachtingen verder zoals v1.1: stand · vinger_voor · gr · apply · vinger_na · rollback · vinger_terug.
# Uitkomst = de kolommen van de ene resultaatrij, samengevoegd met '|'. Exit 0 = ✓ (ga door), 2 = STOP. Leest alleen.
# Gebruik: python3 -I p4_stap_N1-W03.py <sql-root met BLOKKEN_MANIFEST.tsv> <blok, bv. 1_L1 of 6_W02n> <stap> "<uitkomst>"
import sys, os, hashlib
SQL, BLOK, STAP, UIT = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4].strip()
def stop(reden): print(f"✗ STOP · {BLOK} · {STAP}: {reden}\n  kreeg:    {UIT}\n  daarna:   niets herhalen; één losse aanroep ROLLBACK; → 7_vinger_aggregaat.sql (stand) → Ibra inlichten"); sys.exit(2)
def goed(volgende): print(f"✓ {BLOK} · {STAP} · {UIT[:80]}{'…' if len(UIT) > 80 else ''}\n  volgende: {volgende}"); sys.exit(0)
MP = os.path.join(SQL, "BLOKKEN_MANIFEST.tsv")
if not os.path.exists(MP): stop(f"geen BLOKKEN_MANIFEST.tsv in {SQL}: dit is niet de bundel van N1-W03")
M = [dict(zip(("volgorde", "week", "blok", "map", "md5_verwacht", "week_voor", "week_na"), l.rstrip("\n").split("\t"))) for l in list(open(MP, encoding="utf-8"))[1:]]
for r in M:
    p = os.path.join(SQL, r["map"], "verwacht.txt")
    if not os.path.exists(p) or hashlib.md5(open(p, "rb").read()).hexdigest() != r["md5_verwacht"]: stop(f"verwacht.txt van {r['map']} ontbreekt of wijkt af van het manifest")
idx = {r["blok"]: r for r in M}
if BLOK not in idx: stop(f"blok '{BLOK}' staat niet in het manifest ({', '.join(r['blok'] for r in M)})")
R = idx[BLOK]
V = dict(l.rstrip("\n").split("\t", 1) for l in open(os.path.join(SQL, R["map"], "verwacht.txt"), encoding="utf-8"))
if V["week_voor"] != R["week_voor"] or V["week_na"] != R["week_na"]: stop("verwacht.txt en manifest spreken elkaar tegen")
def na_dit(r):
    k = int(r["volgorde"])
    return next((x for x in M if int(x["volgorde"]) == k + 1), None)
if STAP == "stand":
    week = "|".join(UIT.split("|")[:2])
    wk = [r for r in M if r["week"] == R["week"]]
    keten = [wk[0]["week_voor"]] + [r["week_na"] for r in wk]
    if week not in keten: stop(f"{R['week']}: vingerafdruk {week} is geen van de {len(keten)} verwachte ketenwaarden → niets uitvoeren, Ibra inlichten")
    k = keten.index(week)
    if k < len(wk): goed(f"{R['week']}: {k} van {len(wk)} blokken toegepast → blok {wk[k]['blok']} (volgorde {wk[k]['volgorde']} in het manifest)")
    vlg = na_dit(wk[-1])
    goed(f"{R['week']} klaar ({len(wk)} van {len(wk)}) → " + (f"volgend blok in het manifest: {vlg['blok']} ({vlg['week']}; eerst stand met dat blok)" if vlg else "alle blokken van het manifest toegepast → slotcontrole"))
verwacht = {"vinger_voor": f"{V['week_voor']}|{V['blok_voor']}|{V['rest']}", "apply": V["apply_uitvoer"],
            "vinger_na": f"{V['week_na']}|{V['blok_na']}|{V['rest']}", "rollback": V["rollback_uitvoer"],
            "vinger_terug": f"{V['week_voor']}|{V['blok_voor']}|{V['rest']}"}
vlg = na_dit(R)
volgende = {"vinger_voor": "8_generale_repetitie.sql (gr)", "apply": "7_vinger_aggregaat.sql (vinger_na)",
            "vinger_na": (f"volgend blok in het manifest: {vlg['blok']} ({vlg['week']}); eerst 7_vinger (stand/vinger_voor)" if vlg else "laatste blok van het manifest → slotcontrole (V-A)"),
            "rollback": "7_vinger_aggregaat.sql (vinger_terug)", "vinger_terug": "blok staat terug op de stand ervóór; verder alleen op opdracht van Ibra"}
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
