# export_hash_N1-W11.py v1.4 (= export_hash_N1-W10.py v1.3, md5 e3eab49238a77b0c32cf94ef08a5537a, voor W11) — Maker-T (7T) · P3 N1-W11: bron = de N1-export van stap 0
#   P3 (bron/APP_EXPORT_N1_2026-11-21.tsv, 4d2cffa5…); HW = 11 (de port van W10 had nog HW = 9: 8T-bevinding, alleen in de tekst van de export-SQL gebruikt).
# export_hash_N1-W10.py v1.3 (= export_hash_N1-W07.py v1.2, md5 7abed7ef5c4af67cd65c2080e923c01a, voor W08 · 7T P3 N1-W08): bron = de export na P4 W07 (18251ce4…, 2.323 rijen);
#   het verwachte aantal gewijzigde rijen komt uit de items.txt («gewijzigd») van de blokken van de SQL-root (`--sql`; met W07n 111 = W08 92 + W07 16 + W05 1 + W04 2,
#   zonder W07n 95); de voorspelde export uit de mastermap van die root (p3/master, p3/master_zonder_W07n). NIEUW: modus `export` schrijft ook de gewone export
#   (export_N1_naP4.sql, READ ONLY, alle kolommen van W01–W25, tijden in UTC) — in W07 een los bestand.
# Basis v1.2/v1.1/v1.0: TERUGVALROUTE voor de verse export na P4 (tekst die inline uit de tool komt en via de chat op schijf gaat, wordt NFC-genormaliseerd). Gebruik deze route alleen als
# de tool de export NIET als bestand teruggeeft. De databank rekent zelf, alleen lezen: per week de vingerafdruk over ALLE 30 kolommen (count|md5 over item_id|md5(30 kolommen))
# en een ASCII-lijst `item_id,id,created_at,updated_at` van de rijen die na de VOOR-export veranderden. Dit script vult daarmee de voorspelde export aan en schrijft de
# export-TSV ALLEEN als de vingerafdruk van elke week (W01–W25) dan gelijk is aan die van de databank. Daarna gewoon herbouw_master met die TSV.
# Gebruik:  python3 -I export_hash_N1-W10.py sql <werkmap> <uit.sql> [--sql <root>]               → export_hash_N1_naP4.sql (READ ONLY)
#           python3 -I export_hash_N1-W10.py export <uit.sql>                                    → export_N1_naP4.sql (READ ONLY)
#           python3 -I export_hash_N1-W10.py tsv <werkmap> <ruwe_uitvoer.json> <uit.tsv> [--sql <root>] → exit 0 = TSV geschreven; exit 2 = STOP (geen TSV)
import sys, os, csv, json, hashlib, re
csv.field_size_limit(10**9)
COLS = ["item_id","unit_code","week","skill","exercise_type","exercise_subtype","display_order","instruction_nl","question","options","correct_answer","correct_options","feedback_correct","feedback_incorrect","input_arabic","input_transliteration","input_translation_nl","reference_media","media_production","media_url","media_alt","audio_url","image_url","points","review_flag","is_published","strict_tashkeel","id","created_at","updated_at"]
WEKEN = list(range(1, 26)); HW = 11; WKN = lambda w: f"N1-W{w:02d}"
BRON = "bron/APP_EXPORT_N1_2026-11-21.tsv"; BRON_MD5 = "4d2cffa52d76b257a5e32d27f089c455"   # 8T-bron: de N1-export van stap 0 P3 N1-W11
md5 = lambda b: hashlib.md5(b).hexdigest()
def lees(p): return list(csv.DictReader(open(p, encoding="utf-8", newline=""), delimiter="\t"))
def stop(m): print("STOP: " + m); sys.exit(2)
def week_vinger(rows):
    ids = sorted(rows, key=lambda r: r["item_id"].encode("utf-8"))
    if not ids: return "0|"
    return f"{len(ids)}|" + md5("\n".join(r["item_id"] + "|" + md5("|".join(r[c] for c in COLS).encode("utf-8")) for r in ids).encode("utf-8"))
a = sys.argv[1:]
SQLR = a[a.index("--sql") + 1] if "--sql" in a else "p3/sql"
if "--sql" in a: i_ = a.index("--sql"); del a[i_:i_ + 2]
MDIR = "p3/master" + os.path.normpath(SQLR)[len("p3/sql"):]
def gewijzigd(wm):   # (aantal, per week) uit de items.txt van de blokken van de root
    n = {}
    for l in list(open(f"{wm}/{SQLR}/BLOKKEN_MANIFEST.tsv", encoding="utf-8"))[1:]:
        c = l.rstrip("\n").split("\t")
        for x in open(f"{wm}/{SQLR}/{c[3]}/items.txt", encoding="utf-8"):
            i, s = x.rstrip("\n").split("\t")
            if s == "gewijzigd": n.setdefault(c[1], set()).add(i)
    return sum(len(v) for v in n.values()), {k: len(v) for k, v in n.items()}
if a[0] == "export":
    sql = (f"-- export_N1_naP4 · READ ONLY · P4 {WKN(HW)} (na de rooktest en de tweede slot + zicht_na) · alle kolommen van W01–W25 (2.323 rijen verwacht; tijden in UTC, 8T C-T25) → het bestand van de tool byte voor byte (cp) → scripts/herbouw_master_{WKN(HW)}.py\n"
           "BEGIN TRANSACTION READ ONLY;\nSET LOCAL TimeZone = 'UTC';\nSELECT * FROM public.curriculum_items WHERE week BETWEEN 1 AND 25 ORDER BY week, display_order, item_id;\nROLLBACK;\n")
    open(a[1], "w", encoding="utf-8").write(sql); print(f"{a[1]}: {len(sql.encode())} bytes · md5 {md5(sql.encode())}"); sys.exit(0)
if a[0] == "sql":
    WM, UIT = a[1], a[2]
    E = lees(f"{WM}/{BRON}"); assert md5(open(f"{WM}/{BRON}", "rb").read()) == BRON_MD5
    grens = max(r["updated_at"] for r in E); ng, pw = gewijzigd(WM)
    h = "md5(concat_ws('|', " + ", ".join(f"coalesce({c}::text,'')" for c in COLS) + "))"
    wk = ",\n  ".join(f"(SELECT count(*)::text || '|' || coalesce(md5(string_agg(item_id || '|' || {h}, E'\\n' ORDER BY item_id COLLATE \"C\")), '') FROM public.curriculum_items WHERE week = {w}) AS w{w:02d}" for w in WEKEN)
    sql = (f"-- export_hash_N1_naP4 · READ ONLY · P4 {WKN(HW)} · SQL-root {SQLR} · terugvalroute voor de verse export (scripts/export_hash_{WKN(HW)}.py v1.3): per week de vingerafdruk over\n"
           f"-- alle 30 kolommen en de ASCII-lijst van de rijen met updated_at na de VOOR-export ({grens}). Verwacht: rijen {len(E)}, gewijzigd {ng} (" + " + ".join(f"{k[-3:]} {v}" for k, v in pw.items()) + "; geen nieuwe).\n"
           "BEGIN TRANSACTION READ ONLY;\nSET LOCAL TimeZone = 'UTC';\nSELECT\n  (SELECT count(*) FROM public.curriculum_items WHERE week BETWEEN 1 AND 25)::text AS rijen,\n  " + wk + ",\n"
           f"  (SELECT count(*) FROM public.curriculum_items WHERE week BETWEEN 1 AND 25 AND updated_at > '{grens}'::timestamptz)::text AS n_gewijzigd,\n"
           f"  (SELECT coalesce(string_agg(item_id || ',' || id::text || ',' || created_at::text || ',' || updated_at::text, ';' ORDER BY item_id COLLATE \"C\"), '') FROM public.curriculum_items WHERE week BETWEEN 1 AND 25 AND updated_at > '{grens}'::timestamptz) AS gewijzigd;\n"
           "ROLLBACK;\n")
    open(UIT, "w", encoding="utf-8").write(sql); print(f"{UIT}: {len(sql.encode())} bytes · md5 {md5(sql.encode())} · grens {grens} · gewijzigd verwacht {ng}"); sys.exit(0)
if a[0] == "tsv":
    WM, RUW, UIT = a[1], a[2], a[3]
    V = lees(f"{WM}/{MDIR}/n1_voorspeld.tsv")
    vm = re.search(r"`n1_voorspeld\.tsv` md5 `([0-9a-f]{32})`", open(f"{WM}/{MDIR}/MASTER_VOORSPELLING_{WKN(HW)}.md", encoding="utf-8").read())
    if not vm or md5(open(f"{WM}/{MDIR}/n1_voorspeld.tsv", "rb").read()) != vm.group(1): stop(f"n1_voorspeld.tsv ≠ de md5 in MASTER_VOORSPELLING_{WKN(HW)}.md")
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
        if r["id"] == "": stop(f"{i}: de voorspelling heeft een rij zonder id (geen nieuwe rijen deze week)")
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
    print(f"export via de databank-vingerafdruk: {len(V)} rijen · {len(lijst)} gewijzigde rijen uit de databank · 25/25 weken gelijk over 30 kolommen · {UIT} md5 {md5(open(UIT, 'rb').read())} → nu herbouw_master_{WKN(HW)}.py met deze TSV")
    sys.exit(0)
sys.exit("gebruik: sql <werkmap> <uit.sql> [--sql root] | export <uit.sql> | tsv <werkmap> <ruw.json> <uit.tsv> [--sql root]")
