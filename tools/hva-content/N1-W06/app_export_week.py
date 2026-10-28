# Zet het opgeslagen resultaat van één Lovable query_database-SELECT (JSON met "rows") om naar het app-export-TSV-formaat
# dat weekweergave_plus.py leest. Wijzigt niets in de app. Jsonb-kolommen (options, correct_options, media_production)
# komen als JSON-tekst; booleans worden 'true'/'false'; None wordt leeg.
# Gebruik: python3 -I app_export_week.py <resultaat.json> <uitvoer.tsv>
import sys, json, csv, hashlib, collections
bron, uit = sys.argv[1], sys.argv[2]
j = json.load(open(bron, encoding="utf-8")); rows = j["rows"] if isinstance(j, dict) else j
cols = ["item_id","unit_code","week","skill","exercise_type","exercise_subtype","display_order","instruction_nl","question","options","correct_answer","correct_options","feedback_correct","feedback_incorrect","input_arabic","input_transliteration","input_translation_nl","reference_media","media_production","media_url","media_alt","audio_url","image_url","points","review_flag","is_published","strict_tashkeel","id","created_at","updated_at"]
def cel(v):
    if v is None: return ""
    if isinstance(v, bool): return "true" if v else "false"
    if isinstance(v, (list, dict)): return json.dumps(v, ensure_ascii=False)
    return str(v)
rows.sort(key=lambda r: (int(r.get("week") or 0), int(r.get("display_order") or 0), r.get("item_id") or ""))
with open(uit, "w", encoding="utf-8", newline="") as fh:
    w = csv.writer(fh, delimiter="\t", lineterminator="\n", quoting=csv.QUOTE_MINIMAL)
    w.writerow(cols)
    for r in rows: w.writerow([cel(r.get(c)) for c in cols])
ids = [r["item_id"] for r in rows]
print("rijen", len(rows), "· unieke item_id", len(set(ids)), "· per week", dict(sorted(collections.Counter(int(r["week"]) for r in rows).items())))
print("md5", hashlib.md5(open(uit, "rb").read()).hexdigest())
