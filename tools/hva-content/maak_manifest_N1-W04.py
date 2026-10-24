# maak_manifest_N1-W04.py v1 — Maker-T (7T) · P3 N1-W04 · P1-18 (9T V2) en tegenrapport T P2 (V5): één blokkenmanifest voor P4.
# Leest de SQL-mappen van maak_sql_N1-W04.py v4.4.1 (per week één map met genummerde blokmappen) en schrijft BLOKKEN_MANIFEST.tsv:
#   volgorde · week · blok · map (echte mapnaam, relatief t.o.v. de SQL-root) · md5 van verwacht.txt · week_voor · week_na
# Controles (assert = STOP): nummers 1..n zonder gat en uniek over de weken heen, bloknamen uniek, binnen een week sluit de keten
# (week_na van blok k = week_voor van blok k+1), elk blok heeft de 9 SQL-bestanden en verwacht.txt.
# Gebruik: python3 -I maak_manifest_N1-W04.py <sql-root> <weekmap> [<weekmap> …]   (in de volgorde van P4)
import sys, os, hashlib, re
root, weken = sys.argv[1], sys.argv[2:]
NODIG = ["2_droogloop.sql", "3_apply.sql", "4_rollback.sql", "4b_noodrollback.sql", "5_controle.sql", "6_oud_aggregaat.sql", "7_vinger_aggregaat.sql", "8_generale_repetitie.sql", "9_grootte_probe.sql", "verwacht.txt"]
rijen = []
for wm in weken:
    blokken = sorted((d for d in os.listdir(os.path.join(root, wm)) if re.fullmatch(r"\d+_\w+", d) and os.path.isdir(os.path.join(root, wm, d))), key=lambda d: int(d.split("_")[0]))
    vorige = None
    for b in blokken:
        p = os.path.join(root, wm, b)
        ontbreekt = [f for f in NODIG if not os.path.exists(os.path.join(p, f))]
        assert not ontbreekt, f"{wm}/{b}: ontbreekt {ontbreekt}"
        V = dict(l.rstrip("\n").split("\t", 1) for l in open(os.path.join(p, "verwacht.txt"), encoding="utf-8"))
        if vorige is not None: assert V["week_voor"] == vorige, f"{wm}/{b}: keten niet gesloten ({V['week_voor']} ≠ {vorige})"
        vorige = V["week_na"]
        rijen.append((int(b.split("_")[0]), wm, b, f"{wm}/{b}", hashlib.md5(open(os.path.join(p, "verwacht.txt"), "rb").read()).hexdigest(), V["week_voor"], V["week_na"]))
nrs = [r[0] for r in rijen]
assert nrs == list(range(1, len(rijen) + 1)), f"bloknummers niet 1..{len(rijen)} in volgorde: {nrs}"
assert len({r[2] for r in rijen}) == len(rijen), "dubbele bloknaam"
with open(os.path.join(root, "BLOKKEN_MANIFEST.tsv"), "w", encoding="utf-8") as f:
    f.write("volgorde\tweek\tblok\tmap\tmd5_verwacht\tweek_voor\tweek_na\n")
    for r in rijen: f.write("\t".join(map(str, r)) + "\n")
print(open(os.path.join(root, "BLOKKEN_MANIFEST.tsv"), encoding="utf-8").read().rstrip())
print("BLOKKEN_MANIFEST.tsv md5", hashlib.md5(open(os.path.join(root, "BLOKKEN_MANIFEST.tsv"), "rb").read()).hexdigest())
