# maak_manifest_N1-W06.py v1.2 (9T P3 F2/V1: 9e kolom md5_sql = md5 van de regels van dit blok in SQL_MANIFEST.tsv, zodat de md5 van het manifest — waaraan elke
#   P4-logregel gebonden is — verandert zodra één SQL-bestand verandert) · v1.1 — Maker-T (7T) · P3 N1-W06 · = maak_manifest_N1-W05.py v1 + bloksoort (v1.1, architectuur T v1.1 §2–§3):
# Leest de SQL-mappen van maak_sql_N1-W06.py v4.6 (per week één map met genummerde blokmappen) en schrijft BLOKKEN_MANIFEST.tsv:
#   volgorde · week · blok · map (echte mapnaam, relatief t.o.v. de SQL-root) · md5 van verwacht.txt · week_voor · week_na · soort (insert | update)
# Controles (assert = STOP): nummers 1..n zonder gat en uniek over de weken heen, bloknamen uniek, binnen een week sluit de keten
# (week_na van blok k = week_voor van blok k+1), elk blok heeft de bestanden van zijn soort en verwacht.txt; insertblokken alleen vóór de
# updateblokken van dezelfde week. De kolom soort staat achteraan, zodat lezers van v1 (7 kolommen) hetzelfde blijven lezen.
# Gebruik: python3 -I maak_manifest_N1-W06.py <sql-root> <weekmap> [<weekmap> …]   (in de volgorde van P4)
import sys, os, hashlib, re
root, weken = sys.argv[1], sys.argv[2:]
NODIG = {"update": ["2_droogloop.sql", "3_apply.sql", "4_rollback.sql", "4b_noodrollback.sql", "5_controle.sql", "6_oud_aggregaat.sql", "7_vinger_aggregaat.sql", "8_generale_repetitie.sql", "9_grootte_probe.sql", "verwacht.txt"],
         "insert": ["2_droogloop.sql", "3_apply.sql", "5_controle.sql", "7_vinger_aggregaat.sql", "8_generale_repetitie.sql", "verwacht.txt"]}
NIET = {"insert": ["4_rollback.sql", "4b_noodrollback.sql", "6_oud_aggregaat.sql", "9_grootte_probe.sql"], "update": []}
rijen = []
for wm in weken:
    blokken = sorted((d for d in os.listdir(os.path.join(root, wm)) if re.fullmatch(r"\d+_\w+", d) and os.path.isdir(os.path.join(root, wm, d))), key=lambda d: int(d.split("_")[0]))
    vorige = None; soorten = []
    for b in blokken:
        p = os.path.join(root, wm, b)
        V = dict(l.rstrip("\n").split("\t", 1) for l in open(os.path.join(p, "verwacht.txt"), encoding="utf-8"))
        soort = V.get("soort", "update"); assert soort in NODIG, f"{wm}/{b}: onbekend soort {soort}"
        ontbreekt = [f for f in NODIG[soort] if not os.path.exists(os.path.join(p, f))]
        assert not ontbreekt, f"{wm}/{b}: ontbreekt {ontbreekt}"
        teveel = [f for f in NIET[soort] if os.path.exists(os.path.join(p, f))]
        assert not teveel, f"{wm}/{b} ({soort}): mag niet bestaan {teveel}"
        if vorige is not None: assert V["week_voor"] == vorige, f"{wm}/{b}: keten niet gesloten ({V['week_voor']} ≠ {vorige})"
        vorige = V["week_na"]; soorten.append(soort)
        sm = [l for l in open(os.path.join(root, wm, "SQL_MANIFEST.tsv"), encoding="utf-8") if l.split("\t")[0] == b]
        assert sorted(l.split("\t")[1] for l in sm) == sorted(f for f in os.listdir(p) if os.path.isfile(os.path.join(p, f))), f"{wm}/{b}: SQL_MANIFEST ≠ de bestanden van het blok"
        for l in sm: assert hashlib.md5(open(os.path.join(p, l.split("\t")[1]), "rb").read()).hexdigest() == l.split("\t")[3], f"{wm}/{b}/{l.split(chr(9))[1]}: md5 ≠ SQL_MANIFEST"
        rijen.append((int(b.split("_")[0]), wm, b, f"{wm}/{b}", hashlib.md5(open(os.path.join(p, "verwacht.txt"), "rb").read()).hexdigest(), V["week_voor"], V["week_na"], soort, hashlib.md5("".join(sm).encode("utf-8")).hexdigest()))
    assert soorten == sorted(soorten), f"{wm}: insertblokken moeten vóór de updateblokken komen ({soorten})"
nrs = [r[0] for r in rijen]
assert nrs == list(range(1, len(rijen) + 1)), f"bloknummers niet 1..{len(rijen)} in volgorde: {nrs}"
assert len({r[2] for r in rijen}) == len(rijen), "dubbele bloknaam"
with open(os.path.join(root, "BLOKKEN_MANIFEST.tsv"), "w", encoding="utf-8") as f:
    f.write("volgorde\tweek\tblok\tmap\tmd5_verwacht\tweek_voor\tweek_na\tsoort\tmd5_sql\n")
    for r in rijen: f.write("\t".join(map(str, r)) + "\n")
print(open(os.path.join(root, "BLOKKEN_MANIFEST.tsv"), encoding="utf-8").read().rstrip())
print("BLOKKEN_MANIFEST.tsv md5", hashlib.md5(open(os.path.join(root, "BLOKKEN_MANIFEST.tsv"), "rb").read()).hexdigest())
