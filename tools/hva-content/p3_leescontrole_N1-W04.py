# p3_leescontrole_N1-W04.py v1 — Controleur-T (8T) · P3 N1-W04 · beoordeelt één live leescontrole (alleen lezen) tegen verwacht.txt van het
# blok (manifest) en legt ze vast in p3/live/LIVE_LEESCONTROLES_N1-W04.tsv. Raakt de database niet.
#   soort: droogloop (2_droogloop.sql → droogloop_p3) · probe (9_grootte_probe.sql → probe_voor_apply) · vinger (7_vinger_aggregaat.sql →
#          week_voor|blok_voor|rest; alleen geldig voor het eerste blok van een week, want in P3 is nog niets toegepast)
# Exit 0 = ✓ · 2 = STOP (geen JSON, niet precies 1 rij/1 kolom, melding in de uitvoer, of ≠ verwacht).
# Gebruik: python3 -I p3_leescontrole_N1-W04.py <werkmap> <blok> <soort> '<ruwe tooluitvoer, letterlijk>'
import sys, json, os, hashlib, datetime
from zoneinfo import ZoneInfo
WM, BLOK, SOORT, RUW = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
SQL = os.path.join(WM, "p3/sql")
M = {l.split("\t")[2]: l.rstrip("\n").split("\t") for l in list(open(os.path.join(SQL, "BLOKKEN_MANIFEST.tsv"), encoding="utf-8"))[1:]}
assert BLOK in M, f"onbekend blok {BLOK}"
mp = os.path.join(SQL, M[BLOK][3])
assert hashlib.md5(open(os.path.join(mp, "verwacht.txt"), "rb").read()).hexdigest() == M[BLOK][4], "verwacht.txt ≠ manifest"
V = dict(l.rstrip("\n").split("\t", 1) for l in open(os.path.join(mp, "verwacht.txt"), encoding="utf-8"))
BESTAND = {"droogloop": "2_droogloop.sql", "probe": "9_grootte_probe.sql", "vinger": "7_vinger_aggregaat.sql"}[SOORT]
KOLOM = {"droogloop": "droogloop", "probe": "probe", "vinger": "week_blok_rest"}[SOORT]
VERW = {"droogloop": V["droogloop_p3"], "probe": V["probe_voor_apply"], "vinger": f"{V['week_voor']}|{V['blok_voor']}|{V['rest']}"}[SOORT]
if SOORT == "vinger":
    eerste = min((r for r in M.values() if r[1] == M[BLOK][1]), key=lambda r: int(r[0]))[2]
    assert BLOK == eerste, f"in P3 alleen het eerste blok van een week ({eerste})"
data = open(os.path.join(mp, BESTAND), "rb").read()
code, uit, oordeel = 0, "", ""
if any(w in RUW.lower() for w in ("warning", "notice", "error", "aborted", "transaction in progress")): code, oordeel = 2, "melding in de uitvoer"
else:
    try:
        rows = json.loads(RUW)["rows"]; assert len(rows) == 1 and list(rows[0]) == [KOLOM], f"vorm {rows}"
        uit = str(rows[0][KOLOM])
    except Exception as e: code, oordeel = 2, f"uitvoer niet bruikbaar: {e}"
if code == 0: code, oordeel = (0, "✓ = verwacht") if uit == VERW else (2, f"✗ ≠ verwacht {VERW}")
LOG = os.path.join(WM, "p3/live/LIVE_LEESCONTROLES_N1-W04.tsv"); nieuw = not os.path.exists(LOG)
with open(LOG, "a", encoding="utf-8") as f:
    if nieuw: f.write("tijd\tblok\tsoort\tbestand\tbytes\tmd5_bestand\tuitkomst\tverwacht\texit\toordeel\n")
    f.write("\t".join([datetime.datetime.now(ZoneInfo("Europe/Brussels")).strftime("%Y-%m-%d %H:%M:%S"), BLOK, SOORT, f"{M[BLOK][3]}/{BESTAND}", str(len(data)), hashlib.md5(data).hexdigest(), uit, VERW, str(code), oordeel]) + "\n")
print(f"{BLOK} · {SOORT} · {oordeel}"); sys.exit(code)
