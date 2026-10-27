# telrapport_P2_N1-W05.py — Regisseur-T/Controleur-T · N1-W05 · P2: tellingen VOOR → NA (proef) en de diff-controle in twee richtingen.
# (1) elk veld dat tussen VOOR en NA verschilt, heeft een logregel (laatste `nieuw` van de keten = NA-waarde); (2) elke logregel geeft
# een verschil (of is een tussenschakel van een keten). Uitvoer: markdown op stdout. Exit 2 bij een onverklaard verschil.
# Gebruik: python3 -I telrapport_P2_N1-W05.py <log.tsv> (<VOOR.tsv> <NA.tsv> <label>)+
import sys, csv, json, collections
csv.field_size_limit(10**9)
log = list(csv.DictReader(open(sys.argv[1], encoding="utf-8", newline=""), delimiter="\t"))
paren = [sys.argv[i:i + 3] for i in range(2, len(sys.argv), 3)]
NIET = {"updated_at", "created_at", "id"}
def dec(s): return s.replace("\\n", "\n")
fout = 0; uit = []
uit.append("| week | items | gewijzigde items | gewijzigde velden | logregels | onverklaard (diff zonder log) | log zonder diff | punten vóór → na | gepubliceerd vóór → na |")
uit.append("|---|---|---|---|---|---|---|---|---|")
typen = []
for vp, np_, label in paren:
    V = {r["item_id"]: r for r in csv.DictReader(open(vp, encoding="utf-8", newline=""), delimiter="\t")}
    N = {r["item_id"]: r for r in csv.DictReader(open(np_, encoding="utf-8", newline=""), delimiter="\t")}
    assert set(V) == set(N), f"{label}: andere item_id's"
    ketens = collections.defaultdict(list)
    for r in log:
        if r["item_id"] in V: ketens[(r["item_id"], r["veld"])].append(r)
    diff = {(i, k) for i in V for k in V[i] if k not in NIET and V[i][k] != N[i][k]}
    onverklaard = sorted(d for d in diff if d not in ketens or dec(ketens[d][-1]["nieuw"]) != N[d[0]][d[1]])
    zonder = sorted(d for d in ketens if d not in diff)
    fout += len(onverklaard) + len(zonder)
    p_v = sum(int(r["points"] or 0) for r in V.values()); p_n = sum(int(r["points"] or 0) for r in N.values())
    g_v = sum(r["is_published"] == "true" for r in V.values()); g_n = sum(r["is_published"] == "true" for r in N.values())
    nlog = sum(len(x) for x in ketens.values())
    uit.append(f"| {label} | {len(V)} | {len({d[0] for d in diff})} | {len(diff)} | {nlog} | {len(onverklaard)} | {len(zonder)} | {p_v} → {p_n} | {g_v} → {g_n} |")
    for d in onverklaard: uit.append(f"| ONVERKLAARD | {d[0]} · {d[1]} | | | | | | | |")
    for d in zonder: uit.append(f"| LOG ZONDER DIFF | {d[0]} · {d[1]} | | | | | | | |")
    tv = collections.Counter(r["exercise_type"] for r in V.values()); tn = collections.Counter(r["exercise_type"] for r in N.values())
    typen.append(f"- {label}: " + " · ".join(f"{t} {tv[t]} → {tn[t]}" for t in sorted(set(tv) | set(tn))))
    per = collections.Counter(k for _, k in diff)
    typen.append(f"  - velden: " + " · ".join(f"{k} {n}" for k, n in sorted(per.items(), key=lambda x: (-x[1], x[0]))))
print("\n".join(uit)); print("\nOefentypes vóór → na en gewijzigde velden per kolom:"); print("\n".join(typen))
print(f"\nDIFF-CONTROLE: {'GROEN (0 onverklaard, 0 log zonder diff)' if fout == 0 else f'STOP ({fout})'}")
sys.exit(2 if fout else 0)
