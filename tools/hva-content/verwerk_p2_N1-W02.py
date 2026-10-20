# verwerk_p2_N1-W02.py v1.1 — Regisseur-D (1D) · na "P2 akkoord": zet het besluit van Ibra per regel in het wijzigingslog (handboek 1D-5).
# v1.1 (tegenrapporten P2: 9T V4, 9D V2) — ITEM-ATOMAIR, door een script, niet met de hand:
#   (1) review akkoord = ja, of geen reviewregel en geen apart besluit → status goedgekeurd, besluit_ibra "P2 akkoord (datum)";
#   (2) zegt Ibra "nee" of "aangepast" bij een regel van een item (een reviewregel uit deel 1, 2a of 2b, een identieke kopie die
#       daardoor "nee" wordt, of een logregel buiten de review via --logbesluiten), dan gaan ALLE regels van dat item naar
#       status afgewezen: het item blijft in de app zoals het is, en 4D legt het in P3 opnieuw voor (nieuwe regels, voor → na),
#       met de tekst van Ibra ("Ibra-tekst: …") als uitgangspunt. Zo spreken stimulus, opties en feedback elkaar nooit tegen;
#   (3) een afgeleide vlagregel (review_flag) die "nee" wordt omdat een regel in een ANDER item nee is, wordt alleen zelf
#       afgewezen (de vlag blijft staan; de rest van het item kan door);
#   (4) STOP bij: een lege of onbekende review-uitkomst, een reviewregel die niet in het log staat, een logregel die al een
#       andere status dan 'voorgesteld' heeft (al verwerkt?), of een logbesluit voor een onbekend id.
# Gebruik: python3 -I verwerk_p2_N1-W02.py <log.tsv> <review_ingevuld.tsv> <log_uit.tsv> [--logbesluiten <review_uit>_logbesluiten.tsv]
#          [--datum "2026-10-19 hh:mm"]
import sys, csv, collections
args = [a for i, a in enumerate(sys.argv[1:], 1) if not a.startswith("--") and not sys.argv[i - 1].startswith("--")]
opt = lambda n: sys.argv[sys.argv.index(n) + 1] if n in sys.argv else ""
logpad, revpad, uit = args[0], args[1], args[2]
datum = opt("--datum") or "P2"
def stop(m): sys.exit("STOP: " + m)
L = [l.rstrip("\n").split("\t") for l in open(logpad, encoding="utf-8")]
kop, rows = L[0], L[1:]; K = {c: i for i, c in enumerate(kop)}
ids = {r[K["wijziging_id"]] for r in rows}
assert len(ids) == len(rows), "dubbel wijziging_id in het log"
al = [r[K["wijziging_id"]] for r in rows if r[K["status"]] != "voorgesteld"]
if al: stop(f"{len(al)} logregels hebben al een status ≠ voorgesteld (al verwerkt?): {al[:10]}")
R = list(csv.DictReader(open(revpad, encoding="utf-8", newline=""), delimiter="\t"))
rv = {r["wijziging_id"]: r for r in R}
leeg = [w for w, r in rv.items() if not r["akkoord"].strip()]
if leeg: stop(f"{len(leeg)} reviewregels zonder antwoord: {leeg[:15]}")
vreemd = [w for w, r in rv.items() if r["akkoord"].strip().lower() not in ("ja", "nee", "aangepast")]
if vreemd: stop(f"onbekende review-uitkomst bij {vreemd[:10]}")
buiten = [w for w in rv if w not in ids]
if buiten: stop(f"reviewregels die niet in het log staan: {buiten[:10]}")
lb = {}
if opt("--logbesluiten"):
    for r in csv.DictReader(open(opt("--logbesluiten"), encoding="utf-8", newline=""), delimiter="\t"):
        if r["wijziging_id"] not in ids: stop(f"logbesluit voor onbekend id {r['wijziging_id']}")
        if r["wijziging_id"] in rv: stop(f"{r['wijziging_id']} staat in de review; dat besluit hoort via review_bulk")
        lb[r["wijziging_id"]] = (r["akkoord"].strip().lower(), r["tekst"])
def tekst_ibra(w):
    o = rv[w]["opmerking"]
    for sleutel in ("Ibra-tekst: ", "Ibra: "):
        if sleutel in o: return o.split(sleutel, 1)[1].strip()
    return ""
# 1. besluit per regel
besl = {}
for r in rows:
    w = r[K["wijziging_id"]]
    if w in rv: a = rv[w]["akkoord"].strip().lower(); t = tekst_ibra(w) if a != "ja" else ""
    elif w in lb: a, t = lb[w]
    else: a, t = "ja", ""
    besl[w] = (a, t)
# 2. items die terug gaan naar 4D
terug = collections.defaultdict(list); alleen_vlag = []
for r in rows:
    w, i, veld = r[K["wijziging_id"]], r[K["item_id"]], r[K["veld"]]
    a, t = besl[w]
    if a == "ja": continue
    is_afgeleide_vlag = w in rv and rv[w]["deel"] == "afgeleid" and veld == "review_flag"
    if is_afgeleide_vlag: alleen_vlag.append(w)
    else: terug[i].append((w, veld, a, t))
for w in list(alleen_vlag):          # een vlag in een item dat toch al terug gaat, volgt het item
    i = next(r[K["item_id"]] for r in rows if r[K["wijziging_id"]] == w)
    if i in terug: alleen_vlag.remove(w)
# 3. statussen schrijven
tel = collections.Counter()
for r in rows:
    w, i = r[K["wijziging_id"]], r[K["item_id"]]
    a, t = besl[w]
    if i in terug:
        r[K["status"]] = "afgewezen"
        if a == "nee": r[K["besluit_ibra"]] = f"afgewezen in P2 ({datum})" + (f": {t}" if t else "") + " · item terug naar 4D (P3)"
        elif a == "aangepast": r[K["besluit_ibra"]] = f"aangepast in P2 ({datum}) · item terug naar 4D (P3) · Ibra-tekst: {t}"
        else: r[K["besluit_ibra"]] = f"item terug naar 4D (P3) door {', '.join(x[0] for x in terug[i])} ({datum})"
    elif w in alleen_vlag:
        r[K["status"]] = "afgewezen"; r[K["besluit_ibra"]] = f"vlag blijft: afgeleid van een regel die in P2 niet werd goedgekeurd ({datum})"
    else:
        r[K["status"]] = "goedgekeurd"; r[K["besluit_ibra"]] = f"P2 akkoord ({datum})"
    tel[r[K["status"]]] += 1
with open(uit, "w", encoding="utf-8") as f:
    f.write("\t".join(kop) + "\n")
    for r in rows: f.write("\t".join(r) + "\n")
print(f"logregels vóór: {len(rows)} (alle voorgesteld) · na: {dict(tel)} · items terug naar 4D: {len(terug)} · alleen vlag afgewezen: {len(alleen_vlag)}")
for i, lst in terug.items():
    n = sum(1 for r in rows if r[K["item_id"]] == i)
    print(f"  TERUG {i} ({n} regels afgewezen) ← " + " · ".join(f"{w} {veld} {a}" + (f": {t[:60]}" if t else "") for w, veld, a, t in lst))
for w in alleen_vlag: print(f"  VLAG {w} afgewezen (blijft staan)")
