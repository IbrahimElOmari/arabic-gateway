# master_rest_uit_master.py — Maker-T · N1-W02 · haalt uit een bestaande LEESBARE_LIJST_MASTER.tsv de rijen die NIET uit de app komen
# (N1-comp-items + N2), letterlijk en in dezelfde volgorde, als vervanger van de TSV-bron voor maak_master.py.
# Waarom: maak_master.py neemt uit de TSV alleen N1-items die niet in de app staan (comp) en N2; die rijen staan letterlijk in de master.
# Herbouwtest: maak_master.py <n1_uit_app.tsv> <rest.tsv> <uit.tsv> moet de master byte-gelijk teruggeven.
# Gebruik: python3 -I master_rest_uit_master.py <master.tsv> <n1_uit_app.tsv> <uit_rest.tsv>
import sys, csv, hashlib, collections
csv.field_size_limit(10**9)
rd = lambda p: list(csv.DictReader(open(p, encoding="utf-8", newline=""), delimiter="\t"))
master, app = rd(sys.argv[1]), rd(sys.argv[2])
appids = {r["item_id"] for r in app}
rest = [r for r in master if not (r["niveau"] == "N1" and r["item_id"] in appids)]
K = ["niveau", "week", "item_id", "categorie", "bronlabel", "tekst"]
with open(sys.argv[3], "w", encoding="utf-8", newline="") as f:
    w = csv.writer(f, delimiter="\t", lineterminator="\n", quoting=csv.QUOTE_MINIMAL); w.writerow(K)
    for r in rest: w.writerow([r[k] for k in K])
c = collections.Counter(r["niveau"] for r in rest)
print(f"master {len(master)} regels · uit de app {len(master) - len(rest)} · rest {len(rest)} (N1-comp {c['N1']} · N2 {c['N2']}) · items rest {len({(r['niveau'], r['item_id']) for r in rest})}")
print("md5 rest", hashlib.md5(open(sys.argv[3], "rb").read()).hexdigest())
