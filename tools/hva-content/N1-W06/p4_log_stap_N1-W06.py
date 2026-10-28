# p4_log_stap_N1-W06.py v1.5.4 (8T C-T22: ook een geweigerde c7_voorcontrole krijgt geen «✓» meer in de STOP-regel) · v1.5.3 (Maker-T P4-gereedschap: een geweigerde variant krijgt geen «✓ variant … vastgelegd» meer in de STOP-regel) · v1.5.2 (9T P3 F1c/V4: het akkoord voor variant A is precies «PR #8 akkoord» (hoofdletters vrij, een punt mag), geen deelstring;
#   c7_voorcontrole alleen in de vaste vorm «ok: url=<url> sha=<commit> item=<U6-item> open✓ indienen✓ opnieuw✓ volgende✓ desktop✓ gsm✓»; geen «Juist!» vóór 5_R1) · v1.5.1 — Regisseur-D · P4 N1-W06 · legt één P4-aanroep vast en laat p4_stap_N1-W06.py v1.6 oordelen.
# v1.5.1 (8T P3 C-T02, 9D P3 R1/V4): de VARIANT is gebonden. Twee handstappen in blok `slot`, zonder SQL-bestand (bestand «-»):
#   `c7_voorcontrole` (uitkomst «ok: <wat de tester zag>» → ✓, elke andere uitkomst → STOP) en `variant` met `--variant A|B` en
#   `--akkoord-ibra "<letterlijke tekst van Ibra>"`. Een ✓ variant: de gekozen variant = die van de bundel (slot_verwacht.variant van P4SQL),
#   alle blokken nog open; variant A vraagt «PR #8 akkoord» in de tekst van Ibra én een ✓ c7_voorcontrole eerder in dit log. Elke andere stap
#   (stand, blokstappen, slotstappen) weigert zolang er in dit log geen ✓ variant staat.
# v1.5 (architectuur T v1.1 §2–§3): = v1.4 voor de bundel van N1-W06 (P4_log_N1-W06.tsv, slot_verwacht_N1-W06.json) met insertblokken:
#   het manifest heeft een 8e kolom `soort`; de gr van een insertblok heeft de kolommen start · apply · na_apply · tweede · na_tweede · activiteit ·
#   isolatie; rollback, noodrollback en vinger_terug van een insertblok = STOP (vastgelegd): terugdraaien stopt bij het eerste updateblok, de nieuwe
#   rijen blijven onzichtbaar (nooit DELETE). Verder ongewijzigd (volgorde, ketenhash, slot, verse gr, --uit, --akkoord-ibra).
# Basis: p4_log_stap_N1-W05.py v1.4.
# Basis: p4_log_stap.py v1.0 (N1-W02). v1.1: p4_stap_N1-W05.py (manifest) en de paden van W03 (P4BASIS, P4SQL, P4LOG).
# v1.2 (8T C-T01–C-T04): volgorde over de weken uit het log, bestand gebonden aan SQL_MANIFEST (--voor), logmap aangemaakt, rollback/4b.
# v1.3 (9T P3 V1–V4):
#   - TOESTAND per blok uit het log, regel na regel (voorcontroles tellen niet mee): ✓ vinger_na → toegepast · ✓ vinger_terug of ✓ vinger_voor
#     → open · elke apply-, rollback- of noodrollback-regel → onzeker · ✓ stand (7_vinger) → de hele week volgens de vingerafdruk (k blokken
#     toegepast, de rest open) (V2). Een ✓ gr van het blok geldt tot de volgende 7_vinger-, apply- of rollbackregel van dat blok.
#   - VOLGORDE: vinger_voor van k: blokken vóór k toegepast, ná k open · gr en apply van k: vóór k toegepast, k en later open · apply alleen
#     na een ✓ gr sinds de laatste ✓ 7_vinger van het blok (V1) · rollback van k: latere blokken open, k toegepast of onzeker · 4b: latere open.
#   - SCHRIJVEN (apply, rollback, noodrollback): de uitkomst wordt alleen aanvaard als de regel er direct vóór de ✓ voorcontrole is van
#     hetzelfde blok, dezelfde stap en dezelfde md5 (V1). De ruwe uitvoer wordt ALTIJD vastgelegd, ook bij een bezwaar (exit 2).
#   - ACTIVITEIT: gr met leerdersactiviteit = STOP, tenzij `--akkoord-ibra "<letterlijke tekst van Ibra>"` (komt in het log) (V1).
#   - SLOT (blok `slot`): slot_ref en zicht_voor als alle blokken open zijn, slot en zicht_na als alle blokken toegepast zijn; slot krijgt de
#     referentie van de laatste ✓ slot_ref uit het log (V3, V4).
#   - HET LOG ZELF: elke regel draagt de md5 van BLOKKEN_MANIFEST.tsv en een ketenhash (md5 van de vorige ketenhash + de regel). Een regel
#     van een andere bundel of een regel die buiten dit script gewijzigd, ingevoegd of verwijderd is = STOP (9T P3 S5, S6).
# v1.4 (9T P4 V1–V4, risico's R1–R3):
#   - RUWE UITVOER UIT EEN BESTAND: `--uit <pad>` (geschreven met een heredoc `<<'RUW'`), zodat ', $ en Arabisch de shell overleven (R1).
#     Elke exit ≠ 0 is een STOP; een onverwachte scriptfout geeft exit 2 met de melding (nooit exit 1).
#   - STAND TEGEN HET LOG (V2): kent het log de week al, dan moet een ✓ stand kloppen met wat het log zegt (toegepaste blokken blijven
#     toegepast, open blokken open; alleen 'onzeker' mag beide kanten op). Een nieuw log (herstelstap 5) zet de stand vrij.
#   - SLOT OP HET LOG (V3): een exclusieve flock (`<log>.lock`) rond lezen en schrijven; gelijktijdige aanroepen wachten op elkaar.
#   - REFERENTIE (V4): staat er geen ✓ slot_ref in het log, dan gebruikt `slot` de P3-referentie uit slot_verwacht (`pogingen_ref_p3`) en meldt dat.
#   - VERSE GR: een apply alleen binnen 15 minuten na de ✓ gr (P4_GR_MAX_MIN), anders eerst opnieuw gr (9T P4 §2: oude activiteitstelling).
# Leest alleen SQL-bestanden (md5/bytes) en schrijft één regel in het log. Raakt de database niet.
# Gebruik: python3 -I p4_log_stap_N1-W06.py <wie> <blok|slot> <stap> <sql-bestand relatief t.o.v. P4BASIS | -> [--uit <bestand met de ruwe tooluitvoer> | --voor | '<ruwe uitvoer>'] [--akkoord-ibra "<tekst>"]
#   stap: stand | vinger_voor | gr | apply | vinger_na | rollback | noodrollback | vinger_terug | rollback_los | slot_ref | zicht_voor | slot | zicht_na | c7_voorcontrole | variant (--variant A|B)
# Exit 0 = ✓ · exit 2 = STOP.
import sys, json, subprocess, hashlib, os, datetime, fcntl
from zoneinfo import ZoneInfo
def _fout(t, v, tb): print(f"✗ STOP · scriptfout in p4_log_stap: {t.__name__}: {v} → niets herhalen, Ibra inlichten", flush=True); os._exit(2)
sys.excepthook = _fout
BASIS = os.environ.get("P4BASIS", "/home/claude/hva_w06")
LOG = os.environ.get("P4LOG", f"{BASIS}/p4/uitvoering/P4_log_N1-W06.tsv"); SQLROOT = os.environ.get("P4SQL", "p3/sql")
ARG = sys.argv[1:]; AKKOORD = ""; UITPAD = ""; VARIANT = ""
if "--variant" in ARG:
    i = ARG.index("--variant"); VARIANT = ARG[i + 1].strip(); del ARG[i:i + 2]
if "--akkoord-ibra" in ARG:
    i = ARG.index("--akkoord-ibra"); AKKOORD = ARG[i + 1].strip(); del ARG[i:i + 2]
if "--uit" in ARG:
    i = ARG.index("--uit"); UITPAD = ARG[i + 1]; del ARG[i:i + 2]
wie, blok, stap, bestand = ARG[0:4]
VOOR = len(ARG) > 4 and ARG[4] == "--voor"
if UITPAD:
    if VOOR or len(ARG) > 4: print("✗ STOP · --uit samen met --voor of met een ruwe uitvoer als argument"); sys.exit(2)
    ruw = open(os.path.join(BASIS, UITPAD) if not os.path.isabs(UITPAD) else UITPAD, encoding="utf-8").read().rstrip("\n")
else:
    ruw = "" if VOOR else (ARG[4] if len(ARG) > 4 else "")
GRMAX = int(os.environ.get("P4_GR_MAX_MIN", "15"))
KOL = {"vinger_voor": ["week_blok_rest"], "vinger_na": ["week_blok_rest"], "stand": ["week_blok_rest"], "vinger_terug": ["week_blok_rest"],
       "gr": ["start", "apply", "na_apply", "rollback", "na_rollback", "activiteit", "isolatie"],
       "apply": ["apply", "isolatie"], "rollback": ["rollback", "isolatie"], "noodrollback": ["noodrollback", "isolatie"]}
SLOTSTAP = {"slot_ref": "slot_tellingen_N1-W06.sql", "slot": "slot_tellingen_N1-W06.sql", "zicht_voor": "leerderszicht_N1-W06.sql", "zicht_na": "leerderszicht_N1-W06.sql"}
BEST = {"stand": "7_vinger_aggregaat.sql", "vinger_voor": "7_vinger_aggregaat.sql", "vinger_na": "7_vinger_aggregaat.sql", "vinger_terug": "7_vinger_aggregaat.sql",
        "gr": "8_generale_repetitie.sql", "apply": "3_apply.sql", "rollback": "4_rollback.sql", "noodrollback": "4b_noodrollback.sql", **SLOTSTAP}
SCHRIJF = ("apply", "rollback", "noodrollback")
HAND = ("c7_voorcontrole", "variant")   # v1.5.1: handstappen in blok slot, zonder SQL-bestand
import re
C7VORM = r"ok: url=https?://\S+ sha=[0-9a-f]{7,40} item=U6-[a-z]+-\d{2}(?:-\d)? open✓ indienen✓ opnieuw✓ volgende✓ desktop✓ gsm✓"   # v1.5.2 (9T P3 F1c, V5)
P4STAP = os.path.join(BASIS, "scripts/p4_stap_N1-W06.py"); SQLABS = os.path.join(BASIS, SQLROOT)
MPATH = os.path.join(SQLABS, "BLOKKEN_MANIFEST.tsv"); MMD5 = hashlib.md5(open(MPATH, "rb").read()).hexdigest()
M = [dict(zip(("volgorde", "week", "blok", "map", "md5_verwacht", "week_voor", "week_na", "soort"), l.rstrip("\n").split("\t"))) for l in list(open(MPATH, encoding="utf-8"))[1:]]
SOORT = {r["blok"]: r.get("soort", "update") for r in M}
if SOORT.get(blok) == "insert": KOL["gr"] = ["start", "apply", "na_apply", "tweede", "na_tweede", "activiteit", "isolatie"]   # v1.5
VOLG = {r["blok"]: int(r["volgorde"]) for r in M}; WEEK = {r["blok"]: r["week"] for r in M}
KOP = "tijd\twie\tblok\tstap\tbestand\tbytes\tmd5_bestand\truwe_uitvoer\tuitkomst\texit\tp4_stap\tmanifest\tketen"
tijd = datetime.datetime.now(ZoneInfo("Europe/Brussels")).strftime("%Y-%m-%d %H:%M:%S")
def h(s): return hashlib.md5(s.encode("utf-8")).hexdigest()
def uit_zonder_log(reden): print(f"✗ STOP · {reden}"); sys.exit(2)
def lees_log():   # → lijst van kolomlijsten; STOP bij een andere kop, een andere bundel of een gebroken keten
    if not os.path.exists(LOG): return [], h(KOP)
    regels = open(LOG, encoding="utf-8").read().split("\n")
    if regels and regels[-1] == "": regels.pop()
    if not regels or regels[0] != KOP: uit_zonder_log(f"het P4-log {LOG} heeft niet de kop van v1.3: nieuw log beginnen (stand per week) of het juiste log gebruiken")
    vorige, rijen = h(KOP), []
    for n, l in enumerate(regels[1:], 2):
        c = l.split("\t")
        if len(c) != 13 or c[12] != h(vorige + "\t" + "\t".join(c[:12])): uit_zonder_log(f"P4-log regel {n} is buiten p4_log_stap gewijzigd, ingevoegd of verwijderd (ketenhash klopt niet) → Ibra inlichten; niets uitvoeren")
        if c[11] != MMD5: uit_zonder_log(f"P4-log regel {n} hoort bij een andere bundel (manifest {c[11][:8]} ≠ {MMD5[:8]}) → het log van deze bundel gebruiken")
        vorige = c[12]; rijen.append(c)
    return rijen, vorige
os.makedirs(os.path.dirname(LOG), exist_ok=True)   # C-T03
_slot = open(LOG + ".lock", "a"); fcntl.flock(_slot, fcntl.LOCK_EX)   # V3: tot het einde van het proces
RIJEN, LAATSTE = lees_log()
SV = json.load(open(os.path.join(SQLABS, "slot_verwacht_N1-W06.json"), encoding="utf-8"))
TZ = ZoneInfo("Europe/Brussels")
def schrijf(nb, md5, ruw1, uitkomst, code, oordeel):
    os.makedirs(os.path.dirname(LOG), exist_ok=True)   # C-T03
    nieuw = not os.path.exists(LOG)
    vlak = [tijd, wie, blok, stap + (" (voorcontrole)" if VOOR else ""), bestand, nb, md5, ruw1, uitkomst, str(code), oordeel.replace("\t", " ").replace("\n", " ⏎ "), MMD5]
    with open(LOG, "a", encoding="utf-8") as f:
        if nieuw: f.write(KOP + "\n")
        f.write("\t".join(vlak + [h(LAATSTE + "\t" + "\t".join(vlak))]) + "\n")
    print(oordeel); print(f"[vastgelegd {tijd} · exit {code}]"); sys.exit(code)
def toestand():
    st = {r["blok"]: "open" for r in M}; gr = {r["blok"]: False for r in M}
    for c in RIJEN:
        b, s_, ok_ = c[2], c[3], c[9] == "0"
        if b not in st: continue
        if s_ == "vinger_na" and ok_: st[b] = "toegepast"; gr[b] = False
        elif s_ in ("vinger_terug", "vinger_voor") and ok_: st[b] = "open"; gr[b] = False
        elif s_ in SCHRIJF: st[b] = "onzeker"; gr[b] = False
        elif s_ == "gr": gr[b] = datetime.datetime.strptime(c[0], "%Y-%m-%d %H:%M:%S").replace(tzinfo=TZ) if ok_ else False
        elif s_ == "stand" and ok_:
            wk = [r for r in M if r["week"] == WEEK[b]]; keten = [wk[0]["week_voor"]] + [r["week_na"] for r in wk]
            w = "|".join(c[8].split("|")[:2])
            if w in keten:
                for i, r in enumerate(wk): st[r["blok"]] = "toegepast" if i < keten.index(w) else "open"; gr[r["blok"]] = False
    return st, gr
def variant_ok():   # v1.5.1: de laatste ✓ variant in dit log (of "")
    for c in reversed(RIJEN):
        if c[2] == "slot" and c[3] == "variant" and c[9] == "0": return c[8]
    return ""
def ref_pogingen():   # (referentie, bron)
    for c in reversed(RIJEN):
        if c[2] == "slot" and c[3] == "slot_ref" and c[9] == "0": return str(json.loads(c[8])["pogingen_totaal"]), "slot_ref in dit log"
    return str(SV["pogingen_ref_p3"]), "P3-referentie uit slot_verwacht (geen ✓ slot_ref in dit log; V4)"
# ---------------- bezwaren vóór het oordeel van p4_stap ----------------
bezwaar = []; nb = md5 = ""
if stap not in ("rollback_los",) + HAND and not variant_ok():
    bezwaar.append("nog geen ✓ variant in dit log: eerst «variant» (met --variant A|B en het letterlijke akkoord van Ibra; bij A eerst een ✓ c7_voorcontrole) (8T P3 C-T02)")
if stap == "rollback_los":
    pass
elif blok == "slot" and stap in HAND:
    if VOOR: uit_zonder_log(f"{stap} heeft geen voorcontrole")
    if bestand != "-": uit_zonder_log(f"{stap} heeft geen SQL-bestand (bestand «-»)")
    st, _ = toestand()
    if any(v != "open" for v in st.values()): bezwaar.append(f"{stap} alleen vóór blok 1 (alle blokken open)")
    if stap == "variant":
        if VARIANT not in ("A", "B"): bezwaar.append("variant zonder --variant A|B")
        elif VARIANT != SV.get("variant"): bezwaar.append(f"variant {VARIANT} ≠ de variant van deze bundel ({SV.get('variant')}, P4SQL={SQLROOT}): andere SQL-root kiezen")
        if not AKKOORD: bezwaar.append("variant zonder het letterlijke akkoord van Ibra (--akkoord-ibra)")
        if VARIANT == "A":
            if not re.fullmatch(r"pr #8 akkoord\.?", AKKOORD.strip().lower()): bezwaar.append("variant A vraagt als akkoord precies «PR #8 akkoord» (9T P3 V4); een andere tekst of een deelstring telt niet")
            if not any(c[2] == "slot" and c[3] == "c7_voorcontrole" and c[9] == "0" for c in RIJEN): bezwaar.append("variant A zonder ✓ c7_voorcontrole op productie in dit log (9D P3 V4)")
elif blok == "slot":
    if stap not in SLOTSTAP: uit_zonder_log(f"onbekende slotstap '{stap}' ({', '.join(list(SLOTSTAP) + list(HAND))})")
    st, _ = toestand()
    if stap in ("slot_ref", "zicht_voor") and any(v != "open" for v in st.values()): bezwaar.append("slot_ref/zicht_voor alleen vóór blok 1 (alle blokken open); volgens het log: " + ", ".join(f"{b} ({v})" for b, v in st.items() if v != "open"))
    if stap in ("slot", "zicht_na") and any(v != "toegepast" for v in st.values()): bezwaar.append("slot/zicht_na alleen als alle blokken toegepast zijn; volgens het log: " + ", ".join(f"{b} ({v})" for b, v in st.items() if v != "toegepast"))
else:
    if blok not in VOLG: uit_zonder_log(f"blok '{blok}' staat niet in het manifest")
    if stap not in KOL: uit_zonder_log(f"onbekende stap '{stap}'")
    st, gr = toestand(); k = VOLG[blok]; ORD = sorted(VOLG.items(), key=lambda x: x[1])
    if SOORT[blok] == "insert" and stap in ("rollback", "noodrollback", "vinger_terug"):
        bezwaar.append(f"{blok} is een insertblok: geen {stap}; de nieuwe rijen blijven onzichtbaar (is_published = false), nooit DELETE (N2-10); terugdraaien stopt bij het eerste updateblok")
    if stap in ("vinger_voor", "gr", "apply"):
        grens = k if stap == "vinger_voor" else k - 1
        fout = [f"{b} ({st[b]})" for b, n in ORD if (n < k and st[b] != "toegepast") or (n > grens and st[b] != "open")]
        if fout: bezwaar.append(f"volgorde: vóór {stap} van blok {blok} moeten de blokken 1–{k - 1} toegepast zijn en " + (f"de blokken ná {blok}" if stap == "vinger_voor" else f"{blok} en later") + f" open; afwijkend volgens het log: {', '.join(fout)}" + (" → eerst 7_vinger als stand van dit blok" if st[blok] == "onzeker" else ""))
    if stap == "apply" and not gr[blok]: bezwaar.append(f"apply van {blok} zonder ✓ generale repetitie sinds de laatste 7_vinger van dit blok (9T V1)")
    elif stap == "apply" and (datetime.datetime.now(TZ) - gr[blok]).total_seconds() > GRMAX * 60: bezwaar.append(f"de ✓ generale repetitie van {blok} is ouder dan {GRMAX} minuten ({gr[blok]:%H:%M:%S}): eerst opnieuw gr (verse activiteitstelling)")
    if stap in ("rollback", "noodrollback"):
        fout = [f"{b} ({st[b]})" for b, n in reversed(ORD) if n > k and st[b] != "open"]
        if fout: bezwaar.append(f"terugdraaien in omgekeerde volgorde: eerst {', '.join(fout)}")
        if stap == "rollback" and st[blok] == "open": bezwaar.append(f"blok {blok} is volgens het log niet toegepast: niets terug te draaien (bij twijfel: 7_vinger als stand; 4b alleen na akkoord van Ibra)")
if stap not in ("rollback_los",) + HAND:
    if bestand == "-": bezwaar.append(f"stap {stap} zonder SQL-bestand")
    else:
        rel = os.path.relpath(os.path.join(BASIS, bestand), SQLABS)
        p = subprocess.run(["python3", "-I", P4STAP, SQLABS, blok, "bestand", rel], capture_output=True, text=True)
        if p.returncode != 0: bezwaar.append("bestand niet gebonden: " + (p.stdout + p.stderr).strip().split("\n")[0])
        elif os.path.basename(rel) != BEST[stap]: bezwaar.append(f"stap {stap} hoort bij {BEST[stap]}, niet bij {os.path.basename(rel)}")
        if os.path.isfile(os.path.join(BASIS, bestand)):
            data = open(os.path.join(BASIS, bestand), "rb").read(); nb, md5 = str(len(data)), hashlib.md5(data).hexdigest()
if VOOR:
    if stap == "rollback_los": uit_zonder_log("rollback_los heeft geen voorcontrole")
    if AKKOORD: uit_zonder_log("--akkoord-ibra hoort bij de uitkomst van gr of bij variant, niet bij een voorcontrole")
    if bezwaar: schrijf(nb, md5, "", "", 2, "✗ STOP · " + " · ".join(bezwaar))
    schrijf(nb, md5, "", "", 0, f"✓ voorcontrole {blok} · {stap}: volgorde en bestand in orde → nu precies {bestand} plakken")
if stap in SCHRIJF:   # V1: de regel direct hiervoor moet de ✓ voorcontrole van dit blok, deze stap en deze md5 zijn
    v = RIJEN[-1] if RIJEN else None
    if not (v and v[2] == blok and v[3] == stap + " (voorcontrole)" and v[9] == "0" and v[6] == md5):
        bezwaar.append("geen ✓ voorcontrole direct vóór deze schrijfstap (zelfde blok, stap en md5) (9T V1)")
# ---------------- uitkomst: altijd vastleggen ----------------
ruw1 = ruw.strip().replace("\t", " ").replace("\r", " ").replace("\n", " ⏎ ")
uitkomst, code, oordeel = "", 0, ""
verdacht = [w for w in ("warning", "notice", "error", "transaction in progress", "aborted") if w in ruw.lower()]
if stap == "rollback_los":
    oordeel = "losse ROLLBACK; vastgelegd (stopprocedure)" + (f" · melding: {', '.join(verdacht)}" if verdacht else "")
elif stap == "c7_voorcontrole":
    uitkomst = ruw1
    if re.fullmatch(C7VORM, ruw1): oordeel = "" if bezwaar else f"✓ C7-voorcontrole op de URL van de klas: {ruw1[3:].strip()} → nu variant vastleggen"   # v1.5.4 (8T C-T22)
    else: code, oordeel = 2, "✗ STOP · C7-voorcontrole niet geslaagd of niet in de vaste vorm «ok: url=… sha=… item=U6-… open✓ indienen✓ opnieuw✓ volgende✓ desktop✓ gsm✓»: variant A kan niet → variant B (Ibra beslist vóór blok 1)"
elif stap == "variant":
    uitkomst = VARIANT; oordeel = "" if bezwaar else f"✓ variant {VARIANT} vastgelegd · akkoord Ibra: «{AKKOORD}» · SQL-root {SQLROOT} (slot_verwacht.variant {SV.get('variant')}) → slot_ref, zicht_voor, daarna blok 1"   # v1.5.3: geen «✓» in een STOP-regel
else:
    try:
        j = json.loads(ruw); rows = j["rows"]
        if len(rows) != 1: raise ValueError(f"{len(rows)} rijen in plaats van 1")
        r = rows[0]
        if blok == "slot": uitkomst = json.dumps(r, ensure_ascii=False)
        else:
            if set(r) != set(KOL[stap]): raise ValueError(f"kolommen {list(r)} ≠ {KOL[stap]}")
            uitkomst = "|".join("" if r[x] is None else str(r[x]) for x in KOL[stap])
    except Exception as e:
        code, oordeel = 2, f"✗ STOP · uitvoer niet bruikbaar: {e}"
    if code == 0 and verdacht: code, oordeel = 2, f"✗ STOP · melding in de uitvoer: {', '.join(verdacht)}"
    if code == 0:
        extra = (["--ref", ref_pogingen()[0]] if stap == "slot" else []) + (["--activiteit-akkoord"] if stap == "gr" and AKKOORD else [])
        p = subprocess.run(["python3", "-I", P4STAP, SQLABS, blok, stap, uitkomst] + extra, capture_output=True, text=True)
        code = 0 if p.returncode == 0 else 2
        oordeel = (p.stdout + p.stderr).strip() + (f" · referentie: {ref_pogingen()[1]}" if stap == "slot" else "")
    if code == 0 and stap == "stand":   # V2: een stand moet kloppen met wat het log al weet over deze week
        wk = [r for r in M if r["week"] == WEEK[blok]]; keten = [wk[0]["week_voor"]] + [r["week_na"] for r in wk]
        k = keten.index("|".join(uitkomst.split("|")[:2]))
        bekend = any(c[2] in {r["blok"] for r in wk} and "(voorcontrole)" not in c[3] for c in RIJEN)
        st, _ = toestand()
        tegen = [f"{r['blok']} ({st[r['blok']]})" for i, r in enumerate(wk) if (st[r["blok"]] == "toegepast" and i >= k) or (st[r["blok"]] == "open" and i < k)]
        if bekend and tegen: code, oordeel = 2, f"✗ STOP · stand '{k} van {len(wk)} toegepast' wijkt af van het log: {', '.join(tegen)} → niets uitvoeren, Ibra inlichten (9T V2) ⏎ " + oordeel
    if AKKOORD:
        if stap != "gr": bezwaar.append("--akkoord-ibra geldt alleen voor gr en variant")
        else: oordeel = f"akkoord Ibra: «{AKKOORD}» · " + oordeel
if bezwaar:
    code, oordeel = 2, "✗ STOP · " + " · ".join(bezwaar) + (" ⏎ oordeel p4_stap over de uitkomst: " + oordeel if oordeel else "")
schrijf(nb, md5, ruw1, uitkomst, code, oordeel)
