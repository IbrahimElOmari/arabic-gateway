# const_week_N1-W11.py v1.0 — Maker-T (7T) · register-punt P4-1 N1-W10: een weekkopie van een script mag het weeknummer
#   niet alleen in de bestandsnaam dragen. Deze controle zoekt een weeknummer als CONSTANTE (HW = 9, WEEK = "N1-W10", …)
#   buiten de kop, en meldt elke constante die nog op een vorige week staat. Exit 2 bij een treffer.
import sys, re
CONST = re.compile(r'^\s*([A-Z_][A-Z0-9_]{1,})\s*=\s*[\'"]?(9|09|10|N1-W09|N1-W10|U9|U10)[\'"]?\s*(?:#.*)?$')
rest = 0
for f in sys.argv[1:]:
    hits = []
    for n, l in enumerate(open(f, encoding="utf-8"), 1):
        m = CONST.match(l)
        if m: hits.append(f"r{n}: {m.group(0).strip()}")
    print(f"{f}\tconstanten op een vorige week: {len(hits)}" + (("\t" + " | ".join(hits)) if hits else ""))
    rest += len(hits)
print(f"CONST-controle: {rest} treffer(s)")
sys.exit(2 if rest else 0)
