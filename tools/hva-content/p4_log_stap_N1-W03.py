# p4_log_stap_N1-W03.py v1.2.1 — Regisseur-D · P4 N1-W03 · legt één P4-aanroep vast en laat p4_stap_N1-W03.py oordelen.
# Basis: p4_log_stap.py v1.0 (N1-W02). Nieuw in v1.1: p4_stap_N1-W03.py (manifest) en de paden van W03 (P4BASIS, P4SQL, P4LOG).
# Nieuw in v1.2 (controle 8T, C-T01–C-T04):
#   - VOLGORDE OVER DE WEKEN (C-T01): de toestand per blok volgt uit het P4-log, regel na regel (voorcontroles tellen niet mee):
#       ✓ vinger_na → toegepast · ✓ vinger_terug of ✓ vinger_voor (p4_stap: vingerafdruk = VOOR van dit blok) → niet toegepast, open
#       elke apply-, rollback- of noodrollback-aanroep (ook met STOP of toolfout) → "onzeker" tot een volgende ✓ 7_vinger.
#     vinger_voor van blok k: alle blokken vóór k toegepast, alle blokken ná k open (k zelf mag onzeker zijn: 7_vinger bepaalt de stand);
#     gr en apply van blok k: alle blokken vóór k toegepast, k en alle latere open (dus ook geen dubbel blok);
#     rollback van blok k: alle latere blokken open, k toegepast of onzeker; noodrollback (4b): alle latere blokken open. Anders STOP, vóór p4_stap.
#   - BESTAND GEBONDEN (C-T02): het bestand moet het bestand van deze stap zijn, in de map van dit blok, met de md5 uit SQL_MANIFEST.tsv
#     (via `p4_stap … bestand`). Met --voor gebeurt dat VÓÓR de aanroep (geen uitkomst; legt een regel `voorcontrole` vast).
#   - De map van het log wordt aangemaakt als ze nog niet bestaat (C-T03).
#   - Stappen rollback en noodrollback (4b) met hun kolommen (C-T04).
# Leest alleen SQL-bestanden (md5/bytes) en schrijft één regel in het log. Raakt de database niet.
# Gebruik: python3 -I p4_log_stap_N1-W03.py <wie> <blok> <stap> <sql-bestand relatief t.o.v. P4BASIS | -> ['<ruwe tooluitvoer, letterlijk>' | --voor]
#   stap: stand | vinger_voor | gr | apply | vinger_na | rollback | noodrollback | vinger_terug | rollback_los
# Exit 0 = ✓ · exit 2 = STOP (volgorde, bestand, p4_stap exit 2, geen JSON, niet precies 1 rij, andere kolommen, WARNING/NOTICE/ERROR).
import sys, json, subprocess, hashlib, os, datetime
from zoneinfo import ZoneInfo
BASIS = os.environ.get("P4BASIS", "/home/claude/N1-W03")
LOG = os.environ.get("P4LOG", f"{BASIS}/p4/uitvoering/P4_log_N1-W03.tsv"); SQLROOT = os.environ.get("P4SQL", "p3/sql")
wie, blok, stap, bestand = sys.argv[1:5]
VOOR = len(sys.argv) > 5 and sys.argv[5] == "--voor"
ruw = "" if VOOR else sys.argv[5]
KOL = {"vinger_voor": ["week_blok_rest"], "vinger_na": ["week_blok_rest"], "stand": ["week_blok_rest"], "vinger_terug": ["week_blok_rest"],
       "gr": ["start", "apply", "na_apply", "rollback", "na_rollback", "activiteit", "isolatie"],
       "apply": ["apply", "isolatie"], "rollback": ["rollback", "isolatie"], "noodrollback": ["noodrollback", "isolatie"]}
P4STAP = os.path.join(BASIS, "scripts/w03/p4_stap_N1-W03.py"); SQLABS = os.path.join(BASIS, SQLROOT)
M = [dict(zip(("volgorde", "week", "blok", "map", "md5_verwacht", "week_voor", "week_na"), l.rstrip("\n").split("\t"))) for l in list(open(os.path.join(SQLABS, "BLOKKEN_MANIFEST.tsv"), encoding="utf-8"))[1:]]
VOLG = {r["blok"]: int(r["volgorde"]) for r in M}
tijd = datetime.datetime.now(ZoneInfo("Europe/Brussels")).strftime("%Y-%m-%d %H:%M:%S")
def schrijf(nb, md5, ruw1, uitkomst, code, oordeel):
    os.makedirs(os.path.dirname(LOG), exist_ok=True)   # C-T03
    nieuw = not os.path.exists(LOG)
    with open(LOG, "a", encoding="utf-8") as f:
        if nieuw: f.write("tijd\twie\tblok\tstap\tbestand\tbytes\tmd5_bestand\truwe_uitvoer\tuitkomst\texit\tp4_stap\n")
        f.write("\t".join([tijd, wie, blok, stap + (" (voorcontrole)" if VOOR else ""), bestand, nb, md5, ruw1, uitkomst, str(code), oordeel.replace("\t", " ").replace("\n", " ⏎ ")]) + "\n")
    print(oordeel); print(f"[vastgelegd {tijd} · exit {code}]"); sys.exit(code)
def toestand():   # per blok: "toegepast", "open" of "onzeker", regel na regel uit het log (C-T01)
    st = {r["blok"]: "open" for r in M}
    if os.path.exists(LOG):
        for l in list(open(LOG, encoding="utf-8"))[1:]:
            c = l.rstrip("\n").split("\t")
            if len(c) < 10 or c[2] not in st: continue
            if c[3] == "vinger_na" and c[9] == "0": st[c[2]] = "toegepast"
            elif c[3] in ("vinger_terug", "vinger_voor") and c[9] == "0": st[c[2]] = "open"
            elif c[3] in ("apply", "rollback", "noodrollback"): st[c[2]] = "onzeker"
    return st
nb = md5 = ""
if stap != "rollback_los":
    if blok not in VOLG: schrijf("", "", "", "", 2, f"✗ STOP · blok '{blok}' staat niet in het manifest")
    st = toestand(); k = VOLG[blok]
    if stap in ("vinger_voor", "gr", "apply"):
        grens = k if stap == "vinger_voor" else k - 1
        fout = [f"{b} ({st[b]})" for b, n in sorted(VOLG.items(), key=lambda x: x[1]) if (n < k and st[b] != "toegepast") or (n > grens and st[b] != "open")]
        if fout: schrijf("", "", "", "", 2, f"✗ STOP · volgorde: vóór {stap} van blok {blok} moeten de blokken 1–{k - 1} toegepast zijn en " + (f"de blokken ná {blok}" if stap == "vinger_voor" else f"{blok} en later") + f" open; afwijkend volgens het log: {', '.join(fout)}" + (" → eerst 7_vinger (stand/vinger_voor) van dit blok" if st[blok] == "onzeker" else ""))
    if stap in ("rollback", "noodrollback"):
        fout = [f"{b} ({st[b]})" for b, n in sorted(VOLG.items(), key=lambda x: x[1], reverse=True) if n > k and st[b] != "open"]
        if fout: schrijf("", "", "", "", 2, f"✗ STOP · terugdraaien in omgekeerde volgorde: eerst {', '.join(fout)}")
        if stap == "rollback" and st[blok] == "open": schrijf("", "", "", "", 2, f"✗ STOP · blok {blok} is volgens het log niet toegepast: niets terug te draaien (bij twijfel: 7_vinger, en 4b alleen na akkoord van Ibra)")
    if bestand != "-":
        rel = os.path.relpath(os.path.join(BASIS, bestand), SQLABS)
        p = subprocess.run(["python3", "-I", P4STAP, SQLABS, blok, "bestand", rel], capture_output=True, text=True)
        BEST = {"stand": "7_vinger_aggregaat.sql", "vinger_voor": "7_vinger_aggregaat.sql", "vinger_na": "7_vinger_aggregaat.sql", "vinger_terug": "7_vinger_aggregaat.sql",
                "gr": "8_generale_repetitie.sql", "apply": "3_apply.sql", "rollback": "4_rollback.sql", "noodrollback": "4b_noodrollback.sql"}
        if p.returncode != 0: schrijf("", "", "", "", 2, "✗ STOP · bestand niet gebonden: " + (p.stdout + p.stderr).strip().split("\n")[0])
        if stap in BEST and os.path.basename(rel) != BEST[stap]: schrijf("", "", "", "", 2, f"✗ STOP · stap {stap} hoort bij {BEST[stap]}, niet bij {os.path.basename(rel)}")
        data = open(os.path.join(BASIS, bestand), "rb").read(); nb, md5 = str(len(data)), hashlib.md5(data).hexdigest()
    elif stap in KOL: schrijf("", "", "", "", 2, f"✗ STOP · stap {stap} zonder SQL-bestand")
if VOOR: schrijf(nb, md5, "", "", 0, f"✓ voorcontrole {blok} · {stap}: volgorde en bestand in orde → nu precies {bestand} plakken")
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
        p = subprocess.run(["python3", "-I", P4STAP, SQLABS, blok, stap, uitkomst], capture_output=True, text=True)
        code = 0 if p.returncode == 0 else 2
        oordeel = (p.stdout + p.stderr).strip()
schrijf(nb, md5, ruw1, uitkomst, code, oordeel)
