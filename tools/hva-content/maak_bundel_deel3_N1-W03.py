# maak_bundel_deel3_N1-W03.py v1 — Regisseur-T (1T) · AFSLUITEN N1-W03 deel 3 (P4-uitvoering): alles wat N1-W04 en een eventuele
# terugdraaiactie (V-B, alleen op opdracht van Ibra) nodig hebben, in één zip met MANIFEST (md5 per bestand):
#   scripts (zonder oude versies en __pycache__), bron (verse exports van 2026-10-23, de back-ups, de W04-export), p3 zonder de replica
#   (SQL van de 7 blokken met rollback en 4b, VERWACHT_PER_STAP, de nazorgdelta voor W04, lijsten), p4 (rapport, draaiboeken, antwoorden,
#   P4-log met ruwe uitvoer en verslag, de nieuwe master), export (ruwe JSON van de verse N1-export) en kern_p4 (besluiten v14, sjablonen v1.6).
# Niet in de bundel: de vorige master d993217d…, de N1-export van 2026-10-20 en de ULTIEME lijst (bundel deel 2 en Drive; de lijst ook in de
#   project knowledge), de tussenbestanden van de master en van de voorspelling (opnieuw te maken met de scripts), de replica (71 MB),
#   status_log en OVERDRACHT (project knowledge). Geen lesinhoud in dit script.
# Gebruik: python3 -I maak_bundel_deel3_N1-W03.py <werkmap> <uit.zip>
import sys, os, zipfile, hashlib, re
wm, uit = sys.argv[1], sys.argv[2]
MAPPEN = ["scripts", "bron", "p3", "p4", "export", "kern_p4"]
WEG = ("p3/replica/", "bron/LEESBARE_LIJST_MASTER.tsv", "bron/APP_EXPORT_N1_2026-10-20_W03stap0b.tsv", "bron/ULTIEME_LEESBARE_LIJST.tsv",
       "p4/master/n1_lijst_naP4.tsv", "p4/master/rest_naP4.tsv", "p4/master_voorspelling/n1_", "p4/master_voorspelling/rest",
       "p4/master_voorspelling/LEESBARE", "export/resultaat_W03_2026-10-23.json", "kern_p4/status_log.md", "scripts/deel3/p4_log_stap.py")
OUD = re.compile(r"_v\d+(_\d+)*\.(py|sh)$")
best = []
for m in MAPPEN:
    for d, _, fs in os.walk(os.path.join(wm, m)):
        if "__pycache__" in d: continue
        for f in fs:
            rel = os.path.relpath(os.path.join(d, f), wm)
            if rel.startswith(WEG) or f.endswith(".lock") or (rel.startswith("scripts/") and OUD.search(f)): continue
            best.append(rel)
best = sorted(best)
regels, totaal = [], 0
with zipfile.ZipFile(uit, "w", zipfile.ZIP_DEFLATED) as z:
    for b in best:
        d = open(os.path.join(wm, b), "rb").read(); totaal += len(d)
        regels.append(f"| `{b}` | {len(d)} | `{hashlib.md5(d).hexdigest()}` |"); z.write(os.path.join(wm, b), "N1-W03/" + b)
    man = ("# MANIFEST_N1-W03_deel3.md\nBundel van \"N1-W03 deel 3\" (P4-uitvoering, 2026-10-23). Uitpakken in /home/claude → map N1-W03/. "
           "Controle: elke md5 hieronder. Kern: `p4/uitvoering/P4_log_N1-W03.tsv` (het P4-log), `p4/uitvoering/P4_uitvoering_N1-W03.md` (het verslag), "
           "`p4/master/LEESBARE_LIJST_MASTER.tsv` (de nieuwe master `4673c3eb…`), `bron/APP_EXPORT_N1_2026-10-23_naP4.tsv` (`80a5afcc…`), "
           "`p3/delta/N1-W03_nazorg_voor_W04.tsv` (nazorg voor W04) en `p3/sql/` (de 7 blokken met `4_rollback` en `4b_noodrollback`, alleen op opdracht van Ibra). "
           "Niet in de bundel: de vorige master `d993217d…`, de N1-export `36ce4507…` en de ULTIEME lijst (bundel deel 2, Drive en project knowledge); "
           "tussenbestanden van master en voorspelling; de replica; `status_log.md` en `OVERDRACHT_N1-W03.md` (project knowledge).\n\n"
           f"| bestand | bytes | md5 |\n|---|---|---|\n" + "\n".join(regels) + f"\n\n{len(best)} bestanden, {totaal} bytes.\n")
    z.writestr("N1-W03/MANIFEST_N1-W03_deel3.md", man)
open(os.path.join(wm, "MANIFEST_N1-W03_deel3.md"), "w", encoding="utf-8").write(man)
print(f"{uit}: {len(best)} bestanden ({totaal} bytes) + manifest · {os.path.getsize(uit)} bytes · md5 {hashlib.md5(open(uit, 'rb').read()).hexdigest()}")
