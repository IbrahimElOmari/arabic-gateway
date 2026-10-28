#!/usr/bin/env python3
# herbouw_master_N1-W06.py v1.2.1 (8T C-T27: tijden met hun tijdzone vergeleken) · v1.2 (8T C-T21: nieuwe rijen met een geldige uuid, created_at na de export van P4 W05 en updated_at na created_at; de
#   ruwe JSON moet alle 30 kolommen hebben; --sql moet de variant van de mastervoorspelling zijn; een lege export = STOP) · v1.1 — Maker-T · P4 N1-W06 (na de rooktest) · = herbouw_master_N1-W05.py v1.0 met NIEUWE RIJEN (architectuur T v1.1 §7, 8T P3 C-T10):
# van de verse export (ruwe JSON van query_database, p4/export_N1_naP4.sql) naar de nieuwe LEESBARE_LIJST_MASTER.tsv, met twee poorten:
#   (1) EXPORTCONTROLE: de verse export moet in alle 30 kolommen gelijk zijn aan de voorspelde export p4/master/n1_voorspeld.tsv
#       (voorspel_master_N1-W06.py v2.2), behalve:
#       - `updated_at` in de BESTAANDE rijen die P4 raakt (uit de items.txt van de updateblokken: «gewijzigd»);
#       - `id`, `created_at` en `updated_at` van de NIEUWE rijen (uit de items.txt van de insertblokken: «nieuw»); die zijn in de voorspelling
#         leeg en moeten in de export gevuld zijn; `created_at` is per insertblok één tijd (één statement).
#       Elk ander verschil, een rij te veel of te weinig = STOP (geen master). Geen vaste 2.299: rijen = voorspelling (2.323).
#   (2) MASTERCONTROLE: app_naar_master v1.1 → master_rest_uit_master (comp + N2 uit de huidige master c32981b9…) → maak_master
#       → md5 = p4/master/VOORSPELDE_MD5.txt. Anders = STOP (geen master; het verschil naar Ibra).
# Schrijft alleen in <uitmap>. Raakt de database niet.
# Gebruik: python3 -I herbouw_master_N1-W06.py <werkmap> <ruwe_export.json | export.tsv> <uitmap> [--sql p3/sql_B]
import sys, os, csv, json, subprocess, hashlib, collections, re
csv.field_size_limit(10**9)
WM, BRON, UIT = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2]), os.path.abspath(sys.argv[3]); os.makedirs(UIT, exist_ok=True)
SQLR = sys.argv[sys.argv.index("--sql") + 1] if "--sql" in sys.argv else "p3/sql_B"
S = os.path.join(WM, "scripts"); md5 = lambda p: hashlib.md5(open(p, "rb").read()).hexdigest()
VOORSPELD_EXPORT = f"{WM}/p4/master/n1_voorspeld.tsv"; MASTER = f"{WM}/bron/LEESBARE_LIJST_MASTER_c32981b9.tsv"
VOORSPELD_MASTER_MD5 = open(f"{WM}/p4/master/VOORSPELDE_MD5.txt").read().strip()
import re   # v1.1: de voorspelde export is gebonden aan de md5 die voorspel_master v2.2 zelf in MASTER_VOORSPELLING_N1-W06.md schreef (nooit met de hand)
_vm = re.search(r"`n1_voorspeld\.tsv` md5 `([0-9a-f]{32})`", open(f"{WM}/p4/master/MASTER_VOORSPELLING_N1-W06.md", encoding="utf-8").read())
assert _vm and md5(VOORSPELD_EXPORT) == _vm.group(1), "p4/master/n1_voorspeld.tsv ≠ de md5 in MASTER_VOORSPELLING_N1-W06.md"
assert md5(f"{WM}/p4/master/LEESBARE_LIJST_MASTER_voorspeld.tsv") == VOORSPELD_MASTER_MD5, "VOORSPELDE_MD5.txt ≠ de voorspelde master"
assert md5(MASTER) == "c32981b9ebfb08f201d53e9609da0112", "huidige master wijkt af van c32981b9…"
run = lambda *a: subprocess.run(["python3", "-I", *a], capture_output=True, text=True, check=True).stdout
def stop(m): print("STOP: " + m); sys.exit(2)
import datetime
VAR_VM = re.search(r"variant ([AB])", open(f"{WM}/p4/master/MASTER_VOORSPELLING_N1-W06.md", encoding="utf-8").readline()).group(1)
VAR_SQL = json.load(open(f"{WM}/{SQLR}/slot_verwacht_N1-W06.json", encoding="utf-8")).get("variant")
if VAR_SQL != VAR_VM: stop(f"--sql {SQLR} is variant {VAR_SQL}, de mastervoorspelling is variant {VAR_VM}")
KOL30 = ["item_id","unit_code","week","skill","exercise_type","exercise_subtype","display_order","instruction_nl","question","options","correct_answer","correct_options","feedback_correct","feedback_incorrect","input_arabic","input_transliteration","input_translation_nl","reference_media","media_production","media_url","media_alt","audio_url","image_url","points","review_flag","is_published","strict_tashkeel","id","created_at","updated_at"]
GRENS = "2026-10-27 09:23:04.487035+00"   # grootste updated_at van de export na P4 W05 (0083dcac…): een nieuwe rij is van daarna
def tijd(t):   # v1.2.1 (8T C-T28→C-T27): de tijdzone behouden (Python 3.11+ leest «+00» en «+01» zelf)
    try:
        d = datetime.datetime.fromisoformat(t); return d if d.tzinfo else None
    except Exception: return None
exp = f"{UIT}/APP_EXPORT_N1_naP4_N1-W06.tsv"
if BRON.endswith(".json"):
    try:
        _j = json.load(open(BRON, encoding="utf-8")); _r = _j["rows"] if isinstance(_j, dict) else _j
    except Exception as e: stop(f"ruwe JSON niet leesbaar: {e}")
    if not _r: stop("lege export (0 rijen)")
    _mis = sorted({k for r in _r for k in KOL30 if k not in r})
    if _mis: stop(f"de ruwe JSON mist kolommen: {_mis}")
    print(run(f"{S}/app_export_week.py", BRON, exp).strip().splitlines()[-1]); print(f"ruwe JSON md5 {md5(BRON)}")
else: open(exp, "wb").write(open(BRON, "rb").read())
rd = lambda p: list(csv.DictReader(open(p, encoding="utf-8", newline=""), delimiter="\t"))
E, V = rd(exp), rd(VOORSPELD_EXPORT)
if not E: stop("lege export (0 rijen)")
if list(E[0].keys()) != list(V[0].keys()): stop("andere kolommen dan de voorspelde export")
ev, vv = {r["item_id"]: r for r in E}, {r["item_id"]: r for r in V}
if set(ev) != set(vv) or len(E) != len(V): stop(f"andere rijen: export {len(E)} · voorspeld {len(V)} · alleen in export {sorted(set(ev) - set(vv))[:5]} · alleen voorspeld {sorted(set(vv) - set(ev))[:5]}")
GERAAKT, NIEUW = set(), {}
for l in list(open(f"{WM}/{SQLR}/BLOKKEN_MANIFEST.tsv", encoding="utf-8"))[1:]:
    c = l.rstrip("\n").split("\t"); mp = c[3]
    for x in open(f"{WM}/{SQLR}/{mp}/items.txt", encoding="utf-8"):
        i, s = x.rstrip("\n").split("\t")
        if s == "nieuw": NIEUW[i] = c[2]
        elif s == "gewijzigd": GERAAKT.add(i)
GERAAKT -= set(NIEUW)
if any(vv[i]["id"] or vv[i]["created_at"] or vv[i]["updated_at"] for i in NIEUW): stop("de voorspelling heeft id/created_at/updated_at voor een nieuwe rij")
upd = collections.Counter(); onverwacht = []; verschil = collections.Counter(); ca = collections.defaultdict(set)
for i in NIEUW:   # v1.1 (eigen test «leeg_id»): leeg = gelijk aan de voorspelling en viel daardoor door de vergelijking hieronder
    for k in ("id", "created_at", "updated_at"):
        if not ev[i][k]: onverwacht.append((i, k + " leeg")); verschil[(i.split("-")[0], k + " leeg")] += 1
    # v1.2 (8T C-T21): een echte uuid, created_at na de export van P4 W05, updated_at na created_at (elke nieuwe rij wordt in een later updateblok gepubliceerd)
    if ev[i]["id"] and not re.fullmatch(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", ev[i]["id"]): onverwacht.append((i, "id geen uuid")); verschil[(i.split("-")[0], "id geen uuid")] += 1
    ca_, ua_, gr_ = tijd(ev[i]["created_at"]), tijd(ev[i]["updated_at"]), tijd(GRENS)
    if ev[i]["created_at"] and (ca_ is None or ca_ <= gr_): onverwacht.append((i, "created_at niet na P4 W05")); verschil[(i.split("-")[0], "created_at niet na P4 W05")] += 1
    if ev[i]["updated_at"] and (ua_ is None or ca_ is None or ua_ <= ca_): onverwacht.append((i, "updated_at niet na created_at")); verschil[(i.split("-")[0], "updated_at niet na created_at")] += 1
if len({ev[i]["id"] for i in NIEUW}) != len(NIEUW) or {ev[i]["id"] for i in NIEUW} & {r["id"] for r in V if r["id"]}: onverwacht.append(("(nieuw)", "dubbele id")); verschil[("nieuw", "dubbele id")] += 1
for i, r in ev.items():
    for k in r:
        if r[k] == vv[i][k]: continue
        if i in NIEUW and k in ("id", "created_at", "updated_at"):
            if not r[k]: onverwacht.append((i, k + " leeg"))
            if k == "created_at": ca[NIEUW[i]].add(r[k])
            continue
        if k == "updated_at" and i in GERAAKT: upd[i.split("-")[0]] += 1; continue
        onverwacht.append((i, k)); verschil[(i.split("-")[0], k)] += 1
print(f"exportcontrole: {len(E)} rijen · nieuwe rijen {len(NIEUW)} (id/created_at/updated_at gevuld; created_at per insertblok: {dict((b, len(v)) for b, v in ca.items())}) · updated_at nieuw in {sum(upd.values())} geraakte bestaande rijen ({dict(sorted(upd.items()))}; verwacht {len(GERAAKT)}) · andere verschillen {len(onverwacht)}")
if onverwacht: stop(f"de verse export wijkt af van de voorspelling: {dict(verschil)} (eerste: {onverwacht[:5]}) → geen master, verschil naar Ibra")
if any(len(v) != 1 for v in ca.values()): stop("een insertblok heeft rijen met verschillende created_at (niet één statement?)")
if sum(upd.values()) != len(GERAAKT): print(f"LET OP: updated_at nieuw in {sum(upd.values())} van de {len(GERAAKT)} geraakte rijen (een rij die P4 niet echt veranderde, houdt zijn updated_at)")
run(f"{S}/app_naar_master.py", exp, f"{UIT}/n1_lijst.tsv", "N1")
run(f"{S}/master_rest_uit_master.py", MASTER, f"{UIT}/n1_lijst.tsv", f"{UIT}/rest.tsv")
run(f"{S}/maak_master.py", f"{UIT}/n1_lijst.tsv", f"{UIT}/rest.tsv", f"{UIT}/LEESBARE_LIJST_MASTER.tsv")
m = md5(f"{UIT}/LEESBARE_LIJST_MASTER.tsv"); n = sum(1 for _ in open(f"{UIT}/LEESBARE_LIJST_MASTER.tsv", encoding="utf-8"))
print(f"master: md5 {m} · {n} regels (met kop) · {os.path.getsize(f'{UIT}/LEESBARE_LIJST_MASTER.tsv')} bytes · export md5 {md5(exp)}")
if m != VOORSPELD_MASTER_MD5: stop(f"master {m} ≠ voorspelling {VOORSPELD_MASTER_MD5} → geen master, verschil naar Ibra")
print("MASTER = VOORSPELLING ✓")
