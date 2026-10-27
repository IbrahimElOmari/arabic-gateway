# telrapport_P2_N1-W06.py v1.1 — Regisseur-T/Controleur-T · N1-W06 · P2: tellingen VOOR → NA (proef) en de diff-controle in twee richtingen.
# (1) elk veld dat tussen VOOR en NA verschilt, heeft een logregel (laatste `nieuw` van de keten = NA-waarde); (2) elke logregel geeft
# een verschil (of is een tussenschakel van een keten). Uitvoer: markdown op stdout. Exit 2 bij een onverklaard verschil.
# v1.1 (W06, nieuwe rijen P1-3a): een rij in NA die niet in VOOR staat, moet een logregel `(rij)` hebben (oud «(nieuw)», spec = de vaste
# kolommen van de NA-rij); elk veld van die rij dat afwijkt van de databankdefault heeft een veldketen waarvan de laatste `nieuw` = NA;
# een rij in VOOR die niet in NA staat = STOP (er wordt nooit een rij verwijderd, N2-10). Tellingen: gepubliceerd en punten van de
# gepubliceerde rijen apart (leerderszicht).
# Gebruik: python3 -I telrapport_P2_N1-W06.py <log.tsv> (<VOOR.tsv> <NA.tsv> <label>)+
import sys, csv, json, collections
csv.field_size_limit(10**9)
log = list(csv.DictReader(open(sys.argv[1], encoding="utf-8", newline=""), delimiter="\t"))
paren = [sys.argv[i:i + 3] for i in range(2, len(sys.argv), 3)]
NIET = {"updated_at", "created_at", "id"}
def dec(s): return s.replace("\\n", "\n")
fout = 0; uit = []
uit.append("| week | rijen vóór → na | nieuwe rijen | gewijzigde bestaande items | gewijzigde velden | logregels | onverklaard | log zonder diff | gepubliceerd vóór → na | punten gepubliceerd vóór → na |")
uit.append("|---|---|---|---|---|---|---|---|---|---|")
typen = []
for vp, np_, label in paren:
    V = {r["item_id"]: r for r in csv.DictReader(open(vp, encoding="utf-8", newline=""), delimiter="\t")}
    N = {r["item_id"]: r for r in csv.DictReader(open(np_, encoding="utf-8", newline=""), delimiter="\t")}
    weg = sorted(set(V) - set(N)); nieuw = [i for i in N if i not in V]
    cols = [c for c in next(iter(N.values())).keys() if c not in NIET]
    DEF = {c: "" for c in cols}; DEF.update({"options": "[]", "media_production": "[]", "points": "1", "strict_tashkeel": "false", "is_published": "false"})
    ketens = collections.defaultdict(list)
    for r in log:
        if r["item_id"] in N: ketens[(r["item_id"], r["veld"])].append(r)
    diff = {(i, k) for i in V if i in N for k in cols if V[i][k] != N[i][k]}
    for i in nieuw:
        spec = json.loads(dec(ketens[(i, "(rij)")][-1]["nieuw"])) if (i, "(rij)") in ketens else None
        if spec is None or ketens[(i, "(rij)")][-1]["oud"] != "(nieuw)":
            uit.append(f"| NIEUWE RIJ ZONDER (rij)-REGEL | {i} | | | | | | | | |"); fout += 1; continue
        for k in ("unit_code", "week", "skill", "display_order"):
            if str(spec[k]) != N[i][k]: uit.append(f"| SPEC ≠ NA | {i} · {k} | | | | | | | | |"); fout += 1
        basis = dict(DEF); basis.update({k: str(v) for k, v in spec.items() if k != "na"})
        diff |= {(i, k) for k in cols if k not in ("item_id",) and basis.get(k, "") != N[i][k]}
    onverklaard = sorted(d for d in diff if d not in ketens or dec(ketens[d][-1]["nieuw"]) != N[d[0]][d[1]])
    zonder = sorted(d for d in ketens if d[1] != "(rij)" and d not in diff)
    fout += len(onverklaard) + len(zonder) + len(weg)
    pub = lambda D: [r for r in D.values() if r["is_published"] == "true"]
    p_v = sum(int(r["points"] or 0) for r in pub(V)); p_n = sum(int(r["points"] or 0) for r in pub(N))
    nlog = sum(len(x) for x in ketens.values())
    gew_best = {d[0] for d in diff if d[0] in V}
    uit.append(f"| {label} | {len(V)} → {len(N)} | {len(nieuw)} | {len(gew_best)} | {len(diff)} | {nlog} | {len(onverklaard)} | {len(zonder)} | {len(pub(V))} → {len(pub(N))} | {p_v} → {p_n} |")
    for d in onverklaard: uit.append(f"| ONVERKLAARD | {d[0]} · {d[1]} | | | | | | | | |")
    for d in zonder: uit.append(f"| LOG ZONDER DIFF | {d[0]} · {d[1]} | | | | | | | | |")
    for i in weg: uit.append(f"| RIJ VERDWENEN (N2-10) | {i} | | | | | | | | |")
    tv = collections.Counter(r["exercise_type"] for r in pub(V)); tn = collections.Counter(r["exercise_type"] for r in pub(N))
    typen.append(f"- {label} (gepubliceerd): " + " · ".join(f"{t} {tv[t]} → {tn[t]}" for t in sorted(set(tv) | set(tn))))
    per = collections.Counter(k for _, k in diff)
    typen.append(f"  - velden: " + " · ".join(f"{k} {n}" for k, n in sorted(per.items(), key=lambda x: (-x[1], x[0]))))
    dep = [i for i in N if i in V and V[i]["is_published"] == "true" and N[i]["is_published"] == "false"]
    if dep or nieuw: typen.append(f"  - gedepubliceerd: {len(dep)} ({', '.join(dep) or '—'}) · nieuwe rijen: {len(nieuw)}")
print("\n".join(uit)); print("\nOefentypes vóór → na (gepubliceerd) en gewijzigde velden per kolom:"); print("\n".join(typen))
print(f"\nDIFF-CONTROLE: {'GROEN (0 onverklaard, 0 log zonder diff, 0 rijen verdwenen)' if fout == 0 else f'STOP ({fout})'}")
sys.exit(2 if fout else 0)
