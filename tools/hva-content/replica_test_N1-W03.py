# replica_test_N1-W03.py v3.2 — Controleur-T (8T) / Maker-T (7T) · P3 N1-W03 · architectuur T v1.1 §4 (P1-18: 9T V1, V2; tegenrapport T P2: V5).
# Basis: replica_test_N1-W02.py v2.2 (zelfde kern-tests), nu voor 7 blokken over drie weken, gestuurd door BLOKKEN_MANIFEST.tsv, en met
# p4_stap_N1-W03.py als scheidsrechter van elke uitkomst (zoals in P4).
# Replica = lokale PostgreSQL 16 met schema_replica_v2.sql (live metadata 2026-10-20; op 2026-10-23 opnieuw read-only vergeleken:
# deel2/schema_live_2026-10-23.json, test G0) + de back-ups VOOR van W03 (100), W02 (81) en W01 (21). Elk SQL-bestand wordt eerst
# NFC-genormaliseerd zoals de Lovable-tool doet, en moet daarbij byte-gelijk blijven.
# G0 schema · G1 leescontroles P3 (alles VOOR) · G2 P4-draaiboek 1 → 7 met p4_stap · G3 slottellingen · G4 terugdraaien 7 → 1 ·
# G5 negatieve tests (grendels, NFC/U&, enum, read-only, 4b, serialisatie, omhulde transactie, volgorde, manifest, toolfout).
# v3.1 (8T C-T06): het P4-draaiboek loopt nu volledig via p4_log_stap v1.2 (voorcontrole per bestand + oordeel, log op het STANDAARDPAD
#   p4/uitvoering/ in een tijdelijke P4BASIS waar die map nog niet bestaat); nieuwe tests: volgorde over de weken (G2.13), dubbel blok (G2.7),
#   terugdraaien buiten de volgorde (G4.0), uitvoer van slot_tellingen_N1-W03.sql = slot_verwacht (G3.3–G3.5), activiteit met echte
#   rijen in auth.users/user_roles/attempts (G5.0), bestandsbinding (G5.13) en de toolfout in een geldige toestand (G5.12e).
# v3.2 (9T P3 V1–V4, S1–S8): de replica bevat nu alle 2.299 rijen van N1 (export N1 2026-10-20; W01–W03 = de back-ups) en de 6 policies van
#   curriculum_items zoals live (G0.6); slot_ref/zicht_voor vóór blok 1 en slot/zicht_na na blok 7 lopen via p4_log_stap (G2.14, G3.6); G6 = de
#   breekscenario's van 9T: apply zonder voorcontrole of zonder ✓ gr, activiteit met en zonder akkoord van Ibra, stand na een verloren log,
#   toolfout met en zonder commit, een gewijzigd log, een log van een andere bundel, slotstappen buiten de volgorde.
# Gebruik: python3 -I replica_test_N1-W03.py <werkmap N1-W03> → p3/replica/REPLICA_RAPPORT_N1-W03.md, exit 1 bij ROOD
import sys, os, json, subprocess, unicodedata, hashlib, csv, re, shutil, time, io
WM = os.path.abspath(sys.argv[1]); P3 = WM + "/p3"; SQL = P3 + "/sql"; R = P3 + "/replica"; os.makedirs(R, exist_ok=True)
PGBIN = "/usr/lib/postgresql/16/bin"; DATA = R + "/pgdata"; SOCK = R + "/sock"; PORT = "5434"
SCHEMA_BRON = WM + "/p3/replica_schema/schema_replica_v2.sql"
SCHEMA = open(SCHEMA_BRON, encoding="utf-8").read().replace("VALUES ('U1'), ('U2');", "VALUES ('U1'), ('U2'), ('U3');")
assert "('U3')" in SCHEMA
N1EXP = WM + "/bron/APP_EXPORT_N1_2026-10-20_W03stap0b.tsv"   # 2.299 rijen; W01–W03 byte-gelijk aan de back-ups (gecontroleerd in G0.0)
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
PSQLCSV = f"psql -X -q -h {SOCK} -p {PORT} -U postgres -v ON_ERROR_STOP=1 --csv"
_N1 = list(csv.DictReader(open(N1EXP, encoding="utf-8", newline=""), delimiter="\t"))
UNITS = "INSERT INTO public.curriculum_units (code) SELECT DISTINCT u FROM (VALUES " + ", ".join(f"('{u}')" for u in sorted({r["unit_code"] for r in _N1})) + ") x(u) ON CONFLICT DO NOTHING;\n"
POLICIES = """CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULL::uuid $$;
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;
CREATE OR REPLACE FUNCTION public.can_access_curriculum(_user_id uuid) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT true $$;
CREATE POLICY "Admins beheren items" ON public.curriculum_items FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Leerkrachten en admins zien alle items" ON public.curriculum_items FOR SELECT USING ((has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Leerkrachten maken items" ON public.curriculum_items FOR INSERT WITH CHECK ((has_role(auth.uid(), 'teacher'::app_role) AND (created_by = auth.uid())));
CREATE POLICY "Leerkrachten verwijderen eigen items" ON public.curriculum_items FOR DELETE USING ((has_role(auth.uid(), 'teacher'::app_role) AND (created_by = auth.uid())));
CREATE POLICY "Leerkrachten wijzigen items" ON public.curriculum_items FOR UPDATE USING (has_role(auth.uid(), 'teacher'::app_role)) WITH CHECK (has_role(auth.uid(), 'teacher'::app_role));
CREATE POLICY "Toegang tot curriculum-items" ON public.curriculum_items FOR SELECT USING ((is_published AND can_access_curriculum(auth.uid())));
"""
def nieuwe_db():
    for q_ in ("DROP DATABASE IF EXISTS replica;", "CREATE DATABASE replica;"):
        r = sh(f'{PSQL} -d postgres -c "{q_}"'); assert r.returncode == 0, r.stderr
    r = subprocess.run(f"{PSQL} -d replica -f -", shell=True, input=SCHEMA + UNITS + POLICIES, capture_output=True, text=True); assert r.returncode == 0, r.stderr
    r = sh(f"""{PSQL} -d replica -c "\\copy public.curriculum_items ({', '.join(EXPCOLS)}) FROM '{N1EXP}' WITH (FORMAT csv, DELIMITER E'\\t', HEADER true, FORCE_NOT_NULL ({', '.join(NN)}))" """)
    assert r.returncode == 0, r.stderr
def run(sql, nfc=True):
    if nfc:
        n = unicodedata.normalize("NFC", sql); assert n == sql, "SQL niet NFC-stabiel"; sql = n
    r = subprocess.run(f"{PSQL} -d replica -f -", shell=True, input=sql, capture_output=True, text=True)
    return r.returncode, [l for l in r.stdout.split("\n") if l.strip()], r.stderr.strip()
def bestand(blok, naam): return open(f"{SQL}/{MB[blok]['map']}/{naam}" if blok != "slot" else f"{SQL}/{naam}", encoding="utf-8").read()
def laatste(sql): rc, out, err = run(sql); return out[-1] if (rc == 0 and out) else f"FOUT rc={rc} {err[:200]}"
def q(sql): rc, out, err = run(sql, nfc=False); assert rc == 0, err; return out[-1] if out else ""
MB = {r["blok"]: r for r in M}
V = {r["blok"]: dict(l.rstrip("\n").split("\t", 1) for l in open(f"{SQL}/{r['map']}/verwacht.txt", encoding="utf-8")) for r in M}
def stap(blok, s, uit):   # p4_stap als scheidsrechter, zoals in P4
    p = subprocess.run(["python3", "-I", WM + "/scripts/w03/p4_stap_N1-W03.py", SQL, blok, s, uit], capture_output=True, text=True)
    return p.returncode, (p.stdout + p.stderr).strip()
def ruw(sql):   # zoals de Lovable-tool: JSON met de rij van de laatste SELECT (kolomnamen = de AS-namen)
    assert unicodedata.normalize("NFC", sql) == sql, "SQL niet NFC-stabiel"
    r = subprocess.run(f"{PSQLCSV} -d replica -f -", shell=True, input=sql, capture_output=True, text=True)
    if r.returncode != 0: return "ERROR: " + r.stderr.strip()[:300]
    rec = [x for x in csv.reader(io.StringIO(r.stdout)) if x]
    return json.dumps({"rows": [dict(zip(rec[-2], rec[-1]))]}, ensure_ascii=False)
def psv(uj):
    try: return "|".join(json.loads(uj)["rows"][0].values())
    except Exception: return uj
TB = R + "/p4basis"; shutil.rmtree(TB, ignore_errors=True); os.makedirs(TB)   # tijdelijke P4BASIS: scripts en p3 gelinkt, p4/ bestaat nog niet
os.symlink(WM + "/scripts", TB + "/scripts"); os.symlink(WM + "/p3", TB + "/p3"); LOGSTD = TB + "/p4/uitvoering/P4_log_N1-W03.tsv"
def logstap(blok, s_, best, uit=None, voor=False, extra=None):   # p4_log_stap v1.2 met het standaardpad van het log (geen P4LOG/P4SQL)
    env = {k_: v_ for k_, v_ in os.environ.items() if k_ not in ("P4LOG", "P4SQL")}; env["P4BASIS"] = TB; env.update(extra or {})
    p_ = subprocess.run(["python3", "-I", WM + "/scripts/w03/p4_log_stap_N1-W03.py", "replica", blok, s_, best] + (["--voor"] if voor else [uit]), capture_output=True, text=True, env=env)
    return p_.returncode, (p_.stdout + p_.stderr).strip()
def pad(blok, naam): return f"p3/sql/{MB[blok]['map']}/{naam}" if blok != "slot" else f"p3/sql/{naam}"
def P4(blok, s_, naam):   # één P4-aanroep zoals in het draaiboek: voorcontrole (volgorde + bestand) → plakken → vastleggen + oordeel
    rc1, m1 = logstap(blok, s_, pad(blok, naam), voor=True)
    if rc1 != 0: return rc1, -1, "(niet geplakt)", m1
    uj = ruw(bestand(blok, naam)); rc2, m2 = logstap(blok, s_, pad(blok, naam), uj)
    return rc1, rc2, uj, m2
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
_bw = lambda w: {r["item_id"]: r for r in csv.DictReader(open(VOOR[w], encoding="utf-8", newline=""), delimiter="\t")}
_ew = lambda w: {r["item_id"]: r for r in _N1 if r["week"] == str(w)}
ok("G0.0 export N1: 2.299 rijen, W01–W03 per item_id gelijk aan de back-ups", f"{len(_N1)}|" + "|".join(str(_bw(w) == _ew(w)) for w in (3, 2, 1)), "2299|True|True|True")
ZL = json.load(open(WM + "/p3/live/leerderszicht_live_2026-10-23_P3.json", encoding="utf-8"))["rows"][0]
ok("G0.6 policies op curriculum_items replica = live (pg_policies, 6 policies)", q("SELECT string_agg(policyname::text || ':' || cmd::text || ':' || array_to_string(roles, ',') || ':' || coalesce(qual, '') || ':' || coalesce(with_check, ''), ' # ' ORDER BY policyname) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'curriculum_items';"), ZL["policies"])
ok("G0.7 rijen totaal = live (2.299)", q("SELECT count(*) FROM public.curriculum_items;"), str(ZL["rijen_totaal"]))
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
for s_, f_ in (("slot_ref", "slot_tellingen_N1-W03.sql"), ("zicht_voor", "leerderszicht_N1-W03.sql")):
    rc1, rc2, uj, m = P4("slot", s_, f_); ok(f"G2.14 {s_} vóór blok 1 via p4_log_stap (VOOR-waarden{', referentie pogingen' if s_ == 'slot_ref' else ', 100/81/21 gepubliceerd, policies = live'})", f"{rc1}|{rc2}", "0|0")
for i, r in enumerate(M):
    b = r["blok"]; v = V[b]
    if b == "5_R2":   # C-T06a: W03 staat op de stand na 4_R1; W02 mag nog niet beginnen
        for s_, f_ in (("vinger_voor", "7_vinger_aggregaat.sql"), ("gr", "8_generale_repetitie.sql"), ("apply", "3_apply.sql")):
            rc_, m_ = logstap("6_W02n", s_, pad("6_W02n", f_), voor=True)
            ok(f"G2.13 volgorde over de weken: voorcontrole {s_} van 6_W02n terwijl 5_R2 (W03) open is → STOP", f"{rc_}|{'volgorde' in m_ and '5_R2' in m_}", "2|True")
        rc_, m_ = logstap("6_W02n", "vinger_voor", pad("6_W02n", "7_vinger_aggregaat.sql"), ruw(bestand("6_W02n", "7_vinger_aggregaat.sql")))
        ok("G2.13d idem met de echte uitkomst van 7_vinger 6_W02n (p4_stap zou ✓ geven) → p4_log_stap STOP op de volgorde", f"{rc_}|{'volgorde' in m_}", "2|True")
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
    if b == "2_L2": ok("G2.9 typewissel heen: U3-luisteren-04 is meerkeuze", q("SELECT exercise_type::text FROM public.curriculum_items WHERE item_id = 'U3-luisteren-04';"), "meerkeuze")
    if b == "3_L3": ok("G2.10 depublicatie: U3-luisteren-08 is_published = false, vlag gezet", q("SELECT is_published::text || '|' || review_flag FROM public.curriculum_items WHERE item_id = 'U3-luisteren-08';"), "false|⚠️ ONTBREEKT · gedepubliceerd (B12)")
    if b == "4_R1": ok("G2.11 U3-lezen-01: 4 punten, 4 sleutels", q("SELECT points::text || '|' || jsonb_array_length(correct_options) FROM public.curriculum_items WHERE item_id = 'U3-lezen-01';"), "4|4")
for wk in ("N1-W03", "N1-W02", "N1-W01"):
    laatst = [r["blok"] for r in M if r["week"] == wk][-1]
    rc, msg = stap(laatst, "stand", vinger(laatst)); ok(f"G2.12 p4_stap stand {wk}: week klaar", f"{rc}|{'klaar' in msg}", "0|True")
for s_, f_ in (("slot", "slot_tellingen_N1-W03.sql"), ("zicht_na", "leerderszicht_N1-W03.sql")):
    rc1, rc2, uj, m = P4("slot", s_, f_); ok(f"G3.6 {s_} na blok 7 via p4_log_stap (NA-waarden{', pogingen ≥ referentie' if s_ == 'slot' else ', 99/81/21 gepubliceerd, U3-luisteren-08 false'})", f"{rc1}|{rc2}", "0|0")
# ---------- G3: slotcontrole (NA) ----------
for w in (3, 2, 1): ok(f"G3.1 W0{w} slottellingen = verwacht (B25, needs_*, strict, punten, vlaggen, gepubliceerd, typen)", q(TEL(w)), slot_verw(SLOT[f"W0{w}"]))
for wk in ("N1-W03", "N1-W02", "N1-W01"):
    laatst = [r["blok"] for r in M if r["week"] == wk][-1]
    vt = {l.split("\t")[0]: l.rstrip("\n").split("\t")[2] for l in list(open(f"{SQL}/{MB[laatst]['map']}/verwacht_vingerafdruk.tsv", encoding="utf-8"))[1:]}
    rc, out, err = run(bestand(laatst, "5_controle.sql"))
    live = dict(l.split("|", 1) for l in out if "|" in l)
    ok(f"G3.2 {wk}: vingerafdruk per rij = NA (5_controle)", str(sum(1 for i in vt if live.get(i) == vt[i])), str(len(vt)))
uj = ruw(open(SQL + "/slot_tellingen_N1-W03.sql", encoding="utf-8").read()); d_ = json.loads(uj)["rows"][0] if uj.startswith("{") else {}
for w in (3, 2, 1):
    kreeg = "|".join(d_.get(f"{k}_w0{w}", "?") for k in ("items", "b25", "needs_image", "strict", "punten", "ns_audio", "student_opname", "vlaggen", "gepubliceerd", "typen"))
    ok(f"G3.3 W0{w}: uitvoer van slot_tellingen_N1-W03.sql = slot_verwacht_N1-W03.json", kreeg, slot_verw(SLOT[f"W0{w}"]))
ok("G3.4 slot_tellingen rijen_totaal|rijen_n1|pogingen_totaal (replica: N1 volledig = 2.299 rijen, 0 pogingen)", "|".join(d_.get(k, "?") for k in ("rijen_totaal", "rijen_n1", "pogingen_totaal")), "2299|2299|0")
ok("G3.5 slot_verwacht bevat rijen_totaal = rijen_n1 = 2299 (live) en de regel voor de pogingen (C-T09)", f"{SLOT.get('rijen_totaal')}|{SLOT.get('rijen_n1')}|{'pogingen_totaal' in SLOT}", "2299|2299|True")
# ---------- G4: terugdraaien 7 → 1 (V-B) ----------
for i, r in enumerate(reversed(M)):
    b = r["blok"]; v = V[b]
    if i == 0:   # C-T06e: alle 7 blokken toegepast
        for b_ in ("5_R2", "6_W02n", "1_L1"):
            rc_, m_ = logstap(b_, "rollback", pad(b_, "4_rollback.sql"), voor=True)
            ok(f"G4.0 terugdraaien buiten de volgorde: voorcontrole rollback {b_} terwijl 7_W01n nog toegepast is → STOP", f"{rc_}|{'omgekeerde volgorde' in m_}", "2|True")
        rc_, m_ = logstap(b, "noodrollback", pad(b, "3_apply.sql"), voor=True)
        ok("G4.0d noodrollback met het verkeerde bestand (3_apply.sql) → STOP", f"{rc_}|{'hoort bij' in m_}", "2|True")
        rc_, m_ = logstap(b, "noodrollback", pad(b, "4b_noodrollback.sql"), voor=True)
        ok("G4.0e voorcontrole noodrollback 7_W01n met 4b_noodrollback.sql → ✓ (niet geplakt)", str(rc_), "0")
    ok(f"G4.1 {b} 7_vinger vóór de rollback = NA van dit blok", vinger(b), vn(b))
    rc1, rc2, uj, m = P4(b, "rollback", "4_rollback.sql"); ok(f"G4.2 {b} rollback (REPEATABLE READ; voorcontrole + p4_log_stap ✓)", f"{psv(uj)}|{rc1}|{rc2}", f"{v['rollback_uitvoer']}|0|0")
    rc1, rc2, uj, m = P4(b, "vinger_terug", "7_vinger_aggregaat.sql"); ok(f"G4.3 {b} 7_vinger na de rollback = vóór dit blok (voorcontrole + p4_log_stap ✓)", f"{psv(uj)}|{rc1}|{rc2}", f"{vv(b)}|0|0")
    rc1, m1 = logstap(b, "rollback", pad(b, "4_rollback.sql"), voor=True)
    ok(f"G4.4 {b} tweede rollback: voorcontrole → STOP (log: niet toegepast); toch geplakt = 0", f"{rc1}|{laatste(bestand(b, '4_rollback.sql'))}", f"2|{v['leeg_uitvoer']}")
    if b == "2_L2": ok("G4.5 typewissel terug: U3-luisteren-04 is open-tekst", q("SELECT exercise_type::text FROM public.curriculum_items WHERE item_id = 'U3-luisteren-04';"), "open-tekst")
for w in (3, 2, 1): ok(f"G4.6 W0{w} tellingen na het terugdraaien = VOOR", q(TEL(w)), slot_verw(VOORTEL[w]))
rc_, m_ = logstap("1_L1", "vinger_voor", pad("1_L1", "7_vinger_aggregaat.sql"), voor=True); ok("G4.7 na het volledige terugdraaien: het log staat weer op 'niets toegepast' (voorcontrole vinger_voor 1_L1 ✓)", str(rc_), "0")
LR = list(csv.reader(open(LOGSTD, encoding="utf-8"), delimiter="\t")) if os.path.exists(LOGSTD) else []
ok("G4.8 P4-log op het standaardpad p4/uitvoering/P4_log_N1-W03.tsv aangemaakt (map bestond niet; C-T03, C-T06f)", str(os.path.exists(LOGSTD) and LR[0][:4] == ["tijd", "wie", "blok", "stap"]), "True")
ok("G4.9 P4-log: ✓ vinger_na en ✓ vinger_terug per blok (7 + 7)", f"{sum(1 for c in LR[1:] if c[3] == 'vinger_na' and c[9] == '0')}|{sum(1 for c in LR[1:] if c[3] == 'vinger_terug' and c[9] == '0')}", "7|7")
shutil.copy(LOGSTD, R + "/P4_log_replica_N1-W03.tsv")
# ---------- G5: negatieve tests ----------
nieuwe_db(); b = "1_L1"; v = V[b]
eerste = sorted(l.split("\t")[0] for l in open(f"{SQL}/{MB[b]['map']}/items.txt", encoding="utf-8"))[0]
gr1 = bestand(b, "8_generale_repetitie.sql"); ST, LL = "00000000-0000-0000-0000-00000000000a", "00000000-0000-0000-0000-00000000000b"
q(f"INSERT INTO auth.users (id, last_sign_in_at) VALUES ('{ST}', now() - interval '2 days'); INSERT INTO public.user_roles (user_id, role) VALUES ('{ST}', 'teacher'); "
  f"INSERT INTO public.curriculum_item_attempts (student_id, item_id) SELECT '{ST}', id FROM public.curriculum_items WHERE item_id = '{eerste}';")
u = laatste(gr1); rc, msg = stap(b, "gr", u)
ok("G5.0a activiteit (C-T06c): docent met 1 poging en een login → 1|0|0|1 (pogingen30|leerders|leerder-logins|staf-logins); p4_stap ✓", "|".join(u.split("|")[10:14]) + f"|{rc}", "1|0|0|1|0")
q(f"INSERT INTO auth.users (id, last_sign_in_at) VALUES ('{LL}', now() - interval '40 days'); INSERT INTO public.curriculum_item_attempts (student_id, item_id, created_at) SELECT '{LL}', id, now() - interval '1 day' FROM public.curriculum_items WHERE item_id = '{eerste}';")
u = laatste(gr1); rc, msg = stap(b, "gr", u)
ok("G5.0b leerder met 1 poging (login > 30 dagen) → pogingen30_leerders = 1 → p4_stap STOP", "|".join(u.split("|")[10:14]) + f"|{rc}|{'activiteit' in msg}", "2|1|0|1|2|True")
q(f"DELETE FROM public.curriculum_item_attempts WHERE student_id = '{LL}'; UPDATE auth.users SET last_sign_in_at = now() - interval '1 day' WHERE id = '{LL}';")
u = laatste(gr1); rc, msg = stap(b, "gr", u)
ok("G5.0c leerder zonder poging maar met een login < 30 dagen → logins30_leerders = 1 → p4_stap STOP", "|".join(u.split("|")[10:14]) + f"|{rc}|{'activiteit' in msg}", "1|0|1|1|2|True")
q("DELETE FROM public.curriculum_item_attempts; DELETE FROM public.user_roles; DELETE FROM auth.users;")
ok("G5.0d na de activiteitstests: stand L1 = VOOR (de repetitie is netto read-only)", vinger(b), vv(b))
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
if os.path.exists(logt): os.remove(logt)
p = subprocess.run(["python3", "-I", WM + "/scripts/w03/p4_log_stap_N1-W03.py", "replica", "1_L1", "apply", "p3/sql/N1-W03/1_L1/3_apply.sql", "Lovable API error: 503"], capture_output=True, text=True, env={**os.environ, "P4LOG": logt, "P4BASIS": WM, "P4SQL": "p3/sql"})
ok("G5.12e toolfout zonder resultaatrij (503), in een geldige toestand met het juiste bestand → p4_log_stap STOP (uitvoer niet bruikbaar)", f"{p.returncode}|{'niet bruikbaar' in p.stdout}", "2|True")
p = subprocess.run(["python3", "-I", WM + "/scripts/w03/p4_log_stap_N1-W03.py", "replica", "1_L1", "vinger_voor", "p3/sql/N1-W03/1_L1/7_vinger_aggregaat.sql", json.dumps({"rows": [{"week_blok_rest": vv("1_L1")}]})], capture_output=True, text=True, env={**os.environ, "P4LOG": logt, "P4BASIS": WM, "P4SQL": "p3/sql"})
ok("G5.12f p4_log_stap met een geldige uitkomst → ✓", str(p.returncode), "0")
G5E = {"P4LOG": R + "/p4log_g513.tsv"}
if os.path.exists(G5E["P4LOG"]): os.remove(G5E["P4LOG"])
rc_, m_ = logstap("1_L1", "apply", pad("2_L2", "3_apply.sql"), voor=True, extra=G5E); ok("G5.13a bestandsbinding (C-T02): 3_apply.sql van 2_L2 voor blok 1_L1 → STOP", f"{rc_}|{'niet gebonden' in m_}", "2|True")
rc_, m_ = logstap("1_L1", "apply", pad("1_L1", "4_rollback.sql"), voor=True, extra=G5E); ok("G5.13b stap apply met 4_rollback.sql → STOP", f"{rc_}|{'hoort bij' in m_}", "2|True")
cp = R + "/g513"; shutil.rmtree(cp, ignore_errors=True); shutil.copytree(SQL, cp + "/sql")
with open(f"{cp}/sql/{MB['1_L1']['map']}/3_apply.sql", "a", encoding="utf-8") as f: f.write("-- gewijzigd\n")
rc_, m_ = logstap("1_L1", "apply", f"{cp}/sql/{MB['1_L1']['map']}/3_apply.sql", voor=True, extra={**G5E, "P4SQL": cp + "/sql"}); ok("G5.13c gewijzigd 3_apply.sql (md5 ≠ SQL_MANIFEST) → STOP", f"{rc_}|{'niet gebonden' in m_ and 'md5' in m_}", "2|True")
rc_, m_ = logstap("1_L1", "apply", "-", voor=True, extra=G5E); ok("G5.13d apply zonder SQL-bestand → STOP", f"{rc_}|{'zonder SQL-bestand' in m_}", "2|True")
rc_, m_ = logstap("1_L1", "apply", "bron/APP_BACKUP_N1-W03_2026-10-20.tsv", voor=True, extra={**G5E, "P4BASIS": WM}); ok("G5.13e pad buiten de SQL-root → STOP", f"{rc_}|{'niet gebonden' in m_}", "2|True")
r_ = [logstap("1_L1", "vinger_voor", pad("1_L1", "7_vinger_aggregaat.sql"), ruw(bestand("1_L1", "7_vinger_aggregaat.sql")), extra=G5E)[0], logstap("1_L1", "gr", pad("1_L1", "8_generale_repetitie.sql"), ruw(bestand("1_L1", "8_generale_repetitie.sql")), extra=G5E)[0]]
rc_, m_ = logstap("1_L1", "apply", pad("1_L1", "3_apply.sql"), voor=True, extra=G5E); ok("G5.13f juist bestand, juiste toestand (✓ 7_vinger, ✓ gr) → voorcontrole ✓", f"{'|'.join(map(str, r_))}|{rc_}|{'voorcontrole' in m_}", "0|0|0|True")
G14 = {"P4LOG": R + "/p4log_g514.tsv"}   # toolfout tijdens de apply: toestand "onzeker" tot een volgende ✓ 7_vinger (p4_log_stap v1.2.1)
if os.path.exists(G14["P4LOG"]): os.remove(G14["P4LOG"])
v7 = lambda: ruw(bestand("1_L1", "7_vinger_aggregaat.sql"))
r14 = [logstap("1_L1", "vinger_voor", pad("1_L1", "7_vinger_aggregaat.sql"), v7(), extra=G14)[0],
       logstap("1_L1", "apply", pad("1_L1", "3_apply.sql"), "Lovable API error: 503", extra=G14)[0]]
rc_, m_ = logstap("1_L1", "gr", pad("1_L1", "8_generale_repetitie.sql"), voor=True, extra=G14); r14 += [rc_, "onzeker" in m_]
r14 += [logstap("1_L1", "rollback", pad("1_L1", "4_rollback.sql"), voor=True, extra=G14)[0], logstap("1_L1", "noodrollback", pad("1_L1", "4b_noodrollback.sql"), voor=True, extra=G14)[0],
        logstap("2_L2", "vinger_voor", pad("2_L2", "7_vinger_aggregaat.sql"), voor=True, extra=G14)[0],
        logstap("1_L1", "vinger_voor", pad("1_L1", "7_vinger_aggregaat.sql"), v7(), extra=G14)[0],
        logstap("1_L1", "apply", pad("1_L1", "3_apply.sql"), voor=True, extra=G14)[0],
        logstap("1_L1", "gr", pad("1_L1", "8_generale_repetitie.sql"), ruw(bestand("1_L1", "8_generale_repetitie.sql")), extra=G14)[0],
        logstap("1_L1", "apply", pad("1_L1", "3_apply.sql"), voor=True, extra=G14)[0]]
ok("G5.14 toolfout tijdens apply 1_L1 → onzeker: gr STOP · rollback en 4b mogen (voorcontrole) · 2_L2 STOP · na ✓ 7_vinger (= VOOR) open, apply pas na een nieuwe ✓ gr",
   "|".join(map(str, r14)), "0|2|2|True|0|0|2|0|2|0|0")
# ---------- G6: breekscenario's van 9T (P3), op eigen logs; uitkomsten zoals de tool ze geeft ----------
def J(blok, s_, act="0|0|0|0|", eind=None, iso="repeatable read"):   # de JSON-rij die de tool bij een verwachte uitkomst geeft
    v = V[blok]
    if s_ in ("vinger_voor", "vinger_terug"): return json.dumps({"rows": [{"week_blok_rest": vv(blok)}]})
    if s_ == "vinger_na": return json.dumps({"rows": [{"week_blok_rest": vn(blok)}]})
    if s_ == "gr":
        d = (eind or v["gr_eindrij"]).split("|"); return json.dumps({"rows": [dict(zip(("start", "apply", "na_apply", "rollback", "na_rollback"), ["|".join(d[i:i + 2]) for i in range(0, 10, 2)]), activiteit=act, isolatie=iso)]})
    if s_ == "apply": a, i_ = v["apply_uitvoer"].rsplit("|", 1); return json.dumps({"rows": [{"apply": a, "isolatie": i_}]})
def nieuw_log(n):
    p_ = R + f"/p4log_g6_{n}.tsv"
    if os.path.exists(p_): os.remove(p_)
    return {"P4LOG": p_}
def L6(e, b, s_, uit=None, voor=False, **kw): return logstap(b, s_, pad(b, {"vinger_voor": "7_vinger_aggregaat.sql", "vinger_na": "7_vinger_aggregaat.sql", "stand": "7_vinger_aggregaat.sql", "gr": "8_generale_repetitie.sql", "apply": "3_apply.sql", "rollback": "4_rollback.sql", "noodrollback": "4b_noodrollback.sql"}[s_]), uit, voor, extra=e)
e = nieuw_log(1); r_ = [L6(e, "1_L1", "vinger_voor", J("1_L1", "vinger_voor"))[0], L6(e, "1_L1", "gr", J("1_L1", "gr"))[0]]
rc_, m_ = L6(e, "1_L1", "apply", J("1_L1", "apply")); laatste_regel = open(e["P4LOG"], encoding="utf-8").read().rstrip("\n").split("\n")[-1].split("\t")
ok("G6.1 (S4) apply-uitkomst zonder voorcontrole direct ervóór → STOP, en de uitkomst staat toch in het log", f"{'|'.join(map(str, r_))}|{rc_}|{'voorcontrole' in m_}|{laatste_regel[8] == V['1_L1']['apply_uitvoer']}", "0|0|2|True|True")
e = nieuw_log(2); r_ = [L6(e, "1_L1", "vinger_voor", J("1_L1", "vinger_voor"))[0], L6(e, "1_L1", "gr", J("1_L1", "gr", act="1|1|0|1|2026-10-23 10:00:00+00"))[0], L6(e, "1_L1", "apply", voor=True)[0]]
rc_, m_ = logstap("1_L1", "gr", pad("1_L1", "8_generale_repetitie.sql"), J("1_L1", "gr", act="1|1|0|1|2026-10-23 10:00:00+00"), extra=e)
r_ += [L6(e, "1_L1", "apply", voor=True)[0]]
rc2_, m2_ = subprocess.run(["python3", "-I", WM + "/scripts/w03/p4_log_stap_N1-W03.py", "replica", "1_L1", "gr", pad("1_L1", "8_generale_repetitie.sql"), J("1_L1", "gr", act="1|1|0|1|2026-10-23 10:00:00+00"), "--akkoord-ibra", "Ja, ga door: dat is mijn testleerling."], capture_output=True, text=True, env={**{k_: v_ for k_, v_ in os.environ.items() if k_ not in ("P4LOG", "P4SQL")}, "P4BASIS": TB, **e}).returncode, open(e["P4LOG"], encoding="utf-8").read()
r_ += [rc2_, "«Ja, ga door: dat is mijn testleerling.»" in m2_, L6(e, "1_L1", "apply", voor=True)[0]]
ok("G6.2 (S7) gr met leerdersactiviteit → STOP, apply-voorcontrole STOP; nogmaals → STOP; met --akkoord-ibra → ✓ (akkoord letterlijk in het log), apply-voorcontrole ✓", "|".join(map(str, r_)), "0|2|2|2|0|True|0")
e = nieuw_log(3); r_ = [L6(e, "1_L1", "vinger_voor", J("1_L1", "vinger_voor"))[0], L6(e, "1_L1", "apply", voor=True)[0]]
eind_fout = "|".join(V["1_L1"]["gr_eindrij"].split("|")[:9] + ["0" * 32])
r_ += [L6(e, "1_L1", "gr", J("1_L1", "gr", eind=eind_fout))[0], L6(e, "1_L1", "apply", voor=True)[0], L6(e, "1_L1", "gr", J("1_L1", "gr", iso="read committed"))[0], L6(e, "1_L1", "apply", voor=True)[0]]
ok("G6.3 (S8) zonder gr → apply-voorcontrole STOP; gr met een andere na_rollback of isolatie → STOP en apply blijft dicht", "|".join(map(str, r_)), "0|2|2|2|2|2")
e = nieuw_log(4); st3 = f"{V['3_L3']['week_na']}|{V['3_L3']['blok_na']}|{V['3_L3']['rest']}"
r_ = [L6(e, "1_L1", "stand", json.dumps({"rows": [{"week_blok_rest": st3}]}))[0], L6(e, "4_R1", "vinger_voor", voor=True)[0], L6(e, "3_L3", "rollback", voor=True)[0], L6(e, "2_L2", "rollback", voor=True)[0], L6(e, "6_W02n", "vinger_voor", voor=True)[0]]
ok("G6.4 (S1) log verloren, live na 3_L3: ✓ stand in een nieuw log zet W03 op 3 van 5 → vinger_voor 4_R1 ✓, rollback 3_L3 ✓, rollback 2_L2 STOP, 6_W02n STOP", "|".join(map(str, r_)), "0|0|0|2|2")
e = nieuw_log(5); r_ = [L6(e, "1_L1", "vinger_voor", J("1_L1", "vinger_voor"))[0], L6(e, "1_L1", "gr", J("1_L1", "gr"))[0], L6(e, "1_L1", "apply", voor=True)[0], L6(e, "1_L1", "apply", "Lovable API error: 503")[0]]
st1 = vn("1_L1"); r_ += [L6(e, "1_L1", "gr", voor=True)[0], L6(e, "1_L1", "stand", json.dumps({"rows": [{"week_blok_rest": st1}]}))[0], L6(e, "1_L1", "vinger_na", J("1_L1", "vinger_na"))[0], L6(e, "2_L2", "vinger_voor", voor=True)[0]]
ok("G6.5 (S2) 503 mét commit: onzeker (gr STOP) → ✓ stand toont 1_L1 toegepast → vinger_na ✓ → 2_L2 mag", "|".join(map(str, r_)), "0|0|0|2|2|0|0|0")
e = nieuw_log(6); r_ = [L6(e, "1_L1", "vinger_voor", J("1_L1", "vinger_voor"))[0], L6(e, "1_L1", "gr", J("1_L1", "gr"))[0], L6(e, "1_L1", "apply", voor=True)[0], L6(e, "1_L1", "apply", "Lovable API error: 503")[0]]
r_ += [L6(e, "1_L1", "stand", J("1_L1", "vinger_voor"))[0], L6(e, "1_L1", "apply", voor=True)[0], L6(e, "1_L1", "gr", J("1_L1", "gr"))[0], L6(e, "1_L1", "apply", voor=True)[0]]
ok("G6.6 (S3) 503 zonder commit: ✓ stand toont 1_L1 open → apply pas na een nieuwe ✓ gr (geen lus)", "|".join(map(str, r_)), "0|0|0|2|0|2|0|0")
e = nieuw_log(7); L6(e, "1_L1", "vinger_voor", J("1_L1", "vinger_voor")); L6(e, "1_L1", "gr", J("1_L1", "gr", act="1|1|0|1|"))
t_ = open(e["P4LOG"], encoding="utf-8").read().split("\n"); c_ = t_[2].split("\t"); c_[9] = "0"; t_[2] = "\t".join(c_); open(e["P4LOG"], "w", encoding="utf-8").write("\n".join(t_))
rc_, m_ = L6(e, "1_L1", "apply", voor=True)
e2 = nieuw_log(8); L6(e2, "1_L1", "vinger_voor", J("1_L1", "vinger_voor")); t_ = open(e2["P4LOG"], encoding="utf-8").read().split("\n")
c_ = t_[1].split("\t"); c_[2], c_[3] = "5_R2", "vinger_na"; t_.insert(2, "\t".join(c_)); open(e2["P4LOG"], "w", encoding="utf-8").write("\n".join(t_))
rc2_, m2_ = L6(e2, "6_W02n", "vinger_voor", voor=True)
ok("G6.7 (S6) gewijzigde exit in het log of een ingevoegde regel '5_R2 vinger_na' → STOP (ketenhash)", f"{rc_}|{'ketenhash' in m_}|{rc2_}|{'ketenhash' in m2_}", "2|True|2|True")
e = nieuw_log(9); L6(e, "1_L1", "vinger_voor", J("1_L1", "vinger_voor")); t_ = open(e["P4LOG"], encoding="utf-8").read().rstrip("\n").split("\n")
vorige = hashlib.md5(t_[0].encode()).hexdigest(); nieuw_ = [t_[0]]
for l_ in t_[1:]:
    c_ = l_.split("\t"); c_[11] = "1d29b241" + c_[11][8:]; c_[12] = hashlib.md5((vorige + "\t" + "\t".join(c_[:12])).encode()).hexdigest(); vorige = c_[12]; nieuw_.append("\t".join(c_))
open(e["P4LOG"], "w", encoding="utf-8").write("\n".join(nieuw_) + "\n"); rc_, m_ = L6(e, "1_L1", "gr", voor=True)
e2 = nieuw_log(10); open(e2["P4LOG"], "w", encoding="utf-8").write("tijd\twie\tblok\tstap\tbestand\tbytes\tmd5_bestand\truwe_uitvoer\tuitkomst\texit\tp4_stap\n"); rc2_, m2_ = L6(e2, "1_L1", "vinger_voor", voor=True)
ok("G6.8 (S5) log van een andere bundel (manifest ≠, keten wel gaaf) → STOP; log met de kop van v1.2 → STOP", f"{rc_}|{'andere bundel' in m_}|{rc2_}|{'kop' in m2_}", "2|True|2|True")
e = nieuw_log(11)   # de toestand komt uit het log
r_ = [logstap("slot", "slot", pad("slot", "slot_tellingen_N1-W03.sql"), voor=True, extra=e)[0]]
L6(e, "1_L1", "stand", json.dumps({"rows": [{"week_blok_rest": vn("1_L1")}]}))
r_ += [logstap("slot", "slot_ref", pad("slot", "slot_tellingen_N1-W03.sql"), voor=True, extra=e)[0], logstap("slot", "zicht_voor", pad("slot", "leerderszicht_N1-W03.sql"), voor=True, extra=e)[0],
       logstap("slot", "zicht_na", pad("slot", "leerderszicht_N1-W03.sql"), voor=True, extra=e)[0], logstap("slot", "slot_ref", pad("slot", "leerderszicht_N1-W03.sql"), voor=True, extra=nieuw_log(12))[0]]
ok("G6.9 slotstappen buiten de volgorde: slot zonder alle blokken/zonder slot_ref → STOP; slot_ref en zicht_voor na een toegepast blok → STOP; zicht_na te vroeg → STOP; slot_ref met leerderszicht.sql → STOP", "|".join(map(str, r_)), "2|2|2|2|2")
SV_ = json.load(open(SQL + "/slot_verwacht_N1-W03.json", encoding="utf-8"))
rij = {f"{k}_{w.lower()}": SV_[w][k] for w in ("W03", "W02", "W01") for k in ("items", "b25", "needs_image", "strict", "punten", "ns_audio", "student_opname", "vlaggen", "gepubliceerd", "typen")}; rij.update(rijen_totaal=2299, rijen_n1=2299, pogingen_totaal=45)
p6 = lambda u, *x: subprocess.run(["python3", "-I", WM + "/scripts/w03/p4_stap_N1-W03.py", SQL, "slot", "slot", json.dumps(u, ensure_ascii=False)] + list(x), capture_output=True, text=True).returncode
ok("G6.10 p4_stap slot: NA-rij met pogingen 45 ≥ ref 45 → ✓ · ref 46 → STOP · één getal anders → STOP · zonder --ref → STOP", f"{p6(rij, '--ref', '45')}|{p6(rij, '--ref', '46')}|{p6({**rij, 'punten_w02': 108}, '--ref', '45')}|{p6(rij)}", "0|2|2|2")
# ---------- rapport ----------
groen = sum(1 for r_ in resultaten if r_[1] == "✓"); totaal = len(resultaten)
L = [f"# Replica v3.2 · N1-W03 · rapport\nGemaakt door `scripts/w03/replica_test_N1-W03.py` v3.2 · PostgreSQL 16 lokaal · schema `schema_replica_v2.sql` (md5 `{hashlib.md5(open(SCHEMA_BRON,'rb').read()).hexdigest()}`, + unit U3), op 2026-10-23 read-only vergeleken met live (G0) · gegevens: export N1 2026-10-20 (2.299 rijen; W03 100, W02 81 en W01 21 = de back-ups) + de 6 policies zoals live · manifest `{hashlib.md5(open(SQL + '/BLOKKEN_MANIFEST.tsv','rb').read()).hexdigest()}` · elk SQL-bestand NFC-genormaliseerd vóór het uitvoeren (zoals de tool) · elke P4-uitkomst beoordeeld door `p4_stap_N1-W03.py`.\n",
     f"**Uitslag: {'REPLICA GROEN' if fout == 0 else 'REPLICA ROOD'} · {groen}/{totaal}**\n", "| test | | kreeg | verwacht |", "|---|---|---|---|"]
for n_, s_, k_, v_ in resultaten: L.append(f"| {n_} | {s_} | `{k_}` | `{v_}` |")
open(R + "/REPLICA_RAPPORT_N1-W03.md", "w", encoding="utf-8").write("\n".join(L) + "\n")
print(f"{'REPLICA GROEN' if fout == 0 else 'REPLICA ROOD'} {groen}/{totaal}")
for n_, s_, k_, v_ in resultaten:
    if s_ == "✗": print("  ✗", n_, "| kreeg", k_[:200], "| verwacht", v_[:200])
sh(f"runuser -u claude -- {PGBIN}/pg_ctl -D {DATA} -m fast stop")
sys.exit(1 if fout else 0)
