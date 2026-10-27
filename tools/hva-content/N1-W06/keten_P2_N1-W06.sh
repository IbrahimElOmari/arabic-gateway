#!/bin/bash
# keten_P2_N1-W06.sh v1.1 (variant B: C7-terugval, 9T P2 F6) — 4T/3T · bouwt de P2-stand van N1-W06 opnieuw op uit de bronnen (deterministisch; tweede run bit-gelijk).
# revisie D → check v1.7.1 (VOOR, = revisie T) → maak_log → proef-apply met apply_log v1.4 (alles goedgekeurd, review alles ja; W06 met de
# nieuwe rijen, W05- en W04-nazorg apart) → check v1.7.1 --poort op NA W06 (uitzondering = precies de gedepubliceerde rijen) en VOOR ↔ NA
# voor W05 en W04 (geen nieuwe bevinding) → rendertoets 900/330 (APP en PLAT, --log) → telrapport (diff in twee richtingen, nieuwe rijen).
# set -euo pipefail: elke STOP breekt de keten af.
# Gebruik: bash keten_P2_N1-W06.sh   (BDI_REPO = map met de app-bron van main @ e7317258 en node_modules voor de rendertoets)
set -euo pipefail
cd "$(dirname "$0")/.."
S=scripts; B=bron; P=p2
md5sum -c --quiet - <<'MD5'
bce088092f40d0b9676130c5f15fea13  bron/APP_EXPORT_N1-W06_2026-10-27.tsv
0083dcacf54795737249ca7df5aea08e  bron/APP_EXPORT_N1_2026-10-27_naP4.tsv
0100d326155c0f443af0a437e8d202c2  bron/ULTIEME_LEESBARE_LIJST_N1N2.tsv
MD5
echo "bronnen: md5 ✓"
E6=$B/APP_EXPORT_N1-W06_2026-10-27.tsv; EN=$B/APP_EXPORT_N1_2026-10-27_naP4.tsv; LIJST=$B/ULTIEME_LEESBARE_LIJST_N1N2.tsv
mkdir -p $P/proef $P/bidi
rm -f $P/N1-W06_revisie_D.tsv $P/N1-W06_revisie_T.tsv $P/check_v1_7_VOOR_N1-W06.out $P/N1-W06_wijzigingslog.tsv $P/review_native_N1-W06.tsv \
      $P/proef/*.tsv $P/proef/*.out $P/bidi/rendertoets_NA_900.out $P/bidi/rendertoets_NA_330.out $P/telrapport_P2_N1-W06.md $P/telrapport_P2_N1-W06_terugval.md $P/N1-W06_wijzigingslog_terugval_C7.tsv
python3 -I $S/maak_revisie_D_N1-W06.py $E6 $EN $P/N1-W06_revisie_D.tsv
python3 -I $S/check_N1-W06.py $E6 $LIJST N1 6 $P/N1-W06_revisie_T.tsv > $P/check_v1_7_VOOR_N1-W06.out
tail -1 $P/check_v1_7_VOOR_N1-W06.out
python3 -I $S/maak_log_N1-W06.py $E6 $EN $P/N1-W06_revisie_D.tsv $P/N1-W06_revisie_T.tsv $P/N1-W06_wijzigingslog.tsv $P/review_native_N1-W06.tsv > $P/proef/maak_log.out
cat $P/proef/maak_log.out
python3 -I $S/maak_proef_N1-W06.py $P/N1-W06_wijzigingslog.tsv $P/review_native_N1-W06.tsv $P/proef/log_proef.tsv $P/proef/review_proef.tsv
# VOOR-bestanden van de nazorgweken: de rijen van week 5 en 4 uit de N1-export na P4 W05 (zelfde kolommen en volgorde)
python3 -I - "$EN" "$P/proef" <<'PY'
import csv, sys
csv.field_size_limit(10**9)
R = list(csv.DictReader(open(sys.argv[1], encoding="utf-8", newline=""), delimiter="\t"))
for w in ("5", "4"):
    with open(f"{sys.argv[2]}/APP_VOOR_N1-W0{w}.tsv", "w", encoding="utf-8", newline="") as f:
        wr = csv.writer(f, delimiter="\t", lineterminator="\n", quoting=csv.QUOTE_MINIMAL); wr.writerow(R[0].keys())
        for r in R:
            if r["week"] == w: wr.writerow(r.values())
PY
for w in 6 5 4; do
  src=$EN; [ $w = 6 ] && src=$E6
  python3 -I $S/apply_log.py $src $P/proef/log_proef.tsv $P/proef/APP_NA_N1-W0${w}_proef.tsv --week $w --review $P/proef/review_proef.tsv --apply --stil > $P/proef/apply_W0${w}.out
  grep -v "^  " $P/proef/apply_W0${w}.out || true
  test -s $P/proef/APP_NA_N1-W0${w}_proef.tsv
done
# uitzondering voor de poort = precies de rijen die in NA gedepubliceerd zijn (B12-vorm); anders STOP
UITZ=$(python3 -I - $P/proef/APP_NA_N1-W06_proef.tsv <<'PY'
import csv, sys
csv.field_size_limit(10**9)
print(",".join(r["item_id"] for r in csv.DictReader(open(sys.argv[1], encoding="utf-8", newline=""), delimiter="\t") if r["is_published"] == "false"))
PY
)
test "$UITZ" = "U6-luisteren-01,U6-luisteren-02,U6-luisteren-04,U6-luisteren-06,U6-lezen-05,U6-grammatica-02" || { echo "STOP: gedepubliceerde rijen in NA = $UITZ"; exit 2; }
python3 -I $S/check_N1-W06.py $P/proef/APP_NA_N1-W06_proef.tsv $LIJST N1 6 $P/proef/check_v1_7_NA_N1-W06.tsv --poort --uitzondering=$UITZ > $P/proef/check_v1_7_NA_N1-W06.out
tail -1 $P/proef/check_v1_7_NA_N1-W06.out
for w in 5 4; do
  python3 -I $S/check_N1-W06.py $P/proef/APP_VOOR_N1-W0${w}.tsv $LIJST N1 $w $P/proef/check_v1_7_VOOR_N1-W0${w}.tsv > $P/proef/check_v1_7_VOOR_N1-W0${w}.out
  python3 -I $S/check_N1-W06.py $P/proef/APP_NA_N1-W0${w}_proef.tsv $LIJST N1 $w $P/proef/check_v1_7_NA_N1-W0${w}.tsv > $P/proef/check_v1_7_NA_N1-W0${w}.out
done
python3 -I - $P/proef <<'PY'
import csv, sys
csv.field_size_limit(10**9)
fout = 0
for w in "54":
    S = {}
    for s in ("VOOR", "NA"):
        S[s] = {(r["item_id"], r["categorie"], r["probleem"], r["ernst"]) for r in csv.DictReader(open(f"{sys.argv[1]}/check_v1_7_{s}_N1-W0{w}.tsv", encoding="utf-8", newline=""), delimiter="\t")}
    nieuw = sorted(S["NA"] - S["VOOR"]); weg = sorted(S["VOOR"] - S["NA"])
    print(f"W0{w}-nazorg: bevindingen {len(S['VOOR'])} → {len(S['NA'])} · nieuw in NA {len(nieuw)} · opgelost {len(weg)}: " + "; ".join(f"{x[0]} {x[1]} ({x[2][:40]})" for x in weg))
    for x in nieuw: print("  NIEUW", x)
    fout += len(nieuw)
sys.exit(2 if fout else 0)
PY
# variant B (C7-terugval, 9T P2 F6): het voorwaardelijke log op de NA-stand van het hoofdlog
python3 -I $S/maak_terugval_C7_N1-W06.py $P/proef/APP_NA_N1-W06_proef.tsv $P/N1-W06_wijzigingslog_terugval_C7.tsv
python3 -I $S/maak_proef_N1-W06.py $P/N1-W06_wijzigingslog_terugval_C7.tsv $P/review_native_N1-W06.tsv $P/proef/log_proef_terugval.tsv $P/proef/review_proef_terugval.tsv > /dev/null
python3 -I $S/apply_log.py $P/proef/APP_NA_N1-W06_proef.tsv $P/proef/log_proef_terugval.tsv $P/proef/APP_NA_N1-W06_terugval_proef.tsv --week 6 --apply --stil > $P/proef/apply_W06_terugval.out
grep -v "^  " $P/proef/apply_W06_terugval.out || true
UITZ_B=$(python3 -I - $P/proef/APP_NA_N1-W06_terugval_proef.tsv <<'PY'
import csv, sys
csv.field_size_limit(10**9)
print(",".join(r["item_id"] for r in csv.DictReader(open(sys.argv[1], encoding="utf-8", newline=""), delimiter="\t") if r["is_published"] == "false"))
PY
)
test "$UITZ_B" = "U6-luisteren-01,U6-luisteren-02,U6-luisteren-03,U6-luisteren-04,U6-luisteren-06,U6-lezen-01,U6-lezen-04,U6-lezen-05,U6-lezen-06,U6-grammatica-01,U6-grammatica-02,U6-grammatica-03" || { echo "STOP: gedepubliceerd in variant B = $UITZ_B"; exit 2; }
python3 -I $S/check_N1-W06.py $P/proef/APP_NA_N1-W06_terugval_proef.tsv $LIJST N1 6 $P/proef/check_v1_7_NA_N1-W06_terugval.tsv --poort --uitzondering=$UITZ_B > $P/proef/check_v1_7_NA_N1-W06_terugval.out
echo "variant B: $(tail -1 $P/proef/check_v1_7_NA_N1-W06_terugval.out)"
REPO=${BDI_REPO:-/home/claude/rt_repo}
python3 -I $S/rendertoets_N1-W06.py $REPO $P/proef/APP_NA_N1-W06_proef.tsv $P/proef/APP_NA_N1-W05_proef.tsv $P/proef/APP_NA_N1-W04_proef.tsv --log $P/N1-W06_wijzigingslog.tsv --breedte 900 > $P/bidi/rendertoets_NA_900.out
python3 -I $S/rendertoets_N1-W06.py $REPO $P/proef/APP_NA_N1-W06_proef.tsv $P/proef/APP_NA_N1-W05_proef.tsv $P/proef/APP_NA_N1-W04_proef.tsv --log $P/N1-W06_wijzigingslog.tsv --breedte 330 --wrap > $P/bidi/rendertoets_NA_330.out
grep "^POORT" $P/bidi/rendertoets_NA_900.out $P/bidi/rendertoets_NA_330.out
python3 -I $S/telrapport_P2_N1-W06.py $P/N1-W06_wijzigingslog.tsv $E6 $P/proef/APP_NA_N1-W06_proef.tsv W06 $P/proef/APP_VOOR_N1-W05.tsv $P/proef/APP_NA_N1-W05_proef.tsv W05-nazorg \
  $P/proef/APP_VOOR_N1-W04.tsv $P/proef/APP_NA_N1-W04_proef.tsv W04-nazorg > $P/telrapport_P2_N1-W06.md
tail -1 $P/telrapport_P2_N1-W06.md
python3 -I $S/telrapport_P2_N1-W06.py $P/N1-W06_wijzigingslog_terugval_C7.tsv $P/proef/APP_NA_N1-W06_proef.tsv $P/proef/APP_NA_N1-W06_terugval_proef.tsv "W06 variant B (C7-terugval)" > $P/telrapport_P2_N1-W06_terugval.md
tail -1 $P/telrapport_P2_N1-W06_terugval.md
md5sum $P/N1-W06_revisie_D.tsv $P/N1-W06_revisie_T.tsv $P/N1-W06_wijzigingslog.tsv $P/review_native_N1-W06.tsv $P/N1-W06_wijzigingslog_terugval_C7.tsv $P/proef/APP_NA_N1-W0*_proef.tsv
echo "KETEN GROEN"
