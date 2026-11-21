# replica_P3_N1-W11.py v1.0 — Controleur-T (8T) · P3 N1-W11 · opdracht 2.3 van de startprompt en 9T-1: de SQL-blokken van p3/sql op een lokale PostgreSQL 16
#   (schema v3 + de policies van W11, geladen met de N1-export van stap 0 P3 = de live stand), zonder iets live te raken. Dit is de INHOUDSREPLICA van W11:
#   (1) heen: per blok in de volgorde van het manifest de READ ONLY-grendel (strict op 10_G3, zonder score op 11_C1), de droogloop, vinger vóór, de generale
#       repetitie (ROLLBACK, daarna vinger ongewijzigd), de apply en vinger na — elke uitkomst tegen verwacht.txt van dat blok;
#   (2) de negatieve grendeltoetsen (B44/B25, B22/B24): een rij van G3 al op strict, of een poging op een item van C1 → de grendel leest iets anders dan
#       verwacht en de apply raakt 0 rijen (leeg_uitvoer), vinger ongewijzigd; daarna de oorzaak weg en het blok gewoon;
#   (3) terug: alle blokken in omgekeerde volgorde (V eerst) met 4_rollback.sql → elke week byte-gelijk aan haar VOOR-stand (27 kolommen), elke
#       typewissel teruggedraaid; daarna opnieuw heen (het pad is herhaalbaar);
#   (4) de eindstand: per week een TSV van 29 kolommen (alles behalve updated_at) uit de databank, cmp met dezelfde 29 kolommen van p3/APP_NA_<week>.tsv
#       (byte-gelijk = exit 0), updated_at nieuw in precies de geraakte rijen, en de rest van N1 ongewijzigd.
#   Wat deze replica NIET doet: de P4-gereedschappen (p4_log_stap, p4_stap, p4_tekst, de STOP-routes G5/G7/G8 van replica_test v5.9) — die zijn voor W11 nog
#   niet geport (deel 2). Uitvoer: p3/replica_p3/REPLICA_P3_RAPPORT_N1-W11.md; exit 1 bij ROOD, 2 bij een STOP van de opzet.
# Gebruik: python3 -I replica_P3_N1-W11.py <werkmap>
import sys, os, csv, json, subprocess, unicodedata, hashlib, shutil, atexit, signal, io
csv.field_size_limit(10**9)
WM = os.path.abspath(sys.argv[1]); SQL = WM + "/p3/sql"; R = WM + "/p3/replica_p3"
if not (os.path.isfile(WM + "/scripts/replica_P3_N1-W11.py") and os.path.isdir(WM + "/p2/definitief")) or os.path.islink(WM + "/p3"):
    print(f"✗ STOP · replica_P3 v1.0: {WM} is geen werkmap van N1-W11"); sys.exit(2)
PGBIN = "/usr/lib/postgresql/16/bin"; DATA = R + "/pgdata"; SOCK = R + "/sock"; PORT = os.environ.get("REPLICA_PORT", "5439")
HW, NZ = 11, 10; WKN = lambda w: f"N1-W{w:02d}"
N1EXP = WM + "/bron/APP_EXPORT_N1_2026-11-21.tsv"; VOORP = {w: WM + f"/bron/APP_BACKUP_{WKN(w)}_2026-11-21.tsv" for w in (HW, NZ)}; NAP = {w: WM + f"/p3/APP_NA_{WKN(w)}.tsv" for w in (HW, NZ)}
md5f = lambda p: hashlib.md5(open(p, "rb").read()).hexdigest()
assert md5f(N1EXP) == "4d2cffa52d76b257a5e32d27f089c455", "N1-export van stap 0 wijkt af"
def sh(cmd, **kw): return subprocess.run(cmd, shell=True, capture_output=True, text=True, **kw)
def lees(p): return list(csv.DictReader(open(p, encoding="utf-8", newline=""), delimiter="\t"))
EXPCOLS = list(lees(N1EXP)[0].keys()); C27 = EXPCOLS[:27]; C29 = [c for c in EXPCOLS if c != "updated_at"]
assert EXPCOLS[27:] == ["id", "created_at", "updated_at"], EXPCOLS[27:]
NN = ["exercise_subtype", "instruction_nl", "question", "correct_answer", "feedback_correct", "feedback_incorrect", "input_arabic", "input_transliteration", "input_translation_nl", "reference_media", "review_flag"]
M = [dict(zip(("volgorde", "week", "blok", "map", "md5_verwacht", "week_voor", "week_na", "soort", "md5_sql"), l.rstrip("\n").split("\t"))) for l in list(open(SQL + "/BLOKKEN_MANIFEST.tsv", encoding="utf-8"))[1:]]
V = {b["blok"]: dict(l.rstrip("\n").split("\t", 1) for l in open(f"{SQL}/{b['map']}/verwacht.txt", encoding="utf-8")) for b in M}
for b in M: assert md5f(f"{SQL}/{b['map']}/verwacht.txt") == b["md5_verwacht"], b["blok"]
os.makedirs(R, exist_ok=True)
for d_ in (DATA, SOCK):
    if os.path.lexists(d_) and not os.path.realpath(d_).startswith(os.path.realpath(R) + os.sep): print(f"✗ STOP · {d_} ligt niet onder {R}"); sys.exit(2)
if os.path.isdir(DATA): shutil.rmtree(DATA)
os.makedirs(SOCK, exist_ok=True); shutil.chown(R, "claude"); shutil.chown(SOCK, "claude")
r = sh(f"runuser -u claude -- {PGBIN}/initdb -D {DATA} -A trust -U postgres -E UTF8 --locale=C.UTF-8"); assert r.returncode == 0, r.stderr
def _pg_stop(): subprocess.run(f"runuser -u claude -- {PGBIN}/pg_ctl -D {DATA} -m fast stop", shell=True, capture_output=True, text=True)
atexit.register(_pg_stop)
for _s in (signal.SIGTERM, signal.SIGINT, signal.SIGHUP): signal.signal(_s, lambda s_, f_: sys.exit(128 + s_))
r = sh(f"runuser -u claude -- {PGBIN}/pg_ctl -D {DATA} -o '-p {PORT} -k {SOCK} -c listen_addresses=' -l {R}/pg.log -w start"); assert r.returncode == 0, r.stderr + r.stdout
PSQL = f"psql -X -q -h {SOCK} -p {PORT} -U postgres -v ON_ERROR_STOP=1 -At"
SCHEMA = open(WM + "/p3/replica_schema/schema_replica_v3.sql", encoding="utf-8").read().replace("INSERT INTO public.curriculum_units (code) VALUES ('U1'), ('U2');", "")
_N1 = lees(N1EXP)
UNITS = "INSERT INTO public.curriculum_units (code) SELECT DISTINCT u FROM (VALUES " + ", ".join(f"('{u}')" for u in sorted({x["unit_code"] for x in _N1})) + ") x(u) ON CONFLICT DO NOTHING;\n"
POLICIES = open(WM + "/scripts/replica_policies_N1-W11.sql", encoding="utf-8").read()
TL = "b483998f-c96f-4185-9485-ec4f7bb24da7"
for q_ in ("DROP DATABASE IF EXISTS replica;", "CREATE DATABASE replica;"):
    r = sh(f'{PSQL} -d postgres -c "{q_}"'); assert r.returncode == 0, r.stderr
r = subprocess.run(f"{PSQL} -d replica -f -", shell=True, input=SCHEMA + UNITS + POLICIES, capture_output=True, text=True); assert r.returncode == 0, r.stderr
r = sh(f"""{PSQL} -d replica -c "\\copy public.curriculum_items ({', '.join(EXPCOLS)}) FROM '{N1EXP}' WITH (FORMAT csv, DELIMITER E'\\t', HEADER true, FORCE_NOT_NULL ({', '.join(NN)}))" """); assert r.returncode == 0, r.stderr
r = sh(f"""{PSQL} -d replica -c "INSERT INTO auth.users (id, last_sign_in_at) VALUES ('{TL}', now() - interval '1 day');" """); assert r.returncode == 0, r.stderr
def run(sql):
    assert unicodedata.normalize("NFC", sql) == sql, "SQL niet NFC-stabiel"
    p = subprocess.run(f"{PSQL} -d replica -f -", shell=True, input=sql, capture_output=True, text=True)
    return p.returncode, [l for l in p.stdout.split("\n") if l.strip()], p.stderr.strip()
def laatste(sql): rc, out, err = run(sql); return out[-1] if (rc == 0 and out) else f"FOUT rc={rc} {err[:200]}"
def q(sql): rc, out, err = run(sql); assert rc == 0, err; return out[-1] if out else ""
def bestand(b, n): return open(f"{SQL}/{next(x['map'] for x in M if x['blok'] == b)}/{n}", encoding="utf-8").read()
def heeft(b, n): return os.path.exists(f"{SQL}/{next(x['map'] for x in M if x['blok'] == b)}/{n}")
RES = []
def ok(naam, kreeg, verw):
    RES.append((naam, "✓" if kreeg == verw else "✗", kreeg, verw)); return kreeg == verw
def vinger(b): return laatste(bestand(b, "7_vinger_aggregaat.sql"))
vv = lambda b: f"{V[b]['week_voor']}|{V[b]['blok_voor']}|{V[b]['rest']}"; vn = lambda b: f"{V[b]['week_na']}|{V[b]['blok_na']}|{V[b]['rest']}"
GRENDEL = {"1_strict_grendel.sql": "strict_grendel", "1_zonder_score_grendel.sql": "zonder_score_grendel"}
def heen(b, label=""):
    for f_, k_ in GRENDEL.items():
        if heeft(b, f_): ok(f"{label}{b} grendel vooraf ({f_}, READ ONLY)", laatste(bestand(b, f_)), V[b][k_])
    ok(f"{label}{b} vinger vóór", vinger(b), vv(b))
    ok(f"{label}{b} droogloop", laatste(bestand(b, "2_droogloop.sql")), V[b]["droogloop"])
    g = laatste(bestand(b, "8_generale_repetitie.sql")); ok(f"{label}{b} generale repetitie (eindrij, isolatie)", (g.startswith(V[b]["gr_eindrij"] + "|"), g.endswith("|repeatable read")), (True, True))
    ok(f"{label}{b} na de gr: vinger ongewijzigd (ROLLBACK)", vinger(b), vv(b))
    ok(f"{label}{b} apply", laatste(bestand(b, "3_apply.sql")), V[b]["apply_uitvoer"])
    ok(f"{label}{b} vinger na", vinger(b), vn(b))
def terug(b, label=""):
    ok(f"{label}{b} rollback", laatste(bestand(b, "4_rollback.sql")), V[b]["rollback_uitvoer"]); ok(f"{label}{b} vinger na de rollback = vóór", vinger(b), vv(b))
def ids(b): return [l.split("\t")[0] for l in open(f"{SQL}/{next(x['map'] for x in M if x['blok'] == b)}/items.txt", encoding="utf-8") if l.rstrip("\n").split("\t")[1] == "gewijzigd"]   # alleen de geraakte rijen van het blok
def lst(xs): return ", ".join(f"'{x}'" for x in xs)
G3 = next(b["blok"] for b in M if heeft(b["blok"], "1_strict_grendel.sql")); C1 = next(b["blok"] for b in M if heeft(b["blok"], "1_zonder_score_grendel.sql"))
# (1)+(2) heen, met de negatieve grendeltoetsen vlak vóór hun blok
for b in M:
    B = b["blok"]
    if B == G3:
        q("UPDATE public.curriculum_items SET strict_tashkeel = true WHERE item_id = 'U11-grammatica-14-1';")
        ok(f"NEG {B}: grendel vooraf met U11-grammatica-14-1 al op strict", laatste(bestand(B, "1_strict_grendel.sql")), "true|1")
        ok(f"NEG {B}: apply raakt 0 rijen", laatste(bestand(B, "3_apply.sql")), V[B]["leeg_uitvoer"])
        q("UPDATE public.curriculum_items SET strict_tashkeel = false WHERE item_id = 'U11-grammatica-14-1';")
        ok(f"NEG {B}: na het herstel van de drift: vinger = vóór", vinger(B), vv(B))
    if B == C1:
        q(f"INSERT INTO public.curriculum_item_attempts (student_id, item_id, answer_text) SELECT '{TL}', id, 'replica' FROM public.curriculum_items WHERE item_id = 'U11-reflectie-03-1';")
        ok(f"NEG {B}: grendel vooraf met één poging op U11-reflectie-03-1", laatste(bestand(B, "1_zonder_score_grendel.sql")), "1|0")
        ok(f"NEG {B}: apply raakt 0 rijen", laatste(bestand(B, "3_apply.sql")), V[B]["leeg_uitvoer"])
        q("DELETE FROM public.curriculum_item_attempts WHERE answer_text = 'replica';")
        ok(f"NEG {B}: na het weghalen van de poging: vinger = vóór", vinger(B), vv(B))
    heen(B)
# (3) terug, V eerst, en elke week weer op VOOR; daarna opnieuw heen
def export(w):   # 29 kolommen (zonder updated_at) als TSV, zoals de export (week, display_order, item_id C)
    sel = ", ".join(f"coalesce({c}::text, '')" for c in C29)
    rc, out, err = run(f"SET TimeZone = 'UTC'; SELECT json_agg(json_build_array({sel}) ORDER BY week, display_order, item_id COLLATE \"C\") FROM public.curriculum_items WHERE week = {w};")
    assert rc == 0, err
    buf = io.StringIO(); wr = csv.writer(buf, delimiter="\t", lineterminator="\n", quoting=csv.QUOTE_MINIMAL); wr.writerow(C29)
    for row in json.loads(out[-1]): wr.writerow(row)
    return buf.getvalue()
def tsv29(p):
    rr = lees(p); rr.sort(key=lambda x: (int(x["week"]), int(x["display_order"] or 0), x["item_id"].encode()))
    buf = io.StringIO(); wr = csv.writer(buf, delimiter="\t", lineterminator="\n", quoting=csv.QUOTE_MINIMAL); wr.writerow(C29)
    for x in rr: wr.writerow([x[c] for c in C29])
    return buf.getvalue()
for b in reversed(M): terug(b["blok"], "TERUG ")
for w in (HW, NZ): ok(f"TERUG {WKN(w)}: 29 kolommen = de VOOR-stand (byte-gelijk)", export(w) == tsv29(VOORP[w]), True)
TW = q("SELECT count(*) FROM public.curriculum_items WHERE week = 11 AND exercise_type::text = 'meerkeuze' AND item_id IN ('U11-grammatica-14-1','U11-schrijven-05-1','U11-reflectie-03-1');")
ok("TERUG typewissels: grammatica-14-1 en schrijven-05-1 weer geen meerkeuze, reflectie-03-1 weer meerkeuze", TW, "1")
for b in M: heen(b["blok"], "OPNIEUW ")
# (4) de eindstand
os.makedirs(R + "/uit", exist_ok=True)
for w in (HW, NZ):
    a, b_ = export(w), tsv29(NAP[w]); open(f"{R}/uit/DB_{WKN(w)}_29kol.tsv", "w", encoding="utf-8", newline="").write(a); open(f"{R}/uit/NA_{WKN(w)}_29kol.tsv", "w", encoding="utf-8", newline="").write(b_)
    c_ = subprocess.run(["cmp", f"{R}/uit/DB_{WKN(w)}_29kol.tsv", f"{R}/uit/NA_{WKN(w)}_29kol.tsv"]).returncode
    ok(f"EIND {WKN(w)}: cmp databank (29 kolommen) ↔ p3/APP_NA_{WKN(w)}.tsv (29 kolommen)", c_, 0)
    ok(f"EIND {WKN(w)}: vinger27 = week_na van het laatste blok van die week", vinger([x["blok"] for x in M if x["week"] == WKN(w)][-1]).split("|")[:2], [x for x in M if x["week"] == WKN(w)][-1]["week_na"].split("|"))
GER = {i for b in M for i in ids(b["blok"])}
NU = json.loads(q("SET TimeZone = 'UTC'; SELECT json_object_agg(item_id, updated_at::text) FROM public.curriculum_items;")); OUD = {x["item_id"]: x["updated_at"] for x in _N1}
ok("EIND updated_at van de ongeraakte rijen = de export (zelfde tekstvorm)", sum(NU[i] == OUD[i] for i in OUD if i not in {j for b in M for j in ids(b["blok"])}), len(OUD) - len({j for b in M for j in ids(b["blok"])}))
NIEUW = {i for i in OUD if NU[i] != OUD[i]}
ok("EIND updated_at nieuw in precies de geraakte rijen (W11 182 + W10 2)", (len(NIEUW), NIEUW == GER), (len(GER), True))
REST = [w for w in sorted({int(x["week"]) for x in _N1}) if w not in (HW, NZ)]
_rest_db = q("SELECT md5(string_agg(item_id || '|' || md5(concat_ws('|', " + ", ".join(f"coalesce({c}::text, '')" for c in C27) + f")), E'\\n' ORDER BY item_id COLLATE \"C\")) FROM public.curriculum_items WHERE week NOT IN ({HW}, {NZ});")
_rest_py = hashlib.md5("\n".join(x["item_id"] + "|" + hashlib.md5("|".join(x[c] for c in C27).encode()).hexdigest() for x in sorted((x for x in _N1 if int(x["week"]) not in (HW, NZ)), key=lambda x: x["item_id"].encode())).encode()).hexdigest()
ok(f"EIND de rest van N1 ({len(REST)} weken) ongewijzigd (27 kolommen)", _rest_db, _rest_py)
# (5) de master uit de eindstand van de replica = de voorspelde master van voorspel_master (p3/master/VOORSPELDE_MD5.txt)
sel = ", ".join(f"coalesce({c}::text, '')" for c in EXPCOLS)
rc_, out_, err_ = run(f"SET TimeZone = 'UTC'; SELECT json_agg(json_build_array({sel}) ORDER BY week, display_order, item_id COLLATE \"C\") FROM public.curriculum_items WHERE week BETWEEN 1 AND 25;"); assert rc_ == 0, err_
with open(f"{R}/uit/n1_replica.tsv", "w", encoding="utf-8", newline="") as f:
    wr = csv.writer(f, delimiter="\t", lineterminator="\n", quoting=csv.QUOTE_MINIMAL); wr.writerow(EXPCOLS); [wr.writerow(x) for x in json.loads(out_[-1])]
S_ = WM + "/scripts"; rn = lambda *a: subprocess.run(["python3", "-I", *a], capture_output=True, text=True, check=True)
rn(f"{S_}/app_naar_master.py", f"{R}/uit/n1_replica.tsv", f"{R}/uit/n1_lijst.tsv", "N1"); rn(f"{S_}/master_rest_uit_master.py", WM + "/bron/LEESBARE_LIJST_MASTER_appwaar_2026-11-21.tsv", f"{R}/uit/n1_lijst.tsv", f"{R}/uit/rest.tsv")
rn(f"{S_}/maak_master.py", f"{R}/uit/n1_lijst.tsv", f"{R}/uit/rest.tsv", f"{R}/uit/LEESBARE_LIJST_MASTER_replica.tsv")
ok("EIND master uit de replica = de voorspelde master (p3/master/VOORSPELDE_MD5.txt)", md5f(f"{R}/uit/LEESBARE_LIJST_MASTER_replica.tsv"), open(WM + "/p3/master/VOORSPELDE_MD5.txt").read().strip())
rood = [x for x in RES if x[1] == "✗"]
L = [f"# Inhoudsreplica P3 · {WKN(HW)} (+ nazorg {WKN(NZ)}) · `scripts/replica_P3_{WKN(HW)}.py` v1.0", "",
     f"Lokale PostgreSQL 16, schema v3, geladen met de N1-export van stap 0 P3 (`4d2cffa5…`, {len(_N1)} rijen); SQL-root `p3/sql` ({len(M)} blokken, manifest `{md5f(SQL + '/BLOKKEN_MANIFEST.tsv')}`). Niets live.", "",
     f"**Uitslag: {'GROEN' if not rood else 'ROOD'}** · {len(RES)} toetsen · {len(RES) - len(rood)} ✓ · {len(rood)} ✗", "", "| toets | | kreeg | verwacht |", "|---|---|---|---|"]
L += [f"| {n} | {s} | `{str(k)[:120]}` | `{str(v)[:120]}` |" for n, s, k, v in RES]
open(R + "/REPLICA_P3_RAPPORT_N1-W11.md", "w", encoding="utf-8").write("\n".join(L) + "\n")
print(f"replica P3 {WKN(HW)}: {'GROEN' if not rood else 'ROOD'} · {len(RES)} toetsen · {len(rood)} ✗")
for x in rood[:20]: print("  ✗", x[0], "| kreeg", str(x[2])[:150], "| verwacht", str(x[3])[:150])
sys.exit(1 if rood else 0)
