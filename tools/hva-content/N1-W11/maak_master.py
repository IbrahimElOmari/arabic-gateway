# maak_master.py — Maker-T · B7 punt 4/5 · LEESBARE_LIJST_MASTER.tsv = N1 uit de app-export (app_naar_master.py, incl. app:<kolom>-regels)
# + N1-comp-items uit de TSV (niet in de app; letterlijk, achteraan hun week) + N2 letterlijk uit de TSV (N2 staat nog niet in de app).
# Gebruik: python3 -I maak_master.py <n1_uit_app.tsv> <TSV_bron> <uit_master.tsv>
import sys, csv, collections, hashlib
csv.field_size_limit(10**9)
rd = lambda p: list(csv.DictReader(open(p, encoding="utf-8", newline=""), delimiter="\t"))
app, tsv = rd(sys.argv[1]), rd(sys.argv[2])
appids = {r["item_id"] for r in app}
comp = [r for r in tsv if r["niveau"] == "N1" and r["item_id"] not in appids]
n2 = [r for r in tsv if r["niveau"] == "N2"]
perweek = collections.OrderedDict()
for r in app: perweek.setdefault(int(r["week"]), []).append(r)
for r in comp: perweek.setdefault(int(r["week"]), []).append(r)
out = [r for w in sorted(perweek) for r in perweek[w]] + n2
K = ["niveau", "week", "item_id", "categorie", "bronlabel", "tekst"]
with open(sys.argv[3], "w", encoding="utf-8", newline="") as f:
    w = csv.writer(f, delimiter="\t", lineterminator="\n", quoting=csv.QUOTE_MINIMAL); w.writerow(K)
    for r in out: w.writerow([r[k] for k in K])
it = lambda rs: len({(r["niveau"], r["item_id"]) for r in rs})
print(f"N1 app: {len(app)} regels / {it(app)} items · N1 comp (TSV): {len(comp)} regels / {it(comp)} items · N2 (TSV): {len(n2)} regels / {it(n2)} items")
print(f"MASTER: {len(out)} regels / {it(out)} items · md5 {hashlib.md5(open(sys.argv[3],'rb').read()).hexdigest()}")
