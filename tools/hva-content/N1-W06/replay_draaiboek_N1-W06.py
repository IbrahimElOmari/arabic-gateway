# replay_draaiboek_N1-W06.py v1.2.1 (volgorde «Vooraf» van draaiboek v3.3.1) · v1.2 (8T C-T18: vanuit een UITGEPAKTE PROEFBUNDEL, met de eigen scripts van de bundel, de controle- en mkdir-opdracht
#   uit «Vooraf» van het draaiboek en zonder zelf mappen aan te maken; de export in het formaat van de echte `SELECT *` van query_database:
#   alle 34 kolommen, jsonb als lijst, tijden als tekst in UTC) · v1.1 (ook de terugvalroute export_hash) · v1.0 — Controleur-T (8T) / Maker-T ·
# P4-gereedschap N1-W06 · speelt het P4-DRAAIBOEK zelf (niet de replicatest) rij voor rij af op de replica: precies de bestanden en de volgorde uit
# de tabel van p4/P4_DRAAIBOEK_N1-W06_variant_<V>.md, met de werkwijze «2 + 1 per blok» (voorcontrole → bestand → ruwe uitvoer in een bestand →
# p4_log_stap --uit), de handstap `variant` zoals in rij 1, en de rooktestrij overgeslagen. Daarna, zoals «Na de laatste aanroep»:
# p4/export_N1_naP4.sql → herbouw_master_N1-W06.py, en de terugvalroute export_hash → export_hash tsv → herbouw_master; beide masters = voorspelling.
# Replica: dezelfde opbouw als replica_test_N1-W06.py v4.1.2 (PostgreSQL 16 lokaal, schema_replica_v2 + replica_policies + export N1 met de
# back-ups van W06/W05/W04). Raakt de live database niet. Schrijft in de werkmap alleen het rapport (en tijdelijk het manifest van de proefbundel).
# Gebruik: python3 -I replay_draaiboek_N1-W06.py <werkmap> A|B   (REPLAY_PORT=5436 standaard) → exit 0 = ✓
import sys, os, json, subprocess, unicodedata, csv, re, shutil, hashlib, time, zipfile, io
WM = os.path.abspath(sys.argv[1]); VAR = sys.argv[2]; assert VAR in ("A", "B")
ROOT = "p3/sql" if VAR == "A" else "p3/sql_B"; R = WM + "/p3/replica"
PGBIN = "/usr/lib/postgresql/16/bin"; DATA = R + "/pgdata"; SOCK = R + "/sock"; PORT = os.environ.get("REPLAY_PORT", "5436")
BASIS_DB = "/home/claude/hva_w06"   # zoals in het draaiboek; in de replay vervangen door de uitgepakte proefbundel
sh = lambda c, **k: subprocess.run(c, shell=True, capture_output=True, text=True, **k)
md5 = lambda p: hashlib.md5(open(p, "rb").read()).hexdigest()
# --- 1. proefbundel maken en in een lege map uitpakken (= wat de P4-chat krijgt) ---
TB = "/home/claude/replay_bundel_" + VAR; ZIP = "/home/claude/replay_bundel_" + VAR + ".zip"
shutil.rmtree(TB, ignore_errors=True); os.makedirs(TB)
mb = sh(f"python3 -I {WM}/scripts/maak_bundel_N1-W06.py maak {WM} {ZIP} --naam P4bundel"); assert mb.returncode == 0, mb.stdout + mb.stderr
MANMD5 = md5(WM + "/MANIFEST_N1-W06_P4bundel.tsv")
with zipfile.ZipFile(ZIP) as z: z.extractall(TB)
os.remove(ZIP)
DBK = open(f"{TB}/p4/P4_DRAAIBOEK_N1-W06_variant_{VAR}.md", encoding="utf-8").read()
# --- 2. «Vooraf» van het draaiboek: de controle-opdracht en de mkdir-opdracht letterlijk, met de map van de proefbundel ---
vo = DBK.split("## Vooraf (vóór regel 1)")[1].split("## Werkwijze")[0]
ctrl = re.search(r"Dan de controle: `([^`]+)`", vo).group(1).replace("<md5 van MANIFEST_N1-W06_P4bundel.tsv uit de startprompt>", MANMD5).replace(BASIS_DB, TB)
mkd = re.search(r"Eerst, buiten het log: `([^`]+)`", vo).group(1).replace(BASIS_DB, TB)
c2 = sh(mkd); c1 = sh(ctrl)   # v1.2.1: de volgorde van het draaiboek v3.3.1 (eerst mkdir, dan de controle)
vooraf = f"mkdir exit {c2.returncode} · controle exit {c1.returncode} ({(c1.stdout + c1.stderr).strip().splitlines()[0][:160] if (c1.stdout + c1.stderr).strip() else ''})"
print("vooraf: " + vooraf)
if c1.returncode != 0 or c2.returncode != 0: sys.exit(2)
# --- 3. replica: stand vóór P4 (uit de bestanden van de bundel) ---
EXPCOLS = ["item_id","unit_code","week","skill","exercise_type","exercise_subtype","display_order","instruction_nl","question","options","correct_answer","correct_options","feedback_correct","feedback_incorrect","input_arabic","input_transliteration","input_translation_nl","reference_media","media_production","media_url","media_alt","audio_url","image_url","points","review_flag","is_published","strict_tashkeel","id","created_at","updated_at"]
NN = ["exercise_subtype","instruction_nl","question","correct_answer","feedback_correct","feedback_incorrect","input_arabic","input_transliteration","input_translation_nl","reference_media","review_flag"]
rd = lambda p: list(csv.DictReader(open(p, encoding="utf-8", newline=""), delimiter="\t"))
E = rd(TB + "/bron/APP_EXPORT_N1_2026-10-27_naP4.tsv"); BK = {}
for p in ("APP_BACKUP_N1-W06_2026-10-27.tsv", "APP_BACKUP_N1-W05_2026-10-27_P3.tsv", "APP_BACKUP_N1-W04_2026-10-27_P3.tsv"): BK.update({r["item_id"]: r for r in rd(TB + "/bron/" + p)})
START = "/home/claude/replay_start_" + VAR + ".tsv"
with open(START, "w", encoding="utf-8", newline="") as f:
    wr = csv.writer(f, delimiter="\t", lineterminator="\n", quoting=csv.QUOTE_MINIMAL); wr.writerow(EXPCOLS)
    for r in E: wr.writerow([BK.get(r["item_id"], r)[k] for k in EXPCOLS])
if not os.path.exists(DATA + "/PG_VERSION"):
    os.makedirs(SOCK, exist_ok=True); shutil.chown(R, "claude"); shutil.chown(SOCK, "claude")
    assert sh(f"runuser -u claude -- {PGBIN}/initdb -D {DATA} -A trust -U postgres -E UTF8 --locale=C.UTF-8").returncode == 0
if sh(f"runuser -u claude -- {PGBIN}/pg_ctl -D {DATA} status").returncode != 0:
    assert sh(f"runuser -u claude -- {PGBIN}/pg_ctl -D {DATA} -o '-p {PORT} -k {SOCK} -c listen_addresses=' -l {R}/pg.log -w start").returncode == 0
PSQL = f"psql -X -q -h {SOCK} -p {PORT} -U postgres -v ON_ERROR_STOP=1 -At"
SCHEMA = open(TB + "/p3/replica_schema/schema_replica_v2.sql", encoding="utf-8").read().replace("INSERT INTO public.curriculum_units (code) VALUES ('U1'), ('U2');", "")
UNITS = "INSERT INTO public.curriculum_units (code) SELECT DISTINCT u FROM (VALUES " + ", ".join(f"('{u}')" for u in sorted({r["unit_code"] for r in E})) + ") x(u) ON CONFLICT DO NOTHING;\n"
POL = open(TB + "/scripts/replica_policies_N1-W06.sql", encoding="utf-8").read()
for q_ in ("DROP DATABASE IF EXISTS replay;", "CREATE DATABASE replay;"): assert sh(f'{PSQL} -d postgres -c "{q_}"').returncode == 0
x = subprocess.run(f"{PSQL} -d replay -f -", shell=True, input=SCHEMA + UNITS + POL, capture_output=True, text=True); assert x.returncode == 0, x.stderr
x = sh(f"""{PSQL} -d replay -c "\\copy public.curriculum_items ({', '.join(EXPCOLS)}) FROM '{START}' WITH (FORMAT csv, DELIMITER E'\\t', HEADER true, FORCE_NOT_NULL ({', '.join(NN)}))" """); assert x.returncode == 0, x.stderr
x = sh(f"""{PSQL} -d replay -c "INSERT INTO auth.users (id, last_sign_in_at) VALUES ('00000000-0000-0000-0000-0000000000c1', now() - interval '60 days');" """); assert x.returncode == 0, x.stderr
os.remove(START)
def ruw(sql):   # zoals query_database bij een stap: één JSON-object {"rows": [...]} van de laatste SELECT; fout = de foutmelding
    assert unicodedata.normalize("NFC", sql) == sql
    r = subprocess.run(f"psql -X -q -h {SOCK} -p {PORT} -U postgres -v ON_ERROR_STOP=1 --csv -d replay -f -", shell=True, input=sql, capture_output=True, text=True)
    if r.returncode != 0: return "ERROR: " + r.stderr.strip()[:300]
    rec = [z for z in csv.reader(io.StringIO(r.stdout)) if z]
    return json.dumps({"rows": [dict(zip(rec[-2], rec[-1]))]}, ensure_ascii=False)
def schrijf_ruw(pad, tekst):   # = de heredoc: geen mkdir; bestaat de map niet, dan faalt dit zoals `cat >` (8T C-T17)
    with open(pad, "w", encoding="utf-8") as f: f.write(tekst + "\n")
ENV = {k: v for k, v in os.environ.items() if k not in ("P4LOG", "P4SQL", "P4BASIS")}; ENV.update({"P4BASIS": TB, "P4SQL": ROOT})
def logstap(wie, blok, stap, best, *rest):
    p = subprocess.run(["python3", "-I", TB + "/scripts/p4_log_stap_N1-W06.py", wie, blok, stap, best, *rest], capture_output=True, text=True, env=ENV)
    return p.returncode, (p.stdout + p.stderr).strip()
# --- 4. de rijen van het draaiboek ---
RIJ = re.compile(r"^\| (\d+|—) \| ([^|]+) \| `([^`]+)` \| `?([^|`]+)`? \| (.+)$")
rijen = []
for l in DBK.split("\n"):
    m = RIJ.match(l)
    if m and m.group(1) != "—":
        cel = l.split(" | ")[4]; pad = re.match(r"`([^`]+)`", cel).group(1) if cel.startswith("`") else "-"
        rijen.append((int(m.group(1)), m.group(2).strip(), m.group(3), m.group(4).strip(), pad, cel))
assert [r[0] for r in rijen] == list(range(1, len(rijen) + 1)), "rijnummers niet doorlopend"
fout = []; t0 = time.time()
for nr, wie, blok, stap, pad, cel in rijen:
    w = "maker-t" if wie.startswith("Maker") else "regisseur"
    if pad == "-":   # handstap (variant; bij A eerst c7_voorcontrole met een uitkomst in de vaste vorm)
        args = ["--variant", VAR, "--akkoord-ibra", "4b" if VAR == "B" else "PR #8 akkoord"] if stap == "variant" else []
        c7 = "ok: url=https://replica.invalid sha=244de3e item=U6-lezen-06 open✓ indienen✓ opnieuw✓ volgende✓ desktop✓ gsm✓"
        rc, out = logstap(w, blok, stap, "-", c7 if stap == "c7_voorcontrole" else "", *args)
        if rc != 0: fout.append((nr, stap, out[:200]))
        continue
    assert md5(TB + "/" + pad) == re.search(r"`([0-9a-f]{32})`", cel).group(1), f"rij {nr}: md5 van {pad} ≠ draaiboek"
    rc, out = logstap(w, blok, stap, pad, "--voor")
    if rc != 0: fout.append((nr, stap + " voorcontrole", out[:200])); break
    f_ = f"{TB}/p4/uitvoering/ruw/{nr:02d}_{blok}_{stap}.json"
    try: schrijf_ruw(f_, ruw(open(TB + "/" + pad, encoding="utf-8").read()))
    except Exception as e: fout.append((nr, stap + " heredoc", repr(e)[:200])); break
    rc, out = logstap(w, blok, stap, pad, "--uit", f_)
    if rc != 0: fout.append((nr, stap, out[:300])); break
st = subprocess.run(["python3", "-I", TB + "/scripts/p4_status_N1-W06.py"], capture_output=True, text=True, env=ENV).stdout.strip()
print(f"draaiboek {VAR}: {len(rijen)} rijen afgespeeld in {time.time() - t0:.0f} s · fouten {len(fout)}" + "".join(f"\n  ✗ rij {a}: {b}: {c}" for a, b, c in fout))
print("status: " + st)
# --- 5. na de laatste aanroep: export (formaat van de echte SELECT *) → herbouw_master ---
ok = not fout; h = e2 = h2 = None; gelijk = False
if ok:
    EXP = open(TB + "/p4/export_N1_naP4.sql", encoding="utf-8").read()
    assert "SET LOCAL TimeZone = 'UTC';" in EXP
    sel = re.search(r"SELECT \* FROM public\.curriculum_items WHERE (.+?) ORDER BY (.+?);", EXP)
    q = (f"SET TimeZone = 'UTC'; SELECT coalesce(jsonb_agg(to_jsonb(t) || jsonb_build_object('created_at', t.created_at::text, 'updated_at', t.updated_at::text) "
         f"ORDER BY {', '.join('t.' + c.strip() for c in sel.group(2).split(','))}), '[]') FROM (SELECT * FROM public.curriculum_items WHERE {sel.group(1)}) t;")
    r = subprocess.run(f"{PSQL} -d replay -f -", shell=True, input=q, capture_output=True, text=True); assert r.returncode == 0, r.stderr
    rows = json.loads(r.stdout.strip().split("\n")[-1]); assert len(rows[0]) == 34 and isinstance(rows[0]["options"], list), "niet het formaat van de echte SELECT *"
    EJ = TB + "/p4/export/ruw_export_N1_naP4.json"; schrijf_ruw(EJ, json.dumps({"rows": rows}, ensure_ascii=False))
    h = subprocess.run(["python3", "-I", TB + "/scripts/herbouw_master_N1-W06.py", TB, EJ, TB + "/p4/master_na", "--sql", ROOT], capture_output=True, text=True)
    print("herbouw_master: " + (h.stdout + h.stderr).strip().replace("\n", " ⏎ "))
    ok = h.returncode == 0 and "MASTER = VOORSPELLING ✓" in h.stdout
    # terugvalroute (export_hash): de databank rekent, de uitvoer is ASCII; moet dezelfde export en dezelfde master geven
    hj = TB + "/p4/export/ruw_export_hash_N1_naP4.json"; schrijf_ruw(hj, ruw(open(TB + "/p4/export_hash_N1_naP4.sql", encoding="utf-8").read()))
    ht = TB + "/p4/export/APP_EXPORT_N1_naP4_via_hash.tsv"
    e2 = subprocess.run(["python3", "-I", TB + "/scripts/export_hash_N1-W06.py", "tsv", TB, hj, ht], capture_output=True, text=True)
    h2 = subprocess.run(["python3", "-I", TB + "/scripts/herbouw_master_N1-W06.py", TB, ht, TB + "/p4/master_na_hash", "--sql", ROOT], capture_output=True, text=True)
    exp1 = TB + "/p4/master_na/APP_EXPORT_N1_naP4_N1-W06.tsv"
    gelijk = os.path.exists(ht) and os.path.exists(exp1) and md5(ht) == md5(exp1)
    print("terugvalroute: " + (e2.stdout + e2.stderr).strip().replace("\n", " ⏎ ") + " ⏎ " + (h2.stdout + h2.stderr).strip().replace("\n", " ⏎ ") + f" ⏎ export via hash = export via JSON: {gelijk}")
    ok = ok and e2.returncode == 0 and h2.returncode == 0 and "MASTER = VOORSPELLING ✓" in h2.stdout and gelijk
fmt = lambda p: (p.stdout + p.stderr).strip().replace(chr(10), " ⏎ ") if p else "—"
RAP = [f"# Replay van het P4-draaiboek · N1-W06 · variant {VAR} · {'GROEN' if ok else 'ROOD'}",
       f"Gemaakt door `scripts/replay_draaiboek_N1-W06.py` v1.2.1 op de replica (PostgreSQL 16 lokaal; stand vóór P4 = export N1 `0083dcac…` met de back-ups van W06/W05/W04), **vanuit een uitgepakte proefbundel** (`maak_bundel` → zip → lege map; manifest van de proefbundel `{MANMD5}`), met de scripts uit die bundel. Draaiboek `p4/P4_DRAAIBOEK_N1-W06_variant_{VAR}.md` `{md5(TB + f'/p4/P4_DRAAIBOEK_N1-W06_variant_{VAR}.md')}` · `p4_log_stap` `{md5(TB + '/scripts/p4_log_stap_N1-W06.py')}` · `p4_stap` `{md5(TB + '/scripts/p4_stap_N1-W06.py')}` · `herbouw_master` `{md5(TB + '/scripts/herbouw_master_N1-W06.py')}` · `export_hash` `{md5(TB + '/scripts/export_hash_N1-W06.py')}`.", "",
       f"- **Vooraf (de opdrachten uit het draaiboek):** {vooraf}.",
       f"- **Rijen:** {len(rijen)} afgespeeld (de rooktestrij overgeslagen), elk met voorcontrole, de ruwe uitvoer in `p4/uitvoering/ruw/` (zonder dat de replay de map aanmaakt) en `--uit`; fouten {len(fout)}" + "".join(f"; rij {a} {b}: {c}" for a, b, c in fout) + ".",
       f"- **Status na de laatste rij:** {st}",
       f"- **Export (formaat van de echte `SELECT *`: 34 kolommen, jsonb als lijst, tijden als tekst in UTC) → herbouw_master:** {fmt(h)}",
       f"- **Terugvalroute (export_hash):** {fmt(e2)} ⏎ {fmt(h2)} ⏎ export via hash byte-gelijk aan de export via JSON: {gelijk}", "",
       "Wat dit niet bewijst: de live tool (afkappen, plakbeurten, FOR SHARE onder echte last), het schermgedrag (rooktest) en de activiteit van echte leerders."]
open(f"{R}/REPLAY_DRAAIBOEK_N1-W06_{VAR}.md", "w", encoding="utf-8").write("\n".join(RAP) + "\n")
shutil.rmtree(TB, ignore_errors=True)
sh(f"runuser -u claude -- {PGBIN}/pg_ctl -D {DATA} stop")   # de replicaserver na afloop stoppen (geen socket in de werkmap)
sys.exit(0 if ok else 2)
