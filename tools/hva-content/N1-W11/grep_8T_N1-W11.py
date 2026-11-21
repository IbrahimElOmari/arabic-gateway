# grep_8T_N1-W09.py v1.2 (= grep_8T_N1-W10.py v1.1, md5 2f89b462fbe6a654e1f4c739a455f0b4, voor W09) — Maker-T (7T) · P3 N1-W09: dezelfde grep, nu op
#   «N1-W08», «U8-», «N1-W07», «U7-» en op «W08»/«W07» zonder «N1-» buiten de kop (W08 is deze week de nazorgweek: elke verwijzing eronder hoort «8T-bron» te heten of een
#   toegestane vorm te zijn). Basis: de kop van v1.1 hieronder.
# grep_8T_N1-W10.py v1.1 (= v1.0, md5 2e2e40957a8048aa75622bf5b860e7ec, + de P3-delta N1-W08 D9; 8T C-T07) — Maker-T (7T) · P3 N1-W08: de grep is breder.
#   Naast «N1-W07», «U7-», «N1-W06», «U6-» telt hij nu ook «W07»/«W06» ZONDER «N1-» buiten de kop. Zo'n treffer is alleen in orde als hij W08-configuratie of een
#   beslisverwijzing is: (a) het token «W07n» (het nazorgblok en de variant van W08: 9_W07n, sql_zonder_W07n, MET_W07N, met_W07n …), (b) «ADR-W0x-…»,
#   «aanvulling P<n> W0x», «van W0x» (bv. «P4-9 van W07», «P3 van W07») of «na P4 W0x» (de export na P4 van die week). Elke andere treffer telt als «rest» (exit 2).
#   Uitvoer: TSV per bestand met de extra kolommen «W0x_zonder_N1» (alle treffers) en «waarvan_toegestaan».
# Basis: de kop van v1.0 hieronder.
# grep_8T_N1-W10.py v1.0 — Maker-T (7T) · P3 N1-W08 · B17 aanvulling P1 N1-W08 (5), architectuur T v1.0 §3.3: de 8T-grep op de vorige week.
#   Telt per bestand de regels BUITEN DE KOP met «N1-W07», «U7-», «N1-W06» of «U6-» (de nazorgweek van W07 hoort er ook niet in).
#   Kop = de aaneengesloten commentaarregels bovenaan (# … voor .py/.sh, -- … voor .sql), plus een module-docstring direct daarna (.py).
#   Een regel met de markering «8T-bron» is een bewuste verwijzing naar een W07-bestand als bron (bv. de N1-export na P4 W07) en telt apart.
#   Uitvoer: TSV per bestand (bestand · kopregels · treffers buiten de kop · waarvan 8T-bron · rest) en de regels van «rest».
#   Exit 2 als «rest» > 0 voor één bestand (harde ketenstap), anders 0. --info: alleen tellen, altijd exit 0 (voor de W07-werklijst).
# Gebruik: python3 -I grep_8T_N1-W10.py [--info] <bestand> [<bestand> …]
import sys, re
a = sys.argv[1:]; INFO = "--info" in a; a = [x for x in a if x != "--info"]
PAT = re.compile(r"N1-W(?:09|10)|U(?:9|10)-")   # v1.3 (W10): de vorige week en haar nazorgweek (zie de kop)
PAT2 = re.compile(r"(?<!N1-)(?<![A-Za-z0-9])W(?:09|10)(?![0-9])")   # v1.1 (D9) · v1.3 (W10): de vorige week (of haar nazorgweek) zonder «N1-»
TOE = re.compile(r"W(?:09|10)[nN]|ADR-W(?:09|10)-\d|aanvulling P\d W(?:09|10)|\bvan W(?:09|10)\b|\bna P\d W(?:09|10)\b")   # v1.1 · v1.3 (W10): toegestane vormen (configuratie van deze week, beslisverwijzing)
TOE1 = re.compile(r"B17 (?:aanvulling )?P\d N1-W(?:09|10)|ADR-W(?:09|10)-\d|P\d N1-W(?:09|10) \(|N1-W(?:09|10)n|nazorg(?:week)? (?:van )?N1-W(?:09|10)|\bvan N1-W(?:09|10)\b|\bna P\d N1-W(?:09|10)\b|kل-keuze a|check v1\.9|rendertoets v1\.2")   # v1.3 (W10): een beslisverwijzing (B17, ADR, poortpunt) of de nazorgweek zelf
def pat_treffers(l):   # v1.3 (W10): per regel (alle, toegestaan) voor PAT; «8T-bron» dekt de hele regel, TOE1 per treffer
    alle = [m.start() for m in PAT.finditer(l)]
    if "8T-bron" in l: return len(alle), len(alle)
    toe = {a for m in TOE1.finditer(l) for a in alle if m.start() <= a < m.end()}
    return len(alle), len(toe)
def w07_treffers(l):   # (alle, toegestaan) per regel: elke treffer van PAT2 moet in een toegestane vorm (TOE) liggen
    alle = [m.start() for m in PAT2.finditer(l)]; toe = set()
    for m in TOE.finditer(l):
        for a in alle:
            if m.start() <= a < m.end(): toe.add(a)
    return len(alle), len(toe)
def kopgrens(regels, pad):
    c = "--" if pad.endswith(".sql") else "#"
    i = 0
    while i < len(regels) and regels[i].startswith(c): i += 1
    if pad.endswith(".py") and i < len(regels) and regels[i].lstrip().startswith('"""'):
        j = i if regels[i].count('"""') >= 2 else i + 1
        while j < len(regels) and '"""' not in regels[j]: j += 1
        i = j + 1
    return i
print("bestand\tkopregels\ttreffers_buiten_kop\twaarvan_8T_bron\tW0x_zonder_N1\twaarvan_toegestaan\trest")
fout = 0; details = []
for p in a:
    R = open(p, encoding="utf-8").read().split("\n"); k = kopgrens(R, p)
    hits = [(n + 1, l) for n, l in enumerate(R) if n >= k and PAT.search(l)]
    bron = [h for h in hits if "8T-bron" in h[1]]; rest = [h for h in hits if pat_treffers(h[1])[0] != pat_treffers(h[1])[1]]
    w7 = [(n + 1, l) + w07_treffers(l) for n, l in enumerate(R) if n >= k and PAT2.search(l)]   # v1.1 (D9)
    rest += [(n, l) for n, l, a, t in w7 if a != t and (n, l) not in rest]
    print(f"{p.split('/')[-1]}\t{k}\t{len(hits)}\t{len(bron)}\t{sum(x[2] for x in w7)}\t{sum(x[3] for x in w7)}\t{len(rest)}")
    if rest: fout += 1; details += [f"  {p.split('/')[-1]}:{n}: {l.strip()[:160]}" for n, l in rest]
for d in details[:60]: print(d)
print(f"8T-grep: {len(a)} bestanden · {fout} met treffers buiten de kop (zonder 8T-bron)" + (" → STOP" if fout and not INFO else ""))
sys.exit(2 if fout and not INFO else 0)

# v1.4 (W11, register-punt P4-1 N1-W10): extra controle op een weeknummer als CONSTANTE in een weekkopie.
CONST = re.compile(r"^\s*[A-Z_]{2,}\s*=\s*['\"]?(?:9|09|10|N1-W09|N1-W10)['\"]?\s*(?:#.*)?$", re.M)
for f in a:
    try: t = open(f, encoding="utf-8").read()
    except Exception: continue
    hits = [m.group(0).strip() for m in CONST.finditer(t)]
    print(f"CONST\t{f}\t{len(hits)}" + (("\t" + " | ".join(hits)) if hits else ""))
