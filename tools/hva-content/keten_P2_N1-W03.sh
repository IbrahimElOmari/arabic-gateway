#!/bin/bash
# keten_P2_N1-W03.sh v1.1 — 4T/3T · bouwt de P2-stand van N1-W03 opnieuw op uit de bronnen (deterministisch; tweede run bit-gelijk).
# revisie D → check v1.4 (VOOR, = revisie T) → maak_log → proef-apply (alles goedgekeurd, review alles ja) → check v1.4 --poort op NA → rendertoets 900/330.
# v1.1 (tegenrapport T P2, V2): set -euo pipefail; eerst de bronnen tegen hun md5; alle uitvoer van deze keten eerst gewist; elke STOP
# (apply_log, check --poort, POORT van de rendertoets) breekt de keten af met exit ≠ 0, zodat er nooit een oude NA blijft staan.
# Gebruik: bash keten_P2_N1-W03.sh [a|b]   (variant van U3-luisteren-03, P2-beslissing 8; standaard b)
set -euo pipefail
cd "$(dirname "$0")/../.."
S=scripts; B=bron; P=p2; L03=${1:-b}
md5sum -c --quiet - <<'MD5'
76802ca5b47980e0f274cbd2134e76c4  bron/APP_EXPORT_N1-W03_2026-10-20.tsv
25890cb8ae534ed0ecea3506a0ccf0c5  bron/APP_BACKUP_N1-W02_2026-10-20_W03nazorg.tsv
6b07e8c1cead1625b2dec76f298b8d6d  bron/APP_BACKUP_N1-W01_2026-10-20_W03nazorg.tsv
0100d326155c0f443af0a437e8d202c2  bron/ULTIEME_LEESBARE_LIJST.tsv
MD5
echo "bronnen: md5 ✓"
rm -f $P/N1-W03_revisie_D.tsv $P/N1-W03_revisie_T.tsv $P/check_v1_4_VOOR_N1-W03.out $P/N1-W03_wijzigingslog.tsv $P/review_native_N1-W03.tsv \
      $P/proef/log_proef.tsv $P/proef/review_proef.tsv $P/proef/APP_NA_N1-W0?_proef.tsv $P/proef/check_v1_4_NA_N1-W0?.tsv $P/proef/check_v1_4_NA_N1-W0?.out \
      $P/bidi/rendertoets_NA_900.out $P/bidi/rendertoets_NA_gsm330.out
python3 -I $S/w03/maak_revisie_D_N1-W03.py $B/APP_EXPORT_N1-W03_2026-10-20.tsv $B/APP_BACKUP_N1-W01_2026-10-20_W03nazorg.tsv $B/APP_BACKUP_N1-W02_2026-10-20_W03nazorg.tsv $P/N1-W03_revisie_D.tsv
python3 -I $S/check_N1-W03.py $B/APP_EXPORT_N1-W03_2026-10-20.tsv $B/ULTIEME_LEESBARE_LIJST.tsv N1 3 $P/N1-W03_revisie_T.tsv > $P/check_v1_4_VOOR_N1-W03.out
python3 -I $S/w03/maak_log_N1-W03.py $B/APP_EXPORT_N1-W03_2026-10-20.tsv $B/APP_BACKUP_N1-W02_2026-10-20_W03nazorg.tsv $B/APP_BACKUP_N1-W01_2026-10-20_W03nazorg.tsv $P/N1-W03_revisie_D.tsv $P/N1-W03_revisie_T.tsv $P/N1-W03_wijzigingslog.tsv $P/review_native_N1-W03.tsv --l03 "$L03"
python3 -I $S/w03/maak_proef_N1-W03.py $P/N1-W03_wijzigingslog.tsv $P/review_native_N1-W03.tsv $P/proef/log_proef.tsv $P/proef/review_proef.tsv
for w in 3 2 1; do
  src=$([ $w = 3 ] && echo $B/APP_EXPORT_N1-W03_2026-10-20.tsv || echo $B/APP_BACKUP_N1-W0${w}_2026-10-20_W03nazorg.tsv)
  python3 -I $S/apply_log.py $src $P/proef/log_proef.tsv $P/proef/APP_NA_N1-W0${w}_proef.tsv --week $w --review $P/proef/review_proef.tsv --apply --stil > $P/proef/apply_W0${w}.out
  grep -v "^  " $P/proef/apply_W0${w}.out || true
  test -s $P/proef/APP_NA_N1-W0${w}_proef.tsv
done
UITZ="--uitzondering=U3-luisteren-08"   # gedepubliceerd (P1-11 a, B12): 0 opties en geen Feedback ✗ tellen niet mee
python3 -I $S/check_N1-W03.py $P/proef/APP_NA_N1-W03_proef.tsv $B/ULTIEME_LEESBARE_LIJST.tsv N1 3 $P/proef/check_v1_4_NA_N1-W03.tsv --poort $UITZ > $P/proef/check_v1_4_NA_N1-W03.out
python3 -I $S/check_N1-W03.py $P/proef/APP_NA_N1-W02_proef.tsv $B/ULTIEME_LEESBARE_LIJST.tsv N1 2 $P/proef/check_v1_4_NA_N1-W02.tsv --poort > $P/proef/check_v1_4_NA_N1-W02.out
python3 -I $S/check_N1-W03.py $P/proef/APP_NA_N1-W01_proef.tsv $B/ULTIEME_LEESBARE_LIJST.tsv N1 1 $P/proef/check_v1_4_NA_N1-W01.tsv --poort > $P/proef/check_v1_4_NA_N1-W01.out
for f in $P/proef/check_v1_4_NA_N1-W0*.out; do echo "$(basename $f): $(tail -1 $f)"; done
REPO=${BDI_REPO:-/home/claude/bdi_repo}
python3 -I $S/w03/rendertoets_N1-W03.py $REPO $P/proef/APP_NA_N1-W03_proef.tsv $P/proef/APP_NA_N1-W02_proef.tsv $P/proef/APP_NA_N1-W01_proef.tsv --log $P/N1-W03_wijzigingslog.tsv --breedte 900 > $P/bidi/rendertoets_NA_900.out
python3 -I $S/w03/rendertoets_N1-W03.py $REPO $P/proef/APP_NA_N1-W03_proef.tsv $P/proef/APP_NA_N1-W02_proef.tsv $P/proef/APP_NA_N1-W01_proef.tsv --log $P/N1-W03_wijzigingslog.tsv --breedte 330 --wrap > $P/bidi/rendertoets_NA_gsm330.out
grep "^POORT" $P/bidi/rendertoets_NA_900.out $P/bidi/rendertoets_NA_gsm330.out
md5sum $P/N1-W03_wijzigingslog.tsv $P/review_native_N1-W03.tsv $P/proef/APP_NA_N1-W0*_proef.tsv
echo "KETEN GROEN (variant $L03)"
