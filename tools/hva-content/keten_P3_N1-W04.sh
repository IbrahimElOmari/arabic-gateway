#!/bin/bash
# keten_P3_N1-W04.sh v1.3 (v1.3: werkmap via WM, testleerder via TESTLEERDER=<uuid> → maak_sql v4.5 --testleerder; zonder TESTLEERDER byte-gelijk aan v1.2; v1.1: 9T V3 proefgrendel; v1.2: definitieve P3-stand uit na_p3/ = P2-log + 8D-delta W0650–W0686 na «P3 akkoord · 1a», 04:05) — 7D/7T/8T · bouwt de P3-stand van N1-W04 opnieuw op uit het goedgekeurde log (na_p2/) en de back-ups van P3;
# deterministisch (tweede run bit-gelijk); schrijft niets in de app. set -euo pipefail: elke STOP breekt de keten af.
# apply (4 weken) → lijsten (app_naar_master v1.1) → telrapport + diff (rapport_7D) → JSON + structuurtoets → check v1.5 --poort → rendertoets 900/330
# → maak_sql v4.4.1 (4 weken, 9 blokken) → BLOKKEN_MANIFEST → VERWACHT_PER_STAP + slottellingen + leerderszicht (met de live JSON van P3) → replica v4.0.
# Gebruik: bash keten_P3_N1-W04.sh   (BDI_REPO = checkout van main @ e7317258, standaard /home/claude/repo)
set -euo pipefail
cd "${WM:-$(dirname "$0")/..}"
S=scripts; B=bron; P=p3; N=na_p3
TL=""; if [ -n "${TESTLEERDER:-}" ]; then TL="--testleerder $TESTLEERDER"; echo "testleerder: $TESTLEERDER (maak_sql v4.5)"; fi
E="meerkeuze|meerdere-antwoorden|open-tekst|gatentekst|bestand-upload|audio-opname|rangschikken|koppelen"   # live enum 2026-10-24 (read-only)
md5sum -c --quiet - <<'MD5'
44a3c0a0cc143e07f384f948d45fe762  bron/APP_BACKUP_N1-W04_2026-10-24_P3.tsv
13e64473acfcb75f16cbaf0b6feb3c42  bron/APP_BACKUP_N1-W03_2026-10-24_P3.tsv
132cb2556e539a2175a410d3e16beb8e  bron/APP_BACKUP_N1-W02_2026-10-24_P3.tsv
1ed9e5b3ca722612792ace6d62ba720d  bron/APP_BACKUP_N1-W01_2026-10-24_P3.tsv
0100d326155c0f443af0a437e8d202c2  bron/ULTIEME_LEESBARE_LIJST.tsv
80a5afcc984f73c926f9c0748672b207  bron/APP_EXPORT_N1_2026-10-24_W04stap0b.tsv
0209211b483633603e2c9f402fc0ed12  na_p3/N1-W04_wijzigingslog_P3.tsv
ccf5f650d2550d088535ecf853c35ed1  na_p3/review_native_N1-W04_P3.tsv
MD5
echo "invoer: md5 ✓"
if grep -qP "\tgoedgekeurd\t[^\t]*[Pp]roef" $N/N1-W04_wijzigingslog_P3.tsv; then echo "STOP: proefregel(s) met status goedgekeurd in het log (9T V3)"; exit 3; fi
rm -rf $P/sql $P/json $P/check $P/bidi $P/APP_NA_N1-W0?.tsv $P/LEESBARE_LIJST_N1-W0?_v?.tsv $P/LIJST_N1-W0?_VOOR_uit_app.tsv $P/N1-W04_telrapport.md $P/N1-W04_diff_leesbaar.md $P/replica/REPLICA_RAPPORT_N1-W04.md
mkdir -p $P/json $P/check $P/bidi $P/sql
for w in 4 3 2 1; do python3 -I $S/apply_log.py $B/APP_BACKUP_N1-W0${w}_2026-10-24_P3.tsv $N/N1-W04_wijzigingslog_P3.tsv $P/APP_NA_N1-W0${w}.tsv --week $w --review $N/review_native_N1-W04_P3.tsv --apply --stil | head -1; done
for w in 4 3 2 1; do python3 -I $S/app_naar_master.py $B/APP_BACKUP_N1-W0${w}_2026-10-24_P3.tsv $P/LIJST_N1-W0${w}_VOOR_uit_app.tsv N1 > /dev/null; done
python3 -I $S/app_naar_master.py $P/APP_NA_N1-W04.tsv $P/LEESBARE_LIJST_N1-W04_v1.tsv N1 | tail -1
python3 -I $S/app_naar_master.py $P/APP_NA_N1-W03.tsv $P/LEESBARE_LIJST_N1-W03_v2.tsv N1 | tail -1
python3 -I $S/app_naar_master.py $P/APP_NA_N1-W02.tsv $P/LEESBARE_LIJST_N1-W02_v4.tsv N1 | tail -1
python3 -I $S/app_naar_master.py $P/APP_NA_N1-W01.tsv $P/LEESBARE_LIJST_N1-W01_v5.tsv N1 | tail -1
python3 -I $S/rapport_7D_N1-W04.py $P $N/N1-W04_wijzigingslog_P3.tsv "2026-10-24" | tail -1
python3 -I $S/maak_json_N1-W02.py $P/APP_NA_N1-W04.tsv $N/N1-W04_wijzigingslog_P3.tsv $P/LEESBARE_LIJST_N1-W04_v1.tsv N1 4 $P/json/N1-W04.json "2026-10-24T03:30:00+02:00" | tail -1
python3 -I $S/valideer_structuur_N1-W02.py $P/json/N1-W04.json $P/APP_NA_N1-W04.tsv $P/LEESBARE_LIJST_N1-W04_v1.tsv $P/schema_metadata_2026-10-23.json | grep -E "^items"
python3 -I $S/check_N1-W04.py $P/APP_NA_N1-W04.tsv $B/ULTIEME_LEESBARE_LIJST.tsv N1 4 $P/check/check_v1_5_NA_N1-W04.tsv --poort --uitzondering=U4-luisteren-06,U4-lezen-11 > $P/check/check_v1_5_NA_N1-W04.out
python3 -I $S/check_N1-W04.py $P/APP_NA_N1-W03.tsv $B/ULTIEME_LEESBARE_LIJST.tsv N1 3 $P/check/check_v1_5_NA_N1-W03.tsv --poort --uitzondering=U3-luisteren-08 > $P/check/check_v1_5_NA_N1-W03.out
python3 -I $S/check_N1-W04.py $P/APP_NA_N1-W02.tsv $B/ULTIEME_LEESBARE_LIJST.tsv N1 2 $P/check/check_v1_5_NA_N1-W02.tsv --poort > $P/check/check_v1_5_NA_N1-W02.out
python3 -I $S/check_N1-W04.py $P/APP_NA_N1-W01.tsv $B/ULTIEME_LEESBARE_LIJST.tsv N1 1 $P/check/check_v1_5_NA_N1-W01.tsv --poort > $P/check/check_v1_5_NA_N1-W01.out
for f in $P/check/check_v1_5_NA_N1-W0*.out; do echo "$(basename $f): $(tail -1 $f)"; done
REPO=${BDI_REPO:-/home/claude/repo}
python3 -I $S/rendertoets_N1-W04.py $REPO $P/APP_NA_N1-W04.tsv $P/APP_NA_N1-W03.tsv $P/APP_NA_N1-W02.tsv $P/APP_NA_N1-W01.tsv --log $N/N1-W04_wijzigingslog_P3.tsv --breedte 900 > $P/bidi/rendertoets_P3_900.out
python3 -I $S/rendertoets_N1-W04.py $REPO $P/APP_NA_N1-W04.tsv $P/APP_NA_N1-W03.tsv $P/APP_NA_N1-W02.tsv $P/APP_NA_N1-W01.tsv --log $N/N1-W04_wijzigingslog_P3.tsv --breedte 330 --wrap > $P/bidi/rendertoets_P3_gsm330.out
grep -h "^POORT" $P/bidi/rendertoets_P3_900.out $P/bidi/rendertoets_P3_gsm330.out
python3 -I $S/maak_sql_N1-W04.py $B/APP_BACKUP_N1-W04_2026-10-24_P3.tsv $P/APP_NA_N1-W04.tsv $P/sql/N1-W04 --week 4 --enum-live "$E" $TL \
  --blokken "L1=luisteren-01,luisteren-02;L2=luisteren-03,luisteren-04;L3=luisteren-05,luisteren-06;R1=lezen-01,lezen-02,lezen-03,lezen-04,lezen-05;R2=lezen-06,lezen-07,lezen-08,lezen-09,lezen-10,lezen-11,spreken,schrijven;G1=grammatica,reflectie" > /dev/null
python3 -I $S/maak_sql_N1-W04.py $B/APP_BACKUP_N1-W03_2026-10-24_P3.tsv $P/APP_NA_N1-W03.tsv $P/sql/N1-W03 --week 3 --start 7 --blokken "W03n=*" --enum-live "$E" $TL > /dev/null
python3 -I $S/maak_sql_N1-W04.py $B/APP_BACKUP_N1-W02_2026-10-24_P3.tsv $P/APP_NA_N1-W02.tsv $P/sql/N1-W02 --week 2 --start 8 --blokken "W02n=*" --enum-live "$E" $TL > /dev/null
python3 -I $S/maak_sql_N1-W04.py $B/APP_BACKUP_N1-W01_2026-10-24_P3.tsv $P/APP_NA_N1-W01.tsv $P/sql/N1-W01 --week 1 --start 9 --blokken "W01n=*" --enum-live "$E" $TL > /dev/null
python3 -I $S/maak_manifest_N1-W04.py $P/sql N1-W04 N1-W03 N1-W02 N1-W01 | tail -1
python3 -I $S/maak_verwacht_per_stap_N1-W04.py $P/sql $P/APP_NA_N1-W04.tsv $P/APP_NA_N1-W03.tsv $P/APP_NA_N1-W02.tsv $P/APP_NA_N1-W01.tsv $B/APP_BACKUP_N1-W04_2026-10-24_P3.tsv $B/APP_BACKUP_N1-W03_2026-10-24_P3.tsv $B/APP_BACKUP_N1-W02_2026-10-24_P3.tsv $B/APP_BACKUP_N1-W01_2026-10-24_P3.tsv --rijen 2299 --zicht $P/live/leerderszicht_live_2026-10-24_P3.json --ref-p3 $P/live/slot_ref_live_2026-10-24_P3.json | head -4
chown -R claude $P 2>/dev/null || true
python3 -I $S/replica_test_N1-W04.py . | head -1
md5sum $P/LEESBARE_LIJST_N1-W0?_v?.tsv $P/N1-W04_telrapport.md $P/N1-W04_diff_leesbaar.md $P/json/N1-W04.json $P/sql/N1-W0?/SQL_MANIFEST.tsv $P/sql/BLOKKEN_MANIFEST.tsv $P/sql/VERWACHT_PER_STAP.md $P/sql/slot_tellingen_N1-W04.sql $P/sql/leerderszicht_N1-W04.sql $P/sql/slot_verwacht_N1-W04.json
echo "KETEN P3 GROEN"
