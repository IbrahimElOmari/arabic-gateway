# maak_bundel_N1-W02.py v2.1 — Regisseur-T · N1-W02 · maakt het manifest (md5 + bytes van elk bestand) en de weekbundel voor de volgende
# chat, zodat die alles byte-gelijk terugvindt. Opvolger van maak_bundel_P3_N1-W02.py v1.1 (zelfde werkwijze, fase als argument).
# Neemt NIET op: de master (5 MB, Ibra heeft hem), de N1-export (1,7 MB, opnieuw op te halen; md5 in het manifest), ruwe tool-uitvoer
# (live/q_*.json), de databases van de replica's (pgdata, sock, g34, pg.log), oude bundels (*.zip) en __pycache__.
# v2.1: --zonder <pad>,<pad> sluit bestanden uit die in de project knowledge staan (bv. de overdracht, die de md5 van de bundel noemt).
# Gebruik: python3 -I maak_bundel_N1-W02.py <fase, bv. P4> [--zonder p4/OVERDRACHT_….md,p4/kern/status_log.md]   → <fase-map>/MANIFEST_N1-W02_<fase>.md en N1-W02_<fase>_bundel.zip
import os, sys, hashlib, zipfile
FASE = sys.argv[1]; B = "/home/claude/N1-W02"; MAP = FASE.lower()
ZONDER = tuple(sys.argv[sys.argv.index("--zonder") + 1].split(",")) if "--zonder" in sys.argv else ()
UIT = f"{B}/{MAP}/MANIFEST_N1-W02_{FASE}.md"; ZIP = f"{B}/N1-W02_{FASE}_bundel.zip"; UIT_REL = os.path.relpath(UIT, B)
UIT_SLUIT = ("data/master/", "uit/APP_EXPORT_N1_2026-10-19.tsv", "live/q_", "p2/test/")
REPLICA_SLUIT = ("/replica/pgdata", "/replica/sock", "/replica/g34", "/replica/pg.log")
WAT = {"na_p2/": "goedgekeurd log, ingevulde review, antwoord P2 (deel 1)",
       "p4/sql/": "SQL v4.3.1 per blok (maak_sql_N1-W02.py), verwachte waarden per stap", "p4/replica/": "replica v2.2 (rapport en schema)", "p4/kern/": "besluiten v10, sjablonen v1.5 en status_log (ook in de project knowledge)",
       "p4/tegenrapport_9T/": "scenario's van 9T (eigen replica, poort 5434)",
       "p4/live/": "live leescontroles na P3-akkoord (alleen SELECT)", "p4/content/": "JSON week 2 (schema v1-structuur)", "p4/code_pr/": "draft-PR <bdi> (apart traject)",
       "p4/": "na P3-akkoord: log, review, NA, lijsten, telrapport, checks, controles, P4-rapport",
       "p3/sql/": "SQL v4.2.1 per blok (P3, vervangen door p4/sql)", "p3/replica/": "replica v2 (P3)",
       "p3/voorstel/proef/": "proef: P2-log + voorstel op de back-ups (niet live)", "p3/voorstel/": "voorstel W0468–W0497 (P3-beslissing 1)",
       "p3/live/": "live read-only uitkomsten P3", "p3/content/": "JSON (P3)", "p3/": "P3-uitvoer (7D/7T/8D/8T/9D/9T/1D, poortrapport)",
       "uit/": "exports, back-ups en P1-stukken", "scripts/": "scripts (ook die met inhoud; privé)", "kern_def/": "besluiten v9 en sjablonen v1.4 (deel 1)",
       "p2/": "P2-stukken (deel 1)", "bundel_uit/": "hulpscripts W11", "data/lijst/": "bron nr. 2: eerste 262.124 bytes van de TSV (heel W02)",
       "live/": "live schema-metadata", "MANIFEST_N1-W02_deel1.md": "manifest van deel 1"}
def wat(p): return next((v for k, v in WAT.items() if p.startswith(k)), "")
bestanden = []
for d, _, fs in os.walk(B):
    for f in fs:
        p = os.path.relpath(os.path.join(d, f), B)
        if p.startswith(UIT_SLUIT) or any(x in "/" + p for x in REPLICA_SLUIT) or p.endswith(".zip") or p == UIT_REL or "__pycache__" in p or p in ZONDER: continue
        bestanden.append(p)
bestanden.sort()
rijen = []
for p in bestanden:
    data = open(f"{B}/{p}", "rb").read(); rijen.append((p, len(data), hashlib.md5(data).hexdigest()))
L = [f"# MANIFEST_N1-W02_{FASE}.md", f"Bundel `N1-W02_{FASE}_bundel.zip` · stand {FASE} N1-W02 · gemaakt door `scripts/maak_bundel_N1-W02.py` v2.1 · {len(rijen)} bestanden.", "",
     "## Gebruik", "1. Uitpakken in `/home/claude` → alles staat onder `/home/claude/N1-W02/`.", "2. Controleer elke md5 hieronder (`md5sum`). Wijkt er één af: STOP en meld het.",
     "3. Niet in de bundel: `LEESBARE_LIJST_MASTER.tsv` (md5 `2d3ef80039e491a888698c22cb19e34d`, Ibra uploadt hem) en `uit/APP_EXPORT_N1_2026-10-19.tsv` (verse N1-export, verwacht md5 `2af8f6d5567556c903056d1c5ae41ebb` zolang de app niet gewijzigd is)."
     + (f" Ook niet (staan in de project knowledge): {', '.join('`' + z + '`' for z in ZONDER)}." if ZONDER else ""), "",
     "## Bestanden", "| pad | bytes | md5 | wat |", "|---|---|---|---|"]
for p, b, m in rijen: L.append(f"| `{p}` | {b} | `{m}` | {wat(p)} |")
open(UIT, "w", encoding="utf-8").write("\n".join(L) + "\n")
with zipfile.ZipFile(ZIP, "w", zipfile.ZIP_DEFLATED) as z:
    for p in bestanden + [UIT_REL]:
        z.write(f"{B}/{p}", f"N1-W02/{p}")
print("bestanden", len(rijen), "· manifest md5", hashlib.md5(open(UIT, "rb").read()).hexdigest(), "· zip", os.path.getsize(ZIP), "bytes · md5", hashlib.md5(open(ZIP, "rb").read()).hexdigest())
