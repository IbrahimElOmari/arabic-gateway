# maak_sql_N1-W02.py v4.2.1 — Maker-T (7T) · P3 N1-W02 · techplan T10/T11/T15 · architectuur T v2 §1–§2 · B17 (verlengd, P1-11).
# Basis: maak_sql_N1-W11.py v4.1 (= maak_sql_N1-W01.py v4: U&-escapes, inhouds- en toestandsgrendel, alles-of-niets, 4b, 8, 9).
# Nieuw in v4.2:
#  1. --blokken "L1=luisteren-01,luisteren-02;L2=…" (of "W01=*"): cumulatieve blokken zoals blokken_N1-W02.py. Elk blok start
#     vanaf de stand NA het vorige blok (VOOR_L2 = NA_L1, …), zodat grendels, generale repetitie en 7_vinger kloppen met wat er
#     op dat moment live staat. Elk item zit in precies één blok; na het laatste blok = de volledige NA-stand (assert).
#  2. jsonb-waarden krijgen een U&-escape als ze niet-NFC zijn (v4.1 escapete alleen tekst).
#  3. 9_grootte_probe v2 (T11): read-only, met de VALUES van apply én rollback (even groot als de generale repetitie):
#     per richting n · inhoud_ok (plakken byte-gelijk) · start_ok (live = verwachte startstand van die richting).
#  4. 8_generale_repetitie met de T15-telling in dezelfde aanroep: pogingen 30 d (alle) · pogingen 30 d van leerders (zonder rol
#     admin/teacher) · logins 30 d van leerders · logins 30 d van staf (admin/teacher; v4.2.1, 8T C-T03) · laatste poging.
#  5. 7_vinger_aggregaat met drie scopes: week · blok · rest van de week (de rest moet per blok gelijk blijven).
#  6. 2_droogloop (read-only): per gewijzigd veld md5(live) = md5(oud)?, plus de drie aggregaten en de telling updates/inserts/
#     deletes in één rij; 6_oud_aggregaat in de W01-vorm (n | md5 over item|veld|md5(live)).
#  7. Elk read-only bestand (2, 5, 6, 7, 9) staat in BEGIN TRANSACTION READ ONLY … ROLLBACK: de database weigert elke schrijfactie.
#  8. Aggregaat van 0 rijen = "0|" (v4.1 gaf NULL). Elk bestand NFC-stabiel (assert); SQL_MANIFEST.tsv met bytes, md5 en marge.
#  9. verwacht.txt met de P3-verwachting (live = VOOR) én de P4-verwachting per blok (live = NA van het vorige blok).
# Gebruik: python3 -I maak_sql_N1-W02.py <VOOR.tsv> <NA.tsv> <uitmap> --week 2 --blokken "<spec>"
import sys, csv, json, os, hashlib, unicodedata
csv.field_size_limit(10**9)
def opt(n, d=None): return sys.argv[sys.argv.index(n) + 1] if n in sys.argv else d
skipidx = {sys.argv.index(f) + 1 for f in ("--week", "--blokken") if f in sys.argv}
args = [a for i, a in enumerate(sys.argv[1:], 1) if not a.startswith("--") and i not in skipidx]
week = opt("--week"); spec = opt("--blokken", "ALLES=*")
assert week and week.isdigit(), "--week <getal> is verplicht"
voorrijen = list(csv.DictReader(open(args[0], encoding="utf-8", newline=""), delimiter="\t")); KOP = list(voorrijen[0].keys())
voor = {r["item_id"]: r for r in voorrijen}
na = {r["item_id"]: r for r in csv.DictReader(open(args[1], encoding="utf-8", newline=""), delimiter="\t")}
uitmap = args[2]; os.makedirs(uitmap, exist_ok=True)
assert set(voor) == set(na), "VOOR en NA bevatten niet dezelfde item_id's"
assert all(r["week"] == week for r in voorrijen), "VOOR bevat rijen van een andere week"
TXT = ["instruction_nl","question","correct_answer","feedback_correct","feedback_incorrect","input_arabic","input_transliteration","input_translation_nl","reference_media","review_flag"]
JSB = ["options","correct_options","media_production"]; NUM = ["points"]; BOOL = ["is_published","strict_tashkeel"]
KOL = TXT + JSB + NUM + BOOL
VINGER = ["item_id","unit_code","week","skill","exercise_type","exercise_subtype","display_order","instruction_nl","question","options","correct_answer","correct_options","feedback_correct","feedback_incorrect","input_arabic","input_transliteration","input_translation_nl","reference_media","media_production","media_url","media_alt","audio_url","image_url","points","review_flag","is_published","strict_tashkeel"]
GRENS = 70000  # grootste live geteste aanroep (W11, 2026-10-19); marge = (GRENS - bytes) / GRENS
def uesc(v):
    return "U&'" + "".join(("''" if c == "'" else "\\\\" if c == "\\" else c) if 32 <= ord(c) < 127 else ("\\%04X" % ord(c) if ord(c) <= 0xFFFF else "\\+%06X" % ord(c)) for c in v) + "'"
def lit(v, kol):
    if kol in JSB:
        if v == "": return "NULL::jsonb"
        json.loads(v)
        return (uesc(v) if unicodedata.normalize("NFC", v) != v else "'" + v.replace("'", "''") + "'") + "::jsonb"
    if kol in NUM: return str(int(v)) + "::smallint"
    if kol in BOOL: return ("true" if v == "true" else "false") + "::boolean"
    if unicodedata.normalize("NFC", v) != v: return uesc(v) + "::text"
    return "'" + v.replace("'", "''") + "'::text"
def vinger_sql(alias):
    pre = alias + "." if alias else ""
    return "md5(concat_ws('|', " + ", ".join(f"coalesce({pre}{c}::text,'')" for c in VINGER) + "))"
def inhoud_sql(alias): return "md5(concat_ws('|', " + ", ".join(f"{alias}.{k}::text" for k in KOL) + "))"
def inhoud_py(r): return hashlib.md5("|".join(r[k] for k in KOL if not (k in JSB and r[k] == "")).encode("utf-8")).hexdigest()
def vinger_py(r): return hashlib.md5("|".join(r[c] for c in VINGER).encode("utf-8")).hexdigest()
def md5s(s): return hashlib.md5(s.encode("utf-8")).hexdigest()
def agg_py(src, ids): ids = sorted(ids); return f"{len(ids)}|" + (md5s("\n".join(f"{i}|{vinger_py(src[i])}" for i in ids)) if ids else "")
def agg_sql(filt): return (f"SELECT count(*)::text || '|' || coalesce(md5(string_agg(item_id || '|' || h, E'\\n' ORDER BY item_id COLLATE \"C\")), '') "
                           f"FROM (SELECT item_id, {vinger_sql('')} AS h FROM public.curriculum_items WHERE {filt}) x")
def in_lijst(ids): return "item_id IN (" + ", ".join(f"'{i}'" for i in sorted(ids)) + ")"
kols = ", ".join(KOL); ivals = ", ".join(f"i.{k}" for k in KOL)
def nwith(naam, ids, bron, start):
    rijen = ",\n".join("  (" + ", ".join([lit(i, "x"), lit(inhoud_py(bron[i]), "x"), lit(vinger_py(start[i]), "x")] + [lit(bron[i][k], k) for k in KOL]) + ")" for i in ids)
    return f"{naam}(item_id, h_inhoud, h_start, {kols}) AS (VALUES\n{rijen}\n)"
def update3(ids, bron, start, kop):
    N = len(ids); nvals = ", ".join(f"n.{k}" for k in KOL)
    return f"""-- {kop} · week {week} · {N} rijen · ÉÉN statement (atomair), fail-closed: plakgrendel (h_inhoud) + toestandsgrendel (vingerafdruk 27 kolommen).
WITH {nwith('n', ids, bron, start)},
ok AS (
  SELECT count(*) = {N} AND (SELECT count(*) FROM n) = {N} AS alle
  FROM public.curriculum_items i JOIN n ON n.item_id = i.item_id
  WHERE i.week = {week}
    AND {vinger_sql('i')} = n.h_start
    AND {inhoud_sql('n')} = n.h_inhoud
)
UPDATE public.curriculum_items AS i
SET ({kols}) = (SELECT {nvals} FROM n WHERE n.item_id = i.item_id)
WHERE i.week = {week}
  AND (SELECT alle FROM ok)
  AND EXISTS (SELECT 1 FROM n WHERE n.item_id = i.item_id AND ({ivals}) IS DISTINCT FROM ({nvals}))
RETURNING i.item_id, {vinger_sql('i')} AS vingerafdruk;
"""
def wrap(sql, naam):
    sql = "\n".join(x for x in sql.split("\n") if not x.startswith("--")).strip().rstrip(";")
    head, _, ret = sql.rpartition("RETURNING"); k = "\nUPDATE public.curriculum_items"; i = head.rindex(k)
    return head[:i] + ",\nu AS (UPDATE public.curriculum_items" + head[i + len(k):] + "RETURNING" + ret + ")\n" + f"SELECT set_config('hva.{naam}', count(*)::text || '|' || coalesce(md5(string_agg(item_id||'|'||vingerafdruk, E'\\n' ORDER BY item_id COLLATE \"C\")),''), true) FROM u;"
STAF = "SELECT 1 FROM public.user_roles r WHERE r.user_id = {} AND r.role::text IN ('admin', 'teacher')"
ACTIVITEIT = ("SELECT set_config('hva.activiteit', concat_ws('|', "   # v4.2.1 (8T C-T03): logins van leerders en van staf apart
              "(SELECT count(*) FROM public.curriculum_item_attempts WHERE created_at > now() - interval '30 days'), "
              f"(SELECT count(*) FROM public.curriculum_item_attempts a WHERE a.created_at > now() - interval '30 days' AND NOT EXISTS ({STAF.format('a.student_id')})), "
              f"(SELECT count(*) FROM auth.users u WHERE u.last_sign_in_at > now() - interval '30 days' AND NOT EXISTS ({STAF.format('u.id')})), "
              f"(SELECT count(*) FROM auth.users u WHERE u.last_sign_in_at > now() - interval '30 days' AND EXISTS ({STAF.format('u.id')})), "
              "coalesce((SELECT max(created_at)::text FROM public.curriculum_item_attempts), '')), true);")
RO_BEGIN, RO_END = "BEGIN TRANSACTION READ ONLY;\n", "ROLLBACK;\n"
# blokken
blokken = []
for deel in spec.split(";"):
    naam, _, pref = deel.partition("="); blokken.append((naam.strip(), [p.strip() for p in pref.split(",") if p.strip()]))
def in_blok(iid, pref): return pref == ["*"] or any(iid.split("-", 1)[1].startswith(p) for p in pref)
ids_alle = [r["item_id"] for r in voorrijen]
toewijzing = {i: [n for n, p in blokken if in_blok(i, p)] for i in ids_alle}
assert all(len(v) == 1 for v in toewijzing.values()), f"item niet in precies één blok: {[(i, v) for i, v in toewijzing.items() if len(v) != 1]}"
def schrijf_tsv(rows, p):
    with open(p, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f, delimiter="\t", lineterminator="\n", quoting=csv.QUOTE_MINIMAL); w.writerow(KOP)
        for i in ids_alle: w.writerow([rows[i][c] for c in KOP])
WEEKF = f"week = {week}"
manifest = [("blok", "bestand", "bytes", "md5", "nfc_stabiel", "marge_70kB")]
overzicht = []
stand = {i: dict(voor[i]) for i in ids_alle}
for nr, (naam, pref) in enumerate(blokken, 1):
    bmap = f"{uitmap}/{nr}_{naam}"; os.makedirs(bmap, exist_ok=True)
    start = {i: dict(stand[i]) for i in ids_alle}
    blokids = sorted(i for i in ids_alle if toewijzing[i] == [naam])
    eind = {i: (dict(na[i]) if i in blokids else dict(start[i])) for i in ids_alle}
    gew = sorted(i for i in blokids if any(start[i][k] != eind[i][k] for k in KOL))
    assert all(start[i][k] == voor[i][k] for i in blokids for k in KOP), "blokrijen moeten bij de start van hun blok nog de VOOR-stand hebben"
    andere = [(i, k) for i in blokids for k in KOP if k not in KOL and start[i][k] != eind[i][k] and k not in ("updated_at",)]
    assert not andere, f"verschil buiten de schrijfbare kolommen: {andere[:5]}"
    N = len(gew); assert N > 0, f"blok {naam} heeft geen gewijzigde rijen"
    paren = sorted(((i, k) for i in gew for k in KOL if start[i][k] != eind[i][k]), key=lambda p: (p[0].encode(), p[1].encode()))
    rest = [i for i in ids_alle if i not in blokids]
    schrijf_tsv(start, f"{bmap}/VOOR_{naam}.tsv"); schrijf_tsv(eind, f"{bmap}/NA_{naam}.tsv")
    V = {"blok": naam, "items_blok": str(len(blokids)), "gewijzigd": str(N), "paren": str(len(paren)),
         "week_voor": agg_py(start, ids_alle), "week_na": agg_py(eind, ids_alle), "blok_voor": agg_py(start, blokids), "blok_na": agg_py(eind, blokids),
         "rest": agg_py(start, rest), "apply_returning": agg_py(eind, gew), "rollback_returning": agg_py(start, gew)}
    assert agg_py(start, rest) == agg_py(eind, rest)
    oud = f"{len(paren)}|" + md5s("\n".join(f"{i}|{k}|{md5s(start[i][k])}" for i, k in paren))
    V["oud_aggregaat"] = oud
    V["droogloop"] = f"{len(paren)}|{len(paren)}|0||{N}|0|0|{len(ids_alle)}|{oud}|{V['week_voor']}|{V['blok_voor']}|{V['rest']}"
    # P3: niets is nog toegepast, dus live = de oorspronkelijke VOOR-stand; week en rest verschillen dan vanaf blok 2 van P4
    V["week_p3"] = agg_py(voor, ids_alle); V["rest_p3"] = agg_py(voor, rest)
    V["droogloop_p3"] = f"{len(paren)}|{len(paren)}|0||{N}|0|0|{len(ids_alle)}|{oud}|{V['week_p3']}|{V['blok_voor']}|{V['rest_p3']}"
    V["gr_eindrij"] = f"{V['week_voor']}|{V['apply_returning']}|{V['week_na']}|{V['rollback_returning']}|{V['week_voor']}"
    V["probe_voor_apply"] = f"{N}|{N}|{N}|{N}|{N}|0"; V["probe_na_apply"] = f"{N}|{N}|0|{N}|{N}|{N}"
    apply_sql = update3(gew, eind, start, f"APPLY blok {naam}"); rb_sql = update3(gew, start, eind, f"ROLLBACK blok {naam} uit de back-up")
    bestanden = {}
    bestanden["3_apply.sql"] = apply_sql; bestanden["4_rollback.sql"] = rb_sql
    l = rb_sql.split("\n"); idx = [k for k, x in enumerate(l) if x.strip().endswith("= n.h_start")]; assert len(idx) == 1; del l[idx[0]]
    bestanden["4b_noodrollback.sql"] = "-- NOODROLLBACK (4b) blok " + naam + " · alleen met expliciet akkoord van Ibra · zonder toestandsgrendel; plakgrendel en alles-of-niets blijven. Nooit DELETE.\n" + "\n".join(l)
    case = lambda a: "CASE p.veld " + " ".join(f"WHEN '{k}' THEN {a}.{k}::text" for k in KOL) + " END"
    pvals = ",\n  ".join(f"('{i}', '{k}', '{md5s(start[i][k])}', '{md5s(eind[i][k])}')" for i, k in paren)
    bestanden["2_droogloop.sql"] = (f"-- 2_droogloop · READ ONLY · blok {naam} · week {week} · per gewijzigd veld: is de live waarde de oude (VOOR)? + aggregaten week/blok/rest\n"
        f"-- verwacht in P3 (live = VOOR): {V['droogloop_p3']}\n-- verwacht in P4 vlak vóór dit blok: {V['droogloop']}\n" + RO_BEGIN +
        f"WITH p(item_id, veld, h_oud, h_nieuw) AS (VALUES\n  {pvals}\n),\n"
        f"x AS (SELECT p.item_id, p.veld, p.h_oud, p.h_nieuw, (i.item_id IS NOT NULL) AS gevonden, md5(coalesce({case('i')}, '')) AS h_live\n"
        f"      FROM p LEFT JOIN public.curriculum_items i ON i.item_id = p.item_id AND i.{WEEKF})\n"
        f"SELECT concat_ws('|', count(*) FILTER (WHERE gevonden), count(*) FILTER (WHERE gevonden AND h_live = h_oud), count(*) FILTER (WHERE gevonden AND h_live = h_nieuw),\n"
        f"  coalesce(string_agg(item_id || ':' || veld, ', ' ORDER BY item_id COLLATE \"C\", veld COLLATE \"C\") FILTER (WHERE NOT gevonden OR h_live IS DISTINCT FROM h_oud), ''),\n"
        f"  (SELECT count(DISTINCT item_id) FROM p), 0, 0, (SELECT count(*) FROM public.curriculum_items WHERE {WEEKF}),\n"
        f"  count(*)::text || '|' || coalesce(md5(string_agg(item_id || '|' || veld || '|' || h_live, E'\\n' ORDER BY item_id COLLATE \"C\", veld COLLATE \"C\")), ''),\n"
        f"  ({agg_sql(WEEKF)}), ({agg_sql(WEEKF + ' AND ' + in_lijst(blokids))}), ({agg_sql(WEEKF + ' AND NOT ' + in_lijst(blokids))})) AS droogloop\nFROM x;\n" + RO_END)
    bestanden["5_controle.sql"] = f"-- 5_controle · READ ONLY · week {week} · vingerafdruk (27 kolommen) per rij; vergelijk met verwacht_vingerafdruk.tsv\n" + RO_BEGIN + f"SELECT item_id, {vinger_sql('')} AS h FROM public.curriculum_items WHERE {WEEKF} ORDER BY item_id COLLATE \"C\";\n" + RO_END
    bestanden["6_oud_aggregaat.sql"] = (f"-- 6_oud_aggregaat · READ ONLY · blok {naam} · verwacht vóór de apply: {oud}\n" + RO_BEGIN +
        "WITH p(item_id, veld) AS (VALUES " + ", ".join(f"('{i}','{k}')" for i, k in paren) + ")\n"
        f"SELECT count(*)::text || '|' || coalesce(md5(string_agg(p.item_id || '|' || p.veld || '|' || md5(coalesce({case('c')}, '')), E'\\n' ORDER BY p.item_id COLLATE \"C\", p.veld COLLATE \"C\")), '') AS oud_aggregaat\n"
        f"FROM p JOIN public.curriculum_items c ON c.item_id = p.item_id AND c.{WEEKF};\n" + RO_END)
    bestanden["7_vinger_aggregaat.sql"] = (f"-- 7_vinger_aggregaat · READ ONLY · blok {naam} · week | blok | rest\n-- verwacht vóór: {V['week_voor']}|{V['blok_voor']}|{V['rest']}\n-- verwacht na:   {V['week_na']}|{V['blok_na']}|{V['rest']}\n" + RO_BEGIN +
        f"SELECT ({agg_sql(WEEKF)}) || '|' || ({agg_sql(WEEKF + ' AND ' + in_lijst(blokids))}) || '|' || ({agg_sql(WEEKF + ' AND NOT ' + in_lijst(blokids))}) AS week_blok_rest;\n" + RO_END)
    zet = lambda n: f"SELECT set_config('hva.{n}', ({agg_sql(WEEKF)}), true);"
    bestanden["8_generale_repetitie.sql"] = (f"-- 8_generale_repetitie · blok {naam} · netto read-only: BEGIN … ROLLBACK in één aanroep, met de T15-telling (activiteit) in dezelfde aanroep\n"
        f"-- verwacht: {V['gr_eindrij']} | activiteit pogingen30|pogingen30_leerders|logins30_leerders|logins30_staf|laatste_poging (STOP als pogingen30_leerders > 0 of logins30_leerders > 0)\n"
        "BEGIN;\n" + ACTIVITEIT + "\n" + zet("start") + "\n" + wrap(apply_sql, "apply") + "\n" + zet("na_apply") + "\n" + wrap(rb_sql, "rollback") + "\n" + zet("na_rollback") +
        "\nSELECT current_setting('hva.start') AS start, current_setting('hva.apply') AS apply, current_setting('hva.na_apply') AS na_apply, current_setting('hva.rollback') AS rollback, current_setting('hva.na_rollback') AS na_rollback, current_setting('hva.activiteit') AS activiteit;\nROLLBACK;\n")
    pw = lambda a: f"(SELECT count(*) FROM {a} n WHERE {inhoud_sql('n')} = n.h_inhoud)"
    ps = lambda a: f"(SELECT count(*) FROM public.curriculum_items i JOIN {a} m ON m.item_id = i.item_id WHERE i.{WEEKF} AND {vinger_sql('i')} = m.h_start)"
    bestanden["9_grootte_probe.sql"] = (f"-- 9_grootte_probe v2 · READ ONLY · blok {naam} · VALUES van apply (a) én rollback (r), even groot als de generale repetitie · wijzigt niets\n"
        f"-- verwacht vóór de apply: {V['probe_voor_apply']} · na de apply: {V['probe_na_apply']} (a_n|a_inhoud_ok|a_start_ok|r_n|r_inhoud_ok|r_start_ok)\n" + RO_BEGIN +
        f"WITH {nwith('a', gew, eind, start)},\n{nwith('r', gew, start, eind)}\n"
        f"SELECT concat_ws('|', (SELECT count(*) FROM a), {pw('a')}, {ps('a')}, (SELECT count(*) FROM r), {pw('r')}, {ps('r')}) AS probe;\n" + RO_END)
    for n_, t in bestanden.items():
        assert unicodedata.normalize("NFC", t) == t, f"{naam}/{n_} is niet NFC-stabiel"
        if n_ in ("2_droogloop.sql", "5_controle.sql", "6_oud_aggregaat.sql", "7_vinger_aggregaat.sql", "9_grootte_probe.sql"):
            body = "\n".join(x for x in t.split("\n") if not x.startswith("--")).upper()
            assert body.startswith("BEGIN TRANSACTION READ ONLY;") and body.rstrip().endswith("ROLLBACK;"), n_
            assert not any(w in body for w in ("UPDATE PUBLIC", "INSERT ", "DELETE ", "ALTER ", "DROP ", "TRUNCATE ", "CREATE ", "GRANT ")), n_
        open(f"{bmap}/{n_}", "w", encoding="utf-8").write(t)
    with open(f"{bmap}/verwacht.txt", "w", encoding="utf-8") as f:
        for k, v in V.items(): f.write(f"{k}\t{v}\n")
    with open(f"{bmap}/verwacht_vingerafdruk.tsv", "w", encoding="utf-8") as f:
        f.write("item_id\tvoor\tna\n")
        for i in sorted(ids_alle): f.write(f"{i}\t{vinger_py(start[i])}\t{vinger_py(eind[i])}\n")
    open(f"{bmap}/items.txt", "w", encoding="utf-8").write("".join(f"{i}\t{'gewijzigd' if i in gew else 'ongewijzigd'}\n" for i in blokids))
    for n_ in sorted(os.listdir(bmap)):
        p = f"{bmap}/{n_}"; b = os.path.getsize(p); t = open(p, encoding="utf-8").read()
        marge = f"{100 * (GRENS - b) / GRENS:.0f} %" if n_.endswith(".sql") else ""
        manifest.append((f"{nr}_{naam}", n_, str(b), hashlib.md5(open(p, "rb").read()).hexdigest(), str(unicodedata.normalize("NFC", t) == t), marge))
    gr = os.path.getsize(f"{bmap}/8_generale_repetitie.sql"); pr = os.path.getsize(f"{bmap}/9_grootte_probe.sql"); ap = os.path.getsize(f"{bmap}/3_apply.sql")
    uesc_n = sum(open(f"{bmap}/{x}", encoding="utf-8").read().count("U&'") for x in ("3_apply.sql", "4_rollback.sql"))
    overzicht.append(f"| {nr}_{naam} | {len(blokids)} | {N} | {len(paren)} | {ap/1000:.1f} kB | {gr/1000:.1f} kB ({100*(GRENS-gr)/GRENS:.0f} %) | {pr/1000:.1f} kB ({100*(GRENS-pr)/GRENS:.0f} %) | {uesc_n} | `{V['week_voor']}` → `{V['week_na']}` |")
    stand = eind
assert all(stand[i] == na[i] for i in ids_alle), "na het laatste blok is de stand niet gelijk aan de NA-stand"
with open(f"{uitmap}/SQL_MANIFEST.tsv", "w", encoding="utf-8") as f:
    for r in manifest: f.write("\t".join(r) + "\n")
kop = "| blok | items | gewijzigd | velden | 3_apply | 8_generale_repetitie (marge) | 9_grootte_probe v2 (marge) | U&-escapes (apply+rollback) | week-vingerafdruk vóór → na |\n|---|---|---|---|---|---|---|---|---|"
open(f"{uitmap}/BLOKKEN.md", "w", encoding="utf-8").write(f"# SQL v4.2 · week {week} · blokken\nGemaakt door `maak_sql_N1-W02.py` v4.2 uit `{os.path.basename(args[0])}` (md5 `{hashlib.md5(open(args[0],'rb').read()).hexdigest()}`) en `{os.path.basename(args[1])}` (md5 `{hashlib.md5(open(args[1],'rb').read()).hexdigest()}`). Volgorde apply: {' → '.join(n for n, _ in blokken)}; terugdraaien in omgekeerde volgorde: {' → '.join(n for n, _ in reversed(blokken))}. Na het laatste blok = NA-stand (gecontroleerd).\n\n{kop}\n" + "\n".join(overzicht) + "\n")
print(open(f"{uitmap}/BLOKKEN.md", encoding="utf-8").read())
print("SQL_MANIFEST.tsv md5", hashlib.md5(open(f"{uitmap}/SQL_MANIFEST.tsv", "rb").read()).hexdigest())
