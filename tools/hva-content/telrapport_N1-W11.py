# telrapport_N1-W11.py — Verbeteraar-T (4T) · vergelijkt VOOR en NA veld voor veld en eist dat elk verschil precies één
# (laatste) goedgekeurde logregel heeft en elke logregel een verschil. Gebruik: python3 -I telrapport_N1-W11.py <voor.tsv> <na.tsv> <log.tsv>
import sys, csv, collections
csv.field_size_limit(10**9)
V = {r["item_id"]: r for r in csv.DictReader(open(sys.argv[1], encoding="utf-8", newline=""), delimiter="\t")}
N = {r["item_id"]: r for r in csv.DictReader(open(sys.argv[2], encoding="utf-8", newline=""), delimiter="\t")}
L = [l.rstrip("\n").split("\t") for l in open(sys.argv[3], encoding="utf-8")][1:]
logv = collections.defaultdict(list)
for r in L: logv[(r[1], r[3])].append(r)
diff = {(i, k) for i in V for k in V[i] if V[i][k] != N[i][k]}
onverklaard = [d for d in diff if d not in logv]
zonder_effect = [k for k in logv if k not in diff]
fout_eind = [k for k in diff if k in logv and logv[k][-1][5].replace("\\n", "\n") != N[k[0]][k[1]]]
print(f"items VOOR {len(V)} · NA {len(N)} · item_id's gelijk: {set(V)==set(N)}")
print(f"veldverschillen {len(diff)} · logregels {len(L)} · onverklaard {len(onverklaard)} · logregel zonder effect {len(zonder_effect)} · eindwaarde ≠ log {len(fout_eind)}")
print("verschillen per veld:", dict(collections.Counter(k for _, k in diff)))
for x in onverklaard + zonder_effect + fout_eind: print("  !", x)
sys.exit(1 if (onverklaard or zonder_effect or fout_eind) else 0)
