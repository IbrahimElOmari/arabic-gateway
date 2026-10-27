# Telt een weekexport (TSV): per vaardigheid, type, publicatie, vlaggen, subitemreeksen, punten, media.
# Gebruik: python3 -I tel_export.py <export.tsv>
import sys, csv, json, collections, re
csv.field_size_limit(10**9)
rows = list(csv.DictReader(open(sys.argv[1], encoding="utf-8", newline=""), delimiter="\t"))
def vaard(i): return i.split("-")[1]
print("rijen", len(rows))
print("vaardigheid", dict(collections.Counter(vaard(r["item_id"]) for r in rows)))
print("type", dict(collections.Counter(r["exercise_type"] for r in rows)))
print("gepubliceerd", sum(r["is_published"] == "true" for r in rows))
vl = [r for r in rows if r["review_flag"].strip()]
print("review_flag", len(vl), "· CONTROLEER/ONTBREEKT", sum(1 for r in vl if "CONTROLEER" in r["review_flag"] or "ONTBREEKT" in r["review_flag"]))
reeks = collections.defaultdict(list)
for r in rows:
    m = re.match(r"^(U\d+-[a-z]+-\d+)-\d+$", r["item_id"])
    if m: reeks[m.group(1)].append(r["item_id"])
print("subitemreeksen", len(reeks), "items", sum(len(v) for v in reeks.values()))
print("punten", sum(int(r["points"] or 0) for r in rows))
mp = collections.Counter()
for r in rows:
    try: l = json.loads(r["media_production"]) if r["media_production"] else []
    except Exception: l = []
    if not l: mp["geen"] += 1
    for x in l: mp[x] += 1
print("media_production", dict(mp))
print("strict", sum(r["strict_tashkeel"] == "true" for r in rows), "· units", set(r["unit_code"] for r in rows), "· laatste updated_at", max(r["updated_at"] for r in rows))
