# app_naar_master.py — Maker-D (7D) · zet een app-export (30 kolommen) om naar het lijst-/masterformaat (B7 punt 4):
# zes kolommen niveau · week · item_id · categorie · bronlabel · tekst, met de B3-labels (Opdracht: Vraag: Opties: Correct:
# Feedback ✓: Feedback ✗:) en extra regels categorie `app:<kolom>` voor input_arabic, input_transliteration, input_translation_nl,
# points, media_production, exercise_type, review_flag. Sleutels: meerkeuze = de sleutel letterlijk; gatentekst/rangschikken =
# één regel per segment (split op |); koppelen = één regel per paar `links = rechts`; meerdere-antwoorden = één regel per
# correct_options-element. Telrapport per categorie. Gebruik: python3 -I app_naar_master.py <app_export.tsv> <uit_master.tsv> N1
# v1.1 (N1-W03, P1-18 en tegenrapport T P2 V5): een gedepubliceerd item krijgt een regel `app:is_published` met `false` (alleen bij false;
#   gepubliceerde items houden precies dezelfde regels als in v1.0).
import sys, csv, json, collections, hashlib
csv.field_size_limit(10**9)
exp, uit, niv = sys.argv[1], sys.argv[2], sys.argv[3]
rows = list(csv.DictReader(open(exp, encoding="utf-8", newline=""), delimiter="\t"))
rows.sort(key=lambda r: (int(r["week"]), int(r["display_order"] or 0), r["item_id"]))
def jl(s):
    try: return json.loads(s) if s else None
    except Exception: return None
out = []
def add(r, cat, label, tekst):
    out.append([niv, r["week"], r["item_id"], cat, label, tekst.replace("\t", " ").replace("\n", "\\n")])
for r in rows:
    typ = r["exercise_type"]; opts = jl(r["options"]) or []; co = jl(r["correct_options"]) or []
    if r["instruction_nl"]: add(r, "Opdracht / instructie", "Opdracht:", r["instruction_nl"])
    if r["question"]: add(r, "Vraag", "Vraag:", r["question"])
    for o in opts: add(r, "Antwoordoptie", "Opties:", o)
    ca = r["correct_answer"]
    if typ in ("gatentekst", "rangschikken") and ca:
        for seg in ca.split("|"): add(r, "Correct antwoord", "Correct:", seg)
    elif typ == "koppelen" and ca:
        for paar in ca.split("|"):
            l, _, rr = paar.partition("="); add(r, "Correct antwoord", "Correct:", f"{l} = {rr}")
    elif typ == "meerdere-antwoorden" and co:
        for c in co: add(r, "Correct antwoord", "Correct:", c)
    elif ca: add(r, "Correct antwoord", "Correct:", ca)
    if r["feedback_correct"]: add(r, "Feedback correct", "Feedback ✓:", r["feedback_correct"])
    if r["feedback_incorrect"]: add(r, "Feedback fout", "Feedback ✗:", r["feedback_incorrect"])
    for k in ("input_arabic", "input_transliteration", "input_translation_nl", "points", "media_production", "exercise_type", "review_flag"):
        if r[k] != "": add(r, f"app:{k}", f"app:{k}:", r[k])
    if r["is_published"] == "false": add(r, "app:is_published", "app:is_published:", "false")
with open(uit, "w", encoding="utf-8", newline="") as f:
    w = csv.writer(f, delimiter="\t", lineterminator="\n", quoting=csv.QUOTE_MINIMAL)  # C6 (tegenrapport T P2): velden die met " beginnen worden gequoot, zodat csv.DictReader ze letterlijk teruggeeft
    w.writerow(["niveau", "week", "item_id", "categorie", "bronlabel", "tekst"])
    for o in out: w.writerow(o)
c = collections.Counter(o[3] for o in out)
print("items", len(rows), "· regels", len(out), "· per categorie", dict(c))
print("md5", hashlib.md5(open(uit, "rb").read()).hexdigest())
