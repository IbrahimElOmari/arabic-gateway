#!/usr/bin/env python3
"""Bundel N1-W05 (afsluiting na P4): alle bestanden van de werkmap behalve wat elders staat of reproduceerbaar is.

Gebruik: python3 maak_bundel_N1-W05.py <werkmap> <uit.zip>
- schrijft <werkmap>/MANIFEST_N1-W05_bundel.tsv (pad · bytes · md5) en
  <werkmap>/UITGESLOTEN_N1-W05_bundel.tsv (pad · bytes · md5 · reden), beide ook in de zip;
- pakt de zip daarna uit in een lege map en controleert elk bestand op md5 (exit 2 bij een verschil).
Content-vrij: het script bevat geen lesinhoud.
"""
import hashlib, os, sys, tempfile, zipfile

UITSLUITEN = [
    # (voorvoegsel of exact pad, reden)
    ("bron/ULTIEME_LEESBARE_LIJST.tsv", "staat in de project knowledge (md5 0100d326…)"),
    ("bron/LEESBARE_LIJST_MASTER_bf0a8b97.tsv", "vorige master, staat in Drive"),
    ("p3/replica/pgdata/", "werkdatabank van de replica (reproduceerbaar)"),
    ("p3/replica/sock/", "socket van de replica"),
    ("p3/replica/pg.log", "serverlog van de replica"),
    ("p3/replica/g5_kopie/", "kopie van de werkmap voor test G5 (reproduceerbaar)"),
    ("p3/replica/g5_vreemd/", "vreemde bundel voor test G5 (reproduceerbaar)"),
    ("p3/replica/p4basis/", "werkmap van de replica (reproduceerbaar)"),
    ("p3/delta/proef_v1_1_hva_w05_proef.tar.gz", "archief van de proef; SQL byte-gelijk aan p3/sql (md5 in .md5)"),
    ("p4/master/LEESBARE_LIJST_MASTER_voorspeld.tsv", "= p4/master_na/LEESBARE_LIJST_MASTER.tsv (zelfde md5)"),
    ("p4/master/n1_voorspeld.tsv", "tussenbestand van voorspel_master (reproduceerbaar)"),
    ("p4/master/n1_lijst.tsv", "tussenbestand van voorspel_master (reproduceerbaar)"),
    ("p4/master/rest.tsv", "tussenbestand van voorspel_master (reproduceerbaar)"),
    ("p4/master_na/n1_lijst.tsv", "tussenbestand van herbouw_master (reproduceerbaar)"),
    ("p4/master_na/rest.tsv", "tussenbestand van herbouw_master (reproduceerbaar)"),
    ("p4/master_na/APP_EXPORT_N1_naP4_N1-W05.tsv", "= p4/export/APP_EXPORT_N1_2026-10-27_naP4.tsv (zelfde md5)"),
    ("MANIFEST_N1-W05_bundel.tsv", "wordt apart toegevoegd"),
    ("UITGESLOTEN_N1-W05_bundel.tsv", "wordt apart toegevoegd"),
]


def md5(p):
    h = hashlib.md5()
    with open(p, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def reden(rel):
    if rel.endswith(".lock") or "/__pycache__/" in rel or rel.endswith(".pyc"):
        return "slot- of cachebestand"
    for pre, r in UITSLUITEN:
        if rel == pre or (pre.endswith("/") and rel.startswith(pre)):
            return r
    return None


def main():
    wm, uit = sys.argv[1], sys.argv[2]
    mee, weg = [], []
    for root, dirs, files in os.walk(wm):
        dirs.sort()
        for fn in sorted(files):
            p = os.path.join(root, fn)
            rel = os.path.relpath(p, wm)
            if os.path.islink(p):
                continue
            r = reden(rel)
            (weg if r else mee).append((rel, os.path.getsize(p), md5(p), r))
    man = os.path.join(wm, "MANIFEST_N1-W05_bundel.tsv")
    with open(man, "w", encoding="utf-8") as f:
        f.write("pad\tbytes\tmd5\n")
        for rel, n, m, _ in mee:
            f.write(f"{rel}\t{n}\t{m}\n")
    ugs = os.path.join(wm, "UITGESLOTEN_N1-W05_bundel.tsv")
    with open(ugs, "w", encoding="utf-8") as f:
        f.write("pad\tbytes\tmd5\treden\n")
        for rel, n, m, r in weg:
            if rel in ("MANIFEST_N1-W05_bundel.tsv", "UITGESLOTEN_N1-W05_bundel.tsv"):
                continue
            f.write(f"{rel}\t{n}\t{m}\t{r}\n")
    if os.path.exists(uit):
        os.remove(uit)
    with zipfile.ZipFile(uit, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for rel, _, _, _ in mee:
            z.write(os.path.join(wm, rel), rel)
        z.write(man, "MANIFEST_N1-W05_bundel.tsv")
        z.write(ugs, "UITGESLOTEN_N1-W05_bundel.tsv")
    # controle: uitpakken in een lege map en elk bestand tegen het manifest
    with tempfile.TemporaryDirectory() as d:
        with zipfile.ZipFile(uit) as z:
            z.extractall(d)
        fout = [rel for rel, _, m, _ in mee if md5(os.path.join(d, rel)) != m]
        n_zip = sum(len(fs) for _, _, fs in os.walk(d))
    print(f"bundel {uit}: {len(mee)} bestanden + manifest + uitgesloten-lijst = {n_zip} in de zip · "
          f"{os.path.getsize(uit)} bytes · md5 {md5(uit)} · uitgesloten {len(weg) - 2} · controle na uitpakken: "
          f"{'✓ alle md5 gelijk' if not fout else 'FOUT ' + ', '.join(fout[:5])}")
    sys.exit(2 if fout else 0)


if __name__ == "__main__":
    main()
