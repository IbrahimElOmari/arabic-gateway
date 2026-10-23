# maak_bundel_P3_N1-W03.py v1 — Regisseur-T (1T) · P3 N1-W03: de P3-uitvoer (p3/, deel2/, scripts/) in één zip met MANIFEST (md5 per bestand).
# Niet in de bundel: de tijdelijke replica-bestanden (pgdata, sock, p4basis, testkopieën g55/g512/g513, testlogs p4log_*, pg.log).
# Gebruik: python3 -I maak_bundel_P3_N1-W03.py <werkmap> <uit.zip>
import sys, os, zipfile, hashlib
wm, uit = sys.argv[1], sys.argv[2]
MAPPEN = ["p3", "deel2", "scripts"]
WEG = ("p3/replica/pgdata", "p3/replica/sock", "p3/replica/p4basis", "p3/replica/g55", "p3/replica/g512", "p3/replica/g513")
best = []
for m in MAPPEN:
    for d, _, fs in os.walk(os.path.join(wm, m)):
        if "__pycache__" in d: continue
        for f in fs:
            rel = os.path.relpath(os.path.join(d, f), wm)
            if rel.startswith(WEG) or (rel.startswith("p3/replica/") and (f.startswith("p4log_") or f == "pg.log")): continue
            best.append(rel)
best = sorted(best)
regels = []
with zipfile.ZipFile(uit, "w", zipfile.ZIP_DEFLATED) as z:
    for b in best:
        d = open(os.path.join(wm, b), "rb").read(); regels.append(f"| `{b}` | {len(d)} | `{hashlib.md5(d).hexdigest()}` |"); z.write(os.path.join(wm, b), "N1-W03/" + b)
    man = ("# MANIFEST_N1-W03_P3.md\nBundel van P3 van N1-W03 (2026-10-23): export (lijsten, telrapport, diff, JSON, SQL-bundel met manifest), controles 8D/8T + nacontrole, "
           "replica v3.1, live leescontroles, P3-delta (voorgesteld), tegenrapporten, poortrapport en alle scripts. Uitpakken in /home/claude naast de bundel van deel 1 → map N1-W03/. "
           "Controle: elke md5 hieronder.\n\n"
           f"| bestand | bytes | md5 |\n|---|---|---|\n" + "\n".join(regels) + f"\n\n{len(best)} bestanden.\n")
    z.writestr("N1-W03/MANIFEST_N1-W03_P3.md", man)
open(os.path.join(wm, "MANIFEST_N1-W03_P3.md"), "w", encoding="utf-8").write(man)
print(f"{uit}: {len(best)} bestanden + manifest · {os.path.getsize(uit)} bytes · md5 {hashlib.md5(open(uit, 'rb').read()).hexdigest()}")
