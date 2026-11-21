# maak_json_N1-W02.py v1.1 — Maker-T (7T) · P3 N1-W02 · = maak_json_N1-W01.py v1 (zelfde uitvoerstructuur, schema v1) met drie
# aanpassingen: (1) `gegenereerd_op` komt uit een argument (deterministisch: twee runs = bit-gelijk); (2) de kolommen van het log
# worden op naam gelezen, niet op positie; (3) `log_range` telt alleen de logregels van deze week (het W02-log bevat ook de
# W01-nazorg). dir per veld = afgeleid uit de tekst (ltr/rtl/mixed, zelfde regel als valideer_json.py); correct_options '[]' → null.
# Gebruik: python3 -I maak_json_N1-W02.py <APP_NA.tsv> <wijzigingslog.tsv> <LEESBARE_LIJST.tsv> N1 2 <uit.json> <gegenereerd_op ISO>
import sys, csv, json, re, hashlib, collections
csv.field_size_limit(10**9)
na, logpad, lijst, niv, wk, uit, tijd = sys.argv[1:8]
rows = [r for r in csv.DictReader(open(na, encoding="utf-8", newline=""), delimiter="\t") if r["week"] == wk]
rows.sort(key=lambda r: (int(r["display_order"]), r["item_id"]))
L = [l.rstrip("\n").split("\t") for l in open(logpad, encoding="utf-8")]; K = {c: i for i, c in enumerate(L[0])}
log = [r for r in L[1:] if r[K["item_id"]].startswith(f"U{wk}-")]
refs = collections.defaultdict(list)
for r in log:
    if r[K["status"]] in ("goedgekeurd", "aangepast"): refs[r[K["item_id"]]].append(r[K["wijziging_id"]])
lijstregels = collections.Counter(r["item_id"] for r in csv.DictReader(open(lijst, encoding="utf-8", newline=""), delimiter="\t"))
AR = re.compile(r"[؀-ۿ]"); LAT = re.compile(r"[A-Za-z]")
def richting(s):
    a, l = bool(AR.search(s or "")), bool(LAT.search(s or ""))
    return "mixed" if a and l else "rtl" if a else "ltr"
VELDEN = ["instruction_nl", "question", "correct_answer", "feedback_correct", "feedback_incorrect", "input_arabic", "input_transliteration", "input_translation_nl"]
items = []
for r in rows:
    opts = json.loads(r["options"]) if r["options"] else []
    co = json.loads(r["correct_options"]) if r["correct_options"] else None
    if co == []: co = None
    it = {"item_id": r["item_id"], "unit_code": r["unit_code"], "week": int(r["week"]), "skill": r["skill"], "exercise_type": r["exercise_type"],
          "exercise_subtype": r["exercise_subtype"], "display_order": int(r["display_order"])}
    for v in VELDEN[:2]: it[v] = r[v]
    it["options"] = opts; it["correct_answer"] = r["correct_answer"]; it["correct_options"] = co
    for v in VELDEN[3:]: it[v] = r[v]
    it.update({"reference_media": r["reference_media"], "media_production": json.loads(r["media_production"]), "points": int(r["points"]),
               "review_flag": r["review_flag"], "strict_tashkeel": r["strict_tashkeel"] == "true", "is_published": r["is_published"] == "true"})
    d = {v: richting(r[v]) for v in VELDEN}; d["options"] = richting(" ".join(opts))
    it["dir"] = {k: d[k] for k in ["instruction_nl", "question", "options", "correct_answer", "feedback_correct", "feedback_incorrect", "input_arabic", "input_transliteration", "input_translation_nl"]}
    it["log_refs"] = refs.get(r["item_id"], []); it["master_regels"] = lijstregels[r["item_id"]]
    items.append(it)
ids = [x[K["wijziging_id"]] for x in log]
doc = {"schema_versie": "1.0", "niveau": niv, "week": int(wk), "unit_code": f"U{int(wk)}",
       "bron": {"bestand": lijst.split("/")[-1], "md5": hashlib.md5(open(lijst, "rb").read()).hexdigest(), "regels": sum(lijstregels.values()), "items": len(lijstregels),
                "wijzigingslog": logpad.split("/")[-1], "log_range": f"{min(ids)}–{max(ids)} ({len(ids)} regels)"},
       "gegenereerd_op": tijd, "items": items}
json.dump(doc, open(uit, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("items", len(items), "· log_refs", sum(len(x["log_refs"]) for x in items), "· md5", hashlib.md5(open(uit, "rb").read()).hexdigest())
