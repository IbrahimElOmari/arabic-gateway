#!/bin/bash
# keten_P2_N1-W04.sh v1.0 — 4T/3T · bouwt de P2-stand van N1-W04 opnieuw op uit de bronnen (deterministisch; tweede run bit-gelijk).
# revisie D → check v1.5 (VOOR, = revisie T) → maak_log → proef-apply (alles goedgekeurd, review alles ja; W04, W03, W02, W01 apart) →
# check v1.5 --poort op NA → rendertoets 900/330 (APP en PLAT, --log). set -euo pipefail: elke STOP breekt de keten af (geen oude NA blijft staan).
# Gebruik: bash keten_P2_N1-W04.sh [a|b]   (variant van U4-luisteren-04-3, P2-beslissing 7; standaard a = P1-7a) (vanuit /home/claude/w04/scripts of elke map; BDI_REPO = checkout van main @ e7317258)
set -euo pipefail
cd "$(dirname "$0")/.."
S=scripts; B=bron; P=p2; L04=${1:-a}
md5sum -c --quiet - <<'MD5'
44a3c0a0cc143e07f384f948d45fe762  bron/APP_EXPORT_N1-W04_2026-10-24.tsv
13e64473acfcb75f16cbaf0b6feb3c42  bron/APP_EXPORT_N1-W03_2026-10-23_naP4.tsv
132cb2556e539a2175a410d3e16beb8e  bron/APP_EXPORT_N1-W02_2026-10-23_naP4.tsv
1ed9e5b3ca722612792ace6d62ba720d  bron/APP_EXPORT_N1-W01_2026-10-23_naP4.tsv
0100d326155c0f443af0a437e8d202c2  bron/ULTIEME_LEESBARE_LIJST.tsv
8c96cfb6d0f37804da32f9026aa393c5  bron/N1-W03_nazorg_voor_W04.tsv
MD5
echo "bronnen: md5 ✓"
mkdir -p $P/proef $P/bidi
rm -f $P/N1-W04_revisie_D.tsv $P/N1-W04_revisie_T.tsv $P/check_v1_5_VOOR_N1-W04.out $P/N1-W04_wijzigingslog.tsv $P/review_native_N1-W04.tsv \
      $P/proef/log_proef.tsv $P/proef/review_proef.tsv $P/proef/APP_NA_N1-W0?_proef.tsv $P/proef/check_v1_5_NA_N1-W0?.tsv $P/proef/check_v1_5_NA_N1-W0?.out \
      $P/bidi/rendertoets_NA_900.out $P/bidi/rendertoets_NA_gsm330.out
E4=$B/APP_EXPORT_N1-W04_2026-10-24.tsv; E3=$B/APP_EXPORT_N1-W03_2026-10-23_naP4.tsv; E2=$B/APP_EXPORT_N1-W02_2026-10-23_naP4.tsv; E1=$B/APP_EXPORT_N1-W01_2026-10-23_naP4.tsv
python3 -I $S/maak_revisie_D_N1-W04.py $E4 $E3 $E2 $E1 $P/N1-W04_revisie_D.tsv
python3 -I $S/check_N1-W04.py $E4 $B/ULTIEME_LEESBARE_LIJST.tsv N1 4 $P/N1-W04_revisie_T.tsv > $P/check_v1_5_VOOR_N1-W04.out
tail -1 $P/check_v1_5_VOOR_N1-W04.out
python3 -I $S/maak_log_N1-W04.py $E4 $E3 $E2 $E1 $P/N1-W04_revisie_D.tsv $P/N1-W04_revisie_T.tsv $B/N1-W03_nazorg_voor_W04.tsv $P/N1-W04_wijzigingslog.tsv $P/review_native_N1-W04.tsv --l04 "$L04"
python3 -I $S/maak_proef_N1-W04.py $P/N1-W04_wijzigingslog.tsv $P/review_native_N1-W04.tsv $P/proef/log_proef.tsv $P/proef/review_proef.tsv
for w in 4 3 2 1; do
  eval src=\$E$w
  python3 -I $S/apply_log.py $src $P/proef/log_proef.tsv $P/proef/APP_NA_N1-W0${w}_proef.tsv --week $w --review $P/proef/review_proef.tsv --apply --stil > $P/proef/apply_W0${w}.out
  grep -v "^  " $P/proef/apply_W0${w}.out || true
  test -s $P/proef/APP_NA_N1-W0${w}_proef.tsv
done
UITZ="--uitzondering=U4-luisteren-06,U4-lezen-11"   # gedepubliceerd (P1-9, P1-6a, B12): 0 opties en geen Feedback ✗ tellen niet mee
python3 -I $S/check_N1-W04.py $P/proef/APP_NA_N1-W04_proef.tsv $B/ULTIEME_LEESBARE_LIJST.tsv N1 4 $P/proef/check_v1_5_NA_N1-W04.tsv --poort $UITZ > $P/proef/check_v1_5_NA_N1-W04.out
python3 -I $S/check_N1-W04.py $P/proef/APP_NA_N1-W03_proef.tsv $B/ULTIEME_LEESBARE_LIJST.tsv N1 3 $P/proef/check_v1_5_NA_N1-W03.tsv --poort --uitzondering=U3-luisteren-08 > $P/proef/check_v1_5_NA_N1-W03.out
python3 -I $S/check_N1-W04.py $P/proef/APP_NA_N1-W02_proef.tsv $B/ULTIEME_LEESBARE_LIJST.tsv N1 2 $P/proef/check_v1_5_NA_N1-W02.tsv --poort > $P/proef/check_v1_5_NA_N1-W02.out
python3 -I $S/check_N1-W04.py $P/proef/APP_NA_N1-W01_proef.tsv $B/ULTIEME_LEESBARE_LIJST.tsv N1 1 $P/proef/check_v1_5_NA_N1-W01.tsv --poort > $P/proef/check_v1_5_NA_N1-W01.out
for f in $P/proef/check_v1_5_NA_N1-W0*.out; do echo "$(basename $f): $(tail -1 $f)"; done
REPO=${BDI_REPO:-/home/claude/repo}
python3 -I $S/rendertoets_N1-W04.py $REPO $P/proef/APP_NA_N1-W04_proef.tsv $P/proef/APP_NA_N1-W03_proef.tsv $P/proef/APP_NA_N1-W02_proef.tsv $P/proef/APP_NA_N1-W01_proef.tsv --log $P/N1-W04_wijzigingslog.tsv --breedte 900 > $P/bidi/rendertoets_NA_900.out
python3 -I $S/rendertoets_N1-W04.py $REPO $P/proef/APP_NA_N1-W04_proef.tsv $P/proef/APP_NA_N1-W03_proef.tsv $P/proef/APP_NA_N1-W02_proef.tsv $P/proef/APP_NA_N1-W01_proef.tsv --log $P/N1-W04_wijzigingslog.tsv --breedte 330 --wrap > $P/bidi/rendertoets_NA_gsm330.out
grep "^POORT" $P/bidi/rendertoets_NA_900.out $P/bidi/rendertoets_NA_gsm330.out
md5sum $P/N1-W04_wijzigingslog.tsv $P/review_native_N1-W04.tsv $P/proef/APP_NA_N1-W0*_proef.tsv
echo "KETEN GROEN (variant luisteren-04-3 = $L04)"
