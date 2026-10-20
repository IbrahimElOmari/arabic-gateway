# verwerk_p3_N1-W02.py v1 — Regisseur-D (1D) / Maker-T (4T) · na "P3 akkoord" N1-W02 (2026-10-20 13:19) · zet het antwoord van Ibra
# door een script in het log en de review (B18: nooit met de hand). Beslissing 1: de 30 logregels W0468–W0497 (status=voorgesteld)
# worden goedgekeurd, en de native-review 2a van W0468/W0469 krijgt "ja".
# Invoer: het goedgekeurde P2-log (467 regels), het P3-voorstel (30 regels), de P2-review (266 regels), de P3-review (2 regels).
# Uitvoer: één log (497 regels) en één review (268 regels). Harde controles (assert): de P2-regels blijven byte-gelijk; het voorstel
# sluit aan op het laatste P2-nummer; alleen de kolommen status/besluit_ibra (log) en akkoord/opmerking (review) veranderen;
# elke review-regel hoort bij een logregel met dezelfde tekst (oud = oud, voorgesteld = nieuw).
# Gebruik: python3 -I verwerk_p3_N1-W02.py <P2-log> <P3-voorstel-log> <P2-review> <P3-voorstel-review> <uit-log> <uit-review> "<besluit>"
import sys, csv, hashlib
csv.field_size_limit(10**9)
p2log, p3log, p2rev, p3rev, uitlog, uitrev, besluit = sys.argv[1:8]
def lees(p):
    rijen = list(csv.reader(open(p, encoding="utf-8", newline=""), delimiter="\t", quoting=csv.QUOTE_NONE))
    return rijen[0], rijen[1:]
kL, L2 = lees(p2log); kV, V = lees(p3log); kR, R2 = lees(p2rev); kRV, RV = lees(p3rev)
assert kL == kV, "kop log ≠ kop voorstel"; assert kR == kRV, "kop review ≠ kop voorstel-review"
iS, iB = kL.index("status"), kL.index("besluit_ibra")
assert all(r[iS] == "goedgekeurd" for r in L2), "P2-log niet volledig goedgekeurd"
assert all(r[iS] == "voorgesteld" and r[iB] == "" for r in V), "voorstel niet volledig voorgesteld"
laatste = max(int(r[0][1:]) for r in L2)
assert [r[0] for r in V] == [f"W{n:04d}" for n in range(laatste + 1, laatste + 1 + len(V))], "voorstel sluit niet aan"
assert not ({r[0] for r in V} & {r[0] for r in L2}), "dubbel wijziging_id"
Vn = []
for r in V:
    n = list(r); n[iS] = "goedgekeurd"; n[iB] = besluit; Vn.append(n)
    assert [x for k, x in enumerate(n) if k not in (iS, iB)] == [x for k, x in enumerate(r) if k not in (iS, iB)]
iA, iO = kR.index("akkoord"), kR.index("opmerking")
assert all(r[iA] == "" for r in RV), "voorstel-review al ingevuld"
logidx = {r[0]: r for r in V}
io, inw = kL.index("oud"), kL.index("nieuw"); ro, rv = kR.index("oud"), kR.index("voorgesteld")
RVn = []
for r in RV:
    l = logidx[r[0]]; assert r[ro] == l[io] and r[rv] == l[inw], f"review ≠ log bij {r[0]}"
    n = list(r); n[iA] = "ja"; n[iO] = besluit + ", beslissing 1"; RVn.append(n)
with open(uitlog, "w", encoding="utf-8", newline="") as f:
    f.write("\t".join(kL) + "\n" + "".join("\t".join(r) + "\n" for r in L2 + Vn))
with open(uitrev, "w", encoding="utf-8", newline="") as f:
    f.write("\t".join(kR) + "\n" + "".join("\t".join(r) + "\n" for r in R2 + RVn))
# controle: de P2-delen zijn byte-gelijk aan de bron
for bron, uit, n in ((p2log, uitlog, len(L2)), (p2rev, uitrev, len(R2))):
    a = open(bron, encoding="utf-8").read().rstrip("\n").split("\n"); b = open(uit, encoding="utf-8").read().rstrip("\n").split("\n")
    assert a == b[:n + 1], f"P2-deel van {uit} niet byte-gelijk"
md5 = lambda p: hashlib.md5(open(p, "rb").read()).hexdigest()
print(f"log: {len(L2)} + {len(Vn)} = {len(L2) + len(Vn)} regels, alle goedgekeurd · md5 {md5(uitlog)}")
print(f"review: {len(R2)} + {len(RVn)} = {len(R2) + len(RVn)} regels · nieuw ja: {', '.join(r[0] for r in RVn)} · md5 {md5(uitrev)}")
