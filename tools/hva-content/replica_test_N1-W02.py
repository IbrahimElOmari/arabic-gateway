# replica_test_N1-W02.py v2 — Controleur-T (8T) / Maker-T (7T) · P3 N1-W02 · techplan T6/T13 · architectuur T v2 §1, §6.
# Replica v2 = lokale PostgreSQL 16 met het LIVE-schema van public.curriculum_items (uit information_schema/pg_catalog, read-only
# opgehaald op 2026-10-20: 34 kolommen, NOT NULL/defaults, de gegenereerde kolommen needs_*, PK, UNIQUE, beide FK's, indexen,
# de trigger op updated_at) + minimale stubs voor auth.users, curriculum_units, curriculum_item_attempts en user_roles.
# Gegevens: de back-ups VOOR van W02 (81 rijen) en W01 (21 rijen). Elk SQL-bestand wordt eerst NFC-genormaliseerd, zoals de
# Lovable-tool doet bij het plakken (W01-les), en moet daarbij byte-gelijk blijven.
# Groepen: G1 hoofdcyclus W02 (cumulatief L1 → L2 → R1 → R2, terugdraaien R2 → R1 → L2 → L1) · G2 W01-nazorg · G3 negatieve tests.
# Gebruik: python3 -I replica_test_N1-W02.py <schema-metadata.json> <map p3>   → <map p3>/replica/REPLICA_RAPPORT.md, exit 1 bij ROOD
import sys, os, json, subprocess, unicodedata, hashlib, csv, re, shutil, time
META, P3 = sys.argv[1], os.path.abspath(sys.argv[2])
B = os.path.dirname(P3); R = P3 + "/replica"; os.makedirs(R, exist_ok=True)
PGBIN = "/usr/lib/postgresql/16/bin"; DATA = R + "/pgdata"; SOCK = R + "/sock"; PORT = "5433"
SQL2 = P3 + "/sql/N1-W02"; SQL1 = P3 + "/sql/N1-W01"
BLOKKEN = ["1_L1", "2_L2", "3_R1", "4_R2"]
VOOR2 = B + "/uit/APP_BACKUP_N1-W02_2026-10-19.tsv"; VOOR1 = B + "/uit/APP_BACKUP_N1-W01_2026-10-20.tsv"
# ---------- 1. schema uit de live metadata ----------
m = json.load(open(META, encoding="utf-8"))["rows"][0]
def coltype(c):
    if c["type"] == "USER-DEFINED": return c["udt"]
    return {"timestamp with time zone": "timestamptz"}.get(c["type"], c["type"])
regels = []
for c in m["kolommen"]:
    s = f'  {c["n"]} {coltype(c)}'
    if c["gen"] == "ALWAYS": s += f' GENERATED ALWAYS AS {c["genexpr"]} STORED'
    else:
        if c["null"] == "NO": s += " NOT NULL"
        if c["def"] is not None: s += f' DEFAULT {c["def"]}'
    regels.append(s)
enums = "\n".join(f"CREATE TYPE public.{e['type']} AS ENUM (" + ", ".join("'" + w + "'" for w in e["waarden"]) + ");" for e in m["enums"])
cons = "\n".join(f"ALTER TABLE public.curriculum_items ADD CONSTRAINT {c['naam']} {c['def'].replace('REFERENCES curriculum_units', 'REFERENCES public.curriculum_units')};"
                 for c in sorted(m["constraints"], key=lambda c: {"p": 0, "u": 1, "f": 2}[c["type"]]))
idx = "\n".join(i["def"] + ";" for i in m["indexen"] if not i["naam"].endswith(("_pkey", "_key")))
trig = "\n".join(f"CREATE OR REPLACE FUNCTION public.{t['functie']}() RETURNS trigger LANGUAGE plpgsql AS $f${t['bron']}$f$;\n" + t["def"].replace("EXECUTE FUNCTION ", "EXECUTE FUNCTION public.") + ";" for t in m["triggers"])
SCHEMA = f"""-- schema_replica_v2.sql · gemaakt door replica_test_N1-W02.py uit de live metadata ({os.path.basename(META)}, md5 {hashlib.md5(open(META,'rb').read()).hexdigest()})
-- live: {m['versie'].split(' on ')[0]} · rol {m['rol']} · RLS aan: {m['rls_aan']}. Replica: PostgreSQL 16 (zelfde gedrag voor jsonb, md5, string_agg, set_config, U&-literals, gegenereerde kolommen).
CREATE SCHEMA auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY, last_sign_in_at timestamptz);
CREATE TYPE public.app_role AS ENUM ('admin', 'teacher', 'student');
{enums}
CREATE TABLE public.curriculum_units (code text PRIMARY KEY);
INSERT INTO public.curriculum_units (code) VALUES ('U1'), ('U2');
CREATE TABLE public.curriculum_items (
{(','+chr(10)).join(regels)}
);
{cons}
{idx}
{trig}
ALTER TABLE public.curriculum_items ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.curriculum_item_attempts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id uuid REFERENCES public.curriculum_items(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.user_roles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, role public.app_role NOT NULL);
"""
open(R + "/schema_replica_v2.sql", "w", encoding="utf-8").write(SCHEMA)
EXPCOLS = ["item_id","unit_code","week","skill","exercise_type","exercise_subtype","display_order","instruction_nl","question","options","correct_answer","correct_options","feedback_correct","feedback_incorrect","input_arabic","input_transliteration","input_translation_nl","reference_media","media_production","media_url","media_alt","audio_url","image_url","points","review_flag","is_published","strict_tashkeel","id","created_at","updated_at"]
NOTNULL_TXT = [c["n"] for c in m["kolommen"] if c["type"] == "text" and c["null"] == "NO" and c["n"] in EXPCOLS and c["n"] not in ("item_id", "unit_code", "skill")]
# ---------- 2. cluster ----------
def sh(cmd, **kw): return subprocess.run(cmd, shell=True, capture_output=True, text=True, **kw)
if not os.path.exists(DATA + "/PG_VERSION"):
    os.makedirs(SOCK, exist_ok=True); shutil.chown(R, "claude"); shutil.chown(SOCK, "claude")
    r = sh(f"runuser -u claude -- {PGBIN}/initdb -D {DATA} -A trust -U postgres -E UTF8 --locale=C.UTF-8"); assert r.returncode == 0, r.stderr
if sh(f"runuser -u claude -- {PGBIN}/pg_ctl -D {DATA} status").returncode != 0:
    r = sh(f"runuser -u claude -- {PGBIN}/pg_ctl -D {DATA} -o '-p {PORT} -k {SOCK} -c listen_addresses=' -l {R}/pg.log -w start"); assert r.returncode == 0, r.stderr + r.stdout
PSQL = f"psql -X -q -h {SOCK} -p {PORT} -U postgres -v ON_ERROR_STOP=1 -At"
def nieuwe_db():
    for q in ("DROP DATABASE IF EXISTS replica;", "CREATE DATABASE replica;"):
        r = sh(f'{PSQL} -d postgres -c "{q}"'); assert r.returncode == 0, r.stderr
    r = subprocess.run(f"{PSQL} -d replica -f -", shell=True, input=SCHEMA, capture_output=True, text=True); assert r.returncode == 0, r.stderr
    for p in (VOOR2, VOOR1):
        r = sh(f"""{PSQL} -d replica -c "\\copy public.curriculum_items ({', '.join(EXPCOLS)}) FROM '{p}' WITH (FORMAT csv, DELIMITER E'\\t', HEADER true, FORCE_NOT_NULL ({', '.join(NOTNULL_TXT)}))" """)
        assert r.returncode == 0, r.stderr
def run(sql, nfc=True):
    if nfc:
        n = unicodedata.normalize("NFC", sql); assert n == sql, "SQL niet NFC-stabiel"; sql = n
    r = subprocess.run(f"{PSQL} -d replica -f -", shell=True, input=sql, capture_output=True, text=True)
    return r.returncode, [l for l in r.stdout.split("\n") if l.strip()], r.stderr.strip()
def bestand(map_, naam): return open(f"{map_}/{naam}", encoding="utf-8").read()
def laatste(sql): rc, out, err = run(sql); return out[-1] if (rc == 0 and out) else f"FOUT rc={rc} {err[:200]}"
def ret(sql):
    rc, out, err = run(sql)
    if rc != 0: return f"FOUT rc={rc} {err[:200]}"
    L = sorted(l.split("|", 1) for l in out if "|" in l)
    return f"{len(L)}|" + (hashlib.md5("\n".join(f"{a}|{b}" for a, b in L).encode()).hexdigest() if L else "")
def verwacht(map_): return dict(l.rstrip("\n").split("\t", 1) for l in open(f"{map_}/verwacht.txt", encoding="utf-8"))
def q(sql): rc, out, err = run(sql, nfc=False); assert rc == 0, err; return out[-1] if out else ""
resultaten = []; fout = 0
def ok(naam, kreeg, verw):
    global fout
    goed = kreeg == verw
    if not goed: fout += 1
    resultaten.append((naam, "✓" if goed else "✗", kreeg, verw))
T13 = "SELECT count(*) FILTER (WHERE needs_image) || '|' || count(*) FILTER (WHERE strict_tashkeel) || '|' || sum(points) || '|' || count(*) FILTER (WHERE needs_ns_audio) || '|' || count(*) FILTER (WHERE needs_student_recording) FROM public.curriculum_items WHERE week = 2;"
B25 = "SELECT count(*) FROM public.curriculum_items WHERE week = 2 AND strict_tashkeel AND NOT (options ? correct_answer);"
W01VINGER = bestand(f"{SQL1}/1_W01", "7_vinger_aggregaat.sql"); W01V = verwacht(f"{SQL1}/1_W01")
# ---------- G1: hoofdcyclus W02 ----------
nieuwe_db()
V = {b: verwacht(f"{SQL2}/{b}") for b in BLOKKEN}
ok("G1.0 replica = live-vingerafdruk VOOR (week 2 | blok L1 | rest)", laatste(bestand(f"{SQL2}/1_L1", "7_vinger_aggregaat.sql")), f"{V['1_L1']['week_voor']}|{V['1_L1']['blok_voor']}|{V['1_L1']['rest']}")
ok("G1.0b W01 = live-vingerafdruk VOOR", laatste(W01VINGER).split("|", 2)[0] + "|" + laatste(W01VINGER).split("|")[1], W01V["week_voor"])
ok("G1.0c T13 vóór: needs_image | strict | punten | needs_ns_audio | needs_student_recording", q(T13), "10|0|119|42|6")
for b in BLOKKEN:  # P3-situatie: alles nog VOOR
    ok(f"G1.1 {b} droogloop P3 (live = VOOR)", laatste(bestand(f"{SQL2}/{b}", "2_droogloop.sql")), V[b]["droogloop_p3"])
    ok(f"G1.2 {b} grootte-probe v2 vóór de apply", laatste(bestand(f"{SQL2}/{b}", "9_grootte_probe.sql")), V[b]["probe_voor_apply"])
    ok(f"G1.3 {b} oud-aggregaat", laatste(bestand(f"{SQL2}/{b}", "6_oud_aggregaat.sql")), V[b]["oud_aggregaat"])
for b in BLOKKEN:  # P4-draaiboek, cumulatief
    d = f"{SQL2}/{b}"; v = V[b]
    ok(f"G1.4 {b} droogloop P4 (live = NA vorig blok)", laatste(bestand(d, "2_droogloop.sql")), v["droogloop"])
    ok(f"G1.5 {b} 7_vinger vóór", laatste(bestand(d, "7_vinger_aggregaat.sql")), f"{v['week_voor']}|{v['blok_voor']}|{v['rest']}")
    ok(f"G1.6 {b} generale repetitie (+ T15-telling in dezelfde aanroep)", laatste(bestand(d, "8_generale_repetitie.sql")), v["gr_eindrij"] + "|0|0|0|")
    ok(f"G1.7 {b} 7_vinger na de repetitie = vóór", laatste(bestand(d, "7_vinger_aggregaat.sql")), f"{v['week_voor']}|{v['blok_voor']}|{v['rest']}")
    ok(f"G1.8 {b} apply (RETURNING)", ret(bestand(d, "3_apply.sql")), v["apply_returning"])
    ok(f"G1.9 {b} 7_vinger na de apply (rest ongewijzigd)", laatste(bestand(d, "7_vinger_aggregaat.sql")), f"{v['week_na']}|{v['blok_na']}|{v['rest']}")
    ok(f"G1.10 {b} tweede apply = 0", ret(bestand(d, "3_apply.sql")), "0|")
    ok(f"G1.11 {b} grootte-probe v2 na de apply", laatste(bestand(d, "9_grootte_probe.sql")), v["probe_na_apply"])
NA_WEEK = V["4_R2"]["week_na"]
ok("G1.12 na R2 = volledige NA-stand (week 2)", laatste(bestand(f"{SQL2}/4_R2", "7_vinger_aggregaat.sql")).split("|")[0] + "|" + laatste(bestand(f"{SQL2}/4_R2", "7_vinger_aggregaat.sql")).split("|")[1], NA_WEEK)
ok("G1.13 T13 na: needs_image 10 → 0 · strict 0 → 20 · punten 119 → 109 · audio/opname ongewijzigd", q(T13), "0|20|109|42|6")
ok("G1.14 T12/B25: strict-items met sleutel buiten de opties", q(B25), "0")
w01 = laatste(W01VINGER).split("|"); ok("G1.15 W01 ongewijzigd door alle W02-blokken", f"{w01[0]}|{w01[1]}", W01V["week_voor"])
for b in reversed(BLOKKEN):
    d = f"{SQL2}/{b}"; v = V[b]
    ok(f"G1.16 {b} rollback (RETURNING)", ret(bestand(d, "4_rollback.sql")), v["rollback_returning"])
    ok(f"G1.17 {b} 7_vinger na de rollback = vóór dit blok", laatste(bestand(d, "7_vinger_aggregaat.sql")), f"{v['week_voor']}|{v['blok_voor']}|{v['rest']}")
    ok(f"G1.18 {b} tweede rollback = 0", ret(bestand(d, "4_rollback.sql")), "0|")
ok("G1.19 T13 na het terugdraaien = start", q(T13), "10|0|119|42|6")
# ---------- G2: W01-nazorg ----------
d = f"{SQL1}/1_W01"; v = W01V
ok("G2.1 W01 droogloop (P3 = P4)", laatste(bestand(d, "2_droogloop.sql")), v["droogloop_p3"])
ok("G2.2 W01 grootte-probe v2 vóór", laatste(bestand(d, "9_grootte_probe.sql")), v["probe_voor_apply"])
ok("G2.3 W01 generale repetitie (+ T15)", laatste(bestand(d, "8_generale_repetitie.sql")), v["gr_eindrij"] + "|0|0|0|")
ok("G2.4 W01 apply", ret(bestand(d, "3_apply.sql")), v["apply_returning"])
ok("G2.5 W01 7_vinger na", laatste(bestand(d, "7_vinger_aggregaat.sql")), f"{v['week_na']}|{v['blok_na']}|{v['rest']}")
ok("G2.6 W01 tweede apply = 0", ret(bestand(d, "3_apply.sql")), "0|")
ok("G2.7 W02 ongewijzigd door W01", laatste(bestand(f"{SQL2}/1_L1", "7_vinger_aggregaat.sql")), f"{V['1_L1']['week_voor']}|{V['1_L1']['blok_voor']}|{V['1_L1']['rest']}")
ok("G2.8 W01 rollback", ret(bestand(d, "4_rollback.sql")), v["rollback_returning"])
ok("G2.9 W01 terug = start", laatste(bestand(d, "7_vinger_aggregaat.sql")), f"{v['week_voor']}|{v['blok_voor']}|{v['rest']}")
# ---------- G3: negatieve tests ----------
nieuwe_db(); v = V["1_L1"]; d = f"{SQL2}/1_L1"
eerste = sorted(l.split("\t")[0] for l in open(f"{d}/items.txt", encoding="utf-8"))[0]
q(f"UPDATE public.curriculum_items SET question = question || ' ' WHERE item_id = '{eerste}';")
ok(f"G3.1 toestandsgrendel: 1 rij buiten het log gewijzigd ({eerste}) → apply 0", ret(bestand(d, "3_apply.sql")), "0|")
q(f"UPDATE public.curriculum_items SET question = left(question, length(question) - 1) WHERE item_id = '{eerste}';")
ok("G3.1b stand terug = VOOR", laatste(bestand(d, "7_vinger_aggregaat.sql")), f"{v['week_voor']}|{v['blok_voor']}|{v['rest']}")
a = bestand(d, "3_apply.sql"); k = a.index("(VALUES"); j = a.index("َ", k)
ok("G3.2 plakgrendel: één fatḥa weg in de VALUES → apply 0", ret(a[:j] + a[j + 1:]), "0|")
ok("G3.2b stand ongewijzigd", laatste(bestand(d, "7_vinger_aggregaat.sql")), f"{v['week_voor']}|{v['blok_voor']}|{v['rest']}")
# G3.3 NFC-regressie (W01-les): R1-rollback zonder U&-escape, geplakt zoals de tool doet (NFC) → 0; met escape → alle rijen
d3 = f"{SQL2}/3_R1"; v3 = V["3_R1"]
ok("G3.3a R1 apply (rijen van R1 zijn VOOR)", ret(bestand(d3, "3_apply.sql")), v3["apply_returning"])
rb = bestand(d3, "4_rollback.sql"); esc = re.findall(r"U&'((?:[^']|'')*)'::text", rb)
def ont(s): return re.sub(r"\\\+([0-9A-F]{6})|\\([0-9A-F]{4})", lambda mm: chr(int(mm.group(1) or mm.group(2), 16)), s.replace("''", "'")).replace("\\\\", "\\")
rauw = rb
for e in esc: rauw = rauw.replace(f"U&'{e}'::text", "'" + ont(e).replace("'", "''") + "'::text")
ok(f"G3.3b R1-rollback heeft {len(esc)} U&-escape(s); zonder escape is de tekst niet NFC-stabiel", str(len(esc) > 0 and unicodedata.normalize('NFC', rauw) != rauw), "True")
ok("G3.3c rollback zónder escape, NFC-geplakt → 0 (fail-closed, zoals W01 v3)", ret(unicodedata.normalize("NFC", rauw)), "0|")
ok("G3.3d rollback mét escape (v4.2) → alle rijen", ret(rb), v3["rollback_returning"])
# G3.4 lege jsonb-cel (T13): options leeg in de NA → NOT NULL-fout, niets veranderd
tmp = R + "/g34"; shutil.rmtree(tmp, ignore_errors=True); os.makedirs(tmp)
l1 = {l.split("\t")[0] for l in open(f"{d}/items.txt", encoding="utf-8")}
for bron, doel in ((f"{d}/VOOR_L1.tsv", f"{tmp}/VOOR.tsv"), (f"{d}/NA_L1.tsv", f"{tmp}/NA.tsv")):  # alleen de 27 L1-rijen; in NA één lege options-cel
    rows = [r_ for r_ in csv.DictReader(open(bron, encoding="utf-8", newline=""), delimiter="\t") if r_["item_id"] in l1]; kop = list(rows[0].keys())
    for r_ in rows:
        if doel.endswith("NA.tsv") and r_["item_id"] == eerste: r_["options"] = ""
    with open(doel, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f, delimiter="\t", lineterminator="\n", quoting=csv.QUOTE_MINIMAL); w.writerow(kop)
        for r_ in rows: w.writerow([r_[c] for c in kop])
g = subprocess.run(["python3", "-I", B + "/scripts/maak_sql_N1-W02.py", f"{tmp}/VOOR.tsv", f"{tmp}/NA.tsv", f"{tmp}/sql", "--week", "2", "--blokken", "L1=luisteren-01,luisteren-02,luisteren-03"], capture_output=True, text=True)
assert g.returncode == 0, g.stderr
rc, out, err = run(bestand(f"{tmp}/sql/1_L1", "3_apply.sql"))
ok("G3.4 lege jsonb-cel (options) → NOT NULL-fout, statement faalt", str(rc != 0 and "null value" in err and "options" in err), "True")
ok("G3.4b stand ongewijzigd na de fout", laatste(bestand(d, "7_vinger_aggregaat.sql")), f"{v['week_voor']}|{v['blok_voor']}|{v['rest']}")
# G3.5 noodrollback 4b na een apply
d2 = f"{SQL2}/2_L2"; v2 = V["2_L2"]
ok("G3.5a L2 apply", ret(bestand(d2, "3_apply.sql")), v2["apply_returning"])
ok("G3.5b noodrollback 4b (zonder toestandsgrendel)", ret(bestand(d2, "4b_noodrollback.sql")), v2["rollback_returning"])
ok("G3.5c blok L2 terug = VOOR", laatste(bestand(d2, "7_vinger_aggregaat.sql")).split("|", 2)[2].split("|")[0] + "|" + laatste(bestand(d2, "7_vinger_aggregaat.sql")).split("|")[3], v2["blok_voor"])
# G3.6 een read-only bestand weigert elke schrijfactie (veiligheidsnet voor de live controles)
ro = bestand(d, "7_vinger_aggregaat.sql").replace("ROLLBACK;", f"UPDATE public.curriculum_items SET question = question WHERE item_id = '{eerste}';\nROLLBACK;")
rc, out, err = run(ro)
ok("G3.6 UPDATE binnen BEGIN TRANSACTION READ ONLY → geweigerd", str(rc != 0 and "read-only transaction" in err), "True")
# G3.7 elk SQL-bestand NFC-stabiel; read-only bestanden zonder schrijfopdracht
alle = [f"{SQL2}/{b}/{f}" for b in BLOKKEN for f in os.listdir(f"{SQL2}/{b}") if f.endswith(".sql")] + [f"{SQL1}/1_W01/{f}" for f in os.listdir(f"{SQL1}/1_W01") if f.endswith(".sql")]
nfc_ok = sum(1 for p in alle if unicodedata.normalize("NFC", open(p, encoding="utf-8").read()) == open(p, encoding="utf-8").read())
ok(f"G3.7 SQL-bestanden NFC-stabiel ({len(alle)} bestanden)", str(nfc_ok), str(len(alle)))
# ---------- rapport ----------
groen = sum(1 for r_ in resultaten if r_[1] == "✓"); totaal = sum(1 for r_ in resultaten if r_[1] in ("✓", "✗"))
L = [f"# Replica v2 · N1-W02 · rapport\nGemaakt door `scripts/replica_test_N1-W02.py` v2 · PostgreSQL 16 lokaal · schema uit de live metadata (`schema_replica_v2.sql`, md5 `{hashlib.md5(SCHEMA.encode()).hexdigest()}`) · gegevens: back-up W02 (81) + back-up W01 (21) · elk SQL-bestand NFC-genormaliseerd vóór het uitvoeren (zoals de tool).\n",
     f"**Uitslag: {'REPLICA GROEN' if fout == 0 else 'REPLICA ROOD'} · {groen}/{totaal}**\n", "| test | | kreeg | verwacht |", "|---|---|---|---|"]
for n_, s_, k_, v_ in resultaten: L.append(f"| {n_} | {s_} | `{k_}` | `{v_}` |" if s_ else f"| {n_} | | | |")
open(R + "/REPLICA_RAPPORT.md", "w", encoding="utf-8").write("\n".join(L) + "\n")
print(f"{'REPLICA GROEN' if fout == 0 else 'REPLICA ROOD'} {groen}/{totaal}")
for n_, s_, k_, v_ in resultaten:
    if s_ == "✗": print("  ✗", n_, "| kreeg", k_, "| verwacht", v_)
sys.exit(1 if fout else 0)
