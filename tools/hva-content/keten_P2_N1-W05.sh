#!/bin/bash
# keten_P2_N1-W05.sh v1.0 — 4T/3T · bouwt de P2-stand van N1-W05 opnieuw op uit de bronnen (deterministisch; tweede run bit-gelijk).
# revisie D → check v1.5 (VOOR, = revisie T) → maak_log → proef-apply (alles goedgekeurd, review alles ja; W05, W04, W03, W02 apart) →
# check v1.5 --poort op NA → rendertoets 900/330 (APP en PLAT, --log). set -euo pipefail: elke STOP breekt de keten af.
# Gebruik: bash keten_P2_N1-W05.sh   (BDI_REPO = checkout van main @ e7317258)
set -euo pipefail
cd "$(dirname "$0")/.."
S=scripts; B=bron; P=p2
md5sum -c --quiet - <<'MD5'
83815abcecdc31e3fc188a1f8b4cb142  bron/APP_EXPORT_N1-W05_2026-10-26.tsv
d9d0aef3d24b499adbb9310c15fffdfd  bron/APP_EXPORT_N1-W04_2026-10-24_naP4.tsv
6d7530b04b96d0be1e4d49bf5dade865  bron/APP_EXPORT_N1-W03_2026-10-24_naP4.tsv
112a6b40dba40178bc445cb3fe8896b2  bron/APP_EXPORT_N1-W02_2026-10-24_naP4.tsv
0100d326155c0f443af0a437e8d202c2  bron/ULTIEME_LEESBARE_LIJST.tsv
MD5
echo "bronnen: md5 ✓"
mkdir -p $P/proef $P/bidi
rm -f $P/N1-W05_revisie_D.tsv $P/N1-W05_revisie_T.tsv $P/check_v1_5_VOOR_N1-W05.out $P/N1-W05_wijzigingslog.tsv $P/review_native_N1-W05.tsv \
      $P/proef/log_proef.tsv $P/proef/review_proef.tsv $P/proef/APP_NA_N1-W0?_proef.tsv $P/proef/check_v1_5_NA_N1-W0?.tsv $P/proef/check_v1_5_NA_N1-W0?.out \
      $P/bidi/rendertoets_NA_900.out $P/bidi/rendertoets_NA_gsm330.out
E5=$B/APP_EXPORT_N1-W05_2026-10-26.tsv; E4=$B/APP_EXPORT_N1-W04_2026-10-24_naP4.tsv; E3=$B/APP_EXPORT_N1-W03_2026-10-24_naP4.tsv; E2=$B/APP_EXPORT_N1-W02_2026-10-24_naP4.tsv
python3 -I $S/maak_revisie_D_N1-W05.py $E5 $E4 $E3 $E2 $P/N1-W05_revisie_D.tsv
python3 -I $S/check_N1-W05.py $E5 $B/ULTIEME_LEESBARE_LIJST.tsv N1 5 $P/N1-W05_revisie_T.tsv > $P/check_v1_5_VOOR_N1-W05.out
tail -1 $P/check_v1_5_VOOR_N1-W05.out
python3 -I $S/maak_log_N1-W05.py $E5 $E4 $E3 $E2 $P/N1-W05_revisie_D.tsv $P/N1-W05_revisie_T.tsv $P/N1-W05_wijzigingslog.tsv $P/review_native_N1-W05.tsv
python3 -I $S/maak_proef_N1-W05.py $P/N1-W05_wijzigingslog.tsv $P/review_native_N1-W05.tsv $P/proef/log_proef.tsv $P/proef/review_proef.tsv
for w in 5 4 3 2; do
  eval src=\$E$w
  python3 -I $S/apply_log.py $src $P/proef/log_proef.tsv $P/proef/APP_NA_N1-W0${w}_proef.tsv --week $w --review $P/proef/review_proef.tsv --apply --stil > $P/proef/apply_W0${w}.out
  grep -v "^  " $P/proef/apply_W0${w}.out || true
  test -s $P/proef/APP_NA_N1-W0${w}_proef.tsv
done
python3 -I $S/check_N1-W05.py $P/proef/APP_NA_N1-W05_proef.tsv $B/ULTIEME_LEESBARE_LIJST.tsv N1 5 $P/proef/check_v1_5_NA_N1-W05.tsv --poort > $P/proef/check_v1_5_NA_N1-W05.out
python3 -I $S/check_N1-W05.py $P/proef/APP_NA_N1-W04_proef.tsv $B/ULTIEME_LEESBARE_LIJST.tsv N1 4 $P/proef/check_v1_5_NA_N1-W04.tsv --poort --uitzondering=U4-luisteren-06,U4-lezen-11 > $P/proef/check_v1_5_NA_N1-W04.out
python3 -I $S/check_N1-W05.py $P/proef/APP_NA_N1-W03_proef.tsv $B/ULTIEME_LEESBARE_LIJST.tsv N1 3 $P/proef/check_v1_5_NA_N1-W03.tsv --poort --uitzondering=U3-luisteren-08 > $P/proef/check_v1_5_NA_N1-W03.out
python3 -I $S/check_N1-W05.py $P/proef/APP_NA_N1-W02_proef.tsv $B/ULTIEME_LEESBARE_LIJST.tsv N1 2 $P/proef/check_v1_5_NA_N1-W02.tsv --poort > $P/proef/check_v1_5_NA_N1-W02.out
for f in $P/proef/check_v1_5_NA_N1-W0*.out; do echo "$(basename $f): $(tail -1 $f)"; done
REPO=${BDI_REPO:-/home/claude/repo_ag}
python3 -I $S/rendertoets_N1-W05.py $REPO $P/proef/APP_NA_N1-W05_proef.tsv $P/proef/APP_NA_N1-W04_proef.tsv $P/proef/APP_NA_N1-W03_proef.tsv $P/proef/APP_NA_N1-W02_proef.tsv --log $P/N1-W05_wijzigingslog.tsv --breedte 900 > $P/bidi/rendertoets_NA_900.out
python3 -I $S/rendertoets_N1-W05.py $REPO $P/proef/APP_NA_N1-W05_proef.tsv $P/proef/APP_NA_N1-W04_proef.tsv $P/proef/APP_NA_N1-W03_proef.tsv $P/proef/APP_NA_N1-W02_proef.tsv --log $P/N1-W05_wijzigingslog.tsv --breedte 330 --wrap > $P/bidi/rendertoets_NA_gsm330.out
grep "^POORT" $P/bidi/rendertoets_NA_900.out $P/bidi/rendertoets_NA_gsm330.out
md5sum $P/N1-W05_wijzigingslog.tsv $P/review_native_N1-W05.tsv $P/proef/APP_NA_N1-W0*_proef.tsv
echo "KETEN GROEN"
