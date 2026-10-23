#!/bin/bash
# keten_P3_N1-W03.sh v1.1 — 7D/7T/8T · bouwt de P3-stand van N1-W03 opnieuw op uit het goedgekeurde log (na_p2/) en de back-ups;
# deterministisch (tweede run bit-gelijk); schrijft niets in de app. set -euo pipefail: elke STOP breekt de keten af.
# lijsten (app_naar_master v1.1) → telrapport + diff (rapport_7D) → JSON + structuurtoets → check v1.4 --poort → rendertoets 900/330
# → maak_sql v4.4.1 (3 weken, 7 blokken) → BLOKKEN_MANIFEST → VERWACHT_PER_STAP + slottellingen (v1.4, --rijen) → replica v3.1.
# v1.1 (8T C-T07, C-T09): ook check/ en bidi/ komen uit deze keten (eerst gewist); --rijen 2299 voor de slotverwachting.
set -euo pipefail
cd "$(dirname "$0")/../.."
S=scripts; B=bron; P=p3; N=na_p2
E="meerkeuze|meerdere-antwoorden|open-tekst|gatentekst|bestand-upload|audio-opname|rangschikken|koppelen"   # live enum 2026-10-23 (deel2/)
md5sum -c --quiet - <<'MD5'
76802ca5b47980e0f274cbd2134e76c4  bron/APP_BACKUP_N1-W03_2026-10-20.tsv
25890cb8ae534ed0ecea3506a0ccf0c5  bron/APP_BACKUP_N1-W02_2026-10-20_W03nazorg.tsv
6b07e8c1cead1625b2dec76f298b8d6d  bron/APP_BACKUP_N1-W01_2026-10-20_W03nazorg.tsv
0100d326155c0f443af0a437e8d202c2  bron/ULTIEME_LEESBARE_LIJST.tsv
7821975611da65119fe61f7d8b00d4c7  na_p2/N1-W03_wijzigingslog_P2.tsv
2f1c8564e85f0283851016f8daa26eb7  na_p2/review_native_N1-W03_P2.tsv
7e88964b400f9916227a317deee2c1bf  na_p2/APP_NA_N1-W03_P2.tsv
7f5c668f30d0fd3e91afbcadeb08a3cd  na_p2/APP_NA_N1-W02_P2.tsv
3b78fefff6ac81cc641c1de11aafbb3e  na_p2/APP_NA_N1-W01_P2.tsv
691e35d63073eab28094d91e33395db4  p3/replica_schema/schema_replica_v2.sql
MD5
echo "invoer: md5 ✓"
rm -rf $P/sql $P/json $P/check $P/bidi $P/APP_NA_N1-W0?.tsv $P/LEESBARE_LIJST_N1-W0?_v?.tsv $P/LIJST_N1-W0?_VOOR_uit_app.tsv $P/N1-W03_telrapport.md $P/N1-W03_diff_leesbaar.md $P/replica/REPLICA_RAPPORT_N1-W03.md
mkdir -p $P/json $P/check $P/bidi
for w in 3 2 1; do cp $N/APP_NA_N1-W0${w}_P2.tsv $P/APP_NA_N1-W0${w}.tsv; done
python3 -I $S/app_naar_master.py $B/APP_BACKUP_N1-W03_2026-10-20.tsv $P/LIJST_N1-W03_VOOR_uit_app.tsv N1 > /dev/null
python3 -I $S/app_naar_master.py $B/APP_BACKUP_N1-W02_2026-10-20_W03nazorg.tsv $P/LIJST_N1-W02_VOOR_uit_app.tsv N1 > /dev/null
python3 -I $S/app_naar_master.py $B/APP_BACKUP_N1-W01_2026-10-20_W03nazorg.tsv $P/LIJST_N1-W01_VOOR_uit_app.tsv N1 > /dev/null
python3 -I $S/app_naar_master.py $P/APP_NA_N1-W03.tsv $P/LEESBARE_LIJST_N1-W03_v1.tsv N1 | tail -1
python3 -I $S/app_naar_master.py $P/APP_NA_N1-W02.tsv $P/LEESBARE_LIJST_N1-W02_v3.tsv N1 | tail -1
python3 -I $S/app_naar_master.py $P/APP_NA_N1-W01.tsv $P/LEESBARE_LIJST_N1-W01_v4.tsv N1 | tail -1
python3 -I $S/w03/rapport_7D_N1-W03.py $P $N/N1-W03_wijzigingslog_P2.tsv "2026-10-23"
python3 -I $S/maak_json_N1-W02.py $P/APP_NA_N1-W03.tsv $N/N1-W03_wijzigingslog_P2.tsv $P/LEESBARE_LIJST_N1-W03_v1.tsv N1 3 $P/json/N1-W03.json "2026-10-23T19:30:00+02:00"
python3 -I $S/valideer_structuur_N1-W02.py $P/json/N1-W03.json $P/APP_NA_N1-W03.tsv $P/LEESBARE_LIJST_N1-W03_v1.tsv $P/schema_metadata_2026-10-23.json | grep -E "^items"
python3 -I $S/check_N1-W03.py $P/APP_NA_N1-W03.tsv $B/ULTIEME_LEESBARE_LIJST.tsv N1 3 $P/check/check_v1_4_NA_N1-W03.tsv --poort --uitzondering=U3-luisteren-08 > $P/check/check_v1_4_NA_N1-W03.out
python3 -I $S/check_N1-W03.py $P/APP_NA_N1-W02.tsv $B/ULTIEME_LEESBARE_LIJST.tsv N1 2 $P/check/check_v1_4_NA_N1-W02.tsv --poort > $P/check/check_v1_4_NA_N1-W02.out
python3 -I $S/check_N1-W03.py $P/APP_NA_N1-W01.tsv $B/ULTIEME_LEESBARE_LIJST.tsv N1 1 $P/check/check_v1_4_NA_N1-W01.tsv --poort > $P/check/check_v1_4_NA_N1-W01.out
for f in $P/check/check_v1_4_NA_N1-W0*.out; do echo "$(basename $f): $(tail -1 $f)"; done
REPO=${BDI_REPO:-/home/claude/bdi_repo}
python3 -I $S/w03/rendertoets_N1-W03.py $REPO $P/APP_NA_N1-W03.tsv $P/APP_NA_N1-W02.tsv $P/APP_NA_N1-W01.tsv --log $N/N1-W03_wijzigingslog_P2.tsv --breedte 900 > $P/bidi/rendertoets_P3_900.out
python3 -I $S/w03/rendertoets_N1-W03.py $REPO $P/APP_NA_N1-W03.tsv $P/APP_NA_N1-W02.tsv $P/APP_NA_N1-W01.tsv --log $N/N1-W03_wijzigingslog_P2.tsv --breedte 330 --wrap > $P/bidi/rendertoets_P3_gsm330.out
grep -h "^POORT" $P/bidi/rendertoets_P3_900.out $P/bidi/rendertoets_P3_gsm330.out
python3 -I $S/w03/maak_sql_N1-W03.py $B/APP_BACKUP_N1-W03_2026-10-20.tsv $P/APP_NA_N1-W03.tsv $P/sql/N1-W03 --week 3 --enum-live "$E" \
  --blokken "L1=luisteren-01,luisteren-02;L2=luisteren-03,luisteren-04,luisteren-05;L3=luisteren-06,luisteren-07,luisteren-08;R1=lezen;R2=spreken,schrijven,grammatica,reflectie" > /dev/null
python3 -I $S/w03/maak_sql_N1-W03.py $B/APP_BACKUP_N1-W02_2026-10-20_W03nazorg.tsv $P/APP_NA_N1-W02.tsv $P/sql/N1-W02 --week 2 --start 6 --blokken "W02n=*" --enum-live "$E" > /dev/null
python3 -I $S/w03/maak_sql_N1-W03.py $B/APP_BACKUP_N1-W01_2026-10-20_W03nazorg.tsv $P/APP_NA_N1-W01.tsv $P/sql/N1-W01 --week 1 --start 7 --blokken "W01n=*" --enum-live "$E" > /dev/null
python3 -I $S/w03/maak_manifest_N1-W03.py $P/sql N1-W03 N1-W02 N1-W01 | tail -1
python3 -I $S/w03/maak_verwacht_per_stap_N1-W03.py $P/sql $P/APP_NA_N1-W03.tsv $P/APP_NA_N1-W02.tsv $P/APP_NA_N1-W01.tsv $B/APP_BACKUP_N1-W03_2026-10-20.tsv $B/APP_BACKUP_N1-W02_2026-10-20_W03nazorg.tsv $B/APP_BACKUP_N1-W01_2026-10-20_W03nazorg.tsv --rijen 2299 | head -3
chown -R claude $P 2>/dev/null || true
python3 -I $S/w03/replica_test_N1-W03.py .
md5sum $P/LEESBARE_LIJST_N1-W0?_v?.tsv $P/N1-W03_telrapport.md $P/N1-W03_diff_leesbaar.md $P/json/N1-W03.json $P/sql/N1-W0?/SQL_MANIFEST.tsv $P/sql/BLOKKEN_MANIFEST.tsv $P/sql/VERWACHT_PER_STAP.md
echo "KETEN P3 GROEN"
