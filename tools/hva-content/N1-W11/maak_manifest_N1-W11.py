# maak_manifest_N1-W08.py v1.3.1 (= maak_manifest_N1-W10.py v1.3, md5 8941eef437b26decb96c9fb15c670c7c, voor W08 · 7T P3 N1-W08): ongewijzigde logica; alleen de kop
#   (leest de SQL-mappen van maak_sql_N1-W08.py v4.8; de extra sleutels van v4.8 in verwacht.txt — rollback_offline, *_off, voorwaarde — tellen mee in md5_verwacht).
#   Gebruikt voor beide varianten van de P4-bundel (met en zonder W07n): elke SQL-root krijgt een eigen BLOKKEN_MANIFEST.tsv.
# maak_manifest_N1-W10.py v1.3 — Maker-T (7T) · P3 N1-W07 · = maak_manifest_N1-W06.py v1.2 + (a) de blokken van alle weekmappen worden GLOBAAL op nummer
#   gesorteerd (het V-blok 12_V_W07 staat in de map N1-W07 maar komt ná de nazorgblokken 9–11 van de andere weken; de keten binnen een week blijft
#   gesloten: week_na van 8_G1 = week_voor van 12_V_W07) en (b) de blokgrootte-guard T15 (9T P2 V5; P1-17): 3_apply.sql > 40 000 B of
#   8_generale_repetitie.sql > 63 000 B = exit 2 zonder manifest (blok splitsen met --blokken, zonder poort, B17). (c) een blok met `kern`
#   (display_order) moet het laatste blok van zijn week én van het manifest zijn.
# v1.2 (9T P3 F2/V1: 9e kolom md5_sql = md5 van de regels van dit blok in SQL_MANIFEST.tsv, zodat de md5 van het manifest — waaraan elke
#   P4-logregel gebonden is — verandert zodra één SQL-bestand verandert) · v1.1 + bloksoort · v1 (N1-W05).
# Leest de SQL-mappen van maak_sql (v4.7/v4.8) en schrijft BLOKKEN_MANIFEST.tsv:
#   volgorde · week · blok · map (echte mapnaam, relatief t.o.v. de SQL-root) · md5 van verwacht.txt · week_voor · week_na · soort (insert | update) · md5_sql
# Controles (assert of exit 2 = STOP): nummers 1..n zonder gat en uniek over de weken heen, bloknamen uniek, binnen een week sluit de keten
# (week_na van blok k = week_voor van het volgende blok van die week), elk blok heeft de bestanden van zijn soort en verwacht.txt; insertblokken
# alleen vóór de updateblokken van dezelfde week; T15-groottes.
# Gebruik: python3 -I maak_manifest_N1-W10.py <sql-root> <weekmap> [<weekmap> …]   (in de volgorde van P4) [--max-apply 40000] [--max-gr 63000]
import sys, os, hashlib, re
a = sys.argv[1:]
def opt(n, d):
    if n in a:
        i = a.index(n); v = a[i + 1]; del a[i:i + 2]; return int(v)
    return d
MAX_APPLY = opt("--max-apply", 40000); MAX_GR = opt("--max-gr", 63000)
root, weken = a[0], a[1:]
NODIG = {"update": ["2_droogloop.sql", "3_apply.sql", "4_rollback.sql", "4b_noodrollback.sql", "5_controle.sql", "6_oud_aggregaat.sql", "7_vinger_aggregaat.sql", "8_generale_repetitie.sql", "9_grootte_probe.sql", "verwacht.txt"],
         "insert": ["2_droogloop.sql", "3_apply.sql", "5_controle.sql", "7_vinger_aggregaat.sql", "8_generale_repetitie.sql", "verwacht.txt"]}
NIET = {"insert": ["4_rollback.sql", "4b_noodrollback.sql", "6_oud_aggregaat.sql", "9_grootte_probe.sql"], "update": []}
rijen = []; te_groot = []
for wm in weken:
    blokken = sorted((d for d in os.listdir(os.path.join(root, wm)) if re.fullmatch(r"\d+_\w+", d) and os.path.isdir(os.path.join(root, wm, d))), key=lambda d: int(d.split("_")[0]))
    vorige = None; soorten = []; kernen = []
    for b in blokken:
        p = os.path.join(root, wm, b)
        V = dict(l.rstrip("\n").split("\t", 1) for l in open(os.path.join(p, "verwacht.txt"), encoding="utf-8"))
        soort = V.get("soort", "update"); assert soort in NODIG, f"{wm}/{b}: onbekend soort {soort}"
        ontbreekt = [f for f in NODIG[soort] if not os.path.exists(os.path.join(p, f))]
        assert not ontbreekt, f"{wm}/{b}: ontbreekt {ontbreekt}"
        teveel = [f for f in NIET[soort] if os.path.exists(os.path.join(p, f))]
        assert not teveel, f"{wm}/{b} ({soort}): mag niet bestaan {teveel}"
        if vorige is not None: assert V["week_voor"] == vorige, f"{wm}/{b}: keten niet gesloten ({V['week_voor']} ≠ {vorige})"
        vorige = V["week_na"]; soorten.append(soort); kernen.append(V.get("kern", ""))
        sm = [l for l in open(os.path.join(root, wm, "SQL_MANIFEST.tsv"), encoding="utf-8") if l.split("\t")[0] == b]
        assert sorted(l.split("\t")[1] for l in sm) == sorted(f for f in os.listdir(p) if os.path.isfile(os.path.join(p, f))), f"{wm}/{b}: SQL_MANIFEST ≠ de bestanden van het blok"
        for l in sm: assert hashlib.md5(open(os.path.join(p, l.split("\t")[1]), "rb").read()).hexdigest() == l.split("\t")[3], f"{wm}/{b}/{l.split(chr(9))[1]}: md5 ≠ SQL_MANIFEST"
        ap = os.path.getsize(os.path.join(p, "3_apply.sql")); gr = os.path.getsize(os.path.join(p, "8_generale_repetitie.sql"))
        if ap > MAX_APPLY or gr > MAX_GR: te_groot.append(f"{wm}/{b}: 3_apply {ap} B (max {MAX_APPLY}) · 8_generale_repetitie {gr} B (max {MAX_GR})")
        rijen.append((int(b.split("_")[0]), wm, b, f"{wm}/{b}", hashlib.md5(open(os.path.join(p, "verwacht.txt"), "rb").read()).hexdigest(), V["week_voor"], V["week_na"], soort, hashlib.md5("".join(sm).encode("utf-8")).hexdigest(), V.get("kern", "")))
    assert soorten == sorted(soorten), f"{wm}: insertblokken moeten vóór de updateblokken komen ({soorten})"
    assert all(k == "" for k in kernen[:-1]), f"{wm}: een blok met kern (display_order) moet het laatste blok van zijn week zijn"
if te_groot:
    print("✗ STOP (T15, 9T P2 V5): blok te groot voor één plakbeurt — splitsen met --blokken, zonder poort (B17):\n  " + "\n  ".join(te_groot)); sys.exit(2)
rijen.sort(key=lambda r: r[0])   # v1.3 (a): globaal op nummer
nrs = [r[0] for r in rijen]
assert nrs == list(range(1, len(rijen) + 1)), f"bloknummers niet 1..{len(rijen)} in volgorde: {nrs}"
assert len({r[2] for r in rijen}) == len(rijen), "dubbele bloknaam"
assert all(r[9] == "" for r in rijen[:-1]), "een blok met kern (display_order) moet het laatste blok van het manifest zijn (9T P2 V3)"
with open(os.path.join(root, "BLOKKEN_MANIFEST.tsv"), "w", encoding="utf-8") as f:
    f.write("volgorde\tweek\tblok\tmap\tmd5_verwacht\tweek_voor\tweek_na\tsoort\tmd5_sql\n")
    for r in rijen: f.write("\t".join(map(str, r[:9])) + "\n")
print(open(os.path.join(root, "BLOKKEN_MANIFEST.tsv"), encoding="utf-8").read().rstrip())
print("BLOKKEN_MANIFEST.tsv md5", hashlib.md5(open(os.path.join(root, "BLOKKEN_MANIFEST.tsv"), "rb").read()).hexdigest(), f"· T15 max 3_apply {max(os.path.getsize(os.path.join(root, r[3], '3_apply.sql')) for r in rijen)} B / {MAX_APPLY} · max gr {max(os.path.getsize(os.path.join(root, r[3], '8_generale_repetitie.sql')) for r in rijen)} B / {MAX_GR}")
