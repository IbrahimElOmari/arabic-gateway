# p4_status_N1-W04.py v1 — Regisseur-D · P4 N1-W04 · 9T P4 V8: één statusregel na elk blok (en in elke overdracht bij een crash):
# aantal regels, md5 en laatste ketenhash van het P4-log, de toestand per week en per blok (zoals p4_log_stap v1.4 ze afleidt),
# de pogingenreferentie en de akkoorden van Ibra (letterlijk). Leest alleen; controleert de ketenhash. Exit 2 als het log niet gaaf is.
# Gebruik: python3 -I p4_status_N1-W04.py   (P4BASIS, P4LOG, P4SQL zoals p4_log_stap)
import os, sys, json, hashlib, fcntl
BASIS = os.environ.get("P4BASIS", "/home/claude/N1-W04")
LOG = os.environ.get("P4LOG", f"{BASIS}/p4/uitvoering/P4_log_N1-W04.tsv"); SQLABS = os.path.join(BASIS, os.environ.get("P4SQL", "p3/sql"))
MPATH = os.path.join(SQLABS, "BLOKKEN_MANIFEST.tsv"); MMD5 = hashlib.md5(open(MPATH, "rb").read()).hexdigest()
M = [dict(zip(("volgorde", "week", "blok", "map", "md5_verwacht", "week_voor", "week_na"), l.rstrip("\n").split("\t"))) for l in list(open(MPATH, encoding="utf-8"))[1:]]
WEEK = {r["blok"]: r["week"] for r in M}
KOP = "tijd\twie\tblok\tstap\tbestand\tbytes\tmd5_bestand\truwe_uitvoer\tuitkomst\texit\tp4_stap\tmanifest\tketen"
h = lambda s: hashlib.md5(s.encode("utf-8")).hexdigest()
if not os.path.exists(LOG): print(f"P4-log: bestaat nog niet ({LOG}) · alle blokken open"); sys.exit(0)
with open(LOG + ".lock", "a") as lk:
    fcntl.flock(lk, fcntl.LOCK_SH); data = open(LOG, "rb").read()
regels = data.decode("utf-8").split("\n")
if regels and regels[-1] == "": regels.pop()
if regels[0] != KOP: print("✗ P4-log: andere kop (geen v1.3/v1.4-log)"); sys.exit(2)
vorige, R = h(KOP), []
for n, l in enumerate(regels[1:], 2):
    c = l.split("\t")
    if len(c) != 13 or c[12] != h(vorige + "\t" + "\t".join(c[:12])): print(f"✗ P4-log regel {n}: ketenhash klopt niet"); sys.exit(2)
    if c[11] != MMD5: print(f"✗ P4-log regel {n}: andere bundel"); sys.exit(2)
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
ref = next((json.loads(c[8])["pogingen_totaal"] for c in reversed(R) if c[2] == "slot" and c[3] == "slot_ref" and c[9] == "0"), None)
weken = []
for wk in dict.fromkeys(r["week"] for r in M):
    bl = [r["blok"] for r in M if r["week"] == wk]
    weken.append(f"{wk} {sum(st[b] == 'toegepast' for b in bl)}/{len(bl)} toegepast" + (f" (onzeker: {', '.join(b for b in bl if st[b] == 'onzeker')})" if any(st[b] == "onzeker" for b in bl) else ""))
stops = sum(1 for c in R if c[9] != "0")
akk = [c[10].split(" · ")[0] for c in R if c[10].startswith("akkoord Ibra:")]
laatste = R[-1] if R else None
print(f"P4-log: {len(R)} regels · md5 {hashlib.md5(data).hexdigest()} · laatste ketenhash {vorige} · " + " · ".join(weken)
      + f" · pogingenreferentie {ref if ref is not None else '— (P3: 45)'} · STOP-regels {stops}" + (f" · akkoorden Ibra: {' | '.join(akk)}" if akk else "")
      + (f" · laatste regel: {laatste[2]} {laatste[3]} exit {laatste[9]} ({laatste[0]})" if laatste else ""))
