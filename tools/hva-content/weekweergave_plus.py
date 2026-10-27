# Weekweergave PLUS v1.1 (stap 0) — besluit B7 (PM-N1, 2026-10-17): de app is bron nr. 1, de leesbare lijst nr. 2.
# Toont per item eerst de app-inhoud in het format van handboek §3.5, daarna wat de lijst (TSV/master) extra heeft
# of anders heeft: "(lijst)" = alleen in de lijst, "(lijst, wijkt af)" = beide gevuld, inhoud verschilt.
# Items die alleen in de lijst staan (bv. comp) worden na de app-items getoond met de markering "⚠ niet in de app".
# Gebruik: python3 -I weekweergave_plus.py <tsv-of-master> <app_export.tsv> N1 1
import sys, csv, collections, json, re
csv.field_size_limit(10**9)
pad, apppad, niv, wk = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
VOLG = ["luisteren","lezen","spreken","schrijven","grammatica","cultuur","reflectie","comp"]
ICON = {"luisteren":"🎧","lezen":"📖","spreken":"🗣️","schrijven":"✍️","grammatica":"🧩","cultuur":"🌍","reflectie":"🪞","comp":"👥"}
CAT = {"Opdracht / instructie":"Opdracht","Vraag":"Vraag","Antwoordoptie":"Opties","Antwoordoptie / element":"Opties",
       "Correct antwoord":"✔ Antwoord","Antwoordsleutel":"✔ Antwoord","Feedback correct":"Feedback ✓",
       "Feedback fout":"Feedback ✗","Feedback fout / criteria":"Feedback ✗"}
NORM = re.compile(r"[^a-zء-ي]")
def norm(s): return NORM.sub("", (s or "").lower())
def jl(s):
    try: return json.loads(s) if s else None
    except Exception: return None
def vaard(iid):
    v = iid.split("-")[1]
    return "comp" if v.startswith("comp") else v
def opties_txt(lst): return " · ".join(f"{chr(65+i)}) {w}" for i, w in enumerate(lst))
# lijst (TSV/master)
tsv = collections.OrderedDict(); regels = 0
with open(pad, encoding="utf-8", newline="") as f:
    for r in csv.DictReader(f, delimiter="\t"):
        if r["niveau"] == niv and r["week"] == wk:
            regels += 1
            tsv.setdefault(r["item_id"], collections.OrderedDict()).setdefault(CAT.get(r["categorie"], r["categorie"]), []).append(r["tekst"])
# app
app = collections.OrderedDict()
with open(apppad, encoding="utf-8", newline="") as f:
    rows = [r for r in csv.DictReader(f, delimiter="\t") if r["week"] == wk]
rows.sort(key=lambda r: (int(r["display_order"] or 0), r["item_id"]))
for r in rows: app[r["item_id"]] = r
alle_ids = list(app) + [i for i in tsv if i not in app]
groep = collections.OrderedDict((v, []) for v in VOLG)
for iid in alle_ids: groep.setdefault(vaard(iid), []).append(iid)
print(f"## {niv}-W{int(wk):02d} · app: {len(app)} items · lijst: {len(tsv)} items / {regels} regels · samen: {len(alle_ids)} items\n")
print("| Vaardigheid | Items (app) | Items (alleen lijst) |\n|---|---|---|")
for v, lst in groep.items():
    if lst: print(f"| {ICON.get(v,'•')} {v} | {sum(1 for i in lst if i in app)} | {sum(1 for i in lst if i not in app)} |")
for v, lst in groep.items():
    if not lst: continue
    print(f"\n### {ICON.get(v,'•')} {v.capitalize()} ({len(lst)} {'item' if len(lst)==1 else 'items'})")
    for iid in lst:
        print(f"\n#### {iid}")
        t = tsv.get(iid, {})
        a = app.get(iid)
        if not a:
            for naam, waarden in t.items():
                print(f"- **{naam} (lijst):** {opties_txt(waarden) if naam == 'Opties' else ' / '.join(waarden)}")
            print("- ⚠ niet in de app"); continue
        opts = jl(a["options"]) or []; co = jl(a["correct_options"]); mp = jl(a["media_production"]) or []
        # 1. app-inhoud (bron nr. 1)
        if a["instruction_nl"]: print(f"- **Opdracht:** {a['instruction_nl']}")
        if a["question"]: print(f"- **Vraag:** {a['question']}")
        if opts: print(f"- **Opties:** {opties_txt(opts)}")
        if a["correct_answer"]: print(f"- **✔ Antwoord:** {a['correct_answer']}")
        if co: print(f"- **✔ Meerdere juist:** {' · '.join(co)}")
        if a["feedback_correct"]: print(f"- **Feedback ✓:** {a['feedback_correct']}")
        if a["feedback_incorrect"]: print(f"- **Feedback ✗:** {a['feedback_incorrect']}")
        if a["input_arabic"]: print(f"- **Arabisch:** {a['input_arabic']}")
        if a["input_transliteration"]: print(f"- **Transliteratie:** {a['input_transliteration']}")
        if a["input_translation_nl"]: print(f"- **Vertaling:** {a['input_translation_nl']}")
        print(f"- **App:** type {a['exercise_type']} · {a['points']} pt · media {', '.join(mp) if mp else 'geen'} · {'gepubliceerd' if a['is_published']=='true' else 'CONCEPT'}" + (f" · vlag: {a['review_flag']}" if a["review_flag"].strip() else ""))
        gesloten = a["exercise_type"] in ("meerkeuze", "meerdere-antwoorden", "rangschikken", "koppelen", "gatentekst")
        if gesloten and not opts and a["exercise_type"] != "gatentekst": print("- ⚠ geen opties in de app")
        if gesloten and not a["correct_answer"] and not co: print("- ⚠ geen sleutel in de app")
        # 2. lijst (bron nr. 2): alleen wat ontbreekt of afwijkt
        for naam, kol in [("Opdracht", "instruction_nl"), ("Vraag", "question"), ("✔ Antwoord", "correct_answer"), ("Feedback ✓", "feedback_correct"), ("Feedback ✗", "feedback_incorrect")]:
            lt = " / ".join(t.get(naam, []))
            if lt and not a[kol]: print(f"- **{naam} (lijst):** {lt}")
            elif lt and a[kol] and norm(lt) != norm(a[kol]): print(f"- **{naam} (lijst, wijkt af):** {lt}")
        lo = t.get("Opties", [])
        if lo and not opts: print(f"- **Opties (lijst):** {opties_txt(lo)}")
        elif lo and opts and norm("".join(lo)) != norm("".join(opts)): print(f"- **Opties (lijst, wijkt af):** {opties_txt(lo)}")
        if "✔ Koppelparen" in t: print(f"- **✔ Koppelparen (lijst):** {' / '.join(t['✔ Koppelparen'])}")
print(f"\n▶ P0 INHOUD {niv}-W{int(wk):02d}\n- Typ \"P0 akkoord\" → de rollen beginnen.\n- Of stel wijzigingen voor (item_id + wat je wilt) → die worden eerst verwerkt.")
