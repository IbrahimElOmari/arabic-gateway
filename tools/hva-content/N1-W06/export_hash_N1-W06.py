# export_hash_N1-W06.py v1.1 (8T C-T25: ontbrekende sleutels in de ruwe uitvoer = STOP, exit 2) · v1.0 — Maker-T · P4 N1-W06 · TERUGVALROUTE voor de verse export na P4 (stap 0 N1-W06, T-aandachtspunt: tekst die inline uit
# de tool komt en via de chat op schijf gaat, wordt NFC-genormaliseerd; 33 velden van W06 zijn in de databank niet-NFC). Gebruik deze route alleen als
# de tool de export van 2.323 rijen NIET als bestand teruggeeft (dan is de heredoc-kopie niet byte-gelijk en weigert herbouw_master terecht).
# De databank rekent zelf, alleen lezen: per week de vingerafdruk over ALLE 30 kolommen (count|md5 over item_id|md5(30 kolommen), zoals stap 0b)
# en een ASCII-lijst `item_id,id,created_at,updated_at` van de rijen die na de export van P4 W05 veranderden of erbij kwamen (updated_at > de
# grootste updated_at van `0083dcac…`). Dit script vult daarmee de voorspelde export (p4/master/n1_voorspeld.tsv) aan en schrijft de export-TSV
# ALLEEN als de vingerafdruk van elke week (W01–W25) dan gelijk is aan die van de databank. Daarna gewoon herbouw_master met die TSV.
# Alles wat het bewijs draagt is ASCII (hex, uuid, tijd), dus de NFC-normalisatie van de chat kan het niet veranderen.
# Gebruik:  python3 -I export_hash_N1-W06.py sql <werkmap> <uit.sql>                 → p4/export_hash_N1_naP4.sql (READ ONLY)
#           python3 -I export_hash_N1-W06.py tsv <werkmap> <ruwe_uitvoer.json> <uit.tsv>  → exit 0 = TSV geschreven; exit 2 = STOP (geen TSV)
import sys, os, csv, json, hashlib, re
csv.field_size_limit(10**9)
COLS = ["item_id","unit_code","week","skill","exercise_type","exercise_subtype","display_order","instruction_nl","question","options","correct_answer","correct_options","feedback_correct","feedback_incorrect","input_arabic","input_transliteration","input_translation_nl","reference_media","media_production","media_url","media_alt","audio_url","image_url","points","review_flag","is_published","strict_tashkeel","id","created_at","updated_at"]
WEKEN = list(range(1, 26))
md5 = lambda b: hashlib.md5(b).hexdigest()
def lees(p): return list(csv.DictReader(open(p, encoding="utf-8", newline=""), delimiter="\t"))
def stop(m): print("STOP: " + m); sys.exit(2)
def week_vinger(rows):
    ids = sorted(rows, key=lambda r: r["item_id"].encode("utf-8"))
    if not ids: return "0|"
    return f"{len(ids)}|" + md5("\n".join(r["item_id"] + "|" + md5("|".join(r[c] for c in COLS).encode("utf-8")) for r in ids).encode("utf-8"))
a = sys.argv[1:]
if a[0] == "sql":
    WM, UIT = a[1], a[2]
    E = lees(f"{WM}/bron/APP_EXPORT_N1_2026-10-27_naP4.tsv"); assert md5(open(f"{WM}/bron/APP_EXPORT_N1_2026-10-27_naP4.tsv", "rb").read()) == "0083dcacf54795737249ca7df5aea08e"
    grens = max(r["updated_at"] for r in E)
    h = "md5(concat_ws('|', " + ", ".join(f"coalesce({c}::text,'')" for c in COLS) + "))"
    wk = ",\n  ".join(f"(SELECT count(*)::text || '|' || coalesce(md5(string_agg(item_id || '|' || {h}, E'\\n' ORDER BY item_id COLLATE \"C\")), '') FROM public.curriculum_items WHERE week = {w}) AS w{w:02d}" for w in WEKEN)
    sql = ("-- export_hash_N1_naP4 · READ ONLY · P4 N1-W06 · terugvalroute voor de verse export (scripts/export_hash_N1-W06.py v1.0): per week de vingerafdruk over\n"
           "-- alle 30 kolommen en de ASCII-lijst van de rijen met updated_at na de export van P4 W05 (" + grens + "). Verwacht: rijen 2323, gewijzigd 100 (24 nieuw + 76 geraakt).\n"
           "BEGIN TRANSACTION READ ONLY;\nSET LOCAL TimeZone = 'UTC';\nSELECT\n  (SELECT count(*) FROM public.curriculum_items WHERE week BETWEEN 1 AND 25)::text AS rijen,\n  " + wk + ",\n"
           f"  (SELECT count(*) FROM public.curriculum_items WHERE week BETWEEN 1 AND 25 AND updated_at > '{grens}'::timestamptz)::text AS n_gewijzigd,\n"
           f"  (SELECT coalesce(string_agg(item_id || ',' || id::text || ',' || created_at::text || ',' || updated_at::text, ';' ORDER BY item_id COLLATE \"C\"), '') FROM public.curriculum_items WHERE week BETWEEN 1 AND 25 AND updated_at > '{grens}'::timestamptz) AS gewijzigd;\n"
           "ROLLBACK;\n")
    open(UIT, "w", encoding="utf-8").write(sql); print(f"{UIT}: {len(sql.encode())} bytes · md5 {md5(sql.encode())} · grens {grens}"); sys.exit(0)
if a[0] == "tsv":
    WM, RUW, UIT = a[1], a[2], a[3]
    V = lees(f"{WM}/p4/master/n1_voorspeld.tsv")
    vm = re.search(r"`n1_voorspeld\.tsv` md5 `([0-9a-f]{32})`", open(f"{WM}/p4/master/MASTER_VOORSPELLING_N1-W06.md", encoding="utf-8").read())
    if not vm or md5(open(f"{WM}/p4/master/n1_voorspeld.tsv", "rb").read()) != vm.group(1): stop("n1_voorspeld.tsv ≠ de md5 in MASTER_VOORSPELLING_N1-W06.md")
    try:
        j = json.load(open(RUW, encoding="utf-8")); rows = j["rows"] if isinstance(j, dict) else j
        if len(rows) != 1: raise ValueError(f"{len(rows)} rijen in plaats van 1")
        d = {k: ("" if v is None else str(v)) for k, v in rows[0].items()}
    except Exception as e: stop(f"ruwe uitvoer niet bruikbaar: {e}")
    _mis = [k for k in ["rijen", "n_gewijzigd", "gewijzigd"] + [f"w{w:02d}" for w in WEKEN] if k not in d]
    if _mis: stop(f"de ruwe uitvoer mist kolommen: {_mis}")
    if d.get("rijen") != str(len(V)): stop(f"rijen in de databank {d.get('rijen')} ≠ voorspeld {len(V)}")
    lijst = [x.split(",") for x in d["gewijzigd"].split(";")] if d["gewijzigd"] else []
    if len(lijst) != int(d["n_gewijzigd"]) or any(len(x) != 4 for x in lijst): stop("de lijst van gewijzigde rijen is onvolledig of misvormd")
    if any(not re.fullmatch(r"[A-Za-z0-9-]+,[0-9a-f-]{36},[0-9:. +-]+,[0-9:. +-]+", ",".join(x)) for x in lijst): stop("de lijst bevat iets anders dan item_id, uuid en tijden")
    vv = {r["item_id"]: r for r in V}
    for i, id_, ca, ua in lijst:
        if i not in vv: stop(f"{i} staat in de databank maar niet in de voorspelling")
        r = vv[i]
        if r["id"] == "":   # nieuwe rij: id, created_at en updated_at komen uit de databank
            r["id"], r["created_at"], r["updated_at"] = id_, ca, ua
        else:
            if r["id"] != id_ or r["created_at"] != ca: stop(f"{i}: id of created_at van een bestaande rij veranderd")
            r["updated_at"] = ua
    leeg = [i for i, r in vv.items() if r["id"] == ""]
    if leeg: stop(f"{len(leeg)} nieuwe rijen zonder id uit de databank (eerste: {leeg[:3]})")
    fout = []
    for w in WEKEN:
        lok = week_vinger([r for r in V if r["week"] == str(w)])
        if lok != d[f"w{w:02d}"]: fout.append(f"W{w:02d} lokaal {lok} ≠ databank {d[f'w{w:02d}']}")
    if fout: stop("vingerafdruk over 30 kolommen ongelijk: " + " · ".join(fout[:5]) + " → geen export, Ibra (de databank wijkt af van de voorspelling)")
    with open(UIT, "w", encoding="utf-8", newline="") as f:
        wr = csv.writer(f, delimiter="\t", lineterminator="\n", quoting=csv.QUOTE_MINIMAL); wr.writerow(COLS)
        for r in V: wr.writerow([r[c] for c in COLS])
    print(f"export via de databank-vingerafdruk: {len(V)} rijen · {len(lijst)} gewijzigde of nieuwe rijen uit de databank · 25/25 weken gelijk over 30 kolommen · {UIT} md5 {md5(open(UIT, 'rb').read())} → nu herbouw_master_N1-W06.py met deze TSV")
    sys.exit(0)
sys.exit("gebruik: sql <werkmap> <uit.sql> | tsv <werkmap> <ruw.json> <uit.tsv>")
