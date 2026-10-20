# maak_bundel_P3_N1-W02.py v1 — Regisseur-T · P3 N1-W02 · maakt MANIFEST_N1-W02_P3.md (md5 + bytes van elk bestand) en de bundel
# N1-W02_P3_bundel.zip, zodat een volgende chat (P4 of "N1-W02 deel 3") alles byte-gelijk terugvindt. Neemt NIET op: de master
# (5 MB, Ibra heeft hem), de N1-export (1,7 MB, opnieuw op te halen; md5 staat in het manifest), ruwe tool-uitvoer (live/q_*.json)
# en de database van de replica (replica/pgdata). Gebruik: python3 -I maak_bundel_P3_N1-W02.py
import os, hashlib, zipfile, datetime
B = "/home/claude/N1-W02"; UIT = B + "/p3/MANIFEST_N1-W02_P3.md"; ZIP = B + "/N1-W02_P3_bundel.zip"
UIT_SLUIT = ("data/master/", "uit/APP_EXPORT_N1_2026-10-19.tsv", "live/q_", "p3/replica/pgdata", "p3/replica/sock", "p3/replica/g34", "p3/replica/pg.log", "p2/test/")
WAT = {"na_p2/": "goedgekeurd log, ingevulde review, antwoord P2 (deel 1)", "p3/sql/": "SQL v4.2 per blok (maak_sql_N1-W02.py)", "p3/replica/": "replica v2",
       "p3/live/": "live read-only uitkomsten P3", "p3/content/": "JSON (schema v1-structuur)", "p3/": "P3-uitvoer (7D/7T/8D/8T/9D/9T/1D)", "uit/": "exports, back-ups en P1-stukken",
       "scripts/": "scripts (ook die met inhoud; privé)", "kern_def/": "besluiten v9 en sjablonen v1.4 (deel 1)", "p2/": "P2-stukken (deel 1)", "bundel_uit/": "hulpscripts W11",
       "data/lijst/": "bron nr. 2: eerste 262.124 bytes van de TSV (heel W02)", "live/": "live schema-metadata", "MANIFEST_N1-W02_deel1.md": "manifest van deel 1"}
def wat(p): return next((v for k, v in WAT.items() if p.startswith(k)), "")
bestanden = []
for d, _, fs in os.walk(B):
    for f in fs:
        p = os.path.relpath(os.path.join(d, f), B)
        if p.startswith(UIT_SLUIT) or p.endswith(".zip") or p == "p3/MANIFEST_N1-W02_P3.md" or "__pycache__" in p: continue
        bestanden.append(p)
bestanden.sort()
rijen = []
for p in bestanden:
    data = open(f"{B}/{p}", "rb").read(); rijen.append((p, len(data), hashlib.md5(data).hexdigest()))
L = [f"# MANIFEST_N1-W02_P3.md", f"Bundel `N1-W02_P3_bundel.zip` · stand P3 N1-W02 · gemaakt door `scripts/maak_bundel_P3_N1-W02.py` · {len(rijen)} bestanden.", "",
     "## Gebruik", "1. Uitpakken in `/home/claude` → alles staat onder `/home/claude/N1-W02/`.", "2. Controleer elke md5 hieronder (`md5sum`). Wijkt er één af: STOP en meld het.",
     "3. Niet in de bundel: `LEESBARE_LIJST_MASTER.tsv` (md5 `2d3ef80039e491a888698c22cb19e34d`, Ibra uploadt hem) en `uit/APP_EXPORT_N1_2026-10-19.tsv` (verse N1-export, verwacht md5 `2af8f6d5567556c903056d1c5ae41ebb` zolang de app niet gewijzigd is).", "",
     "## Bestanden", "| pad | bytes | md5 | wat |", "|---|---|---|---|"]
for p, b, m in rijen: L.append(f"| `{p}` | {b} | `{m}` | {wat(p)} |")
open(UIT, "w", encoding="utf-8").write("\n".join(L) + "\n")
with zipfile.ZipFile(ZIP, "w", zipfile.ZIP_DEFLATED) as z:
    for p in bestanden + ["p3/MANIFEST_N1-W02_P3.md"]:
        z.write(f"{B}/{p}", f"N1-W02/{p}")
print("bestanden", len(rijen), "· manifest md5", hashlib.md5(open(UIT, "rb").read()).hexdigest(), "· zip", os.path.getsize(ZIP), "bytes · md5", hashlib.md5(open(ZIP, "rb").read()).hexdigest())
