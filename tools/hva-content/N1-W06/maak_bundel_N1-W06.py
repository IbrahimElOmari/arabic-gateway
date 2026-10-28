#!/usr/bin/env python3
"""Bundel N1-W06 — v1.1.1 (8T C-T28: mappen 0755; --manifest-md5 zonder waarde = exit 2) · v1.1 (8T C-T17: de lege werkmappen p4/uitvoering/ruw/ en p4/export/ als mapregels in de zip en verplicht bij controleer;
8T C-T19: controleer vraagt --manifest-md5 <md5 uit de OVERDRACHT>; een ander of ontbrekend manifest = exit 2) · v1.0 (Maker-T · P4-gereedschap) = maak_bundel_N1-W05.py met een naam per bundel en een aparte controlestap.

Gebruik:
  python3 -I maak_bundel_N1-W06.py maak <werkmap> <uit.zip> --naam P4bundel|afsluiting
      schrijft <werkmap>/MANIFEST_N1-W06_<naam>.tsv (pad · bytes · md5) en <werkmap>/UITGESLOTEN_N1-W06_<naam>.tsv (pad · bytes · md5 · reden),
      beide ook in de zip; pakt de zip daarna uit in een lege map en controleert elk bestand (exit 2 bij een verschil).
  python3 -I maak_bundel_N1-W06.py controleer <uitgepakte map> --naam P4bundel|afsluiting --manifest-md5 <md5>
      vóór P4 in de lege chat (9T P3 §3.8): elk bestand van het manifest bestaat met dezelfde bytes en md5, er is geen bestand te veel
      (buiten het manifest, de uitgesloten-lijst, slot- en cachebestanden), en de kernankers kloppen: BLOKKEN_MANIFEST (A en B), de
      SQL_MANIFEST's, slot_verwacht, VERWACHT_PER_STAP, p4_stap, p4_log_stap, het draaiboek, de rooktest en de voorspelde master.
      Exit 0 = ✓, exit 2 = STOP (niets uitvoeren, Ibra).
Content-vrij: het script bevat geen lesinhoud.
"""
import hashlib, os, sys, tempfile, zipfile

UITSLUITEN = [
    # (voorvoegsel of exact pad, reden)
    ("p3/replica/pgdata/", "werkdatabank van de replica (reproduceerbaar)"),
    ("p3/replica/sock/", "socket van de replica"),
    ("p3/replica/pg.log", "serverlog van de replica"),
    ("p3/replica/g5_kopie_A/", "kopie van de werkmap voor test G5 (reproduceerbaar)"),
    ("p3/replica/g5_kopie_B/", "kopie van de werkmap voor test G5 (reproduceerbaar)"),
    ("p3/replica/g5_gen_A/", "generatoruitvoer voor test G5 (reproduceerbaar)"),
    ("p3/replica/g5_gen_B/", "generatoruitvoer voor test G5 (reproduceerbaar)"),
    ("p3/replica/g5_vreemd_A/", "vreemde bundel voor test G5 (reproduceerbaar)"),
    ("p3/replica/g5_vreemd_B/", "vreemde bundel voor test G5 (reproduceerbaar)"),
    ("p3/replica/p4basis_A/", "werkmap van de replica (reproduceerbaar)"),
    ("p3/replica/p4basis_B/", "werkmap van de replica (reproduceerbaar)"),
    ("p3/replica/g5_log_A.tsv", "testlog van G5 (reproduceerbaar)"),
    ("p3/replica/g5_log_B.tsv", "testlog van G5 (reproduceerbaar)"),
    ("p3/replica/g5_log14_A.tsv", "testlog van G5 (reproduceerbaar)"),
    ("p3/replica/g5_log14_B.tsv", "testlog van G5 (reproduceerbaar)"),
    ("p3/replica/replay_basis_A/", "werkmap van de draaiboek-replay (reproduceerbaar)"),
    ("p3/replica/replay_basis_B/", "werkmap van de draaiboek-replay (reproduceerbaar)"),
    ("p3/replica/replay_start.tsv", "startstand van de draaiboek-replay (reproduceerbaar)"),
]
ANKERS = ["p3/sql/BLOKKEN_MANIFEST.tsv", "p3/sql_B/BLOKKEN_MANIFEST.tsv", "p3/sql/N1-W06/SQL_MANIFEST.tsv", "p3/sql/N1-W05/SQL_MANIFEST.tsv",
          "p3/sql/N1-W04/SQL_MANIFEST.tsv", "p3/sql_B/N1-W06/SQL_MANIFEST.tsv", "p3/sql_B/N1-W05/SQL_MANIFEST.tsv", "p3/sql_B/N1-W04/SQL_MANIFEST.tsv",
          "p3/sql_B/slot_verwacht_N1-W06.json", "p3/sql_B/VERWACHT_PER_STAP.md", "scripts/p4_stap_N1-W06.py", "scripts/p4_log_stap_N1-W06.py",
          "scripts/p4_status_N1-W06.py", "scripts/herbouw_master_N1-W06.py", "p4/P4_DRAAIBOEK_N1-W06_variant_B.md", "p4/ROOKTEST_N1-W06.md",
          "p4/uitvoering/RECEPT_MAKER-T_blok.md", "p4/master/VOORSPELDE_MD5.txt", "p4/master/n1_voorspeld.tsv", "p4/export_N1_naP4.sql",
          "p4/export_hash_N1_naP4.sql", "scripts/export_hash_N1-W06.py"]


LEGE_MAPPEN = ["p4/uitvoering/ruw/", "p4/export/"]   # v1.1 (8T C-T17): de heredocs en de export schrijven hierin


def md5(p):
    h = hashlib.md5()
    with open(p, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def reden(rel, eigen):
    if rel in eigen:
        return "wordt apart toegevoegd"
    if rel.endswith(".lock") or "/__pycache__/" in rel or rel.endswith(".pyc"):
        return "slot- of cachebestand"
    for pre, r in UITSLUITEN:
        if rel == pre or (pre.endswith("/") and rel.startswith(pre)):
            return r
    return None


def lijst(wm, eigen):
    mee, weg = [], []
    for root, dirs, files in os.walk(wm):
        dirs.sort()
        for fn in sorted(files):
            p = os.path.join(root, fn); rel = os.path.relpath(p, wm)
            if os.path.islink(p):
                weg.append((rel, 0, "", "symbolische link")); continue
            if not __import__("stat").S_ISREG(os.stat(p).st_mode):   # v1.1: socket van een draaiende replica e.d.
                weg.append((rel, 0, "", "geen gewoon bestand (socket)")); continue
            r = reden(rel, eigen)
            (weg if r else mee).append((rel, os.path.getsize(p), md5(p), r))
    return mee, weg


def maak(wm, uit, naam):
    MAN, UGS = f"MANIFEST_N1-W06_{naam}.tsv", f"UITGESLOTEN_N1-W06_{naam}.tsv"
    mee, weg = lijst(wm, {MAN, UGS})
    for a in ANKERS:
        if naam == "P4bundel": assert any(rel == a for rel, _, _, _ in mee), f"anker ontbreekt: {a}"
    with open(os.path.join(wm, MAN), "w", encoding="utf-8") as f:
        f.write("pad\tbytes\tmd5\n"); f.writelines(f"{rel}\t{n}\t{m}\n" for rel, n, m, _ in mee)
    with open(os.path.join(wm, UGS), "w", encoding="utf-8") as f:
        f.write("pad\tbytes\tmd5\treden\n"); f.writelines(f"{rel}\t{n}\t{m}\t{r}\n" for rel, n, m, r in weg if r != "wordt apart toegevoegd")
    if os.path.exists(uit): os.remove(uit)
    with zipfile.ZipFile(uit, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for rel, _, _, _ in mee: z.write(os.path.join(wm, rel), rel)
        z.write(os.path.join(wm, MAN), MAN); z.write(os.path.join(wm, UGS), UGS)
        if naam == "P4bundel":
            for m in LEGE_MAPPEN:
                zi = zipfile.ZipInfo(m); zi.external_attr = (0o40755 << 16) | 0x10   # v1.1.1 (8T C-T28): drwxr-xr-x, ook met unzip
                z.writestr(zi, "")
    with tempfile.TemporaryDirectory() as d:
        with zipfile.ZipFile(uit) as z: z.extractall(d)
        code = controleer(d, naam, md5(os.path.join(wm, MAN)), stil=True)
    print(f"bundel {uit}: {len(mee)} bestanden + manifest + uitgesloten-lijst · {os.path.getsize(uit)} bytes · md5 {md5(uit)} · "
          f"uitgesloten {sum(1 for w in weg if w[3] != 'wordt apart toegevoegd')} · manifest md5 {md5(os.path.join(wm, MAN))} · controle na uitpakken: {'✓' if code == 0 else 'FOUT'}")
    return code


def controleer(d, naam, verwacht_md5, stil=False):
    MAN, UGS = f"MANIFEST_N1-W06_{naam}.tsv", f"UITGESLOTEN_N1-W06_{naam}.tsv"
    if not os.path.isfile(os.path.join(d, MAN)): print(f"✗ STOP · {MAN} ontbreekt in {d}"); return 2
    if md5(os.path.join(d, MAN)) != verwacht_md5: print(f"✗ STOP · {MAN} md5 {md5(os.path.join(d, MAN))} ≠ de verwachte {verwacht_md5} (andere of gewijzigde bundel)"); return 2
    rijen = [l.rstrip("\n").split("\t") for l in list(open(os.path.join(d, MAN), encoding="utf-8"))[1:]]
    verwacht = {r[0]: (int(r[1]), r[2]) for r in rijen}
    fout = []
    for rel, (n, m) in verwacht.items():
        p = os.path.join(d, rel)
        if not os.path.isfile(p): fout.append(f"ontbreekt: {rel}")
        elif os.path.getsize(p) != n or md5(p) != m: fout.append(f"anders: {rel}")
    extra = []
    for root, dirs, files in os.walk(d):
        for fn in files:
            rel = os.path.relpath(os.path.join(root, fn), d)
            if rel in verwacht or rel in (MAN, UGS) or rel.endswith(".lock") or "/__pycache__/" in rel or rel.endswith(".pyc"): continue
            extra.append(rel)
    if naam == "P4bundel":
        for a in ANKERS:
            if a not in verwacht: fout.append(f"anker niet in het manifest: {a}")
        for m in LEGE_MAPPEN:
            if not os.path.isdir(os.path.join(d, m)): fout.append(f"map ontbreekt: {m}")
    if not stil or fout or extra:
        print(f"controle {naam} in {d}: {len(verwacht)} bestanden · {len(fout)} fout · {len(extra)} te veel · manifest md5 {md5(os.path.join(d, MAN))}"
              + ("" if fout or extra else " · ✓ alle md5 gelijk") + "".join(f"\n  ✗ {x}" for x in fout[:20]) + "".join(f"\n  ✗ te veel: {x}" for x in extra[:20]))
        if naam == "P4bundel" and not fout:
            print("ankers: " + " · ".join(f"{os.path.basename(a)} {verwacht[a][1][:8]}" for a in ANKERS))
    return 2 if fout or extra else 0


if __name__ == "__main__":
    a = sys.argv[1:]; naam = a[a.index("--naam") + 1]; assert naam in ("P4bundel", "afsluiting")
    if a[0] == "maak": sys.exit(maak(os.path.abspath(a[1]), os.path.abspath(a[2]), naam))
    if a[0] == "controleer":
        _i = a.index("--manifest-md5") if "--manifest-md5" in a else -1   # v1.1.1 (8T C-T28): ook zonder waarde exit 2
        if _i < 0 or _i + 1 >= len(a) or not __import__("re").fullmatch(r"[0-9a-f]{32}", a[_i + 1]): print("✗ STOP · controleer vraagt --manifest-md5 <md5 uit de OVERDRACHT>"); sys.exit(2)
        sys.exit(controleer(os.path.abspath(a[1]), naam, a[a.index("--manifest-md5") + 1]))
    sys.exit("gebruik: maak <werkmap> <uit.zip> --naam … | controleer <map> --naam … --manifest-md5 <md5>")
