# maak_bundel_deel2_N1-W03.py v1 — Regisseur-T (1T) · AFSLUITEN N1-W03 deel 2: alles wat "N1-W03 deel 3" (P4-uitvoering, master, overdracht)
# nodig heeft in één zip met MANIFEST (md5 per bestand): scripts, bron (met de master en de N1-export: één upload volstaat), na_p2, deel2,
# p3 (zonder tijdelijke replica-bestanden), p4 en kern_p3. Niet in de bundel: p1, p2, weergave en bdi_repo_kopie (bundel deel 1 en Drive;
# in P4 niet nodig).
# Gebruik: python3 -I maak_bundel_deel2_N1-W03.py <werkmap> <uit.zip>
import sys, os, zipfile, hashlib, re
wm, uit = sys.argv[1], sys.argv[2]
MAPPEN = ["scripts", "bron", "na_p2", "deel2", "p3", "p4", "kern_p3"]
WEG = ("p3/replica/pgdata", "p3/replica/sock", "p3/replica/p4basis", "p3/replica/g55", "p3/replica/g512", "p3/replica/g513", "p3/replica/P4_log_replica", "p4/uitvoering",
       "p4/master_voorspelling/n1_", "p4/master_voorspelling/rest", "p4/master_voorspelling/LEESBARE", "kern_p3/OVERDRACHT", "kern_p3/status_log", "scripts/deel3/p4_log_stap.py")
OUD = re.compile(r"_v\d+(_\d+)*\.(py|sh)$")   # 9T P4 V5: geen oude scriptversies in de bundel (een oude p4_log_stap breekt het log)
best = []
for m in MAPPEN:
    for d, _, fs in os.walk(os.path.join(wm, m)):
        if "__pycache__" in d: continue
        for f in fs:
            rel = os.path.relpath(os.path.join(d, f), wm)
            if rel.startswith(WEG) or (rel.startswith("p3/replica/") and (f.startswith("p4log_") or f == "pg.log")) or (rel.startswith("scripts/") and OUD.search(f)): continue
            best.append(rel)
best = sorted(best)
regels = []
with zipfile.ZipFile(uit, "w", zipfile.ZIP_DEFLATED) as z:
    for b in best:
        d = open(os.path.join(wm, b), "rb").read(); regels.append(f"| `{b}` | {len(d)} | `{hashlib.md5(d).hexdigest()}` |"); z.write(os.path.join(wm, b), "N1-W03/" + b)
    man = ("# MANIFEST_N1-W03_deel2.md\nBundel van \"N1-W03 deel 2\" (P3 en het P4-rapport, 2026-10-23). Uitpakken in /home/claude → map N1-W03/ "
           "(de P4-scripts verwachten /home/claude/N1-W03). Controle: elke md5 hieronder. Bevat ook `bron/LEESBARE_LIJST_MASTER.tsv` (d993217d…) en de "
           "N1-export (36ce4507…) voor de masterherbouw na P4. Niet in de bundel: p1/, p2/, weergave/ en bdi_repo_kopie/ (bundel deel 1, Drive); oude scriptversies, "
           "replicalogs en tijdelijke replicabestanden (9T P4 V5); de voorspelde master zelf (opnieuw te maken met `voorspel_master_N1-W03.py`); "
           "`OVERDRACHT_N1-W03-deel2.md` en `status_log.md` (project knowledge).\n\n"
           f"| bestand | bytes | md5 |\n|---|---|---|\n" + "\n".join(regels) + f"\n\n{len(best)} bestanden.\n")
    z.writestr("N1-W03/MANIFEST_N1-W03_deel2.md", man)
open(os.path.join(wm, "MANIFEST_N1-W03_deel2.md"), "w", encoding="utf-8").write(man)
print(f"{uit}: {len(best)} bestanden + manifest · {os.path.getsize(uit)} bytes · md5 {hashlib.md5(open(uit, 'rb').read()).hexdigest()}")
