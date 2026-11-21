# valideer_structuur_N1-W02.py v1 — Controleur-T (8T) · P3 N1-W02 · VERVANGT DE SCHEMA-VALIDATIE NIET.
# Het officiële schema v1 (schema/hva-content.schema.json, md5 46150074…) en valideer_json.py (md5 0fa54dfe…) zitten in de
# macro-bundel, die niet in deze chat staat. Dit script toetst wat zonder dat schema wél kan:
#   1. structuur: exact dezelfde sleutels en types als maak_json_N1-W01.py v1 maakte (N1-W01.json valideerde in P3 W01 met 0 fouten);
#   2. waarden: exercise_type uit de live enum, dir = de afgeleide richting (regel van valideer_json.py), correct_options null of ≥ 1,
#      opties en media_production lijsten van tekst, punten ≥ 0, week/unit/item_id consistent;
#   3. inhoud: elk JSON-item = de rij in APP_NA (de bron van de SQL), veld voor veld; aantal items = lijst = APP_NA; master_regels = lijst.
# Gebruik: python3 -I valideer_structuur_N1-W02.py <json> <APP_NA.tsv> <LEESBARE_LIJST.tsv> <schema-metadata.json>
import sys, json, csv, re, collections
csv.field_size_limit(10**9)
J = json.load(open(sys.argv[1], encoding="utf-8")); NA = {r["item_id"]: r for r in csv.DictReader(open(sys.argv[2], encoding="utf-8", newline=""), delimiter="\t")}
LIJST = collections.Counter(r["item_id"] for r in csv.DictReader(open(sys.argv[3], encoding="utf-8", newline=""), delimiter="\t"))
META = json.load(open(sys.argv[4], encoding="utf-8"))["rows"][0]
ENUM = set(next(e["waarden"] for e in META["enums"] if e["type"] == "curriculum_exercise_type"))
fouten = []
def f(x): fouten.append(x)
TOP = {"schema_versie": str, "niveau": str, "week": int, "unit_code": str, "bron": dict, "gegenereerd_op": str, "items": list}
BRON = {"bestand": str, "md5": str, "regels": int, "items": int, "wijzigingslog": str, "log_range": str}
ITEM = {"item_id": str, "unit_code": str, "week": int, "skill": str, "exercise_type": str, "exercise_subtype": str, "display_order": int,
        "instruction_nl": str, "question": str, "options": list, "correct_answer": str, "correct_options": (list, type(None)), "feedback_correct": str,
        "feedback_incorrect": str, "input_arabic": str, "input_transliteration": str, "input_translation_nl": str, "reference_media": str,
        "media_production": list, "points": int, "review_flag": str, "strict_tashkeel": bool, "is_published": bool, "dir": dict, "log_refs": list, "master_regels": int}
DIRV = ["instruction_nl", "question", "options", "correct_answer", "feedback_correct", "feedback_incorrect", "input_arabic", "input_transliteration", "input_translation_nl"]
AR = re.compile(r"[؀-ۿ]"); LAT = re.compile(r"[A-Za-z]")
def richting(s): a, l = bool(AR.search(s or "")), bool(LAT.search(s or "")); return "mixed" if a and l else "rtl" if a else "ltr"
if list(J) != list(TOP): f(f"topniveau-sleutels {list(J)}")
for k, t in TOP.items():
    if not isinstance(J.get(k), t) or isinstance(J.get(k), bool) and t is int: f(f"topniveau {k}: type")
if list(J["bron"]) != list(BRON): f(f"bron-sleutels {list(J['bron'])}")
for k, t in BRON.items():
    if not isinstance(J["bron"].get(k), t): f(f"bron.{k}: type")
wk = J["week"]
if J["schema_versie"] != "1.0" or J["unit_code"] != f"U{wk}": f("schema_versie of unit_code")
ids = [it.get("item_id") for it in J["items"]]
if len(ids) != len(set(ids)): f("dubbele item_id")
if set(ids) != set(NA) or set(ids) != set(LIJST): f(f"items JSON {len(ids)} · APP_NA {len(NA)} · lijst {len(LIJST)} niet dezelfde set")
if J["bron"]["items"] != len(LIJST) or J["bron"]["regels"] != sum(LIJST.values()): f("bron.items/regels ≠ lijst")
for it in J["items"]:
    i = it.get("item_id", "?")
    if list(it) != list(ITEM): f(f"{i}: sleutels/volgorde {list(it)}")
    for k, t in ITEM.items():
        v = it.get(k)
        if not isinstance(v, t) or (isinstance(v, bool) and t is int): f(f"{i}.{k}: type {type(v).__name__}")
    if not re.fullmatch(rf"U{wk}-[a-z]+(-\d+)*", i): f(f"{i}: item_id-patroon")
    if it["week"] != wk or it["unit_code"] != f"U{wk}": f(f"{i}: week/unit")
    if it["exercise_type"] not in ENUM: f(f"{i}: exercise_type {it['exercise_type']} niet in de live enum")
    if it["correct_options"] is not None and (len(it["correct_options"]) < 1 or not all(isinstance(x, str) for x in it["correct_options"])): f(f"{i}: correct_options")
    if not all(isinstance(x, str) and x for x in it["options"]): f(f"{i}: opties niet allemaal niet-lege tekst")
    if not all(isinstance(x, str) and x for x in it["media_production"]): f(f"{i}: media_production")
    if it["points"] < 0: f(f"{i}: punten < 0")
    if list(it["dir"]) != DIRV: f(f"{i}: dir-sleutels")
    for k in DIRV:
        verw = richting(" ".join(it["options"])) if k == "options" else richting(it[k])
        if it["dir"].get(k) != verw: f(f"{i}: dir.{k} = {it['dir'].get(k)} ≠ {verw}")
    if it["master_regels"] != LIJST[i]: f(f"{i}: master_regels {it['master_regels']} ≠ lijst {LIJST[i]}")
    r = NA.get(i)
    if r:  # inhoud = APP_NA (de bron van de SQL)
        for k in ["unit_code", "skill", "exercise_type", "exercise_subtype", "instruction_nl", "question", "correct_answer", "feedback_correct", "feedback_incorrect",
                  "input_arabic", "input_transliteration", "input_translation_nl", "reference_media", "review_flag"]:
            if it[k] != r[k]: f(f"{i}.{k} ≠ APP_NA")
        if it["options"] != (json.loads(r["options"]) if r["options"] else []): f(f"{i}.options ≠ APP_NA")
        co = json.loads(r["correct_options"]) if r["correct_options"] else None
        if it["correct_options"] != (None if co == [] else co): f(f"{i}.correct_options ≠ APP_NA")
        if it["media_production"] != json.loads(r["media_production"]) or it["points"] != int(r["points"]) or it["display_order"] != int(r["display_order"]): f(f"{i}: media/punten/volgorde ≠ APP_NA")
        if it["strict_tashkeel"] != (r["strict_tashkeel"] == "true") or it["is_published"] != (r["is_published"] == "true"): f(f"{i}: booleans ≠ APP_NA")
print(f"items {len(ids)} · structuurfouten {len(fouten)} · exercise_type-enum (live): {len(ENUM)} waarden · per type {dict(collections.Counter(it['exercise_type'] for it in J['items']))}")
for x in fouten[:50]: print("  !", x)
print("LET OP: dit is geen validatie tegen schema v1 (schema en validator niet beschikbaar in deze chat).")
sys.exit(1 if fouten else 0)
