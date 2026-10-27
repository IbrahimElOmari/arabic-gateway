# replica_test_N1-W05.py v4.0 — Controleur-T (8T) / Maker-T (7T) · P3 N1-W05 · architectuur T v1.0 §1–§3; P1-24 (replica met enumcast + terugdraaien); 9T P2 V3.
# Generieke herschrijving van replica_test_N1-W03.py v3.4.1: alles uit BLOKKEN_MANIFEST.tsv (9 blokken, 4 weken), p4_stap_N1-W05.py v1.5 als
# scheidsrechter van elke uitkomst en p4_log_stap_N1-W05.py v1.4 (voorcontrole, slot, ketenhash) zoals in het P4-draaiboek 2b.
# Replica: PostgreSQL 16 lokaal, schema_replica_v2.sql (+ units U1–U25 uit de export), alle 2.299 rijen van N1 (export N1 2026-10-24 = 80a5afcc…;
# W01–W04 byte-gelijk aan de back-ups van P3), de 6 live policies, de rol authenticated en één leerder met toegang. Elk SQL-bestand wordt
# NFC-genormaliseerd vóór het uitvoeren (zoals de tool). Niets raakt de live database.
# Groepen: G0 schema/data = live (read-only JSON van 2026-10-24) · G1 leescontroles P3 · G2 P4 1 → 9 met p4_stap en p4_log_stap · G3 slotcontrole ·
# G4 terugdraaien 9 → 1 (V-B) · G5 negatieve tests (activiteit, volgorde, toestands- en plakgrendel, U&-escapes, enum, tweede apply, vreemde bundel) ·
# G6 W04-specifiek (gatentekst heen en terug, twee depublicaties, media_production jsonb, correct_options jsonb, nazorg over drie weken).
# Gebruik: python3 -I replica_test_N1-W05.py <werkmap w04> → p3/replica/REPLICA_RAPPORT_N1-W05.md, exit 1 bij ROOD
import sys, os, json, subprocess, unicodedata, hashlib, csv, re, shutil, io, collections
WM = os.path.abspath(sys.argv[1]); P3 = WM + "/p3"; SQL = P3 + "/sql"; R = P3 + "/replica"; os.makedirs(R, exist_ok=True)
PGBIN = "/usr/lib/postgresql/16/bin"; DATA = R + "/pgdata"; SOCK = R + "/sock"; PORT = "5435"
SCHEMA_BRON = WM + "/p3/replica_schema/schema_replica_v2.sql"
N1EXP = WM + "/bron/APP_EXPORT_N1_2026-10-26_W05stap0b.tsv"
VOOR = {5: WM + "/bron/APP_BACKUP_N1-W05_2026-10-26.tsv", 4: WM + "/bron/APP_BACKUP_N1-W04_2026-10-26_P3.tsv", 3: WM + "/bron/APP_BACKUP_N1-W03_2026-10-26_P3.tsv", 2: WM + "/bron/APP_BACKUP_N1-W02_2026-10-26_P3.tsv"}
NA = {5: P3 + "/APP_NA_N1-W05.tsv", 4: P3 + "/APP_NA_N1-W04.tsv", 3: P3 + "/APP_NA_N1-W03.tsv", 2: P3 + "/APP_NA_N1-W02.tsv"}
WEKEN = (5, 4, 3, 2)
EXPCOLS = ["item_id","unit_code","week","skill","exercise_type","exercise_subtype","display_order","instruction_nl","question","options","correct_answer","correct_options","feedback_correct","feedback_incorrect","input_arabic","input_transliteration","input_translation_nl","reference_media","media_production","media_url","media_alt","audio_url","image_url","points","review_flag","is_published","strict_tashkeel","id","created_at","updated_at"]
NN = ["exercise_subtype","instruction_nl","question","correct_answer","feedback_correct","feedback_incorrect","input_arabic","input_transliteration","input_translation_nl","reference_media","review_flag"]
M = [dict(zip(("volgorde", "week", "blok", "map", "md5_verwacht", "week_voor", "week_na"), l.rstrip("\n").split("\t"))) for l in list(open(SQL + "/BLOKKEN_MANIFEST.tsv", encoding="utf-8"))[1:]]
MB = {r["blok"]: r for r in M}
V = {r["blok"]: dict(l.rstrip("\n").split("\t", 1) for l in open(f"{SQL}/{r['map']}/verwacht.txt", encoding="utf-8")) for r in M}
WEEKNR = {"N1-W05": 5, "N1-W04": 4, "N1-W03": 3, "N1-W02": 2}
def sh(cmd, **kw): return subprocess.run(cmd, shell=True, capture_output=True, text=True, **kw)
_N1 = list(csv.DictReader(open(N1EXP, encoding="utf-8", newline=""), delimiter="\t"))
SCHEMA = open(SCHEMA_BRON, encoding="utf-8").read().replace("INSERT INTO public.curriculum_units (code) VALUES ('U1'), ('U2');", "")
UNITS = "INSERT INTO public.curriculum_units (code) SELECT DISTINCT u FROM (VALUES " + ", ".join(f"('{u}')" for u in sorted({r["unit_code"] for r in _N1})) + ") x(u) ON CONFLICT DO NOTHING;\n"
POLICIES = open(WM + "/scripts/replica_policies.sql", encoding="utf-8").read()
if not os.path.exists(DATA + "/PG_VERSION"):
    os.makedirs(SOCK, exist_ok=True); shutil.chown(R, "claude"); shutil.chown(SOCK, "claude")
    r = sh(f"runuser -u claude -- {PGBIN}/initdb -D {DATA} -A trust -U postgres -E UTF8 --locale=C.UTF-8"); assert r.returncode == 0, r.stderr
if sh(f"runuser -u claude -- {PGBIN}/pg_ctl -D {DATA} status").returncode != 0:
    r = sh(f"runuser -u claude -- {PGBIN}/pg_ctl -D {DATA} -o '-p {PORT} -k {SOCK} -c listen_addresses=' -l {R}/pg.log -w start"); assert r.returncode == 0, r.stderr + r.stdout
PSQL = f"psql -X -q -h {SOCK} -p {PORT} -U postgres -v ON_ERROR_STOP=1 -At"
PSQLCSV = f"psql -X -q -h {SOCK} -p {PORT} -U postgres -v ON_ERROR_STOP=1 --csv"
LEERDER = "00000000-0000-0000-0000-0000000000c1"
def nieuwe_db():
    for q_ in ("DROP DATABASE IF EXISTS replica;", "CREATE DATABASE replica;"):
        r = sh(f'{PSQL} -d postgres -c "{q_}"'); assert r.returncode == 0, r.stderr
    r = subprocess.run(f"{PSQL} -d replica -f -", shell=True, input=SCHEMA + UNITS + POLICIES, capture_output=True, text=True); assert r.returncode == 0, r.stderr
    r = sh(f"""{PSQL} -d replica -c "\\copy public.curriculum_items ({', '.join(EXPCOLS)}) FROM '{N1EXP}' WITH (FORMAT csv, DELIMITER E'\\t', HEADER true, FORCE_NOT_NULL ({', '.join(NN)}))" """); assert r.returncode == 0, r.stderr
    r = sh(f"""{PSQL} -d replica -c "INSERT INTO auth.users (id, last_sign_in_at) VALUES ('{LEERDER}', now() - interval '60 days');" """); assert r.returncode == 0, r.stderr
def run(sql, nfc=True):
    if nfc:
        n = unicodedata.normalize("NFC", sql); assert n == sql, "SQL niet NFC-stabiel"; sql = n
    r = subprocess.run(f"{PSQL} -d replica -f -", shell=True, input=sql, capture_output=True, text=True)
    return r.returncode, [l for l in r.stdout.split("\n") if l.strip()], r.stderr.strip()
def bestand(blok, naam): return open(f"{SQL}/{MB[blok]['map']}/{naam}" if blok != "slot" else f"{SQL}/{naam}", encoding="utf-8").read()
def laatste(sql): rc, out, err = run(sql); return out[-1] if (rc == 0 and out) else f"FOUT rc={rc} {err[:200]}"
def q(sql): rc, out, err = run(sql, nfc=False); assert rc == 0, err; return out[-1] if out else ""
def stap(blok, s, uit):
    p = subprocess.run(["python3", "-I", WM + "/scripts/p4_stap_N1-W05.py", SQL, blok, s, uit], capture_output=True, text=True)
    return p.returncode, (p.stdout + p.stderr).strip()
def ruw(sql):
    assert unicodedata.normalize("NFC", sql) == sql, "SQL niet NFC-stabiel"
    r = subprocess.run(f"{PSQLCSV} -d replica -f -", shell=True, input=sql, capture_output=True, text=True)
    if r.returncode != 0: return "ERROR: " + r.stderr.strip()[:300]
    rec = [x for x in csv.reader(io.StringIO(r.stdout)) if x]
    return json.dumps({"rows": [dict(zip(rec[-2], rec[-1]))]}, ensure_ascii=False)
def psv(uj):
    try: return "|".join(json.loads(uj)["rows"][0].values())
    except Exception: return uj
TB = R + "/p4basis"; shutil.rmtree(TB, ignore_errors=True); os.makedirs(TB)
os.symlink(WM + "/scripts", TB + "/scripts"); os.symlink(WM + "/p3", TB + "/p3"); LOGSTD = TB + "/p4/uitvoering/P4_log_N1-W05.tsv"
def logstap(blok, s_, best, uit=None, voor=False, extra=None):
    env = {k_: v_ for k_, v_ in os.environ.items() if k_ not in ("P4LOG", "P4SQL")}; env["P4BASIS"] = TB; env.update(extra or {})
    p_ = subprocess.run(["python3", "-I", WM + "/scripts/p4_log_stap_N1-W05.py", "replica", blok, s_, best] + (["--voor"] if voor else [uit]), capture_output=True, text=True, env=env)
    return p_.returncode, (p_.stdout + p_.stderr).strip()
def pad(blok, naam): return f"p3/sql/{MB[blok]['map']}/{naam}" if blok != "slot" else f"p3/sql/{naam}"
def P4(blok, s_, naam):
    rc1, m1 = logstap(blok, s_, pad(blok, naam), voor=True)
    if rc1 != 0: return rc1, -1, "(niet geplakt)", m1
    uj = ruw(bestand(blok, naam)); rc2, m2 = logstap(blok, s_, pad(blok, naam), uj)
    return rc1, rc2, uj, m2
resultaten = []; fout = 0
def ok(naam, kreeg, verw):
    global fout
    goed = str(kreeg) == str(verw)
    if not goed: fout += 1
    resultaten.append((naam, "✓" if goed else "✗", str(kreeg), str(verw)))
def vinger(blok): return laatste(bestand(blok, "7_vinger_aggregaat.sql"))
def vv(blok): v = V[blok]; return f"{v['week_voor']}|{v['blok_voor']}|{v['rest']}"
def vn(blok): v = V[blok]; return f"{v['week_na']}|{v['blok_na']}|{v['rest']}"
SLOT = json.load(open(SQL + "/slot_verwacht_N1-W05.json", encoding="utf-8"))
TEL = lambda w: (f"SELECT count(*) || '|' || count(*) FILTER (WHERE strict_tashkeel AND NOT (options ? correct_answer)) || '|' || count(*) FILTER (WHERE needs_image) || '|' || count(*) FILTER (WHERE strict_tashkeel) || '|' || sum(points) || '|' || "
                 f"count(*) FILTER (WHERE needs_ns_audio) || '|' || count(*) FILTER (WHERE needs_student_recording) || '|' || count(*) FILTER (WHERE review_flag <> '') || '|' || count(*) FILTER (WHERE is_published) || '|' || "
                 f"(SELECT string_agg(t || ':' || n, '|' ORDER BY t COLLATE \"C\") FROM (SELECT exercise_type::text AS t, count(*)::text AS n FROM public.curriculum_items WHERE week = {w} GROUP BY 1) x) FROM public.curriculum_items WHERE week = {w};")
def slot_verw(d): return "|".join(str(d[k]) for k in ("items", "b25", "needs_image", "strict", "punten", "ns_audio", "student_opname", "vlaggen", "gepubliceerd")) + "|" + d["typen"]
def tel_bestand(p):
    R_ = list(csv.DictReader(open(p, encoding="utf-8", newline=""), delimiter="\t")); mp = lambda r: json.loads(r["media_production"])
    return dict(items=len(R_), b25=sum(1 for r in R_ if r["strict_tashkeel"] == "true" and r["correct_answer"] not in json.loads(r["options"] or "[]")),
                needs_image=sum("beeld" in mp(r) for r in R_), strict=sum(r["strict_tashkeel"] == "true" for r in R_), punten=sum(int(r["points"]) for r in R_),
                ns_audio=sum("NS-audio" in mp(r) for r in R_), student_opname=sum("student-opname" in mp(r) for r in R_), vlaggen=sum(r["review_flag"] != "" for r in R_),
                gepubliceerd=sum(r["is_published"] == "true" for r in R_), typen="|".join(f"{k}:{v}" for k, v in sorted(collections.Counter(r["exercise_type"] for r in R_).items())))
VOORTEL = {w: tel_bestand(VOOR[w]) for w in WEKEN}
# ---------- G0: schema en data = live (read-only, 2026-10-24) ----------
nieuwe_db()
LIVE = json.load(open(WM + "/p3/live/schema_live_2026-10-26_P3.json", encoding="utf-8"))["rows"][0]
ok("G0.1 kolommen (naam:type:null:gegenereerd) replica = live", q("SELECT string_agg(column_name || ':' || udt_name || ':' || is_nullable || ':' || is_generated, ',' ORDER BY ordinal_position) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'curriculum_items';"), LIVE["kolomlijst"])
ok("G0.2 constraints replica = live", q("SELECT string_agg(conname::text || ' ' || contype::text, ',' ORDER BY conname) FROM pg_constraint WHERE conrelid = 'public.curriculum_items'::regclass;"), LIVE["constraints"])
ok("G0.3 trigger en RLS replica = live", q("SELECT (SELECT string_agg(tgname::text, ',') FROM pg_trigger WHERE tgrelid = 'public.curriculum_items'::regclass AND NOT tgisinternal) || '|' || (SELECT relrowsecurity::text FROM pg_class WHERE oid = 'public.curriculum_items'::regclass);"), LIVE["triggers"] + "|" + LIVE["rls"])
ok("G0.4 enum replica = live (enum_range)", q("SELECT array_to_string(enum_range(NULL::public.curriculum_exercise_type), '|');"), "meerkeuze|meerdere-antwoorden|open-tekst|gatentekst|bestand-upload|audio-opname|rangschikken|koppelen")
for w in WEKEN: ok(f"G0.5 W0{w} tellingen VOOR (replica = back-up)", q(TEL(w)), slot_verw(VOORTEL[w]))
_bw = lambda w: {r["item_id"]: r for r in csv.DictReader(open(VOOR[w], encoding="utf-8", newline=""), delimiter="\t")}
_ew = lambda w: {r["item_id"]: r for r in _N1 if r["week"] == str(w)}
ok("G0.0 export N1: 2.299 rijen, W02–W05 per item_id gelijk aan de back-ups", f"{len(_N1)}|" + "|".join(str(_bw(w) == _ew(w)) for w in WEKEN), "2299|True|True|True|True")
ZL = json.load(open(WM + "/p3/live/leerderszicht_live_2026-10-26_P3.json", encoding="utf-8"))["rows"][0]
ok("G0.6 policies op curriculum_items replica = live (pg_policies, 6 policies)", q("SELECT string_agg(policyname::text || ':' || cmd::text || ':' || array_to_string(roles, ',') || ':' || coalesce(qual, '') || ':' || coalesce(with_check, ''), ' # ' ORDER BY policyname) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'curriculum_items';"), ZL["policies"])
ok("G0.7 rijen totaal = live (2.299)", q("SELECT count(*) FROM public.curriculum_items;"), str(LIVE["rijen_totaal"]))
ok("G0.8 als leerder (rol authenticated, RLS): W05 82 · W25 0 · zonder jwt-sub 0", q(f"BEGIN; SELECT set_config('request.jwt.claims', '{{\"sub\":\"{LEERDER}\"}}', true); SET LOCAL ROLE authenticated; SELECT (SELECT count(*) FROM public.curriculum_items WHERE week = 5) || '|' || (SELECT count(*) FROM public.curriculum_items WHERE week = 25) || '|' || current_user; ROLLBACK;") + "|" + q("BEGIN; SET LOCAL ROLE authenticated; SELECT count(*) FROM public.curriculum_items; ROLLBACK;"), "82|0|authenticated|0")
# ---------- G1: leescontroles zoals in P3 ----------
for r in M:
    b = r["blok"]
    ok(f"G1.1 {b} droogloop P3 (live = VOOR)", laatste(bestand(b, "2_droogloop.sql")), V[b]["droogloop_p3"])
    ok(f"G1.2 {b} grootte-probe v2 vóór de apply", laatste(bestand(b, "9_grootte_probe.sql")), V[b]["probe_voor_apply"])
    ok(f"G1.3 {b} oud-aggregaat", laatste(bestand(b, "6_oud_aggregaat.sql")), V[b]["oud_aggregaat"])
for wk in WEEKNR:
    eerste = next(r["blok"] for r in M if r["week"] == wk)
    rc, msg = stap(eerste, "stand", vinger(eerste)); ok(f"G1.4 p4_stap stand {wk}: niets toegepast → blok {eerste}", f"{rc}|{'blok ' + eerste in msg}", "0|True")
# ---------- G2: P4-draaiboek 1 → 9 ----------
for s_, f_ in (("slot_ref", "slot_tellingen_N1-W05.sql"), ("zicht_voor", "leerderszicht_N1-W05.sql")):
    rc1, rc2, uj, m = P4("slot", s_, f_); ok(f"G2.14 {s_} vóór blok 1 via p4_log_stap (VOOR-waarden)", f"{rc1}|{rc2}", "0|0")
for i, r in enumerate(M):
    b = r["blok"]; v = V[b]
    if b == "6_G1":   # volgorde over de weken: 7_W04a mag niet beginnen terwijl W05 open is
        for s_, f_ in (("vinger_voor", "7_vinger_aggregaat.sql"), ("gr", "8_generale_repetitie.sql"), ("apply", "3_apply.sql")):
            rc_, m_ = logstap("7_W04a", s_, pad("7_W04a", f_), voor=True)
            ok(f"G2.13 volgorde over de weken: voorcontrole {s_} van 7_W04a terwijl 6_G1 (W05) open is → STOP", f"{rc_}|{'volgorde' in m_}", "2|True")
    if i == 0 or M[i - 1]["week"] != r["week"]:
        rc1, rc2, uj, m = P4(b, "stand", "7_vinger_aggregaat.sql"); ok(f"G2.0 {b} stand {r['week']} (voorcontrole + p4_log_stap ✓)", f"{rc1}|{rc2}|{'blok ' + b in m}", "0|0|True")
    rc1, rc2, uj, m = P4(b, "vinger_voor", "7_vinger_aggregaat.sql"); ok(f"G2.1 {b} 7_vinger vóór (voorcontrole + p4_log_stap ✓)", f"{psv(uj)}|{rc1}|{rc2}", f"{vv(b)}|0|0")
    ok(f"G2.2 {b} droogloop P4 (live = NA vorig blok)", laatste(bestand(b, "2_droogloop.sql")), v["droogloop"])
    rc1, rc2, uj, m = P4(b, "gr", "8_generale_repetitie.sql")
    ok(f"G2.3 {b} generale repetitie (+ activiteit + isolatie; voorcontrole + p4_log_stap ✓)", f"{psv(uj)}|{rc1}|{rc2}", v["gr_eindrij"] + "|0|0|0|0||repeatable read|0|0")
    ok(f"G2.4 {b} 7_vinger na de repetitie = vóór", vinger(b), vv(b))
    rc1, rc2, uj, m = P4(b, "apply", "3_apply.sql"); ok(f"G2.5 {b} apply (REPEATABLE READ; voorcontrole + p4_log_stap ✓)", f"{psv(uj)}|{rc1}|{rc2}", f"{v['apply_uitvoer']}|0|0")
    rc1, rc2, uj, m = P4(b, "vinger_na", "7_vinger_aggregaat.sql"); ok(f"G2.6 {b} 7_vinger na de apply (voorcontrole + p4_log_stap ✓)", f"{psv(uj)}|{rc1}|{rc2}", f"{vn(b)}|0|0")
    rc1, m1 = logstap(b, "apply", pad(b, "3_apply.sql"), voor=True)
    u = laatste(bestand(b, "3_apply.sql")); rc, msg = stap(b, "apply", u)
    ok(f"G2.7 {b} dubbel blok: voorcontrole van een tweede apply → STOP (log); toch geplakt = 0 rijen → p4_stap STOP", f"{rc1}|{'volgorde' in m1}|{u}|{rc}", f"2|True|{v['leeg_uitvoer']}|2")
    ok(f"G2.8 {b} grootte-probe v2 na de apply", laatste(bestand(b, "9_grootte_probe.sql")), v["probe_na_apply"])
    if b == "1_L1": ok("G6.1 U5-luisteren-01-2: stimulus غَيْمٌ (B1) en opties in de nieuwe volgorde", q("SELECT input_arabic || '|' || options::text FROM public.curriculum_items WHERE item_id = 'U5-luisteren-01-2';"), "غَيْمٌ|[\"غ\", \"ء\", \"ع\"]")
    if b == "2_L2":
        ok("G6.2 enumcast heen: U5-luisteren-02-1 rangschikken → meerkeuze met 4 Nederlandse opties en sleutel in de opties; media zonder beeld", q("SELECT exercise_type::text || '|' || jsonb_array_length(options) || '|' || (options ? correct_answer)::text || '|' || media_production::text FROM public.curriculum_items WHERE item_id = 'U5-luisteren-02-1';"), "meerkeuze|4|true|[\"NS-audio\"]")
        ok("G6.2b U5-luisteren-03-1: sleutel 'achter' staat in de Nederlandse opties", q("SELECT correct_answer || '|' || (options ? correct_answer)::text FROM public.curriculum_items WHERE item_id = 'U5-luisteren-03-1';"), "achter|true")
    if b == "3_L3": ok("G6.3 U5-luisteren-04-3 draagt de volledige dialoog (byte-gelijk aan -1)", q("SELECT (a.input_arabic = b.input_arabic)::text || '|' || length(a.input_arabic) FROM public.curriculum_items a, public.curriculum_items b WHERE a.item_id = 'U5-luisteren-04-3' AND b.item_id = 'U5-luisteren-04-1';"), "true|" + str(len([r for r in csv.DictReader(open(NA[5], encoding="utf-8", newline=""), delimiter="	") if r["item_id"] == "U5-luisteren-04-1"][0]["input_arabic"])))
    if b == "4_R1":
        ok("G6.4 U5-lezen-01: meerdere-antwoorden, 15 opties, correct_options 4 ⊂ opties, strict true, 4 punten", q("SELECT exercise_type::text || '|' || jsonb_array_length(options) || '|' || jsonb_array_length(correct_options) || '|' || (options @> correct_options)::text || '|' || strict_tashkeel::text || '|' || points FROM public.curriculum_items WHERE item_id = 'U5-lezen-01';"), "meerdere-antwoorden|15|4|true|true|4")
        ok("G6.5 U5-lezen-05: gatentekst met sleutel 10:30", q("SELECT exercise_type::text || '|' || correct_answer FROM public.curriculum_items WHERE item_id = 'U5-lezen-05';"), "gatentekst|10:30")
    if b == "6_G1": ok("G6.6 U5-grammatica-02-1: open-tekst → meerkeuze met 3 vormen, sleutel in de opties", q("SELECT exercise_type::text || '|' || jsonb_array_length(options) || '|' || (options ? correct_answer)::text FROM public.curriculum_items WHERE item_id = 'U5-grammatica-02-1';"), "meerkeuze|3|true")
    if b == "9_W04c": ok("G6.7 nazorg W04: U4-luisteren-04-4 = -1 met de nieuwe beurt; reference_media U4-luisteren-03-1 GEAUTEURD", q("SELECT (a.input_arabic = b.input_arabic AND a.input_arabic LIKE '%وَكِيلُو مِنَ الْبُرْتُقَالِ%')::text || '|' || (c.reference_media LIKE '%GEAUTEURD%')::text FROM public.curriculum_items a, public.curriculum_items b, public.curriculum_items c WHERE a.item_id = 'U4-luisteren-04-4' AND b.item_id = 'U4-luisteren-04-1' AND c.item_id = 'U4-luisteren-03-1';"), "true|true")
for wk in WEEKNR:
    laatst = [r["blok"] for r in M if r["week"] == wk][-1]
    rc, msg = stap(laatst, "stand", vinger(laatst)); ok(f"G2.12 p4_stap stand {wk}: week klaar", f"{rc}|{'klaar' in msg}", "0|True")
for s_, f_ in (("slot", "slot_tellingen_N1-W05.sql"), ("zicht_na", "leerderszicht_N1-W05.sql")):
    rc1, rc2, uj, m = P4("slot", s_, f_); ok(f"G3.6 {s_} na blok 13 via p4_log_stap (NA-waarden)", f"{rc1}|{rc2}", "0|0")
# ---------- G3: slotcontrole (NA) ----------
for w in WEKEN: ok(f"G3.1 W0{w} slottellingen = verwacht", q(TEL(w)), slot_verw(SLOT[f"W0{w}"]))
for wk in WEEKNR:
    laatst = [r["blok"] for r in M if r["week"] == wk][-1]
    vt = {l.split("\t")[0]: l.rstrip("\n").split("\t")[2] for l in list(open(f"{SQL}/{MB[laatst]['map']}/verwacht_vingerafdruk.tsv", encoding="utf-8"))[1:]}
    rc, out, err = run(bestand(laatst, "5_controle.sql")); live = dict(l.split("|", 1) for l in out if "|" in l)
    ok(f"G3.2 {wk}: vingerafdruk per rij = NA (5_controle)", str(sum(1 for i in vt if live.get(i) == vt[i])), str(len(vt)))
uj = ruw(open(SQL + "/slot_tellingen_N1-W05.sql", encoding="utf-8").read()); d_ = json.loads(uj)["rows"][0] if uj.startswith("{") else {}
for w in WEKEN:
    kreeg = "|".join(d_.get(f"{k}_w0{w}", "?") for k in ("items", "b25", "needs_image", "strict", "punten", "ns_audio", "student_opname", "vlaggen", "gepubliceerd", "typen"))
    ok(f"G3.3 W0{w}: uitvoer van slot_tellingen_N1-W05.sql = slot_verwacht_N1-W05.json", kreeg, slot_verw(SLOT[f"W0{w}"]))
ok("G3.4 slot_tellingen rijen_totaal|rijen_n1|pogingen_totaal (replica: 2.299 rijen, 0 pogingen)", "|".join(d_.get(k, "?") for k in ("rijen_totaal", "rijen_n1", "pogingen_totaal")), "2299|2299|0")
ok("G3.7 als leerder na P4: W05 82 · twee items 0 · W25 0", q(f"BEGIN; SELECT set_config('request.jwt.claims', '{{\"sub\":\"{LEERDER}\"}}', true); SET LOCAL ROLE authenticated; SELECT (SELECT count(*) FROM public.curriculum_items WHERE week = 5) || '|' || (SELECT count(*) FROM public.curriculum_items WHERE item_id IN ('U4-luisteren-06', 'U4-lezen-11')) || '|' || (SELECT count(*) FROM public.curriculum_items WHERE week = 25); ROLLBACK;"), "82|0|0")
# ---------- G4: terugdraaien 9 → 1 (V-B) ----------
for i, r in enumerate(reversed(M)):
    b = r["blok"]; v = V[b]
    if i == 0:
        for b_ in ("6_G1", "7_W04a", "1_L1"):
            rc_, m_ = logstap(b_, "rollback", pad(b_, "4_rollback.sql"), voor=True)
            ok(f"G4.0 terugdraaien buiten de volgorde: voorcontrole rollback {b_} terwijl 13_W02b nog toegepast is → STOP", f"{rc_}|{'omgekeerde volgorde' in m_}", "2|True")
        rc_, m_ = logstap(b, "noodrollback", pad(b, "3_apply.sql"), voor=True); ok("G4.0d noodrollback met het verkeerde bestand → STOP", f"{rc_}|{'hoort bij' in m_}", "2|True")
        rc_, m_ = logstap(b, "noodrollback", pad(b, "4b_noodrollback.sql"), voor=True); ok("G4.0e voorcontrole noodrollback 13_W02b met 4b → ✓ (niet geplakt)", str(rc_), "0")
    ok(f"G4.1 {b} 7_vinger vóór de rollback = NA van dit blok", vinger(b), vn(b))
    rc1, rc2, uj, m = P4(b, "rollback", "4_rollback.sql"); ok(f"G4.2 {b} rollback (REPEATABLE READ; voorcontrole + p4_log_stap ✓)", f"{psv(uj)}|{rc1}|{rc2}", f"{v['rollback_uitvoer']}|0|0")
    rc1, rc2, uj, m = P4(b, "vinger_terug", "7_vinger_aggregaat.sql"); ok(f"G4.3 {b} 7_vinger na de rollback = vóór dit blok", f"{psv(uj)}|{rc1}|{rc2}", f"{vv(b)}|0|0")
    rc1, m1 = logstap(b, "rollback", pad(b, "4_rollback.sql"), voor=True)
    ok(f"G4.4 {b} tweede rollback: voorcontrole → STOP; toch geplakt = 0", f"{rc1}|{laatste(bestand(b, '4_rollback.sql'))}", f"2|{v['leeg_uitvoer']}")
    if b == "1_L1": ok("G6.8 terug: U5-luisteren-01-2 stimulus غَيم en opties in de oude volgorde", q("SELECT input_arabic || '|' || options::text FROM public.curriculum_items WHERE item_id = 'U5-luisteren-01-2';"), "غَيم|[\"ع\", \"غ\", \"ء\"]")
    if b == "4_R1": ok("G6.9 terug: U5-lezen-01 rangschikken, correct_options NULL, strict false, 15 punten; U5-lezen-05 open-tekst", q("SELECT (SELECT exercise_type::text || '|' || (correct_options IS NULL)::text || '|' || strict_tashkeel::text || '|' || points FROM public.curriculum_items WHERE item_id = 'U5-lezen-01') || '|' || (SELECT exercise_type::text FROM public.curriculum_items WHERE item_id = 'U5-lezen-05');"), "rangschikken|true|false|15|open-tekst")
    if b == "6_G1": ok("G6.10 terug: U5-grammatica-02-1 open-tekst met options []", q("SELECT exercise_type::text || '|' || options::text FROM public.curriculum_items WHERE item_id = 'U5-grammatica-02-1';"), "open-tekst|[]")
    if b == "2_L2": ok("G6.11 terug: U5-luisteren-02-1 rangschikken met 6 lettertegels en sleutel A, media met beeld", q("SELECT exercise_type::text || '|' || jsonb_array_length(options) || '|' || correct_answer || '|' || media_production::text FROM public.curriculum_items WHERE item_id = 'U5-luisteren-02-1';"), "rangschikken|6|A|[\"NS-audio\", \"beeld\"]")
for w in WEKEN: ok(f"G4.6 W0{w} tellingen na het terugdraaien = VOOR", q(TEL(w)), slot_verw(VOORTEL[w]))
rc_, m_ = logstap("1_L1", "vinger_voor", pad("1_L1", "7_vinger_aggregaat.sql"), voor=True); ok("G4.7 na het volledige terugdraaien: het log staat weer op 'niets toegepast'", str(rc_), "0")
LR = list(csv.reader(open(LOGSTD, encoding="utf-8"), delimiter="\t")) if os.path.exists(LOGSTD) else []
ok("G4.8 P4-log op het standaardpad aangemaakt", str(os.path.exists(LOGSTD) and LR[0][:4] == ["tijd", "wie", "blok", "stap"]), "True")
ok("G4.9 P4-log: ✓ vinger_na en ✓ vinger_terug per blok (13 + 13)", f"{sum(1 for c in LR[1:] if c[3] == 'vinger_na' and c[9] == '0')}|{sum(1 for c in LR[1:] if c[3] == 'vinger_terug' and c[9] == '0')}", "13|13")
shutil.copy(LOGSTD, R + "/P4_log_replica_N1-W05.tsv")
# ---------- G5: negatieve tests ----------
nieuwe_db(); b = "1_L1"; v = V[b]
eerste = sorted(l.split("\t")[0] for l in open(f"{SQL}/{MB[b]['map']}/items.txt", encoding="utf-8"))[0]
gr1 = bestand(b, "8_generale_repetitie.sql"); ST, LL = "00000000-0000-0000-0000-00000000000a", "00000000-0000-0000-0000-00000000000b"
q(f"INSERT INTO auth.users (id, last_sign_in_at) VALUES ('{ST}', now() - interval '2 days'); INSERT INTO public.user_roles (user_id, role) VALUES ('{ST}', 'teacher'); INSERT INTO public.curriculum_item_attempts (student_id, item_id) SELECT '{ST}', id FROM public.curriculum_items WHERE item_id = '{eerste}';")
u = laatste(gr1); rc, msg = stap(b, "gr", u); ok("G5.0a activiteit: docent met 1 poging en een login → 1|0|0|1; p4_stap ✓", "|".join(u.split("|")[10:14]) + f"|{rc}", "1|0|0|1|0")
q(f"INSERT INTO auth.users (id, last_sign_in_at) VALUES ('{LL}', now() - interval '40 days'); INSERT INTO public.curriculum_item_attempts (student_id, item_id, created_at) SELECT '{LL}', id, now() - interval '1 day' FROM public.curriculum_items WHERE item_id = '{eerste}';")
u = laatste(gr1); rc, msg = stap(b, "gr", u); ok("G5.0b leerder met 1 poging → pogingen30_leerders = 1 → p4_stap STOP", "|".join(u.split("|")[10:14]) + f"|{rc}|{'activiteit' in msg}", "2|1|0|1|2|True")
q(f"DELETE FROM public.curriculum_item_attempts WHERE student_id = '{LL}'; UPDATE auth.users SET last_sign_in_at = now() - interval '1 day' WHERE id = '{LL}';")
u = laatste(gr1); rc, msg = stap(b, "gr", u); ok("G5.0c leerder met een login < 30 dagen → logins30_leerders = 1 → p4_stap STOP", "|".join(u.split("|")[10:14]) + f"|{rc}|{'activiteit' in msg}", "1|0|1|1|2|True")
q("DELETE FROM public.curriculum_item_attempts; DELETE FROM public.user_roles; DELETE FROM auth.users;")
ok("G5.0d na de activiteitstests: stand L1 = VOOR (de repetitie is netto read-only)", vinger(b), vv(b))
u = vinger("2_L2"); rc, msg = stap("2_L2", "vinger_voor", u); ok("G5.1 volgorde: 7_vinger vóór L2 terwijl L1 niet toegepast is → p4_stap STOP", str(rc), "2")
q(f"UPDATE public.curriculum_items SET question = question || ' ' WHERE item_id = '{eerste}';")
ok(f"G5.2 toestandsgrendel: 1 rij buiten het log gewijzigd ({eerste}) → apply 0", laatste(bestand(b, "3_apply.sql")), v["leeg_uitvoer"])
q(f"UPDATE public.curriculum_items SET question = left(question, length(question) - 1) WHERE item_id = '{eerste}';"); ok("G5.2b stand terug = VOOR", vinger(b), vv(b))
a = bestand(b, "3_apply.sql"); k = a.index("(VALUES"); j = a.index("َ", k)
ok("G5.3 plakgrendel: één fatḥa weg in de VALUES → apply 0", laatste(a[:j] + a[j + 1:]), v["leeg_uitvoer"]); ok("G5.3b stand ongewijzigd", vinger(b), vv(b))
b4 = "2_L2"; v4 = V[b4]
ok("G5.4a L2 apply los (de grendels per rij dwingen de volgorde niet af → daarom 7_vinger + p4_stap)", laatste(bestand(b4, "3_apply.sql")), v4["apply_uitvoer"])
rb = bestand(b4, "4_rollback.sql"); esc = re.findall(r"U&'((?:[^']|'')*)'::(?:text|jsonb)", rb)
def ont(s): return re.sub(r"\\\+([0-9A-F]{6})|\\([0-9A-F]{4})", lambda mm: chr(int(mm.group(1) or mm.group(2), 16)), s.replace("''", "'")).replace("\\\\", "\\")
rauw = rb
for e in esc: rauw = re.sub(re.escape(f"U&'{e}'") + r"::(text|jsonb)", lambda mm: "'" + ont(e).replace("'", "''") + "'::" + mm.group(1), rauw)
ok(f"G5.4b L2-rollback heeft {len(esc)} U&-escape(s); zonder escape niet NFC-stabiel", str(len(esc) > 0 and unicodedata.normalize('NFC', rauw) != rauw), "True")
ok("G5.4c rollback zónder escape, NFC-geplakt → 0 (fail-closed)", laatste(unicodedata.normalize("NFC", rauw)), v4["leeg_uitvoer"])
ok("G5.4d L2 rollback mét escape → terug", laatste(rb), v4["rollback_uitvoer"]); ok("G5.4e blokdeel L2 = VOOR (L1 is in deze verse replica niet toegepast, dus alleen het blokdeel telt)", vinger(b4).split("|")[2:4], vv(b4).split("|")[2:4])
# enum: een waarde buiten de enum weigert de generator
tmp = R + "/g5_enum"; shutil.rmtree(tmp, ignore_errors=True); os.makedirs(tmp)
rows = list(csv.DictReader(open(NA[5], encoding="utf-8", newline=""), delimiter="\t")); kop = list(rows[0].keys())
for r_ in rows:
    if r_["item_id"] == "U5-luisteren-02-1": r_["exercise_type"] = "gatentekts"
with open(f"{tmp}/NA_fout.tsv", "w", encoding="utf-8", newline="") as f:
    w_ = csv.writer(f, delimiter="\t", lineterminator="\n"); w_.writerow(kop); [w_.writerow([r_[c] for c in kop]) for r_ in rows]
E = "meerkeuze|meerdere-antwoorden|open-tekst|gatentekst|bestand-upload|audio-opname|rangschikken|koppelen"; SPEC = "L1=luisteren-01;REST=*"
g = subprocess.run(["python3", "-I", WM + "/scripts/maak_sql_N1-W05.py", VOOR[5], f"{tmp}/NA_fout.tsv", f"{tmp}/sql", "--week", "5", "--blokken", SPEC, "--enum-live", E], capture_output=True, text=True)
ok("G5.5 enumwaarde 'gatentekts' buiten de enum → maak_sql weigert, geen uitmap", f"{g.returncode != 0}|{os.path.exists(tmp + '/sql')}", "True|False")
g = subprocess.run(["python3", "-I", WM + "/scripts/maak_sql_N1-W05.py", VOOR[5], NA[5], f"{tmp}/sql2", "--week", "5", "--blokken", SPEC, "--enum-live", E.replace("|koppelen", "")], capture_output=True, text=True)
ok("G5.6 --enum-live ≠ verwachte enum → maak_sql weigert", f"{g.returncode != 0}|{os.path.exists(tmp + '/sql2')}", "True|False")
# vreemde bundel en p4_stap
tmpm = R + "/g5_vreemd"; shutil.rmtree(tmpm, ignore_errors=True); shutil.copytree(f"{SQL}/{MB['1_L1']['map']}", tmpm + "/1_L1")
p = subprocess.run(["python3", "-I", WM + "/scripts/p4_stap_N1-W05.py", tmpm, "1_L1", "stand", vv("1_L1")], capture_output=True, text=True)
ok("G5.7 bundel zonder BLOKKEN_MANIFEST.tsv → p4_stap STOP", f"{p.returncode}|{'manifest' in (p.stdout + p.stderr).lower()}", "2|True")
p = subprocess.run(["python3", "-I", WM + "/scripts/p4_stap_N1-W05.py", SQL, "4_R2", "stand", vv("1_L1")], capture_output=True, text=True); ok("G5.8 onbekend blok 4_R2 → p4_stap STOP", str(p.returncode), "2")
p = subprocess.run(["python3", "-I", WM + "/scripts/p4_stap_N1-W05.py", SQL, "1_L1", "stand", "82|00000000000000000000000000000000|x"], capture_output=True, text=True); ok("G5.9 vingerafdruk geen ketenwaarde → p4_stap STOP", str(p.returncode), "2")
G5E = {"P4LOG": R + "/g5_log.tsv", "P4SQL": "p3/sql"}; [os.remove(G5E["P4LOG"]) for _ in [0] if os.path.exists(G5E["P4LOG"])]
rc_, m_ = logstap("1_L1", "apply", pad("2_L2", "3_apply.sql"), voor=True, extra=G5E); ok("G5.10a bestandsbinding: 3_apply.sql van 2_L2 voor blok 1_L1 → STOP", f"{rc_}|{'niet gebonden' in m_}", "2|True")
rc_, m_ = logstap("1_L1", "apply", pad("1_L1", "4_rollback.sql"), voor=True, extra=G5E); ok("G5.10b stap apply met 4_rollback.sql → STOP", f"{rc_}|{'hoort bij' in m_}", "2|True")
cp = R + "/g5_kopie"; shutil.rmtree(cp, ignore_errors=True); shutil.copytree(SQL, cp + "/sql")
with open(f"{cp}/sql/{MB['1_L1']['map']}/3_apply.sql", "a", encoding="utf-8") as f: f.write("-- gewijzigd\n")
rc_, m_ = logstap("1_L1", "apply", f"{cp}/sql/{MB['1_L1']['map']}/3_apply.sql", voor=True, extra={**G5E, "P4SQL": cp + "/sql"}); ok("G5.10c gewijzigd 3_apply.sql (md5 ≠ manifest) → STOP", f"{rc_}|{'niet gebonden' in m_ and 'md5' in m_}", "2|True")
r_ = [logstap("1_L1", "vinger_voor", pad("1_L1", "7_vinger_aggregaat.sql"), ruw(bestand("1_L1", "7_vinger_aggregaat.sql")), extra=G5E)[0], logstap("1_L1", "gr", pad("1_L1", "8_generale_repetitie.sql"), ruw(bestand("1_L1", "8_generale_repetitie.sql")), extra=G5E)[0]]
rc_, m_ = logstap("1_L1", "apply", pad("1_L1", "3_apply.sql"), voor=True, extra=G5E); ok("G5.10f juist bestand, juiste toestand (✓ 7_vinger, ✓ gr) → voorcontrole apply ✓", f"{'|'.join(map(str, r_))}|{rc_}", "0|0|0")
G14 = {"P4LOG": R + "/g5_log14.tsv", "P4SQL": "p3/sql"}; [os.remove(G14["P4LOG"]) for _ in [0] if os.path.exists(G14["P4LOG"])]
v7 = lambda: ruw(bestand("1_L1", "7_vinger_aggregaat.sql"))
r14 = [logstap("1_L1", "vinger_voor", pad("1_L1", "7_vinger_aggregaat.sql"), v7(), extra=G14)[0], logstap("1_L1", "apply", pad("1_L1", "3_apply.sql"), "Lovable API error: 503", extra=G14)[0]]
rc_, m_ = logstap("1_L1", "gr", pad("1_L1", "8_generale_repetitie.sql"), voor=True, extra=G14); r14 += [rc_, "onzeker" in m_]
r14 += [logstap("1_L1", "rollback", pad("1_L1", "4_rollback.sql"), voor=True, extra=G14)[0], logstap("2_L2", "vinger_voor", pad("2_L2", "7_vinger_aggregaat.sql"), voor=True, extra=G14)[0],
        logstap("1_L1", "stand", pad("1_L1", "7_vinger_aggregaat.sql"), v7(), extra=G14)[0], logstap("1_L1", "apply", pad("1_L1", "3_apply.sql"), voor=True, extra=G14)[0],
        logstap("1_L1", "gr", pad("1_L1", "8_generale_repetitie.sql"), ruw(bestand("1_L1", "8_generale_repetitie.sql")), extra=G14)[0], logstap("1_L1", "apply", pad("1_L1", "3_apply.sql"), voor=True, extra=G14)[0]]
ok("G5.11 toolfout tijdens apply 1_L1 → onzeker: gr STOP · rollback voorcontrole ✓ · 2_L2 STOP · ✓ stand (= VOOR) → open · apply pas na een nieuwe ✓ gr", "|".join(map(str, r14)), "0|2|2|True|0|2|0|2|0|0")
# ---------- rapport ----------
L = [f"# Replica v4.0 · N1-W05 · rapport\nGemaakt door `scripts/replica_test_N1-W05.py` v4.0 · PostgreSQL 16 lokaal · schema `schema_replica_v2.sql` (md5 `{hashlib.md5(open(SCHEMA_BRON,'rb').read()).hexdigest()}`) · live read-only vergeleken op 2026-10-24 (G0) · gegevens: export N1 2026-10-24 (2.299 rijen; W04 109, W03 100, W02 81, W01 21 = de back-ups van P3) + de 6 policies zoals live, de rol authenticated en één leerder met toegang · manifest `{hashlib.md5(open(SQL + '/BLOKKEN_MANIFEST.tsv','rb').read()).hexdigest()}` · elk SQL-bestand NFC-genormaliseerd vóór het uitvoeren · elke P4-uitkomst beoordeeld door `p4_stap_N1-W05.py` v1.5 en vastgelegd door `p4_log_stap_N1-W05.py` v1.4 (log `P4_log_replica_N1-W05.tsv`).\n",
     f"**Uitslag: {'GROEN' if fout == 0 else 'ROOD'} — {len(resultaten) - fout}/{len(resultaten)} controles ✓**\n", "| controle | | kreeg | verwacht |", "|---|---|---|---|"]
for n, s_, k_, w_ in resultaten: L.append(f"| {n} | {s_} | `{k_[:160]}` | `{w_[:160]}` |")
open(R + "/REPLICA_RAPPORT_N1-W05.md", "w", encoding="utf-8").write("\n".join(L) + "\n")
sh(f"runuser -u claude -- {PGBIN}/pg_ctl -D {DATA} -m fast stop")
print(f"replica: {len(resultaten) - fout}/{len(resultaten)} ✓ · {'GROEN' if fout == 0 else 'ROOD'} · rapport p3/replica/REPLICA_RAPPORT_N1-W05.md")
for n, s_, k_, w_ in resultaten:
    if s_ == "✗": print("  ✗", n, "| kreeg:", k_[:200], "| verwacht:", w_[:200])
sys.exit(1 if fout else 0)
