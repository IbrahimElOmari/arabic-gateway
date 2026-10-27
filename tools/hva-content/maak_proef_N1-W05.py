# maak_proef_N1-W05.py — 4T · simulatie van "P2 akkoord": elke logregel goedgekeurd, elke reviewregel ja. Alleen voor de proef-apply op kopieën.
# Gebruik: python3 -I maak_proef_N1-W05.py <log.tsv> <review.tsv> <log_proef.tsv> <review_proef.tsv>
import sys
log, rev, lu, ru = sys.argv[1:5]
for src, dst, kol, waarde in ((log, lu, "status", "goedgekeurd"), (rev, ru, "akkoord", "ja")):
    rows = [l.rstrip("\n").split("\t") for l in open(src, encoding="utf-8")]
    k = rows[0].index(kol); b = rows[0].index("besluit_ibra") if "besluit_ibra" in rows[0] else None
    with open(dst, "w", encoding="utf-8") as f:
        f.write("\t".join(rows[0]) + "\n")
        for r in rows[1:]:
            r[k] = waarde
            if b is not None: r[b] = "PROEF (simulatie P2)"
            f.write("\t".join(r) + "\n")
print("proef:", lu, ru)
