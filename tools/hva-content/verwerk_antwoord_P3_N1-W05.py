# verwerk_antwoord_P3_N1-W05.py v1.0 — Regisseur-D (1D) · P3 N1-W05 · 2026-10-27 · verwerkt «P3 akkoord volledig ja» (p3/antwoord/antwoord_P3_Ibra.txt)
# = alle aanbevelingen van P3_poortrapport_N1-W05.md: delta v1.1 (34 regels) → goedgekeurd met besluit_ibra «P3 akkoord (P3)»; review van de delta
# (24 × 2a, 1 × 2b W0727 ghālī) → akkoord ja; beide achter het P2-log (711) en de P2-review (345) in na_p3/. Eenmalig: weigert als het log al > 711 regels heeft.
# Gebruik (vanuit de werkmap): python3 -I scripts/verwerk_antwoord_P3_N1-W05.py
import hashlib
assert open("p3/antwoord/antwoord_P3_Ibra.txt", encoding="utf-8").read().strip() == "P3 akkoord volledig ja"
B = "P3 akkoord (P3)"
log = [l.rstrip("\n").split("\t") for l in open("na_p3/N1-W05_wijzigingslog_P3.tsv", encoding="utf-8")]
kop = log[0]; K = {c: i for i, c in enumerate(kop)}
assert len(log) - 1 == 711 and all(r[K["status"]] == "goedgekeurd" for r in log[1:]), "log is niet de P2-stand (711 goedgekeurd): al verwerkt?"
d = [l.rstrip("\n").split("\t") for l in open("p3/delta/N1-W05_delta_P3.tsv", encoding="utf-8")]
assert d[0] == kop and len(d) - 1 == 34
for r in d[1:]:
    assert r[K["status"]] == "voorgesteld" and r[K["besluit_ibra"]] == ""
    r[K["status"]] = "goedgekeurd"; r[K["besluit_ibra"]] = B
with open("na_p3/N1-W05_wijzigingslog_P3.tsv", "a", encoding="utf-8") as f:
    for r in d[1:]: f.write("\t".join(r) + "\n")
rv = [l.rstrip("\n").split("\t") for l in open("na_p3/review_native_N1-W05_P3.tsv", encoding="utf-8")]
RK = {c: i for i, c in enumerate(rv[0])}
dv = [l.rstrip("\n").split("\t") for l in open("p3/delta/review_delta_P3_N1-W05.tsv", encoding="utf-8")]
assert dv[0] == rv[0] and len(dv) - 1 == 25
for r in dv[1:]:
    assert r[RK["akkoord"]] == ""
    r[RK["akkoord"]] = "ja"
    if r[RK["deel"]].startswith("2b"): r[RK["opmerking"]] = "P3 akkoord (P3): ghālī (aanbeveling). " + r[RK["opmerking"]]
with open("na_p3/review_native_N1-W05_P3.tsv", "a", encoding="utf-8") as f:
    for r in dv[1:]: f.write("\t".join(r) + "\n")
for p in ("na_p3/N1-W05_wijzigingslog_P3.tsv", "na_p3/review_native_N1-W05_P3.tsv"):
    print(p, sum(1 for _ in open(p)) - 1, hashlib.md5(open(p, "rb").read()).hexdigest())
