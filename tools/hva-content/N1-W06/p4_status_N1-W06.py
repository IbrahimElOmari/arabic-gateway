# p4_status_N1-W06.py v1.1.1 (8T C-T23: kop naar p4_log_stap v1.5.4; het akkoord tussen «» gelezen) · v1.1 — Regisseur-D · P4 N1-W06 · = p4_status_N1-W05.py v1 voor de bundel van N1-W06 (9 kolommen in het manifest, insertblokken,
# handstappen variant/c7_voorcontrole; p4_log_stap v1.5.4): één statusregel na elk blok (en in elke overdracht bij een crash):
# aantal regels, md5 en laatste ketenhash van het P4-log, de VARIANT (laatste ✓ variant + het letterlijke akkoord), de toestand per week en per blok
# (zoals p4_log_stap v1.5.4 ze afleidt; insertblokken gemerkt «ins»), de slotstappen (slot_ref, zicht_voor, slot, zicht_na), de pogingenreferentie
# en de akkoorden van Ibra (letterlijk). Leest alleen; controleert de ketenhash en de bundel (md5 van BLOKKEN_MANIFEST). Exit 2 als het log niet gaaf is.
# Gebruik: python3 -I p4_status_N1-W06.py   (P4BASIS, P4LOG, P4SQL zoals p4_log_stap; variant B: P4SQL=p3/sql_B)
import os, sys, json, hashlib, fcntl
BASIS = os.environ.get("P4BASIS", "/home/claude/hva_w06")
LOG = os.environ.get("P4LOG", f"{BASIS}/p4/uitvoering/P4_log_N1-W06.tsv"); SQLROOT = os.environ.get("P4SQL", "p3/sql"); SQLABS = os.path.join(BASIS, SQLROOT)
MPATH = os.path.join(SQLABS, "BLOKKEN_MANIFEST.tsv"); MMD5 = hashlib.md5(open(MPATH, "rb").read()).hexdigest()
M = [dict(zip(("volgorde", "week", "blok", "map", "md5_verwacht", "week_voor", "week_na", "soort", "md5_sql"), l.rstrip("\n").split("\t"))) for l in list(open(MPATH, encoding="utf-8"))[1:]]
SV = json.load(open(os.path.join(SQLABS, "slot_verwacht_N1-W06.json"), encoding="utf-8"))
WEEK = {r["blok"]: r["week"] for r in M}; SOORT = {r["blok"]: r["soort"] for r in M}
KOP = "tijd\twie\tblok\tstap\tbestand\tbytes\tmd5_bestand\truwe_uitvoer\tuitkomst\texit\tp4_stap\tmanifest\tketen"
h = lambda s: hashlib.md5(s.encode("utf-8")).hexdigest()
if not os.path.exists(LOG): print(f"P4-log: bestaat nog niet ({LOG}) · bundel {SQLROOT} (variant {SV.get('variant')}, manifest {MMD5[:8]}) · alle {len(M)} blokken open · eerste stap: variant"); sys.exit(0)
with open(LOG + ".lock", "a") as lk:
    fcntl.flock(lk, fcntl.LOCK_SH); data = open(LOG, "rb").read()
regels = data.decode("utf-8").split("\n")
if regels and regels[-1] == "": regels.pop()
if not regels or regels[0] != KOP: print("✗ P4-log: andere kop (geen v1.3-log of later)"); sys.exit(2)
vorige, R = h(KOP), []
for n, l in enumerate(regels[1:], 2):
    c = l.split("\t")
    if len(c) != 13 or c[12] != h(vorige + "\t" + "\t".join(c[:12])): print(f"✗ P4-log regel {n}: ketenhash klopt niet"); sys.exit(2)
    if c[11] != MMD5: print(f"✗ P4-log regel {n}: andere bundel (manifest {c[11][:8]} ≠ {MMD5[:8]}; P4SQL={SQLROOT})"); sys.exit(2)
    vorige = c[12]; R.append(c)
st = {r["blok"]: "open" for r in M}
for c in R:
    b, s_, ok_ = c[2], c[3], c[9] == "0"
    if b not in st: continue
    if s_ == "vinger_na" and ok_: st[b] = "toegepast"
    elif s_ in ("vinger_terug", "vinger_voor") and ok_: st[b] = "open"
    elif s_ in ("apply", "rollback", "noodrollback"): st[b] = "onzeker"
    elif s_ == "stand" and ok_:
        wk = [r for r in M if r["week"] == WEEK[b]]; keten = [wk[0]["week_voor"]] + [r["week_na"] for r in wk]
        w = "|".join(c[8].split("|")[:2])
        if w in keten:
            for i, r in enumerate(wk): st[r["blok"]] = "toegepast" if i < keten.index(w) else "open"
import re
def _akk(t):   # v1.1.1 (8T C-T23): het akkoord staat tussen «» na «akkoord Ibra: »; « · » in de tekst van Ibra breekt niets meer
    m = re.search(r"akkoord Ibra: «(.*?)» · SQL-root", t); return m.group(1) if m else "?"
var = next(((c[8], _akk(c[10])) for c in reversed(R) if c[2] == "slot" and c[3] == "variant" and c[9] == "0"), None)
c7 = next((c[8] for c in reversed(R) if c[2] == "slot" and c[3] == "c7_voorcontrole" and c[9] == "0"), None)
ref = next((json.loads(c[8])["pogingen_totaal"] for c in reversed(R) if c[2] == "slot" and c[3] == "slot_ref" and c[9] == "0"), None)
slot = [s for s in ("slot_ref", "zicht_voor", "slot", "zicht_na") if any(c[2] == "slot" and c[3] == s and c[9] == "0" for c in R)]
weken = []
for wk in dict.fromkeys(r["week"] for r in M):
    bl = [r["blok"] for r in M if r["week"] == wk]
    weken.append(f"{wk} {sum(st[b] == 'toegepast' for b in bl)}/{len(bl)} toegepast" + (f" (onzeker: {', '.join(b + (' ins' if SOORT[b] == 'insert' else '') for b in bl if st[b] == 'onzeker')})" if any(st[b] == "onzeker" for b in bl) else ""))
stops = sum(1 for c in R if c[9] != "0")
akk = [c[10].split(" · ")[0] for c in R if c[10].startswith("akkoord Ibra:")]
laatste = R[-1] if R else None
volgende = next((b for b in sorted(st, key=lambda x: int(next(r["volgorde"] for r in M if r["blok"] == x))) if st[b] != "toegepast"), None)
print(f"P4-log: {len(R)} regels · md5 {hashlib.md5(data).hexdigest()} · laatste ketenhash {vorige} · bundel {SQLROOT} (manifest {MMD5[:8]}, variant {SV.get('variant')})"
      + (f" · variant {var[0]} vastgelegd (akkoord Ibra: «{var[1]}»)" if var else " · GEEN ✓ variant (eerste stap)") + (f" · C7-voorcontrole ✓" if c7 else "")
      + " · " + " · ".join(weken) + f" · slot: {', '.join(slot) if slot else '—'}"
      + f" · pogingenreferentie {ref if ref is not None else '— (P3: ' + str(SV.get('pogingen_ref_p3')) + ')'} · STOP-regels {stops}" + (f" · akkoorden Ibra: {' | '.join(akk)}" if akk else "")
      + (f" · volgend blok: {volgende}{' (insert: geen rollback)' if volgende and SOORT[volgende] == 'insert' else ''}" if volgende else " · alle blokken toegepast")
      + (f" · laatste regel: {laatste[2]} {laatste[3]} exit {laatste[9]} ({laatste[0]})" if laatste else ""))
