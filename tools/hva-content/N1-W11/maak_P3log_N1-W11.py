# maak_P3log_N1-W11.py v1.0 — Maker-T (7T) · P3 N1-W11 · voegt de vier logs van P3 samen tot één P3-log en één P3-reviewlijst:
#   (1) het weeklog van W11 (p2/definitief, 1.064 regels, alle goedgekeurd: groep 1, delta groep 1, groep 2, groep 3),
#   (2) de P3-delta van besluit 1a (4 regels, U11-spreken-06-4),
#   (3) de display_order-regels van blok V_W11 (182 regels, B30),
#   (4) de W10-nazorg (6 regels, W9001–W9006, goedgekeurd in P2 groep 2).
#   De volgorde in het bestand is de volgorde van toepassen (apply_log werkt regel na regel en toetst «oud»): eerst het weeklog, dan de P3-delta
#   (haar «oud» is de stand ná het weeklog), dan V; de W10-regels raken alleen week 10 (apply_log --week 10).
#   Toetsen: dezelfde kop in alle vier (en in de drie reviewlijsten); elke wijziging_id uniek over het geheel; platte tabregels (B35: geen tab, geen
#   echt regeleinde, geen csv-quoting); het aantal regels per bron = het verwachte aantal. Zonder --proef weigert het script elke regel die niet
#   «goedgekeurd» is of «proef» in de herkomst draagt (9T V3); met --proef neemt het de PROEF-kopieën van (2) en (3) (status goedgekeurd + «proef P3»),
#   en dan is de uitvoer alleen voor de proefketen (p3/proef/…), nooit voor P4.
# Gebruik: python3 -I maak_P3log_N1-W11.py <werkmap> <uit_log.tsv> <uit_review.tsv> [--proef]
import sys, os, hashlib
WM, UL, UR = sys.argv[1:4]; PROEF = "--proef" in sys.argv
HW, NAZ = 11, 10; WK = lambda w: f"N1-W{w:02d}"
D = f"{WM}/p2/definitief"; X = f"{WM}/p3/delta"; XP = f"{X}/proef"
BRON = [  # (naam, log, review, regels)
    ("weeklog", f"{D}/{WK(HW)}_wijzigingslog.tsv", f"{D}/review_native_{WK(HW)}.tsv", 1064),
    ("P3-delta", f"{XP}/{WK(HW)}_P3delta_wijzigingslog_PROEF.tsv" if PROEF else f"{X}/{WK(HW)}_P3delta_wijzigingslog.tsv",
                 f"{XP}/review_native_{WK(HW)}_P3delta_PROEF.tsv" if PROEF else f"{X}/review_native_{WK(HW)}_P3delta.tsv", 4),
    ("V", f"{XP}/{WK(HW)}_V_wijzigingslog_PROEF.tsv" if PROEF else f"{X}/{WK(HW)}_V_wijzigingslog.tsv", None, 182),
    ("nazorg van W10", f"{D}/bronlogs/{WK(NAZ)}_nazorg_wijzigingslog_na_P2.tsv", f"{D}/bronlogs/review_native_{WK(NAZ)}_nazorg_na_P2.tsv", 6)]
def stop(m): print(f"✗ STOP · maak_P3log v1.0: {m}"); sys.exit(2)
def lees(p):
    b = open(p, "rb").read()
    if b"\r" in b: stop(f"{p}: CR in het bestand (B35)")
    t = b.decode("utf-8");
    if not t.endswith("\n"): stop(f"{p}: geen afsluitend regeleinde")
    rr = [l.split("\t") for l in t[:-1].split("\n")]
    if len({len(r) for r in rr}) != 1: stop(f"{p}: niet elke regel heeft {len(rr[0])} kolommen (B35)")
    for r in rr:
        for v in r:
            if v.startswith('"') and v.endswith('"') and len(v) > 1: stop(f"{p}: csv-quoting in «{v[:40]}» (B35)")
    return rr
KOP = KOPR = None; LOG = []; REV = []; tel = []
for naam, lp, rp, n in BRON:
    rr = lees(lp); kop, rij = rr[0], rr[1:]
    if KOP is None: KOP = kop
    if kop != KOP: stop(f"{naam}: andere kop dan het weeklog")
    if len(rij) != n: stop(f"{naam}: {len(rij)} regels, verwacht {n}")
    S = KOP.index("status"); H = KOP.index("herkomst")
    for r in rij:
        if r[S] != "goedgekeurd": stop(f"{naam}: {r[0]} heeft status «{r[S]}» (P3-log alleen met goedgekeurde regels; zonder «P3 akkoord» draait alleen --proef)")
        if not PROEF and "proef" in r[H].lower(): stop(f"{naam}: {r[0]} is een proefregel (9T V3)")
    LOG += rij; tel.append(f"{naam} {len(rij)}")
    if rp:
        rv = lees(rp)
        if KOPR is None: KOPR = rv[0]
        if rv[0] != KOPR: stop(f"review {naam}: andere kop")
        A = KOPR.index("akkoord")
        for r in rv[1:]:
            if r[A] != "ja": stop(f"review {naam}: {r[0]} akkoord «{r[A]}»")
        REV += rv[1:]
ids = [r[0] for r in LOG]
dub = sorted({i for i in ids if ids.count(i) > 1})
if dub: stop(f"wijziging_id niet uniek: {dub[:5]}")
ilog = {(r[0], r[1], r[2]) for r in LOG}
for r in REV:
    if (r[0], r[1], r[2]) not in ilog: stop(f"reviewregel {r[0]} {r[1]} {r[2]} hoort bij geen logregel")
for p, kop, rr in ((UL, KOP, LOG), (UR, KOPR, REV)):
    os.makedirs(os.path.dirname(os.path.abspath(p)), exist_ok=True)
    with open(p, "w", encoding="utf-8", newline="") as f: f.write("\n".join("\t".join(r) for r in [kop] + rr) + "\n")
md5 = lambda p: hashlib.md5(open(p, "rb").read()).hexdigest()
print(f"P3-log{' (PROEF)' if PROEF else ''}: {len(LOG)} regels ({' · '.join(tel)}) md5 {md5(UL)} · review {len(REV)} regels md5 {md5(UR)} · ids uniek · B35 ✓")
