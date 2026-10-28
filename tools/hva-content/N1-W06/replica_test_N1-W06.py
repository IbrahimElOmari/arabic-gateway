# replica_test_N1-W06.py v4.1.2 (9T P3 V4: vaste vorm van de C7-voorcontrole en het exacte akkoord, G2.21–G2.22) · v4.1.1 (9D P3 R1: G2.10 koppelen zichtbaar per W06-blok; variant B zonder apart blok C7t) · v4.1 — Controleur-T (8T) / Maker-T (7T) · P3 N1-W06 · architectuur T v1.1 §3 (de zeven inserttests), §5 (slot), ADR-W06-1/3/5;
# 9T P2 F4/F5/F7. = replica_test_N1-W05.py v4.0 voor één variant (A = p3/sql, B = p3/sql_B) met insertblokken:
#   G0 schema/data = live (READ ONLY van 2026-10-27 na main 244de3e: kolommen, defaults, constraints, trigger, RLS, enum, policies, FK's naar
#      curriculum_items met CASCADE, de functie curriculum_unit_accessible) · G1 leescontroles P3 (live = back-up, zonder de nieuwe rijen) ·
#   G2 P4 1 → n met p4_stap_N1-W06.py v1.6 en p4_log_stap_N1-W06.py v1.5 (insertblokken: insert, tweede insert = 0, droogloop na de insert; na elk
#      W06-blok: reeks_fout 0 en geen ongepubliceerde rij zichtbaar als leerder) · G3 slotcontrole (slot_tellingen, 5_controle, leerderszicht,
#      volgorde als leerder) · G4 terugdraaien n → eerste updateblok (insertblokken weigeren; «teruggedraaid» = stand na de inserts; een nieuwe
#      insert = 0) · G5 negatieve tests (activiteit, volgorde, toestands- en plakgrendel, U&-escapes, enum, vreemde bundel, toolfout) en de
#      inserttests (0b vóór 0a, bestaande id, afgekapte VALUES, gewijzigd veld, RETURNING-controle F5, generator weigert) · G6 inhoud per blok.
# Replica: PostgreSQL 16 lokaal (C.UTF-8; live 17.6 en_US.UTF-8: alle aggregaten sorteren COLLATE "C"), schema_replica_v2.sql + units uit de
# export + replica_policies_N1-W06.sql, alle 2.299 rijen van N1 (export N1 2026-10-27 na P4 W05 = 0083dcac…; W06, W05, W04 = de back-ups).
# Elk SQL-bestand wordt NFC-genormaliseerd vóór het uitvoeren (zoals de tool). Niets raakt de live database.
# Gebruik: python3 -I replica_test_N1-W06.py <werkmap> A|B → p3/replica/REPLICA_RAPPORT_N1-W06_<A|B>.md, exit 1 bij ROOD
import sys, os, json, subprocess, unicodedata, hashlib, csv, re, shutil, io, collections
WM = os.path.abspath(sys.argv[1]); VAR = sys.argv[2]; assert VAR in ("A", "B")
P3 = WM + "/p3"; ROOT = "p3/sql" if VAR == "A" else "p3/sql_B"; SQL = WM + "/" + ROOT; R = P3 + "/replica"; os.makedirs(R, exist_ok=True)
PGBIN = "/usr/lib/postgresql/16/bin"; DATA = R + "/pgdata"; SOCK = R + "/sock"; PORT = "5436"
SCHEMA_BRON = P3 + "/replica_schema/schema_replica_v2.sql"
N1EXP = WM + "/bron/APP_EXPORT_N1_2026-10-27_naP4.tsv"
VOOR = {6: WM + "/bron/APP_BACKUP_N1-W06_2026-10-27.tsv", 5: WM + "/bron/APP_BACKUP_N1-W05_2026-10-27_P3.tsv", 4: WM + "/bron/APP_BACKUP_N1-W04_2026-10-27_P3.tsv"}
NA = {6: P3 + ("/APP_NA_N1-W06.tsv" if VAR == "A" else "/APP_NA_N1-W06_terugval.tsv"), 5: P3 + "/APP_NA_N1-W05.tsv", 4: P3 + "/APP_NA_N1-W04.tsv"}
WEKEN = (6, 5, 4)
EXPCOLS = ["item_id","unit_code","week","skill","exercise_type","exercise_subtype","display_order","instruction_nl","question","options","correct_answer","correct_options","feedback_correct","feedback_incorrect","input_arabic","input_transliteration","input_translation_nl","reference_media","media_production","media_url","media_alt","audio_url","image_url","points","review_flag","is_published","strict_tashkeel","id","created_at","updated_at"]
NN = ["exercise_subtype","instruction_nl","question","correct_answer","feedback_correct","feedback_incorrect","input_arabic","input_transliteration","input_translation_nl","reference_media","review_flag"]
M = [dict(zip(("volgorde", "week", "blok", "map", "md5_verwacht", "week_voor", "week_na", "soort"), l.rstrip("\n").split("\t"))) for l in list(open(SQL + "/BLOKKEN_MANIFEST.tsv", encoding="utf-8"))[1:]]
MB = {r["blok"]: r for r in M}
V = {r["blok"]: dict(l.rstrip("\n").split("\t", 1) for l in open(f"{SQL}/{r['map']}/verwacht.txt", encoding="utf-8")) for r in M}
WEEKNR = {"N1-W06": 6, "N1-W05": 5, "N1-W04": 4}
WEEKMAPPEN = list(dict.fromkeys(r["week"] for r in M))
INSB = [r["blok"] for r in M if r["soort"] == "insert"]; UPD = [r["blok"] for r in M if r["soort"] == "update"]
W6 = [r["blok"] for r in M if WEEKNR[r["week"]] == 6]; W6U = [b for b in W6 if b in UPD]
def sh(cmd, **kw): return subprocess.run(cmd, shell=True, capture_output=True, text=True, **kw)
def lees(p): return list(csv.DictReader(open(p, encoding="utf-8", newline=""), delimiter="\t"))
_N1 = lees(N1EXP)
SCHEMA = open(SCHEMA_BRON, encoding="utf-8").read().replace("INSERT INTO public.curriculum_units (code) VALUES ('U1'), ('U2');", "")
UNITS = "INSERT INTO public.curriculum_units (code) SELECT DISTINCT u FROM (VALUES " + ", ".join(f"('{u}')" for u in sorted({r["unit_code"] for r in _N1})) + ") x(u) ON CONFLICT DO NOTHING;\n"
POLICIES = open(WM + "/scripts/replica_policies_N1-W06.sql", encoding="utf-8").read()
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
    p = subprocess.run(["python3", "-I", WM + "/scripts/p4_stap_N1-W06.py", SQL, blok, s, uit], capture_output=True, text=True)
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
TB = R + f"/p4basis_{VAR}"; shutil.rmtree(TB, ignore_errors=True); os.makedirs(TB)
os.symlink(WM + "/scripts", TB + "/scripts"); os.symlink(WM + "/p3", TB + "/p3"); LOGSTD = TB + "/p4/uitvoering/P4_log_N1-W06.tsv"
def logstap(blok, s_, best, uit=None, voor=False, extra=None, args=()):
    env = {k_: v_ for k_, v_ in os.environ.items() if k_ not in ("P4LOG", "P4SQL")}; env["P4BASIS"] = TB; env["P4SQL"] = ROOT; env.update(extra or {})
    p_ = subprocess.run(["python3", "-I", WM + "/scripts/p4_log_stap_N1-W06.py", "replica", blok, s_, best] + (["--voor"] if voor else [uit]) + list(args), capture_output=True, text=True, env=env)
    return p_.returncode, (p_.stdout + p_.stderr).strip()
AKK = {"A": "PR #8 akkoord", "B": "variant B (replica-test)"}
C7OK = "ok: url=https://replica.invalid sha=244de3e item=U6-lezen-06 open✓ indienen✓ opnieuw✓ volgende✓ desktop✓ gsm✓"
def variant_vastleggen(extra=None):   # v4.1.1 (8T P3 C-T02): eerst de variant (bij A na een ✓ C7-voorcontrole)
    r_ = []
    if VAR == "A": r_.append(logstap("slot", "c7_voorcontrole", "-", C7OK, extra=extra)[0])
    r_.append(logstap("slot", "variant", "-", "", extra=extra, args=("--variant", VAR, "--akkoord-ibra", AKK[VAR]))[0])
    return r_
def pad(blok, naam): return f"{ROOT}/{MB[blok]['map']}/{naam}" if blok != "slot" else f"{ROOT}/{naam}"
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
SV = json.load(open(SQL + "/slot_verwacht_N1-W06.json", encoding="utf-8"))
def slot_nu():
    uj = ruw(bestand("slot", "slot_tellingen_N1-W06.sql")); return json.loads(uj)["rows"][0] if uj.startswith("{") else {}
def slot_week(d, w): return "|".join(str(d.get(f"{k}_w0{w}", "?")) for k in SV["sleutels"])
def slot_verw(x): return "|".join(str(x[k]) for k in SV["sleutels"])
def tel(p): return tel_rows(lees(p))
def tel_rows(R_):   # = maak_verwacht_per_stap_N1-W06.py v1.9 (tel), op rijen
    G = [r for r in R_ if r["is_published"] == "true"]; mp = lambda r: json.loads(r["media_production"]); ids = {r["item_id"]: r for r in R_}
    sub = lambda m: [s for s in ids if s.startswith(m + "-") and len(s) == len(m) + 2 and s[-1] in "123456789"]
    def kf(r):
        pa = r["correct_answer"].split("|"); o = json.loads(r["options"])
        return not (all(p.count("=") == 1 for p in pa) and o == [p.split("=", 1)[0] for p in pa] and len({p.split("=")[1] for p in pa if "=" in p}) == len(pa))
    def mf(r):
        co = json.loads(r["correct_options"]) if r["correct_options"] else None; o = json.loads(r["options"]); return not (co and all(x in o for x in co))
    def rf(m):
        s = [ids[x]["is_published"] for x in sub(m)]; return not (len(set(s)) == 1 and s[0] != ids[m]["is_published"])
    ty = lambda X: "|".join(f"{k}:{v}" for k, v in sorted(collections.Counter(r["exercise_type"] for r in X).items()))
    return dict(items=len(R_), b25=sum(1 for r in R_ if r["exercise_type"] == "meerkeuze" and r["strict_tashkeel"] == "true" and r["correct_answer"] not in json.loads(r["options"] or "[]")),
                needs_image=sum("beeld" in mp(r) for r in R_), strict=sum(r["strict_tashkeel"] == "true" for r in R_), punten=sum(int(r["points"]) for r in R_),
                ns_audio=sum("NS-audio" in mp(r) for r in R_), student_opname=sum("student-opname" in mp(r) for r in R_), vlaggen=sum(r["review_flag"] != "" for r in R_),
                gepubliceerd=len(G), typen=ty(R_), punten_gep=sum(int(r["points"]) for r in G), typen_gep=ty(G), vlaggen_gep=sum(r["review_flag"] != "" for r in G),
                ns_audio_gep=sum("NS-audio" in mp(r) for r in G), strict_gep=sum(r["strict_tashkeel"] == "true" for r in G),
                ma_fout=sum(mf(r) for r in G if r["exercise_type"] == "meerdere-antwoorden"), koppelen_fout=sum(kf(r) for r in G if r["exercise_type"] == "koppelen"),
                reeks_fout=sum(rf(m) for m in ids if sub(m)))
ALS_LEERDER = lambda sel: q(f"BEGIN; SELECT set_config('request.jwt.claims', '{{\"sub\":\"{LEERDER}\"}}', true); SET LOCAL ROLE authenticated; SELECT {sel}; ROLLBACK;")
NAROW = {w: {r["item_id"]: r for r in lees(NA[w])} for w in WEKEN}
def veld(i, *k): return "|".join(NAROW[6][i][x] for x in k)
# ---------- G0: schema en data = live (READ ONLY, 2026-10-27 20:48 UTC) ----------
nieuwe_db()
LIVE = json.load(open(P3 + "/live/schema_live_2026-10-27_P3.json", encoding="utf-8"))["rows"][0]
ok("G0.1 kolommen (naam:type:null:gegenereerd) replica = live", q("SELECT string_agg(column_name || ':' || udt_name || ':' || is_nullable || ':' || is_generated, ',' ORDER BY ordinal_position) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'curriculum_items';"), LIVE["kolomlijst"])
ok("G0.1b defaults replica = live (o.a. is_published = true, display_order = 0, correct_options zonder default)", q("SELECT string_agg(column_name || '=' || coalesce(column_default, '∅'), ' ; ' ORDER BY ordinal_position) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'curriculum_items';"), LIVE["defaults"])
ok("G0.2 constraints replica = live (incl. UNIQUE (item_id))", q("SELECT string_agg(conname::text || ': ' || pg_get_constraintdef(oid), ' ; ' ORDER BY conname) FROM pg_constraint WHERE conrelid = 'public.curriculum_items'::regclass;"), LIVE["constraint_defs"])
ok("G0.3 trigger (definitie) en RLS replica = live (alleen BEFORE UPDATE)", q("SELECT (SELECT string_agg(pg_get_triggerdef(oid), ' ; ' ORDER BY tgname) FROM pg_trigger WHERE tgrelid = 'public.curriculum_items'::regclass AND NOT tgisinternal) || '|' || (SELECT relrowsecurity::text FROM pg_class WHERE oid = 'public.curriculum_items'::regclass);"), LIVE["trigger_defs"] + "|" + LIVE["rls"])
ok("G0.4 enum replica = live (enum_range)", q("SELECT array_to_string(enum_range(NULL::public.curriculum_exercise_type), '|');"), LIVE["enum_live"])
ok("G0.4b FK's naar curriculum_items (ON DELETE CASCADE: daarom nooit DELETE, N2-10) replica = live", q("SELECT string_agg(c.conrelid::regclass::text || ':' || c.conname::text || ':' || c.confdeltype::text, ', ' ORDER BY c.conrelid::regclass::text, c.conname) FROM pg_constraint c WHERE c.contype = 'f' AND c.confrelid = 'public.curriculum_items'::regclass;"), LIVE["fk_naar_items"])
ok("G0.4c curriculum_unit_accessible(_user_id uuid, _unit_code text)→boolean bestaat live en in de replica", str("curriculum_unit_accessible(_user_id uuid, _unit_code text)→boolean" in LIVE["functies"]) + "|" + q("SELECT p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')→' || pg_get_function_result(p.oid) FROM pg_proc p WHERE p.proname = 'curriculum_unit_accessible';"), "True|curriculum_unit_accessible(_user_id uuid, _unit_code text)→boolean")
ok("G0.6 policies op curriculum_items replica = live (6 policies)", q("SELECT string_agg(policyname::text || ':' || cmd::text || ':' || array_to_string(roles, ',') || ':' || coalesce(qual, '') || ':' || coalesce(with_check, ''), ' # ' ORDER BY policyname) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'curriculum_items';"), LIVE["policies"])
ok("G0.7 rijen totaal = live (2.299)", q("SELECT count(*) FROM public.curriculum_items;"), str(LIVE["rijen_totaal"]))
_bw = lambda w: {r["item_id"]: r for r in lees(VOOR[w])}
_ew = lambda w: {r["item_id"]: r for r in _N1 if r["week"] == str(w)}
ok("G0.0 export N1: 2.299 rijen, W06/W05/W04 per item_id gelijk aan de back-ups", f"{len(_N1)}|" + "|".join(str(_bw(w) == _ew(w)) for w in WEKEN), "2299|True|True|True")
D0 = slot_nu()
for w in WEKEN: ok(f"G0.5 W0{w} slottellingen VOOR (replica = back-up = slot_verwacht.voor)", slot_week(D0, w), slot_verw(SV["voor"][f"W0{w}"]))
ok("G0.8 als leerder (rol authenticated, RLS): W06 27 · W25 0 · zonder jwt-sub 0", ALS_LEERDER("(SELECT count(*) FROM public.curriculum_items WHERE week = 6) || '|' || (SELECT count(*) FROM public.curriculum_items WHERE week = 25) || '|' || current_user") + "|" + q("BEGIN; SET LOCAL ROLE authenticated; SELECT count(*) FROM public.curriculum_items; ROLLBACK;"), "27|0|authenticated|0")
# ---------- G1: leescontroles zoals in P3 (live = back-up, zonder de nieuwe rijen) ----------
for r in M:
    b = r["blok"]
    ok(f"G1.1 {b} droogloop P3 (live = back-up)", laatste(bestand(b, "2_droogloop.sql")), V[b]["droogloop_p3"])
    if r["soort"] == "update":
        ok(f"G1.2 {b} grootte-probe v2 in P3", laatste(bestand(b, "9_grootte_probe.sql")), V[b]["probe_p3"])
        ok(f"G1.3 {b} oud-aggregaat in P3", laatste(bestand(b, "6_oud_aggregaat.sql")), V[b]["oud_p3"])
for wk in WEEKMAPPEN:
    eerste = next(r["blok"] for r in M if r["week"] == wk)
    rc, msg = stap(eerste, "stand", vinger(eerste)); ok(f"G1.4 p4_stap stand {wk}: niets toegepast → blok {eerste}", f"{rc}|{'blok ' + eerste in msg}", "0|True")
# ---------- G2: P4-draaiboek 1 → n ----------
rc_, m_ = logstap("slot", "slot_ref", pad("slot", "slot_tellingen_N1-W06.sql"), voor=True); ok("G2.15 C-T02: zonder ✓ variant in het log → elke stap STOP (slot_ref)", f"{rc_}|{'variant' in m_}", "2|True")
rc_, m_ = logstap("slot", "variant", "-", "", args=("--variant", "B" if VAR == "A" else "A", "--akkoord-ibra", "PR #8 akkoord")); ok(f"G2.16 C-T02: variant {'B' if VAR == 'A' else 'A'} op de bundel van variant {VAR} → STOP", f"{rc_}|{'≠ de variant van deze bundel' in m_}", "2|True")
if VAR == "A":
    rc_, m_ = logstap("slot", "variant", "-", "", args=("--variant", "A", "--akkoord-ibra", "PR #8 akkoord")); ok("G2.17 C-T02: variant A zonder ✓ c7_voorcontrole → STOP", f"{rc_}|{'c7_voorcontrole' in m_}", "2|True")
    rc_, m_ = logstap("slot", "c7_voorcontrole", "-", "fout: foutscherm op U6-lezen-06"); ok("G2.18 C-T02: c7_voorcontrole «fout» → STOP", str(rc_), "2")
    rc_, m_ = logstap("slot", "variant", "-", "", args=("--variant", "A", "--akkoord-ibra", "ja, ga maar door")); ok("G2.19 C-T02: variant A zonder «PR #8 akkoord» in de tekst → STOP", f"{rc_}|{'PR #8 akkoord' in m_}", "2|True")
    rc_, m_ = logstap("slot", "c7_voorcontrole", "-", "ok: niet getest"); ok("G2.21 9T V4: c7_voorcontrole «ok: niet getest» (niet de vaste vorm) → STOP", str(rc_), "2")
    rc_, m_ = logstap("slot", "c7_voorcontrole", "-", C7OK); rc2_, m2_ = logstap("slot", "variant", "-", "", args=("--variant", "A", "--akkoord-ibra", "nog GEEN PR #8 akkoord, eerst B"))
    ok("G2.22 9T V4: na een ✓ c7_voorcontrole toch «nog GEEN PR #8 akkoord, eerst B» als akkoord voor A → STOP (geen deelstring)", f"{rc_}|{rc2_}|{'precies' in m2_}", "0|2|True")
ok(f"G2.20 variant {VAR} vastleggen ({'✓ c7_voorcontrole, ' if VAR == 'A' else ''}✓ variant)", "|".join(map(str, variant_vastleggen())), "|".join(["0"] * (2 if VAR == "A" else 1)))
for s_, f_ in (("slot_ref", "slot_tellingen_N1-W06.sql"), ("zicht_voor", "leerderszicht_N1-W06.sql")):
    rc1, rc2, uj, m = P4("slot", s_, f_); ok(f"G2.14 {s_} vóór blok 1 via p4_log_stap (VOOR-waarden)", f"{rc1}|{rc2}", "0|0")
    if rc2: resultaten.append((f"   melding {s_}", "·", m[:300], ""))
REEKS = "(SELECT count(*) FROM public.curriculum_items m WHERE m.week = 6 AND EXISTS (SELECT 1 FROM public.curriculum_items s WHERE s.week = 6 AND s.item_id ~ ('^' || m.item_id || '-[1-9]$')) AND NOT (SELECT bool_and(s.is_published) = bool_or(s.is_published) AND bool_and(s.is_published) <> m.is_published FROM public.curriculum_items s WHERE s.week = 6 AND s.item_id ~ ('^' || m.item_id || '-[1-9]$')))"
eerste_w05 = next(r["blok"] for r in M if r["week"] == "N1-W05")
for i, r in enumerate(M):
    b = r["blok"]; v = V[b]; ins = r["soort"] == "insert"
    if b == W6[-1]:   # volgorde over de weken: W05 mag niet beginnen terwijl W06 open is
        for s_, f_ in (("vinger_voor", "7_vinger_aggregaat.sql"), ("gr", "8_generale_repetitie.sql"), ("apply", "3_apply.sql")):
            rc_, m_ = logstap(eerste_w05, s_, pad(eerste_w05, f_), voor=True)
            ok(f"G2.13 volgorde over de weken: voorcontrole {s_} van {eerste_w05} terwijl {b} (W06) open is → STOP", f"{rc_}|{'volgorde' in m_}", "2|True")
    if i == 0 or M[i - 1]["week"] != r["week"]:
        rc1, rc2, uj, m = P4(b, "stand", "7_vinger_aggregaat.sql"); ok(f"G2.0 {b} stand {r['week']} (voorcontrole + p4_log_stap ✓)", f"{rc1}|{rc2}|{'blok ' + b in m}", "0|0|True")
    rc1, rc2, uj, m = P4(b, "vinger_voor", "7_vinger_aggregaat.sql"); ok(f"G2.1 {b} 7_vinger vóór (voorcontrole + p4_log_stap ✓)", f"{psv(uj)}|{rc1}|{rc2}", f"{vv(b)}|0|0")
    ok(f"G2.2 {b} droogloop P4 (live = NA vorig blok)", laatste(bestand(b, "2_droogloop.sql")), v["droogloop"])
    rc1, rc2, uj, m = P4(b, "gr", "8_generale_repetitie.sql")
    ok(f"G2.3 {b} generale repetitie{' (insert, tweede insert = 0)' if ins else ''} (+ activiteit + isolatie; voorcontrole + p4_log_stap ✓)", f"{psv(uj)}|{rc1}|{rc2}", v["gr_eindrij"] + "|0|0|0|0||repeatable read|0|0")
    ok(f"G2.4 {b} 7_vinger na de repetitie = vóór", vinger(b), vv(b))
    rc1, rc2, uj, m = P4(b, "apply", "3_apply.sql"); ok(f"G2.5 {b} apply{' (INSERT; inserttest 1)' if ins else ''} (REPEATABLE READ; voorcontrole + p4_log_stap ✓)", f"{psv(uj)}|{rc1}|{rc2}", f"{v['apply_uitvoer']}|0|0")
    rc1, rc2, uj, m = P4(b, "vinger_na", "7_vinger_aggregaat.sql"); ok(f"G2.6 {b} 7_vinger na de apply (voorcontrole + p4_log_stap ✓)", f"{psv(uj)}|{rc1}|{rc2}", f"{vn(b)}|0|0")
    rc1, m1 = logstap(b, "apply", pad(b, "3_apply.sql"), voor=True)
    u = laatste(bestand(b, "3_apply.sql")); rc, msg = stap(b, "apply", u)
    ok(f"G2.7 {b} dubbel blok{' (inserttest 5)' if ins else ''}: voorcontrole van een tweede apply → STOP (log); toch geplakt = 0 rijen → p4_stap STOP", f"{rc1}|{'volgorde' in m1}|{u}|{rc}", f"2|True|{v['leeg_uitvoer']}|2")
    if ins: ok(f"G2.8 {b} droogloop na de insert (bestaand = n)", laatste(bestand(b, "2_droogloop.sql")), v["droogloop_na_apply"])
    else: ok(f"G2.8 {b} grootte-probe v2 na de apply", laatste(bestand(b, "9_grootte_probe.sql")), v["probe_na_apply"])
    if b in W6:
        ok(f"G2.9 {b}: reeksen W06 na dit blok in orde (macro ⇔ niet de subitems, geen halve reeks) · als leerder geen ongepubliceerde rij zichtbaar", q(f"SELECT {REEKS};") + "|" + ALS_LEERDER("count(*) FROM public.curriculum_items WHERE week = 6 AND NOT is_published"), "0|0")
    if b == INSB[0]:
        ok("G6.1 inserttest: 14 nieuwe rijen, alle is_published = false, één created_at (zelfde statement), display_order = macro, created_by NULL, id gevuld", q("SELECT count(*) || '|' || bool_and(NOT is_published) || '|' || count(DISTINCT created_at) || '|' || bool_and(display_order = (SELECT m.display_order FROM public.curriculum_items m WHERE m.item_id = regexp_replace(c.item_id, '-[1-9]$', ''))) || '|' || bool_and(created_by IS NULL AND id IS NOT NULL AND media_url IS NULL AND audio_url IS NULL) FROM public.curriculum_items c WHERE item_id ~ '^U6-luisteren-0[12]-[1-9]$';"), "14|true|1|true|true")
        ok("G6.1b als leerder: W06 nog 27 zichtbaar (de nieuwe rijen onzichtbaar)", ALS_LEERDER("count(*) FROM public.curriculum_items WHERE week = 6"), "27")
    if b == "3_L1": ok("G6.2 reeks luisteren-01 gewisseld (macro false, 8 subitems true); luisteren-02 nog niet (macro true, 6 subitems false)", q("SELECT string_agg(item_id || ':' || is_published, ',' ORDER BY item_id COLLATE \"C\") FROM public.curriculum_items WHERE item_id IN ('U6-luisteren-01', 'U6-luisteren-01-8', 'U6-luisteren-02', 'U6-luisteren-02-6');"), "U6-luisteren-01:false,U6-luisteren-01-8:true,U6-luisteren-02:true,U6-luisteren-02-6:false")
    if b == "4_L2": ok("G6.3 U6-luisteren-03 open-tekst → koppelen (opties, sleutel, punten, media zoals NA)", q("SELECT exercise_type::text || '|' || options::text || '|' || correct_answer || '|' || points || '|' || media_production::text FROM public.curriculum_items WHERE item_id = 'U6-luisteren-03';"), veld("U6-luisteren-03", "exercise_type", "options", "correct_answer", "points", "media_production"))
    if b == "5_R1": ok("G6.4 U6-lezen-03 meerkeuze → meerdere-antwoorden (correct_options ⊂ opties, 4 punten); reeks lezen-05 gewisseld", q("SELECT exercise_type::text || '|' || jsonb_array_length(correct_options) || '|' || (options @> correct_options)::text || '|' || points || '|' || (SELECT string_agg(is_published::text, ',' ORDER BY item_id COLLATE \"C\") FROM public.curriculum_items WHERE item_id ~ '^U6-lezen-05(-[1-9])?$') FROM public.curriculum_items WHERE item_id = 'U6-lezen-03';"), "meerdere-antwoorden|4|true|4|false,true,true,true,true,true,true")
    if b == "6_S1": ok("G6.5 U6-schrijven-01 open-tekst → bestand-upload, media zoals NA", q("SELECT exercise_type::text || '|' || media_production::text FROM public.curriculum_items WHERE item_id = 'U6-schrijven-01';"), veld("U6-schrijven-01", "exercise_type", "media_production"))
    if b == "7_G1": ok("G6.6 U6-grammatica-01 gatentekst → koppelen met Nederlandse linkerkant en strict; cultuur 0 en reflectie 0 punten (B22)", q("SELECT (SELECT exercise_type::text || '|' || options::text || '|' || strict_tashkeel::text FROM public.curriculum_items WHERE item_id = 'U6-grammatica-01') || '|' || (SELECT string_agg(points::text, ',' ORDER BY item_id COLLATE \"C\") FROM public.curriculum_items WHERE item_id IN ('U6-cultuur-01', 'U6-reflectie-01'));"), veld("U6-grammatica-01", "exercise_type", "options", "strict_tashkeel") + "|0,0")
    if b in W6:   # v4.1.1 (9D P3 R1): zichtbare koppelen-items als leerder = verwacht; in variant B nooit meer dan vóór P4 (geen venster)
        nk = sum(1 for x in lees(f"{SQL}/{MB[b]['map']}/NA_{b.split('_', 1)[1]}.tsv") if x["exercise_type"] == "koppelen" and x["is_published"] == "true")
        k_ = ALS_LEERDER("count(*) FROM public.curriculum_items WHERE week = 6 AND exercise_type = 'koppelen'")
        ok(f"G2.10 {b}: koppelen-items zichtbaar als leerder = verwacht" + (" en nooit meer dan vóór P4 (3; variant B zonder C7)" if VAR == "B" else ""), f"{k_}|{VAR == 'A' or int(k_) <= 3}", f"{nk}|True")
    if VAR == "B" and b == W6[-1]: ok("G6.7 variant B: na de W06-blokken de zes koppelen-items false met B12-vlag", q("SELECT count(*) || '|' || bool_and(NOT is_published AND review_flag <> '') FROM public.curriculum_items WHERE week = 6 AND exercise_type = 'koppelen';"), "6|true")
for wk in WEEKMAPPEN:
    laatst = [r["blok"] for r in M if r["week"] == wk][-1]
    rc, msg = stap(laatst, "stand", vinger(laatst)); ok(f"G2.12 p4_stap stand {wk}: week klaar", f"{rc}|{'klaar' in msg}", "0|True")
for s_, f_ in (("slot", "slot_tellingen_N1-W06.sql"), ("zicht_na", "leerderszicht_N1-W06.sql")):
    rc1, rc2, uj, m = P4("slot", s_, f_); ok(f"G3.6 {s_} na het laatste blok via p4_log_stap (NA-waarden)", f"{rc1}|{rc2}", "0|0")
    if rc2: resultaten.append((f"   melding {s_}", "·", m[:300], ""))
# ---------- G3: slotcontrole (NA) ----------
D1 = slot_nu()
for w in WEKEN: ok(f"G3.1 W0{w} slottellingen = slot_verwacht (NA)", slot_week(D1, w), slot_verw(SV[f"W0{w}"]))
for w in WEKEN: ok(f"G3.1b W0{w} slot_verwacht = telling van het NA-bestand", slot_verw(SV[f"W0{w}"]), slot_verw(tel(NA[w])))
for wk in WEEKMAPPEN:
    laatst = [r["blok"] for r in M if r["week"] == wk][-1]
    vt = {l.split("\t")[0]: l.rstrip("\n").split("\t")[2] for l in list(open(f"{SQL}/{MB[laatst]['map']}/verwacht_vingerafdruk.tsv", encoding="utf-8"))[1:]}
    rc, out, err = run(bestand(laatst, "5_controle.sql")); live = dict(l.split("|", 1) for l in out if "|" in l)
    ok(f"G3.2 {wk}: vingerafdruk per rij = NA (5_controle)", f"{sum(1 for i in vt if live.get(i) == vt[i])}|{len(live)}", f"{len(vt)}|{len(vt)}")
ok("G3.4 slot_tellingen rijen_totaal|rijen_n1|pogingen_totaal (replica: 2.323 rijen, 0 pogingen)", "|".join(str(D1.get(k, "?")) for k in ("rijen_totaal", "rijen_n1", "pogingen_totaal")), f"{SV['rijen_totaal']}|{SV['rijen_n1']}|0")
G6 = {r["item_id"]: r for r in lees(NA[6])}
gep = sorted((r for r in G6.values() if r["is_published"] == "true"), key=lambda r: (int(r["display_order"]), r["item_id"].encode()))
ok("G3.7 als leerder na P4: W06 = gepubliceerd in NA · ongepubliceerd zichtbaar 0 · W25 0", ALS_LEERDER("(SELECT count(*) FROM public.curriculum_items WHERE week = 6) || '|' || (SELECT count(*) FROM public.curriculum_items WHERE week IN (4, 5, 6) AND NOT is_published) || '|' || (SELECT count(*) FROM public.curriculum_items WHERE week = 25)"), f"{len(gep)}|0|0")
ok("G3.8 inserttest 7: volgorde als leerder (ORDER BY display_order, item_id) = didactische volgorde (macro weg, subitems -1 … -k op de plaats van de macro)", ALS_LEERDER("string_agg(item_id, ',' ORDER BY display_order, item_id) FROM public.curriculum_items WHERE week = 6"), ",".join(r["item_id"] for r in gep))
ok("G3.9 inserttest 7: vorige/volgende (ORDER BY display_order, created_at, item_id) = dezelfde volgorde", ALS_LEERDER("string_agg(item_id, ',' ORDER BY display_order, created_at, item_id) FROM public.curriculum_items WHERE week = 6"), ",".join(r["item_id"] for r in gep))
# ---------- G4: terugdraaien n → eerste updateblok (V-B) ----------
TERUG = list(reversed(M))
for i, r in enumerate(TERUG):
    b = r["blok"]; v = V[b]
    if i == 0:
        for b_ in (W6U[-1], eerste_w05, W6U[0]):
            rc_, m_ = logstap(b_, "rollback", pad(b_, "4_rollback.sql"), voor=True)
            ok(f"G4.0 terugdraaien buiten de volgorde: voorcontrole rollback {b_} terwijl {b} nog toegepast is → STOP", f"{rc_}|{'omgekeerde volgorde' in m_}", "2|True")
        rc_, m_ = logstap(b, "noodrollback", pad(b, "3_apply.sql"), voor=True); ok("G4.0d noodrollback met het verkeerde bestand → STOP", f"{rc_}|{'hoort bij' in m_}", "2|True")
        rc_, m_ = logstap(b, "noodrollback", pad(b, "4b_noodrollback.sql"), voor=True); ok(f"G4.0e voorcontrole noodrollback {b} met 4b → ✓ (niet geplakt)", str(rc_), "0")
    if r["soort"] == "insert":
        rc_, m_ = logstap(b, "rollback", pad(b, "3_apply.sql"), voor=True); rc2_, m2_ = stap(b, "rollback", "x")
        ok(f"G4.5 {b} insertblok: rollback → STOP (p4_log_stap en p4_stap: geen rollback, nooit DELETE)", f"{rc_}|{'insertblok' in m_}|{rc2_}|{'insertblok' in m2_}", "2|True|2|True")
        continue
    ok(f"G4.1 {b} 7_vinger vóór de rollback = NA van dit blok", vinger(b), vn(b))
    rc1, rc2, uj, m = P4(b, "rollback", "4_rollback.sql"); ok(f"G4.2 {b} rollback (REPEATABLE READ; voorcontrole + p4_log_stap ✓)", f"{psv(uj)}|{rc1}|{rc2}", f"{v['rollback_uitvoer']}|0|0")
    rc1, rc2, uj, m = P4(b, "vinger_terug", "7_vinger_aggregaat.sql"); ok(f"G4.3 {b} 7_vinger na de rollback = vóór dit blok", f"{psv(uj)}|{rc1}|{rc2}", f"{vv(b)}|0|0")
    rc1, m1 = logstap(b, "rollback", pad(b, "4_rollback.sql"), voor=True)
    ok(f"G4.4 {b} tweede rollback: voorcontrole → STOP; toch geplakt = 0", f"{rc1}|{laatste(bestand(b, '4_rollback.sql'))}", f"2|{v['leeg_uitvoer']}")
    if b in W6U: ok(f"G4.4b {b}: na de rollback reeksen W06 in orde · als leerder geen ongepubliceerde rij zichtbaar", q(f"SELECT {REEKS};") + "|" + ALS_LEERDER("count(*) FROM public.curriculum_items WHERE week = 6 AND NOT is_published"), "0|0")
D2 = slot_nu(); NAINS = f"{SQL}/{MB[INSB[-1]]['map']}/NA_{INSB[-1].split('_', 1)[1]}.tsv"
ok("G4.6 W06 na het terugdraaien = «teruggedraaid» (stand na de insertblokken: 27 rijen = back-up + 24 onzichtbaar)", slot_week(D2, 6), slot_verw(tel(NAINS)))
for w in (5, 4): ok(f"G4.6 W0{w} tellingen na het terugdraaien = VOOR", slot_week(D2, w), slot_verw(SV["voor"][f"W0{w}"]))
ok("G4.6b als leerder na het terugdraaien: W06 27 (= back-up) · ongepubliceerd zichtbaar 0", ALS_LEERDER("(SELECT count(*) FROM public.curriculum_items WHERE week = 6) || '|' || (SELECT count(*) FROM public.curriculum_items WHERE week = 6 AND NOT is_published)"), "27|0")
rc, msg = stap(W6U[0], "stand", vinger(W6U[0])); ok(f"G4.6c p4_stap stand W06 na het terugdraaien: {len(INSB)} van {len(W6)} toegepast (de insertblokken) → blok {W6U[0]}", f"{rc}|{f'{len(INSB)} van {len(W6)}' in msg}|{'blok ' + W6U[0] in msg}", "0|True|True")
ok("G4.6d na het terugdraaien geen tweede insert: 3_apply van het eerste insertblok → 0 (grendel)", laatste(bestand(INSB[0], "3_apply.sql")), V[INSB[0]]["leeg_uitvoer"])
rc_, m_ = logstap(W6U[0], "vinger_voor", pad(W6U[0], "7_vinger_aggregaat.sql"), voor=True); ok(f"G4.7 na het volledige terugdraaien: het log staat op «insertblokken toegepast, {W6U[0]} open» (voorcontrole vinger_voor ✓)", str(rc_), "0")
LR = list(csv.reader(open(LOGSTD, encoding="utf-8"), delimiter="\t")) if os.path.exists(LOGSTD) else []
ok("G4.8 P4-log op het standaardpad aangemaakt", str(os.path.exists(LOGSTD) and LR[0][:4] == ["tijd", "wie", "blok", "stap"]), "True")
ok(f"G4.9 P4-log: ✓ vinger_na per blok ({len(M)}) en ✓ vinger_terug per updateblok ({len(UPD)})", f"{sum(1 for c in LR[1:] if c[3] == 'vinger_na' and c[9] == '0')}|{sum(1 for c in LR[1:] if c[3] == 'vinger_terug' and c[9] == '0')}", f"{len(M)}|{len(UPD)}")
shutil.copy(LOGSTD, R + f"/P4_log_replica_N1-W06_{VAR}.tsv")
# ---------- G5: negatieve tests ----------
nieuwe_db(); b = UPD[0]
# inserttests op een verse replica (architectuur T v1.1 §3: 2, 3, 4, 6 en F5)
i1, i2 = INSB[0], INSB[1]
ok(f"G5.i6 inserttest 6: {i2} vóór {i1} → 0 (de grendel van {i2} = de stand ná {i1})", laatste(bestand(i2, "3_apply.sql")), V[i2]["leeg_uitvoer"])
eerste_nieuw = sorted(l.split("\t")[0] for l in open(f"{SQL}/{MB[i1]['map']}/items.txt", encoding="utf-8"))[2]
q(f"INSERT INTO public.curriculum_items (item_id, unit_code, week, skill, exercise_type) VALUES ('{eerste_nieuw}', 'U25', 25, 'lezen', 'meerkeuze');")
ok(f"G5.i2 inserttest 2: één item_id bestaat al ({eerste_nieuw}, in week 25) → 0; week 6 ongewijzigd", laatste(bestand(i1, "3_apply.sql")) + "|" + vinger(i1), V[i1]["leeg_uitvoer"] + "|" + vv(i1))
q(f"DELETE FROM public.curriculum_items WHERE item_id = '{eerste_nieuw}' AND week = 25;")   # alleen in de replica: de testrij van G5.i2 weer weg
a = bestand(i1, "3_apply.sql"); kop, _, staart = a.partition("(VALUES\n"); rijen, _, na_ = staart.partition("\n),\nu AS")
lijst = rijen.split(",\n  ("); afgekapt = kop + "(VALUES\n" + ",\n  (".join(lijst[:-1]) + "\n),\nu AS" + na_
ok(f"G5.i3 inserttest 3: afgekapte VALUES ({len(lijst) - 1} van {len(lijst)} rijen) → 0", laatste(afgekapt), V[i1]["leeg_uitvoer"])
k_ = a.index("(VALUES"); j_ = a.index("َ", k_)
ok("G5.i4 inserttest 4: één fatḥa weg in de VALUES (h_inhoud klopt niet meer) → 0", laatste(a[:j_] + a[j_ + 1:]), V[i1]["leeg_uitvoer"])
q("CREATE FUNCTION public.t_replica_vervalst() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.review_flag := 'vervalst'; RETURN NEW; END $$; CREATE TRIGGER t_replica_vervalst BEFORE INSERT ON public.curriculum_items FOR EACH ROW EXECUTE FUNCTION public.t_replica_vervalst();")
u_ = laatste(a); n6 = q("SELECT count(*) FROM public.curriculum_items WHERE week = 6;")
ok("G5.i5 RETURNING-controle (F5): een trigger (alleen in de replica) wijzigt een veld → fout 'STOP: RETURNING …' in hetzelfde statement, niets ingevoegd", f"{'STOP: RETURNING' in u_}|{n6}", "True|27")
q("DROP TRIGGER t_replica_vervalst ON public.curriculum_items; DROP FUNCTION public.t_replica_vervalst();")
# G5.i7 (8T P3 C-T03): gelijktijdige schrijver tijdens de insert → de weekgrendel FOR SHARE wacht en de insert faalt (serialisatiefout), niets ingevoegd
import threading, time
A_ = subprocess.Popen(f"{PSQL} -d replica", shell=True, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
A_.stdin.write("BEGIN;\nUPDATE public.curriculum_items SET question = question || ' ' WHERE item_id = 'U6-lezen-01';\n"); A_.stdin.flush(); time.sleep(1.0)
uit_ = {}
t_ = threading.Thread(target=lambda: uit_.update(r=laatste(bestand(i1, "3_apply.sql")))); t_.start(); time.sleep(2.0); wacht_ = t_.is_alive()
A_.stdin.write("COMMIT;\n"); A_.stdin.close(); A_.wait(timeout=30); t_.join(timeout=60)
ok("G5.i7 C-T03: gelijktijdige wijziging van een W06-rij tijdens de insert → de insert wacht op de rijvergrendeling en faalt daarna (serialisatiefout), niets ingevoegd",
   f"{wacht_}|{'could not serialize' in uit_.get('r', '')}|{q('SELECT count(*) FROM public.curriculum_items WHERE week = 6;')}", "True|True|27")
q("UPDATE public.curriculum_items SET question = left(question, length(question) - 1) WHERE item_id = 'U6-lezen-01';")   # alleen in de replica: de testwijziging terug
ok("G5.i1 na de inserttests: stand W06 = back-up", vinger(i1), vv(i1))
# G5.m (8T P3 C-T06): mutatietest van de slotformules bij waarden ≠ 0 (b25, ma_fout), SQL = Python op dezelfde gemuteerde rijen
R6 = [dict(x) for x in lees(VOOR[6])]; R5 = [dict(x) for x in lees(VOOR[5])]
mk = next(x for x in R6 if x["exercise_type"] == "meerkeuze"); mk["strict_tashkeel"] = "true"; mk["correct_answer"] += "x"
ma = next(x for x in R5 if x["exercise_type"] == "meerdere-antwoorden" and x["correct_options"]); ma["correct_options"] = json.dumps(json.loads(ma["correct_options"]) + ["zzz"], ensure_ascii=False)
q(f"UPDATE public.curriculum_items SET strict_tashkeel = true, correct_answer = correct_answer || 'x' WHERE item_id = '{mk['item_id']}'; UPDATE public.curriculum_items SET correct_options = correct_options || '[\"zzz\"]'::jsonb WHERE item_id = '{ma['item_id']}';")
Dm = slot_nu(); tm6, tm5 = tel_rows(R6), tel_rows(R5)
ok(f"G5.m1 mutatie ({mk['item_id']} strict + sleutel niet in de opties; {ma['item_id']} correct_options + 1 vreemd element): slot SQL = Python (W06, W05) · b25_w06 en ma_fout_w05 ≥ 1",
   f"{slot_week(Dm, 6)}#{slot_week(Dm, 5)}#{Dm.get('b25_w06')}|{Dm.get('ma_fout_w05')}", f"{slot_verw(tm6)}#{slot_verw(tm5)}#{tm6['b25']}|{tm5['ma_fout']}")
nieuwe_db()
gr1 = bestand(b, "8_generale_repetitie.sql"); ST, LL = "00000000-0000-0000-0000-00000000000a", "00000000-0000-0000-0000-00000000000b"
eerste = sorted(l.split("\t")[0] for l in open(f"{SQL}/{MB[b]['map']}/items.txt", encoding="utf-8"))[0]
# de updateblokken van W06 starten na de inserts: eerst de insertblokken in de verse replica
for ib in INSB: ok(f"G5.0 voorbereiding: {ib} apply", laatste(bestand(ib, "3_apply.sql")), V[ib]["apply_uitvoer"])
RI = [dict(x) for x in lees(f"{SQL}/{MB[INSB[-1]]['map']}/NA_{INSB[-1].split('_', 1)[1]}.tsv")]; sub_ = next(x for x in RI if x["item_id"] == "U6-lezen-05-3"); sub_["is_published"] = "true"
q("UPDATE public.curriculum_items SET is_published = true WHERE item_id = 'U6-lezen-05-3';"); Dr = slot_nu(); tr = tel_rows(RI)
ok("G5.m2 mutatie: één subitem van de reeks lezen-05 gepubliceerd (halve reeks) → reeks_fout_w06 = 1; slot SQL = Python", f"{slot_week(Dr, 6)}#{Dr.get('reeks_fout_w06')}", f"{slot_verw(tr)}#1")
q("UPDATE public.curriculum_items SET is_published = false WHERE item_id = 'U6-lezen-05-3';")   # alleen in de replica: terug
q(f"INSERT INTO auth.users (id, last_sign_in_at) VALUES ('{ST}', now() - interval '2 days'); INSERT INTO public.user_roles (user_id, role) VALUES ('{ST}', 'teacher'); INSERT INTO public.curriculum_item_attempts (student_id, item_id) SELECT '{ST}', id FROM public.curriculum_items WHERE item_id = '{eerste}';")
u = laatste(gr1); rc, msg = stap(b, "gr", u); ok("G5.0a activiteit: docent met 1 poging en een login → 1|0|0|1; p4_stap ✓", "|".join(u.split("|")[10:14]) + f"|{rc}", "1|0|0|1|0")
q(f"INSERT INTO auth.users (id, last_sign_in_at) VALUES ('{LL}', now() - interval '40 days'); INSERT INTO public.curriculum_item_attempts (student_id, item_id, created_at) SELECT '{LL}', id, now() - interval '1 day' FROM public.curriculum_items WHERE item_id = '{eerste}';")
u = laatste(gr1); rc, msg = stap(b, "gr", u); ok("G5.0b leerder met 1 poging → pogingen30_leerders = 1 → p4_stap STOP", "|".join(u.split("|")[10:14]) + f"|{rc}|{'activiteit' in msg}", "2|1|0|1|2|True")
q(f"DELETE FROM public.curriculum_item_attempts WHERE student_id = '{LL}'; UPDATE auth.users SET last_sign_in_at = now() - interval '1 day' WHERE id = '{LL}';")
u = laatste(gr1); rc, msg = stap(b, "gr", u); ok("G5.0c leerder met een login < 30 dagen → logins30_leerders = 1 → p4_stap STOP", "|".join(u.split("|")[10:14]) + f"|{rc}|{'activiteit' in msg}", "1|0|1|1|2|True")
q("DELETE FROM public.curriculum_item_attempts; DELETE FROM public.user_roles; DELETE FROM auth.users WHERE id <> '" + LEERDER + "';")
ok(f"G5.0d na de activiteitstests: stand {b} = vóór (de repetitie is netto read-only)", vinger(b), vv(b))
b2 = UPD[1]; u = vinger(b2); rc, msg = stap(b2, "vinger_voor", u); ok(f"G5.1 volgorde: 7_vinger vóór {b2} terwijl {b} niet toegepast is → p4_stap STOP", str(rc), "2")
rc, msg = stap(INSB[-1], "vinger_voor", vinger(INSB[-1])); ok(f"G5.1b «al uitgevoerd»: 7_vinger vóór {INSB[-1]} = NA van dat blok → p4_stap STOP met «al uitgevoerd» (stand vastleggen, geen incident)", f"{rc}|{'al uitgevoerd' in msg}", "2|True")
q(f"UPDATE public.curriculum_items SET question = question || ' ' WHERE item_id = '{eerste}';")
ok(f"G5.2 toestandsgrendel: 1 rij buiten het log gewijzigd ({eerste}) → apply 0", laatste(bestand(b, "3_apply.sql")), V[b]["leeg_uitvoer"])
q(f"UPDATE public.curriculum_items SET question = left(question, length(question) - 1) WHERE item_id = '{eerste}';"); ok("G5.2b stand terug = vóór", vinger(b), vv(b))
a = bestand(b, "3_apply.sql"); k = a.index("(VALUES"); j = a.index("َ", k)
ok("G5.3 plakgrendel: één fatḥa weg in de VALUES → apply 0", laatste(a[:j] + a[j + 1:]), V[b]["leeg_uitvoer"]); ok("G5.3b stand ongewijzigd", vinger(b), vv(b))
esc_blok = next((x for x in UPD if bestand(x, "4_rollback.sql").count("U&'") > 0 and WEEKNR[MB[x]["week"]] == 6), None)
if esc_blok:
    ok(f"G5.4a voorbereiding: de W06-blokken tot en met {esc_blok} toepassen", "|".join(laatste(bestand(x, "3_apply.sql")) == V[x]["apply_uitvoer"] and "ok" or "x" for x in W6U[:W6U.index(esc_blok) + 1]), "|".join("ok" for _ in W6U[:W6U.index(esc_blok) + 1]))
    rb = bestand(esc_blok, "4_rollback.sql"); esc = re.findall(r"U&'((?:[^']|'')*)'::(?:text|jsonb)", rb)
    def ont(s): return re.sub(r"\\\+([0-9A-F]{6})|\\([0-9A-F]{4})", lambda mm: chr(int(mm.group(1) or mm.group(2), 16)), s.replace("''", "'")).replace("\\\\", "\\")
    rauw = rb
    for e in esc: rauw = re.sub(re.escape(f"U&'{e}'") + r"::(text|jsonb)", lambda mm: "'" + ont(e).replace("'", "''") + "'::" + mm.group(1), rauw)
    ok(f"G5.4b {esc_blok}-rollback heeft {len(esc)} U&-escape(s); zonder escape niet NFC-stabiel", str(len(esc) > 0 and unicodedata.normalize('NFC', rauw) != rauw), "True")
    ok("G5.4c rollback zónder escape, NFC-geplakt → 0 (fail-closed)", laatste(unicodedata.normalize("NFC", rauw)), V[esc_blok]["leeg_uitvoer"])
    ok(f"G5.4d {esc_blok} rollback mét escape → terug", laatste(rb), V[esc_blok]["rollback_uitvoer"]); ok(f"G5.4e {esc_blok} na de rollback = vóór dit blok", vinger(esc_blok), vv(esc_blok))
E = "meerkeuze|meerdere-antwoorden|open-tekst|gatentekst|bestand-upload|audio-opname|rangschikken|koppelen"
tmp = R + f"/g5_gen_{VAR}"; shutil.rmtree(tmp, ignore_errors=True); os.makedirs(tmp)
rows = lees(P3 + "/APP_NA_N1-W06.tsv"); kop_ = list(rows[0].keys())
def schrijf(rws, p):
    with open(p, "w", encoding="utf-8", newline="") as f:
        w_ = csv.writer(f, delimiter="\t", lineterminator="\n"); w_.writerow(kop_); [w_.writerow([r_[c] for c in kop_]) for r_ in rws]
def gen(napad, uit, extra=()):
    return subprocess.run(["python3", "-I", WM + "/scripts/maak_sql_N1-W06.py", VOOR[6], napad, uit, "--week", "6", "--enum-live", E, "--insert", "I1=luisteren-01-,luisteren-02-,lezen-05-,grammatica-02-", "--blokken", "ALLES=*", *extra], capture_output=True, text=True)
for naam_, wijzig, verw_ in (("display_order ≠ macro", lambda r_: r_.update(display_order="2") if r_["item_id"] == "U6-luisteren-01-1" else None, "display_order"),
                             ("media_url gevuld", lambda r_: r_.update(media_url="x") if r_["item_id"] == "U6-luisteren-01-1" else None, "niet leeg"),
                             ("item_id zonder macro (-10)", lambda r_: r_.update(item_id="U6-luisteren-01-10") if r_["item_id"] == "U6-luisteren-01-8" else None, "subitem"),
                             ("enumwaarde 'gatentekts'", lambda r_: r_.update(exercise_type="gatentekts") if r_["item_id"] == "U6-luisteren-01-1" else None, "enum")):
    rws = [dict(r_) for r_ in rows]; [wijzig(r_) for r_ in rws]; schrijf(rws, f"{tmp}/NA_fout.tsv"); shutil.rmtree(f"{tmp}/sql", ignore_errors=True)
    g = gen(f"{tmp}/NA_fout.tsv", f"{tmp}/sql")
    ok(f"G5.5 generator weigert: {naam_} → maak_sql faalt, geen uitmap", f"{g.returncode != 0}|{os.path.exists(tmp + '/sql')}|{verw_ in (g.stdout + g.stderr)}", "True|False|True")
g = gen(P3 + "/APP_NA_N1-W06.tsv", f"{tmp}/sql2", ())
ok("G5.5b zelfde generator met de echte NA → slaagt (controle op de test zelf)", str(g.returncode == 0 and os.path.exists(tmp + "/sql2")), "True")
g = subprocess.run(["python3", "-I", WM + "/scripts/maak_sql_N1-W06.py", VOOR[5], NA[5], f"{tmp}/sql3", "--week", "5", "--blokken", "ALLES=*", "--enum-live", E.replace("|koppelen", "")], capture_output=True, text=True)
ok("G5.6 --enum-live ≠ verwachte enum → maak_sql weigert", f"{g.returncode != 0}|{os.path.exists(tmp + '/sql3')}", "True|False")
g = subprocess.run(["python3", "-I", WM + "/scripts/maak_sql_N1-W06.py", VOOR[6], P3 + "/APP_NA_N1-W06.tsv", f"{tmp}/sql4", "--week", "6", "--blokken", "ALLES=*", "--enum-live", E], capture_output=True, text=True)
ok("G5.6b nieuwe rijen zonder --insert → maak_sql weigert", f"{g.returncode != 0}|{os.path.exists(tmp + '/sql4')}", "True|False")
tmpm = R + f"/g5_vreemd_{VAR}"; shutil.rmtree(tmpm, ignore_errors=True); shutil.copytree(f"{SQL}/{MB[b]['map']}", tmpm + "/" + b)
p = subprocess.run(["python3", "-I", WM + "/scripts/p4_stap_N1-W06.py", tmpm, b, "stand", vv(b)], capture_output=True, text=True)
ok("G5.7 bundel zonder BLOKKEN_MANIFEST.tsv → p4_stap STOP", f"{p.returncode}|{'manifest' in (p.stdout + p.stderr).lower()}", "2|True")
p = subprocess.run(["python3", "-I", WM + "/scripts/p4_stap_N1-W06.py", SQL, "4_R2", "stand", vv(b)], capture_output=True, text=True); ok("G5.8 onbekend blok 4_R2 → p4_stap STOP", str(p.returncode), "2")
p = subprocess.run(["python3", "-I", WM + "/scripts/p4_stap_N1-W06.py", SQL, b, "stand", "51|00000000000000000000000000000000|x"], capture_output=True, text=True); ok("G5.9 vingerafdruk geen ketenwaarde → p4_stap STOP", str(p.returncode), "2")
G5E = {"P4LOG": R + f"/g5_log_{VAR}.tsv"}; [os.remove(G5E["P4LOG"]) for _ in [0] if os.path.exists(G5E["P4LOG"])]; variant_vastleggen(G5E)
rc_, m_ = logstap(b, "apply", pad(b2, "3_apply.sql"), voor=True, extra=G5E); ok(f"G5.10a bestandsbinding: 3_apply.sql van {b2} voor blok {b} → STOP", f"{rc_}|{'niet gebonden' in m_}", "2|True")
rc_, m_ = logstap(b, "apply", pad(b, "4_rollback.sql"), voor=True, extra=G5E); ok("G5.10b stap apply met 4_rollback.sql → STOP", f"{rc_}|{'hoort bij' in m_}", "2|True")
cp = R + f"/g5_kopie_{VAR}"; shutil.rmtree(cp, ignore_errors=True); shutil.copytree(SQL, cp + "/sql")
with open(f"{cp}/sql/{MB[b]['map']}/3_apply.sql", "a", encoding="utf-8") as f: f.write("-- gewijzigd\n")
rc_, m_ = logstap(b, "apply", f"{cp}/sql/{MB[b]['map']}/3_apply.sql", voor=True, extra={**G5E, "P4SQL": cp + "/sql"}); ok("G5.10c gewijzigd 3_apply.sql (md5 ≠ manifest) → STOP", f"{rc_}|{'niet gebonden' in m_ and 'md5' in m_}", "2|True")
G14 = {"P4LOG": R + f"/g5_log14_{VAR}.tsv"}; [os.remove(G14["P4LOG"]) for _ in [0] if os.path.exists(G14["P4LOG"])]; variant_vastleggen(G14)
nieuwe_db()
v7 = lambda: ruw(bestand(i1, "7_vinger_aggregaat.sql"))
r14 = [logstap(i1, "stand", pad(i1, "7_vinger_aggregaat.sql"), v7(), extra=G14)[0], logstap(i1, "vinger_voor", pad(i1, "7_vinger_aggregaat.sql"), v7(), extra=G14)[0],
       logstap(i1, "gr", pad(i1, "8_generale_repetitie.sql"), ruw(bestand(i1, "8_generale_repetitie.sql")), extra=G14)[0]]
rc_, m_ = logstap(i1, "apply", pad(i1, "3_apply.sql"), voor=True, extra=G14); r14.append(rc_)
laatste(bestand(i1, "3_apply.sql"))   # de insert commit wel, maar de tool «antwoordt» met een fout:
r14.append(logstap(i1, "apply", pad(i1, "3_apply.sql"), "Lovable API error: 503", extra=G14)[0])
rc_, m_ = logstap(i2, "vinger_voor", pad(i2, "7_vinger_aggregaat.sql"), voor=True, extra=G14); r14 += [rc_, "onzeker" in m_ or "volgorde" in m_]
rc_, m_ = logstap(i1, "vinger_voor", pad(i1, "7_vinger_aggregaat.sql"), v7(), extra=G14); r14 += [rc_, "al uitgevoerd" in m_]
r14 += [logstap(i1, "stand", pad(i1, "7_vinger_aggregaat.sql"), v7(), extra=G14)[0], logstap(i2, "vinger_voor", pad(i2, "7_vinger_aggregaat.sql"), voor=True, extra=G14)[0]]
ok(f"G5.11 toolfout tijdens de insert van {i1} (die toch gecommit heeft) → onzeker: {i2} STOP · vinger_voor {i1} = NA → «al uitgevoerd» · ✓ stand → {i1} toegepast · {i2} open", "|".join(map(str, r14)), "0|0|0|0|2|2|True|2|True|0|0")
# ---------- rapport ----------
L = [f"# Replica v4.1.2 · N1-W06 · variant {VAR} · rapport\nGemaakt door `scripts/replica_test_N1-W06.py` v4.1.2 · PostgreSQL 16 lokaal (C.UTF-8) · schema `schema_replica_v2.sql` (md5 `{hashlib.md5(open(SCHEMA_BRON,'rb').read()).hexdigest()}`) + `replica_policies_N1-W06.sql` (md5 `{hashlib.md5(open(WM + '/scripts/replica_policies_N1-W06.sql','rb').read()).hexdigest()}`) · live READ ONLY vergeleken op 2026-10-27 20:48 UTC (G0; PostgreSQL 17.6, en_US.UTF-8) · gegevens: export N1 2026-10-27 na P4 W05 (2.299 rijen; W06, W05, W04 = de back-ups van P3) + de 6 policies zoals live, de rol authenticated en één leerder met toegang · SQL-root `{ROOT}`, manifest `{hashlib.md5(open(SQL + '/BLOKKEN_MANIFEST.tsv','rb').read()).hexdigest()}` · elk SQL-bestand NFC-genormaliseerd vóór het uitvoeren · elke P4-uitkomst beoordeeld door `p4_stap_N1-W06.py` v1.6.1 en vastgelegd door `p4_log_stap_N1-W06.py` v1.5.4 (log `P4_log_replica_N1-W06_{VAR}.tsv`).\n",
     f"**Uitslag: {'GROEN' if fout == 0 else 'ROOD'} — {len([x for x in resultaten if x[1] != '·']) - fout}/{len([x for x in resultaten if x[1] != '·'])} controles ✓**\n", "| controle | | kreeg | verwacht |", "|---|---|---|---|"]
for n, s_, k_, w_ in resultaten: L.append(f"| {n} | {s_} | `{k_[:160]}` | `{w_[:160]}` |")
open(R + f"/REPLICA_RAPPORT_N1-W06_{VAR}.md", "w", encoding="utf-8").write("\n".join(L) + "\n")
sh(f"runuser -u claude -- {PGBIN}/pg_ctl -D {DATA} -m fast stop")
n_ = len([x for x in resultaten if x[1] != '·'])
print(f"replica {VAR}: {n_ - fout}/{n_} ✓ · {'GROEN' if fout == 0 else 'ROOD'} · rapport p3/replica/REPLICA_RAPPORT_N1-W06_{VAR}.md")
for n, s_, k_, w_ in resultaten:
    if s_ == "✗": print("  ✗", n, "| kreeg:", k_[:300], "| verwacht:", w_[:300])
    if s_ == "·": print("  ·", n, k_[:300])
sys.exit(1 if fout else 0)
