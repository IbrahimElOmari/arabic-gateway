#!/bin/bash
# proef_p3_delta_N1-W03.sh v1 — Maker-T (7T) · P3 N1-W03 · simulatie van "P3-delta ja" op kopieën (schrijft alleen in p3/delta/proef/):
# log P2 (636, goedgekeurd) + delta (alle regels goedgekeurd) en review P2 (350 × ja) + review delta (2a, ja) → apply_log v1.3 per week
# vanaf de back-ups VOOR → NA-proef; W02 en W01 moeten byte-gelijk blijven aan p3/APP_NA; W03 mag alleen verschillen in de velden van de delta;
# check v1.4 --poort en rendertoets 900/330 op de proef. set -euo pipefail: elke STOP breekt af.
set -euo pipefail
cd "$(dirname "$0")/../.."
S=scripts; B=bron; D=p3/delta; P=p3/delta/proef; N=na_p2
rm -rf $P; mkdir -p $P
python3 -I - "$N/N1-W03_wijzigingslog_P2.tsv" "$D/N1-W03_P3_delta_log.tsv" "$N/review_native_N1-W03_P2.tsv" "$D/review_P3_delta.tsv" "$P" <<'PY'
import sys
lp, ld, rp, rd, P = sys.argv[1:6]
L = open(lp, encoding="utf-8").read().rstrip("\n").split("\n"); Dl = open(ld, encoding="utf-8").read().rstrip("\n").split("\n")
assert L[0] == Dl[0]; kop = L[0].split("\t"); si = kop.index("status"); bi = kop.index("besluit_ibra")
nieuw = []
for r in Dl[1:]:
    c = r.split("\t"); assert c[si] == "voorgesteld"; c[si] = "goedgekeurd"; c[bi] = "proef P3-delta ja"; nieuw.append("\t".join(c))
open(f"{P}/log_P2_plus_delta_proef.tsv", "w", encoding="utf-8").write("\n".join(L + nieuw) + "\n")
R = open(rp, encoding="utf-8").read().rstrip("\n").split("\n"); Rd = open(rd, encoding="utf-8").read().rstrip("\n").split("\n")
assert R[0] == Rd[0]; ak = R[0].split("\t").index("akkoord")
rn = []
for r in Rd[1:]:
    c = r.split("\t"); c[ak] = "ja"; rn.append("\t".join(c))
open(f"{P}/review_P2_plus_delta_proef.tsv", "w", encoding="utf-8").write("\n".join(R + rn) + "\n")
print(f"proeflog {len(L) - 1} + {len(nieuw)} regels · proefreview {len(R) - 1} + {len(rn)} regels")
PY
python3 -I $S/apply_log.py $B/APP_BACKUP_N1-W03_2026-10-20.tsv $P/log_P2_plus_delta_proef.tsv $P/APP_NA_N1-W03_P3proef.tsv --week 3 --review $P/review_P2_plus_delta_proef.tsv --apply --stil > $P/apply_W03.out
python3 -I $S/apply_log.py $B/APP_BACKUP_N1-W02_2026-10-20_W03nazorg.tsv $P/log_P2_plus_delta_proef.tsv $P/APP_NA_N1-W02_P3proef.tsv --week 2 --review $P/review_P2_plus_delta_proef.tsv --apply --stil > $P/apply_W02.out
python3 -I $S/apply_log.py $B/APP_BACKUP_N1-W01_2026-10-20_W03nazorg.tsv $P/log_P2_plus_delta_proef.tsv $P/APP_NA_N1-W01_P3proef.tsv --week 1 --review $P/review_P2_plus_delta_proef.tsv --apply --stil > $P/apply_W01.out
cmp $P/APP_NA_N1-W02_P3proef.tsv p3/APP_NA_N1-W02.tsv && cmp $P/APP_NA_N1-W01_P3proef.tsv p3/APP_NA_N1-W01.tsv && echo "W02 en W01: byte-gelijk aan p3 (de delta raakt ze niet)"
python3 -I - p3/APP_NA_N1-W03.tsv $P/APP_NA_N1-W03_P3proef.tsv $D/N1-W03_P3_delta_log.tsv <<'PY'
import sys, csv
csv.field_size_limit(10**9)
a = {r["item_id"]: r for r in csv.DictReader(open(sys.argv[1], encoding="utf-8", newline=""), delimiter="\t")}
b = {r["item_id"]: r for r in csv.DictReader(open(sys.argv[2], encoding="utf-8", newline=""), delimiter="\t")}
d = list(csv.DictReader(open(sys.argv[3], encoding="utf-8", newline=""), delimiter="\t"))
assert set(a) == set(b)
verschil = {(i, k) for i in a for k in a[i] if k != "updated_at" and a[i][k] != b[i][k]}
verwacht = {(r["item_id"], r["veld"]) for r in d}
assert verschil == verwacht, (sorted(verschil ^ verwacht))
for r in d: assert b[r["item_id"]][r["veld"]] == r["nieuw"].replace("\\n", "\n"), r["wijziging_id"]
print(f"W03: {len(verschil)} veldverschillen t.o.v. p3/APP_NA = {len(d)} deltaregels, elk met de nieuwe tekst · onverklaard 0")
PY
python3 -I $S/check_N1-W03.py $P/APP_NA_N1-W03_P3proef.tsv $B/ULTIEME_LEESBARE_LIJST.tsv N1 3 $P/check_v1_4_NA_N1-W03_P3proef.tsv --poort --uitzondering=U3-luisteren-08 > $P/check_v1_4_NA_N1-W03_P3proef.out
echo "check W03 proef: $(tail -1 $P/check_v1_4_NA_N1-W03_P3proef.out)"
REPO=${BDI_REPO:-/home/claude/bdi_repo}
python3 -I $S/w03/rendertoets_N1-W03.py $REPO $P/APP_NA_N1-W03_P3proef.tsv $P/APP_NA_N1-W02_P3proef.tsv $P/APP_NA_N1-W01_P3proef.tsv --log $P/log_P2_plus_delta_proef.tsv --breedte 900 > $P/rendertoets_delta_900.out
python3 -I $S/w03/rendertoets_N1-W03.py $REPO $P/APP_NA_N1-W03_P3proef.tsv $P/APP_NA_N1-W02_P3proef.tsv $P/APP_NA_N1-W01_P3proef.tsv --log $P/log_P2_plus_delta_proef.tsv --breedte 330 --wrap > $P/rendertoets_delta_330.out
grep -h "^POORT" $P/rendertoets_delta_900.out $P/rendertoets_delta_330.out
md5sum $D/N1-W03_P3_delta_log.tsv $D/review_P3_delta.tsv $P/APP_NA_N1-W03_P3proef.tsv
echo "PROEF P3-DELTA GROEN"
