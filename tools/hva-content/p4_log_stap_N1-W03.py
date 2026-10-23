# p4_log_stap_N1-W03.py v1.1 — Regisseur-D · P4 N1-W03 · = p4_log_stap.py v1.0 (N1-W02) met p4_stap_N1-W03.py v1.2 (manifest) en de paden van W03
# (P4BASIS, P4SQL, P4LOG). Legt één P4-aanroep vast en laat p4_stap oordelen.
# Leest alleen het SQL-bestand (md5/bytes) en schrijft één regel in het log. Raakt de database niet.
# Gebruik: python3 -I p4_log_stap.py <wie> <blok> <stap> <sql-bestand relatief t.o.v. P4BASIS (standaard /home/claude/N1-W03), of -> '<ruwe tooluitvoer, letterlijk>'
#   stap: vinger_voor | gr | apply | vinger_na | stand | vinger_terug | rollback_los
# Exit 0 = ✓ · exit 2 = STOP (p4_stap exit 2, of: geen JSON, niet precies 1 rij, andere kolommen, WARNING/NOTICE/ERROR in de uitvoer)
import sys, json, subprocess, hashlib, os, datetime
from zoneinfo import ZoneInfo
BASIS = os.environ.get("P4BASIS", "/home/claude/N1-W03")
LOG = os.environ.get("P4LOG", f"{BASIS}/p4/uitvoering/P4_log_N1-W03.tsv"); SQLROOT = os.environ.get("P4SQL", "p3/sql")
wie, blok, stap, bestand, ruw = sys.argv[1:6]
KOL = {"vinger_voor": ["week_blok_rest"], "vinger_na": ["week_blok_rest"], "stand": ["week_blok_rest"], "vinger_terug": ["week_blok_rest"],
       "gr": ["start", "apply", "na_apply", "rollback", "na_rollback", "activiteit", "isolatie"],
       "apply": ["apply", "isolatie"]}
tijd = datetime.datetime.now(ZoneInfo("Europe/Brussels")).strftime("%Y-%m-%d %H:%M:%S")
if bestand != "-":
    data = open(os.path.join(BASIS, bestand), "rb").read(); nb, md5 = str(len(data)), hashlib.md5(data).hexdigest()
else:
    nb, md5 = "", ""
ruw1 = ruw.strip().replace("\t", " ").replace("\r", " ").replace("\n", " ⏎ ")
uitkomst, code, oordeel = "", 0, ""
verdacht = [w for w in ("warning", "notice", "error", "transaction in progress", "aborted") if w in ruw.lower()]
if stap == "rollback_los":
    oordeel = "losse ROLLBACK; vastgelegd (stopprocedure)" + (f" · melding: {', '.join(verdacht)}" if verdacht else "")
elif stap not in KOL:
    code, oordeel = 2, f"✗ STOP · onbekende stap '{stap}'"
else:
    try:
        j = json.loads(ruw); rows = j["rows"]
        if len(rows) != 1: raise ValueError(f"{len(rows)} rijen in plaats van 1")
        r = rows[0]
        if set(r) != set(KOL[stap]): raise ValueError(f"kolommen {list(r)} ≠ {KOL[stap]}")
        uitkomst = "|".join("" if r[k] is None else str(r[k]) for k in KOL[stap])
    except Exception as e:
        code, oordeel = 2, f"✗ STOP · uitvoer niet bruikbaar: {e}"
    if code == 0 and verdacht:
        code, oordeel = 2, f"✗ STOP · melding in de uitvoer: {', '.join(verdacht)}"
    if code == 0:
        p = subprocess.run(["python3", "-I", "scripts/w03/p4_stap_N1-W03.py", SQLROOT, blok, stap, uitkomst], cwd=BASIS, capture_output=True, text=True)
        code = 0 if p.returncode == 0 else 2
        oordeel = (p.stdout + p.stderr).strip()
nieuw = not os.path.exists(LOG)
with open(LOG, "a", encoding="utf-8") as f:
    if nieuw: f.write("tijd\twie\tblok\tstap\tbestand\tbytes\tmd5_bestand\truwe_uitvoer\tuitkomst\texit\tp4_stap\n")
    f.write("\t".join([tijd, wie, blok, stap, bestand, nb, md5, ruw1, uitkomst, str(code), oordeel.replace("\t", " ").replace("\n", " ⏎ ")]) + "\n")
print(oordeel)
print(f"[vastgelegd {tijd} · exit {code}]")
sys.exit(code)
