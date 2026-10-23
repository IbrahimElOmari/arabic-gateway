# replica_test_N1-W03.py v3 — Controleur-T (8T) / Maker-T (7T) · P3 N1-W03 · architectuur T v1.1 §4 (P1-18: 9T V1, V2; tegenrapport T P2: V5).
# Basis: replica_test_N1-W02.py v2.2 (zelfde kern-tests), nu voor 7 blokken over drie weken, gestuurd door BLOKKEN_MANIFEST.tsv, en met
# p4_stap_N1-W03.py als scheidsrechter van elke uitkomst (zoals in P4).
# Replica = lokale PostgreSQL 16 met schema_replica_v2.sql (live metadata 2026-10-20; op 2026-10-23 opnieuw read-only vergeleken:
# deel2/schema_live_2026-10-23.json, test G0) + de back-ups VOOR van W03 (100), W02 (81) en W01 (21). Elk SQL-bestand wordt eerst
# NFC-genormaliseerd zoals de Lovable-tool doet, en moet daarbij byte-gelijk blijven.
# G0 schema · G1 leescontroles P3 (alles VOOR) · G2 P4-draaiboek 1 → 7 met p4_stap · G3 slottellingen · G4 terugdraaien 7 → 1 ·
# G5 negatieve tests (grendels, NFC/U&, enum, read-only, 4b, serialisatie, omhulde transactie, volgorde, manifest, toolfout).
# Gebruik: python3 -I replica_test_N1-W03.py <werkmap N1-W03> → p3/replica/REPLICA_RAPPORT_N1-W03.md, exit 1 bij ROOD
import sys, os, json, subprocess, unicodedata, hashlib, csv, re, shutil, time
WM = os.path.abspath(sys.argv[1]); P3 = WM + "/p3"; SQL = P3 + "/sql"; R = P3 + "/replica"; os.makedirs(R, exist_ok=True)
PGBIN = "/usr/lib/postgresql/16/bin"; DATA = R + "/pgdata"; SOCK = R + "/sock"; PORT = "5434"
SCHEMA_BRON = WM + "/p3/replica_schema/schema_replica_v2.sql"
SCHEMA = open(SCHEMA_BRON, encoding="utf-8").read().replace("VALUES ('U1'), ('U2');", "VALUES ('U1'), ('U2'), ('U3');")
assert "('U3')" in SCHEMA
VOOR = {3: WM + "/bron/APP_BACKUP_N1-W03_2026-10-20.tsv", 2: WM + "/bron/APP_BACKUP_N1-W02_2026-10-20_W03nazorg.tsv", 1: WM + "/bron/APP_BACKUP_N1-W01_2026-10-20_W03nazorg.tsv"}
EXPCOLS = ["item_id","unit_code","week","skill","exercise_type","exercise_subtype","display_order","instruction_nl","question","options","correct_answer","correct_options","feedback_correct","feedback_incorrect","input_arabic","input_transliteration","input_translation_nl","reference_media","media_production","media_url","media_alt","audio_url","image_url","points","review_flag","is_published","strict_tashkeel","id","created_at","updated_at"]
NN = ["exercise_subtype","instruction_nl","question","correct_answer","feedback_correct","feedback_incorrect","input_arabic","input_transliteration","input_translation_nl","reference_media","review_flag"]
M = [dict(zip(("volgorde", "week", "blok", "map", "md5_verwacht", "week_voor", "week_na"), l.rstrip("\n").split("\t"))) for l in list(open(SQL + "/BLOKKEN_MANIFEST.tsv", encoding="utf-8"))[1:]]
WEEKNR = {"N1-W03": 3, "N1-W02": 2, "N1-W01": 1}
def sh(cmd, **kw): return subprocess.run(cmd, shell=True, capture_output=True, text=True, **kw)
if not os.path.exists(DATA + "/PG_VERSION"):
    os.makedirs(SOCK, exist_ok=True); shutil.chown(R, "claude"); shutil.chown(SOCK, "claude")
    r = sh(f"runuser -u claude -- {PGBIN}/initdb -D {DATA} -A trust -U postgres -E UTF8 --locale=C.UTF-8"); assert r.returncode == 0, r.stderr
if sh(f"runuser -u claude -- {PGBIN}/pg_ctl -D {DATA} status").returncode != 0:
    r = sh(f"runuser -u claude -- {PGBIN}/pg_ctl -D {DATA} -o '-p {PORT} -k {SOCK} -c listen_addresses=' -l {R}/pg.log -w start"); assert r.returncode == 0, r.stderr + r.stdout
PSQL = f"psql -X -q -h {SOCK} -p {PORT} -U postgres -v ON_ERROR_STOP=1 -At"
def nieuwe_db():
    for q_ in ("DROP DATABASE IF EXISTS replica;", "CREATE DATABASE replica;"):
        r = sh(f'{PSQL} -d postgres -c "{q_}"'); assert r.returncode == 0, r.stderr
    r = subprocess.run(f"{PSQL} -d replica -f -", shell=True, input=SCHEMA, capture_output=True, text=True); assert r.returncode == 0, r.stderr
    for w in (3, 2, 1):
        r = sh(f"""{PSQL} -d replica -c "\\copy public.curriculum_items ({', '.join(EXPCOLS)}) FROM '{VOOR[w]}' WITH (FORMAT csv, DELIMITER E'\\t', HEADER true, FORCE_NOT_NULL ({', '.join(NN)}))" """)
        assert r.returncode == 0, r.stderr
def run(sql, nfc=True):
    if nfc:
        n = unicodedata.normalize("NFC", sql); assert n == sql, "SQL niet NFC-stabiel"; sql = n
    r = subprocess.run(f"{PSQL} -d replica -f -", shell=True, input=sql, capture_output=True, text=True)
    return r.returncode, [l for l in r.stdout.split("\n") if l.strip()], r.stderr.strip()
def bestand(blok, naam): return open(f"{SQL}/{MB[blok]['map']}/{naam}", encoding="utf-8").read()
def laatste(sql): rc, out, err = run(sql); return out[-1] if (rc == 0 and out) else f"FOUT rc={rc} {err[:200]}"
def q(sql): rc, out, err = run(sql, nfc=False); assert rc == 0, err; return out[-1] if out else ""
MB = {r["blok"]: r for r in M}
V = {r["blok"]: dict(l.rstrip("\n").split("\t", 1) for l in open(f"{SQL}/{r['map']}/verwacht.txt", encoding="utf-8")) for r in M}
def stap(blok, s, uit):   # p4_stap als scheidsrechter, zoals in P4
    p = subprocess.run(["python3", "-I", WM + "/scripts/w03/p4_stap_N1-W03.py", SQL, blok, s, uit], capture_output=True, text=True)
    return p.returncode, (p.stdout + p.stderr).strip()
resultaten = []; fout = 0
def ok(naam, kreeg, verw):
    global fout
    goed = kreeg == verw
    if not goed: fout += 1
    resultaten.append((naam, "✓" if goed else "✗", kreeg, verw))
def vinger(blok): return laatste(bestand(blok, "7_vinger_aggregaat.sql"))
def vv(blok): v = V[blok]; return f"{v['week_voor']}|{v['blok_voor']}|{v['rest']}"
def vn(blok): v = V[blok]; return f"{v['week_na']}|{v['blok_na']}|{v['rest']}"
SLOT = json.load(open(SQL + "/slot_verwacht_N1-W03.json", encoding="utf-8"))
TEL = lambda w: (f"SELECT count(*) || '|' || count(*) FILTER (WHERE strict_tashkeel AND NOT (options ? correct_answer)) || '|' || count(*) FILTER (WHERE needs_image) || '|' || count(*) FILTER (WHERE strict_tashkeel) || '|' || sum(points) || '|' || "
                 f"count(*) FILTER (WHERE needs_ns_audio) || '|' || count(*) FILTER (WHERE needs_student_recording) || '|' || count(*) FILTER (WHERE review_flag <> '') || '|' || count(*) FILTER (WHERE is_published) || '|' || "
                 f"(SELECT string_agg(t || ':' || n, '|' ORDER BY t COLLATE \"C\") FROM (SELECT exercise_type::text AS t, count(*)::text AS n FROM public.curriculum_items WHERE week = {w} GROUP BY 1) x) FROM public.curriculum_items WHERE week = {w};")
def slot_verw(d): return "|".join(str(d[k]) for k in ("items", "b25", "needs_image", "strict", "punten", "ns_audio", "student_opname", "vlaggen", "gepubliceerd")) + "|" + d["typen"]
VOORTEL = {}
def voor_tellen():
    for w in (3, 2, 1):
        R_ = list(csv.DictReader(open(VOOR[w], encoding="utf-8", newline=""), delimiter="\t")); mp = lambda r: json.loads(r["media_production"])
        import collections
        VOORTEL[w] = dict(items=len(R_), b25=sum(1 for r in R_ if r["strict_tashkeel"] == "true" and r["correct_answer"] not in json.loads(r["options"] or "[]")),
                          needs_image=sum("beeld" in mp(r) for r in R_), strict=sum(r["strict_tashkeel"] == "true" for r in R_), punten=sum(int(r["points"]) for r in R_),
                          ns_audio=sum("NS-audio" in mp(r) for r in R_), student_opname=sum("student-opname" in mp(r) for r in R_), vlaggen=sum(r["review_flag"] != "" for r in R_),
                          gepubliceerd=sum(r["is_published"] == "true" for r in R_), typen="|".join(f"{k}:{v}" for k, v in sorted(collections.Counter(r["exercise_type"] for r in R_).items())))
voor_tellen()
# ---------- G0: schema = live (read-only vergeleken op 2026-10-23) ----------
nieuwe_db()
LIVE = json.load(open(WM + "/deel2/schema_live_2026-10-23.json", encoding="utf-8"))["rows"][0]
rep = q("SELECT string_agg(column_name || ':' || udt_name || ':' || is_nullable || ':' || is_generated, ',' ORDER BY ordinal_position) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'curriculum_items';")
ok("G0.1 kolommen (naam:type:null:gegenereerd) replica = live", rep, LIVE["kolomlijst"])
ok("G0.2 constraints replica = live", q("SELECT string_agg(conname::text || ' ' || contype::text, ',' ORDER BY conname) FROM pg_constraint WHERE conrelid = 'public.curriculum_items'::regclass;"), LIVE["constraints"])
ok("G0.3 trigger en RLS replica = live", q("SELECT (SELECT string_agg(tgname::text, ',') FROM pg_trigger WHERE tgrelid = 'public.curriculum_items'::regclass AND NOT tgisinternal) || '|' || (SELECT relrowsecurity::text FROM pg_class WHERE oid = 'public.curriculum_items'::regclass);"), LIVE["triggers"] + "|" + LIVE["rls"])
ok("G0.4 enum replica = live (enum_range)", q("SELECT array_to_string(enum_range(NULL::public.curriculum_exercise_type), '|');"), "meerkeuze|meerdere-antwoorden|open-tekst|gatentekst|bestand-upload|audio-opname|rangschikken|koppelen")
for w in (3, 2, 1): ok(f"G0.5 W0{w} tellingen VOOR (replica = back-up)", q(TEL(w)), slot_verw(VOORTEL[w]))
# ---------- G1: leescontroles zoals in P3 (alles nog VOOR) ----------
for r in M:
    b = r["blok"]
    ok(f"G1.1 {b} droogloop P3 (live = VOOR)", laatste(bestand(b, "2_droogloop.sql")), V[b]["droogloop_p3"])
    ok(f"G1.2 {b} grootte-probe v2 vóór de apply", laatste(bestand(b, "9_grootte_probe.sql")), V[b]["probe_voor_apply"])
    ok(f"G1.3 {b} oud-aggregaat", laatste(bestand(b, "6_oud_aggregaat.sql")), V[b]["oud_aggregaat"])
for wk in ("N1-W03", "N1-W02", "N1-W01"):
    eerste = next(r["blok"] for r in M if r["week"] == wk)
    rc, msg = stap(eerste, "stand", vinger(eerste))
    ok(f"G1.4 p4_stap stand {wk}: niets toegepast → blok {eerste}", f"{rc}|{'blok ' + eerste in msg}", "0|True")
# ---------- G2: P4-draaiboek 1 → 7, elke uitkomst door p4_stap ----------
for r in M:
    b = r["blok"]; v = V[b]
    u = vinger(b); rc, _ = stap(b, "vinger_voor", u); ok(f"G2.1 {b} 7_vinger vóór (p4_stap ✓)", f"{u}|{rc}", f"{vv(b)}|0")
    ok(f"G2.2 {b} droogloop P4 (live = NA vorig blok)", laatste(bestand(b, "2_droogloop.sql")), v["droogloop"])
    u = laatste(bestand(b, "8_generale_repetitie.sql")); rc, _ = stap(b, "gr", u)
    ok(f"G2.3 {b} generale repetitie (+ activiteit + isolatie; p4_stap ✓)", f"{u}|{rc}", v["gr_eindrij"] + "|0|0|0|0||repeatable read|0")
    ok(f"G2.4 {b} 7_vinger na de repetitie = vóór", vinger(b), vv(b))
    u = laatste(bestand(b, "3_apply.sql")); rc, _ = stap(b, "apply", u); ok(f"G2.5 {b} apply (REPEATABLE READ; p4_stap ✓)", f"{u}|{rc}", f"{v['apply_uitvoer']}|0")
    u = vinger(b); rc, msg = stap(b, "vinger_na", u); ok(f"G2.6 {b} 7_vinger na de apply (p4_stap ✓)", f"{u}|{rc}", f"{vn(b)}|0")
    u = laatste(bestand(b, "3_apply.sql")); rc, msg = stap(b, "apply", u); ok(f"G2.7 {b} tweede apply = 0 rijen → p4_stap STOP (niet herhalen)", f"{u}|{rc}", f"{v['leeg_uitvoer']}|2")
    ok(f"G2.8 {b} grootte-probe v2 na de apply", laatste(bestand(b, "9_grootte_probe.sql")), v["probe_na_apply"])
    if b == "2_L2": ok("G2.9 typewissel heen: U3-luisteren-04 is meerkeuze", q("SELECT exercise_type::text FROM public.curriculum_items WHERE item_id = 'U3-luisteren-04';"), "meerkeuze")
    if b == "3_L3": ok("G2.10 depublicatie: U3-luisteren-08 is_published = false, vlag gezet", q("SELECT is_published::text || '|' || review_flag FROM public.curriculum_items WHERE item_id = 'U3-luisteren-08';"), "false|⚠️ ONTBREEKT · gedepubliceerd (B12)")
    if b == "4_R1": ok("G2.11 U3-lezen-01: 4 punten, 4 sleutels", q("SELECT points::text || '|' || jsonb_array_length(correct_options) FROM public.curriculum_items WHERE item_id = 'U3-lezen-01';"), "4|4")
for wk in ("N1-W03", "N1-W02", "N1-W01"):
    laatst = [r["blok"] for r in M if r["week"] == wk][-1]
    rc, msg = stap(laatst, "stand", vinger(laatst)); ok(f"G2.12 p4_stap stand {wk}: week klaar", f"{rc}|{'klaar' in msg}", "0|True")
# ---------- G3: slotcontrole (NA) ----------
for w in (3, 2, 1): ok(f"G3.1 W0{w} slottellingen = verwacht (B25, needs_*, strict, punten, vlaggen, gepubliceerd, typen)", q(TEL(w)), slot_verw(SLOT[f"W0{w}"]))
for wk in ("N1-W03", "N1-W02", "N1-W01"):
    laatst = [r["blok"] for r in M if r["week"] == wk][-1]
    vt = {l.split("\t")[0]: l.rstrip("\n").split("\t")[2] for l in list(open(f"{SQL}/{MB[laatst]['map']}/verwacht_vingerafdruk.tsv", encoding="utf-8"))[1:]}
    rc, out, err = run(bestand(laatst, "5_controle.sql"))
    live = dict(l.split("|", 1) for l in out if "|" in l)
    ok(f"G3.2 {wk}: vingerafdruk per rij = NA (5_controle)", str(sum(1 for i in vt if live.get(i) == vt[i])), str(len(vt)))
ok("G3.3 slot_tellingen_N1-W03.sql draait read-only", str(run(open(SQL + "/slot_tellingen_N1-W03.sql", encoding="utf-8").read())[0]), "0")
# ---------- G4: terugdraaien 7 → 1 (V-B) ----------
for r in reversed(M):
    b = r["blok"]; v = V[b]
    ok(f"G4.1 {b} 7_vinger vóór de rollback = NA van dit blok", vinger(b), vn(b))
    u = laatste(bestand(b, "4_rollback.sql")); rc, _ = stap(b, "rollback", u); ok(f"G4.2 {b} rollback (REPEATABLE READ; p4_stap ✓)", f"{u}|{rc}", f"{v['rollback_uitvoer']}|0")
    u = vinger(b); rc, _ = stap(b, "vinger_terug", u); ok(f"G4.3 {b} 7_vinger na de rollback = vóór dit blok (p4_stap ✓)", f"{u}|{rc}", f"{vv(b)}|0")
    ok(f"G4.4 {b} tweede rollback = 0", laatste(bestand(b, "4_rollback.sql")), v["leeg_uitvoer"])
    if b == "2_L2": ok("G4.5 typewissel terug: U3-luisteren-04 is open-tekst", q("SELECT exercise_type::text FROM public.curriculum_items WHERE item_id = 'U3-luisteren-04';"), "open-tekst")
for w in (3, 2, 1): ok(f"G4.6 W0{w} tellingen na het terugdraaien = VOOR", q(TEL(w)), slot_verw(VOORTEL[w]))
# ---------- G5: negatieve tests ----------
nieuwe_db(); b = "1_L1"; v = V[b]
eerste = sorted(l.split("\t")[0] for l in open(f"{SQL}/{MB[b]['map']}/items.txt", encoding="utf-8"))[0]
u = vinger("2_L2"); rc, msg = stap("2_L2", "vinger_voor", u)
ok("G5.1 volgorde: 7_vinger vóór L2 terwijl L1 niet toegepast is → p4_stap STOP", str(rc), "2")
q(f"UPDATE public.curriculum_items SET question = question || ' ' WHERE item_id = '{eerste}';")
ok(f"G5.2 toestandsgrendel: 1 rij buiten het log gewijzigd ({eerste}) → apply 0", laatste(bestand(b, "3_apply.sql")), v["leeg_uitvoer"])
q(f"UPDATE public.curriculum_items SET question = left(question, length(question) - 1) WHERE item_id = '{eerste}';")
ok("G5.2b stand terug = VOOR", vinger(b), vv(b))
a = bestand(b, "3_apply.sql"); k = a.index("(VALUES"); j = a.index("َ", k)
ok("G5.3 plakgrendel: één fatḥa weg in de VALUES → apply 0", laatste(a[:j] + a[j + 1:]), v["leeg_uitvoer"])
ok("G5.3b stand ongewijzigd", vinger(b), vv(b))
b4 = "4_R1"; v4 = V[b4]
ok("G5.4a R1 apply (rijen van R1 zijn VOOR; de grendels per rij dwingen de volgorde niet af → daarom 7_vinger + p4_stap)", laatste(bestand(b4, "3_apply.sql")), v4["apply_uitvoer"])
rb = bestand(b4, "4_rollback.sql"); esc = re.findall(r"U&'((?:[^']|'')*)'::(?:text|jsonb)", rb)
def ont(s): return re.sub(r"\\\+([0-9A-F]{6})|\\([0-9A-F]{4})", lambda mm: chr(int(mm.group(1) or mm.group(2), 16)), s.replace("''", "'")).replace("\\\\", "\\")
rauw = rb
for e in esc: rauw = re.sub(re.escape(f"U&'{e}'") + r"::(text|jsonb)", lambda mm: "'" + ont(e).replace("'", "''") + "'::" + mm.group(1), rauw)
ok(f"G5.4b R1-rollback heeft {len(esc)} U&-escape(s); zonder escape is de tekst niet NFC-stabiel", str(len(esc) > 0 and unicodedata.normalize('NFC', rauw) != rauw), "True")
ok("G5.4c rollback zónder escape, NFC-geplakt → 0 (fail-closed)", laatste(unicodedata.normalize("NFC", rauw)), v4["leeg_uitvoer"])
ok("G5.4d rollback mét escape → alle rijen", laatste(rb), v4["rollback_uitvoer"])
tmp = R + "/g55"; shutil.rmtree(tmp, ignore_errors=True); os.makedirs(tmp)
rows = list(csv.DictReader(open(P3 + "/APP_NA_N1-W03.tsv", encoding="utf-8", newline=""), delimiter="\t")); kop = list(rows[0].keys())
for r_ in rows:
    if r_["item_id"] == "U3-luisteren-04": r_["exercise_type"] = "meerkeus"
with open(f"{tmp}/NA_fout.tsv", "w", encoding="utf-8", newline="") as f:
    w = csv.writer(f, delimiter="\t", lineterminator="\n", quoting=csv.QUOTE_MINIMAL); w.writerow(kop)
    for r_ in rows: w.writerow([r_[c] for c in kop])
E = "meerkeuze|meerdere-antwoorden|open-tekst|gatentekst|bestand-upload|audio-opname|rangschikken|koppelen"
SPEC = "L1=luisteren-01,luisteren-02;L2=luisteren-03,luisteren-04,luisteren-05;L3=luisteren-06,luisteren-07,luisteren-08;R1=lezen;R2=spreken,schrijven,grammatica,reflectie"
g = subprocess.run(["python3", "-I", WM + "/scripts/w03/maak_sql_N1-W03.py", VOOR[3], f"{tmp}/NA_fout.tsv", f"{tmp}/sql", "--week", "3", "--blokken", SPEC, "--enum-live", E], capture_output=True, text=True)
ok("G5.5a foute enumwaarde ('meerkeus') in de NA → v4.4 weigert, er komt geen SQL", str(g.returncode != 0 and "niet in de enum" in g.stderr and not os.path.exists(f"{tmp}/sql")), "True")
g = subprocess.run(["python3", "-I", WM + "/scripts/w03/maak_sql_N1-W03.py", VOOR[3], P3 + "/APP_NA_N1-W03.tsv", f"{tmp}/sql2", "--week", "3", "--blokken", SPEC, "--enum-live", E.replace("|koppelen", "")], capture_output=True, text=True)
ok("G5.5b live enum ≠ de lijst van de generator → v4.4 weigert", str(g.returncode != 0 and "live enum" in g.stderr and not os.path.exists(f"{tmp}/sql2")), "True")
g = subprocess.run(["python3", "-I", WM + "/scripts/w03/maak_sql_N1-W03.py", VOOR[3], P3 + "/APP_NA_N1-W03.tsv", f"{tmp}/sql3", "--week", "3", "--blokken", SPEC], capture_output=True, text=True)
ok("G5.5c zonder --enum-live → v4.4 weigert", str(g.returncode != 0 and not os.path.exists(f"{tmp}/sql3")), "True")
g = subprocess.run(["python3", "-I", WM + "/scripts/maak_sql_N1-W02.py", VOOR[3], P3 + "/APP_NA_N1-W03.tsv", f"{tmp}/sql4", "--week", "3", "--blokken", SPEC], capture_output=True, text=True)
ok("G5.5d controle: v4.3.1 kan exercise_type niet schrijven (daarom v4.4)", str(g.returncode != 0 and "exercise_type" in g.stderr), "True")
ok("G5.6 stand na de mislukte generaties ongewijzigd (L1)", vinger(b), vv(b))
b2 = "2_L2"; v2 = V[b2]
ok("G5.7a L2 apply", laatste(bestand(b2, "3_apply.sql")), v2["apply_uitvoer"])
ok("G5.7b noodrollback 4b (zonder toestandsgrendel)", laatste(bestand(b2, "4b_noodrollback.sql")), v2["rollback_uitvoer"])
ok("G5.7c blok L2 terug = VOOR (blokdeel; L1 is hier niet toegepast)", "|".join(vinger(b2).split("|")[2:4]), v2["blok_voor"])
ro = bestand(b, "7_vinger_aggregaat.sql").replace("ROLLBACK;", f"UPDATE public.curriculum_items SET question = question WHERE item_id = '{eerste}';\nROLLBACK;")
rc, out, err = run(ro)
ok("G5.8 UPDATE binnen BEGIN TRANSACTION READ ONLY → geweigerd", str(rc != 0 and "read-only transaction" in err), "True")
KOP_RR = "BEGIN;\nSET TRANSACTION ISOLATION LEVEL REPEATABLE READ;\n"
assert bestand(b, "3_apply.sql").count(KOP_RR) == 1
a = bestand(b, "3_apply.sql").replace(KOP_RR, KOP_RR + "SELECT count(*) FROM public.curriculum_items;\nSELECT pg_sleep(3);\n", 1)
proc = subprocess.Popen(f"{PSQL} -d replica -f -", shell=True, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
proc.stdin.write(a); proc.stdin.close(); time.sleep(1.0)
q(f"UPDATE public.curriculum_items SET question = question || ' ' WHERE item_id = '{eerste}';")
uit_, fout_ = proc.stdout.read(), proc.stderr.read(); proc.wait()
ok("G5.9a gelijktijdige wijziging tijdens de apply → serialisatiefout (geen stille overschrijving)", str(proc.returncode != 0 and "could not serialize access" in fout_), "True")
q(f"UPDATE public.curriculum_items SET question = left(question, length(question) - 1) WHERE item_id = '{eerste}';")
ok("G5.9b daarna: blok L1 = VOOR (de apply veranderde niets)", vinger(b), vv(b))
gr9 = laatste("BEGIN;\n" + bestand(b, "8_generale_repetitie.sql") + "COMMIT;\n")
ok("G5.10a omhulde generale repetitie: isolatie = repeatable read, stand terug", gr9.rsplit("|", 1)[-1] + "|" + vinger(b), "repeatable read|" + vv(b))
ok("G5.10b omhulde apply: isolatie = repeatable read, blok toegepast", laatste("BEGIN;\n" + bestand(b, "3_apply.sql") + "COMMIT;\n"), v["apply_uitvoer"])
ok("G5.10c omhulde rollback: terug naar VOOR", laatste("BEGIN;\n" + bestand(b, "4_rollback.sql") + "COMMIT;\n"), v["rollback_uitvoer"])
rc, out, err = run("BEGIN;\nSELECT 1;\n" + bestand(b, "3_apply.sql") + "COMMIT;\n")
ok("G5.10d er liep al een query in de omhullende transactie → SET TRANSACTION faalt, niets toegepast", str(rc != 0 and "SET TRANSACTION ISOLATION LEVEL must be called before any query" in err) + "|" + vinger(b), "True|" + vv(b))
alle = [f"{SQL}/{r['map']}/{f}" for r in M for f in os.listdir(f"{SQL}/{r['map']}") if f.endswith(".sql")] + [SQL + "/slot_tellingen_N1-W03.sql"]
nfc_ok = sum(1 for p in alle if unicodedata.normalize("NFC", open(p, encoding="utf-8").read()) == open(p, encoding="utf-8").read())
ok(f"G5.11 SQL-bestanden NFC-stabiel ({len(alle)} bestanden)", str(nfc_ok), str(len(alle)))
# manifest en p4_stap
W02BUNDEL = "/home/claude/N1-W02_P4/N1-W02/p4/sql"
assert os.path.isdir(W02BUNDEL), "W02-bundel niet gevonden (nodig voor G5.12a)"
p = subprocess.run(["python3", "-I", WM + "/scripts/w03/p4_stap_N1-W03.py", W02BUNDEL, "1_L1", "stand", "100|x|y"], capture_output=True, text=True)
ok("G5.12a p4_stap met de W02-bundel → STOP (geen manifest)", str(p.returncode), "2")
tmpm = R + "/g512"; shutil.rmtree(tmpm, ignore_errors=True); shutil.copytree(SQL, tmpm)
with open(f"{tmpm}/{MB['3_L3']['map']}/verwacht.txt", "a", encoding="utf-8") as f: f.write("x\ty\n")
p = subprocess.run(["python3", "-I", WM + "/scripts/w03/p4_stap_N1-W03.py", tmpm, "1_L1", "stand", vv("1_L1")], capture_output=True, text=True)
ok("G5.12b één verwacht.txt gewijzigd → p4_stap STOP (bundel ≠ manifest), ook voor een ander blok", str(p.returncode), "2")
p = subprocess.run(["python3", "-I", WM + "/scripts/w03/p4_stap_N1-W03.py", SQL, "4_R2", "stand", vv("1_L1")], capture_output=True, text=True)
ok("G5.12c onbekend blok (4_R2 uit W02) → STOP", str(p.returncode), "2")
p = subprocess.run(["python3", "-I", WM + "/scripts/w03/p4_stap_N1-W03.py", SQL, "1_L1", "stand", "100|00000000000000000000000000000000|x"], capture_output=True, text=True)
ok("G5.12d stand met een onbekende vingerafdruk → STOP", str(p.returncode), "2")
logt = R + "/p4log_test.tsv"
p = subprocess.run(["python3", "-I", WM + "/scripts/w03/p4_log_stap_N1-W03.py", "replica", "3_L3", "apply", "-", "Lovable API error: 503"], capture_output=True, text=True, env={**os.environ, "P4LOG": logt, "P4BASIS": WM, "P4SQL": "p3/sql"})
ok("G5.12e toolfout zonder resultaatrij (503) → p4_log_stap STOP", str(p.returncode), "2")
p = subprocess.run(["python3", "-I", WM + "/scripts/w03/p4_log_stap_N1-W03.py", "replica", "1_L1", "vinger_voor", "p3/sql/N1-W03/1_L1/7_vinger_aggregaat.sql", json.dumps({"rows": [{"week_blok_rest": vv("1_L1")}]})], capture_output=True, text=True, env={**os.environ, "P4LOG": logt, "P4BASIS": WM, "P4SQL": "p3/sql"})
ok("G5.12f p4_log_stap met een geldige uitkomst → ✓", str(p.returncode), "0")
# ---------- rapport ----------
groen = sum(1 for r_ in resultaten if r_[1] == "✓"); totaal = len(resultaten)
L = [f"# Replica v3 · N1-W03 · rapport\nGemaakt door `scripts/w03/replica_test_N1-W03.py` v3 · PostgreSQL 16 lokaal · schema `schema_replica_v2.sql` (md5 `{hashlib.md5(open(SCHEMA_BRON,'rb').read()).hexdigest()}`, + unit U3), op 2026-10-23 read-only vergeleken met live (G0) · gegevens: back-up W03 (100) + W02 (81) + W01 (21) · manifest `{hashlib.md5(open(SQL + '/BLOKKEN_MANIFEST.tsv','rb').read()).hexdigest()}` · elk SQL-bestand NFC-genormaliseerd vóór het uitvoeren (zoals de tool) · elke P4-uitkomst beoordeeld door `p4_stap_N1-W03.py`.\n",
     f"**Uitslag: {'REPLICA GROEN' if fout == 0 else 'REPLICA ROOD'} · {groen}/{totaal}**\n", "| test | | kreeg | verwacht |", "|---|---|---|---|"]
for n_, s_, k_, v_ in resultaten: L.append(f"| {n_} | {s_} | `{k_}` | `{v_}` |")
open(R + "/REPLICA_RAPPORT_N1-W03.md", "w", encoding="utf-8").write("\n".join(L) + "\n")
print(f"{'REPLICA GROEN' if fout == 0 else 'REPLICA ROOD'} {groen}/{totaal}")
for n_, s_, k_, v_ in resultaten:
    if s_ == "✗": print("  ✗", n_, "| kreeg", k_[:200], "| verwacht", v_[:200])
sh(f"runuser -u claude -- {PGBIN}/pg_ctl -D {DATA} -m fast stop")
sys.exit(1 if fout else 0)
