#!/bin/bash
# keten_P3_N1-W05.sh v1.1 (2026-10-27: log 745 + review 370 na «P3 akkoord volledig ja»; check v1.6) · v1.0 (= keten_P3_N1-W04.sh v1.3 voor W05 + nazorg W04/W03/W02; LIVE=1 → met de live JSON van P3 (zicht, slot_ref) en de replica) — 7D/7T/8T ·
# bouwt de P3-stand van N1-W05 opnieuw op uit het goedgekeurde log (na_p3/) en de back-ups van P3; deterministisch (tweede run bit-gelijk); schrijft niets in de app.
# apply (4 weken) → lijsten (app_naar_master v1.1) → telrapport + diff (rapport_7D) → JSON + structuurtoets → check v1.6 --poort → rendertoets 900/330
# → maak_sql v4.5 (4 weken, 13 blokken: 6 week + 3 + 2 + 2 nazorg, gesplitst op grootte (B17)) → BLOKKEN_MANIFEST → VERWACHT_PER_STAP + slottellingen + leerderszicht → [LIVE=1] replica v4.0.
# Gebruik: bash keten_P3_N1-W05.sh   (WM = werkmap, TESTLEERDER=<uuid>, BDI_REPO = checkout van main @ e7317258, LIVE=1 na de live leesacties)
set -euo pipefail
cd "${WM:-$(dirname "$0")/..}"
S=scripts; B=bron; P=p3; N=na_p3
TL=""; if [ -n "${TESTLEERDER:-}" ]; then TL="--testleerder $TESTLEERDER"; echo "testleerder: $TESTLEERDER (maak_sql v4.5)"; fi
E="meerkeuze|meerdere-antwoorden|open-tekst|gatentekst|bestand-upload|audio-opname|rangschikken|koppelen"   # live enum 2026-10-26 (read-only)
md5sum -c --quiet - <<'MD5'
83815abcecdc31e3fc188a1f8b4cb142  bron/APP_BACKUP_N1-W05_2026-10-26.tsv
d9d0aef3d24b499adbb9310c15fffdfd  bron/APP_BACKUP_N1-W04_2026-10-26_P3.tsv
6d7530b04b96d0be1e4d49bf5dade865  bron/APP_BACKUP_N1-W03_2026-10-26_P3.tsv
112a6b40dba40178bc445cb3fe8896b2  bron/APP_BACKUP_N1-W02_2026-10-26_P3.tsv
0100d326155c0f443af0a437e8d202c2  bron/ULTIEME_LEESBARE_LIJST.tsv
a17f45f777fde6137a92feb346934413  bron/APP_EXPORT_N1_2026-10-26_W05stap0b.tsv
f0ead0f719a49b496573c883f4716434  na_p3/N1-W05_wijzigingslog_P3.tsv
b117d8414bbdede1e11da243491eee51  na_p3/review_native_N1-W05_P3.tsv
MD5
echo "invoer: md5 ✓"
if grep -qP "\tgoedgekeurd\t[^\t]*[Pp]roef" $N/N1-W05_wijzigingslog_P3.tsv; then echo "STOP: proefregel(s) met status goedgekeurd in het log (9T V3)"; exit 3; fi
rm -rf $P/sql $P/json $P/check $P/bidi $P/APP_NA_N1-W0?.tsv $P/LEESBARE_LIJST_N1-W0?_v?.tsv $P/LIJST_N1-W0?_VOOR_uit_app.tsv $P/N1-W05_telrapport.md $P/N1-W05_diff_leesbaar.md $P/replica/REPLICA_RAPPORT_N1-W05.md
mkdir -p $P/json $P/check $P/bidi $P/sql
V5=$B/APP_BACKUP_N1-W05_2026-10-26.tsv; V4=$B/APP_BACKUP_N1-W04_2026-10-26_P3.tsv; V3=$B/APP_BACKUP_N1-W03_2026-10-26_P3.tsv; V2=$B/APP_BACKUP_N1-W02_2026-10-26_P3.tsv
for w in 5 4 3 2; do eval src=\$V$w; python3 -I $S/apply_log.py $src $N/N1-W05_wijzigingslog_P3.tsv $P/APP_NA_N1-W0${w}.tsv --week $w --review $N/review_native_N1-W05_P3.tsv --apply --stil | head -1; done
for w in 5 4 3 2; do eval src=\$V$w; python3 -I $S/app_naar_master.py $src $P/LIJST_N1-W0${w}_VOOR_uit_app.tsv N1 > /dev/null; done
python3 -I $S/app_naar_master.py $P/APP_NA_N1-W05.tsv $P/LEESBARE_LIJST_N1-W05_v1.tsv N1 | tail -1
python3 -I $S/app_naar_master.py $P/APP_NA_N1-W04.tsv $P/LEESBARE_LIJST_N1-W04_v2.tsv N1 | tail -1
python3 -I $S/app_naar_master.py $P/APP_NA_N1-W03.tsv $P/LEESBARE_LIJST_N1-W03_v3.tsv N1 | tail -1
python3 -I $S/app_naar_master.py $P/APP_NA_N1-W02.tsv $P/LEESBARE_LIJST_N1-W02_v5.tsv N1 | tail -1
python3 -I $S/rapport_7D_N1-W05.py $P $N/N1-W05_wijzigingslog_P3.tsv "2026-10-26" | tail -1
python3 -I $S/maak_json_N1-W02.py $P/APP_NA_N1-W05.tsv $N/N1-W05_wijzigingslog_P3.tsv $P/LEESBARE_LIJST_N1-W05_v1.tsv N1 5 $P/json/N1-W05.json "2026-10-26T22:00:00+01:00" | tail -1
python3 -I $S/valideer_structuur_N1-W02.py $P/json/N1-W05.json $P/APP_NA_N1-W05.tsv $P/LEESBARE_LIJST_N1-W05_v1.tsv $P/schema_metadata_2026-10-23.json | grep -E "^items"
python3 -I $S/check_N1-W05.py $P/APP_NA_N1-W05.tsv $B/ULTIEME_LEESBARE_LIJST.tsv N1 5 $P/check/check_v1_6_NA_N1-W05.tsv --poort > $P/check/check_v1_6_NA_N1-W05.out
python3 -I $S/check_N1-W05.py $P/APP_NA_N1-W04.tsv $B/ULTIEME_LEESBARE_LIJST.tsv N1 4 $P/check/check_v1_6_NA_N1-W04.tsv --poort --uitzondering=U4-luisteren-06,U4-lezen-11 > $P/check/check_v1_6_NA_N1-W04.out
python3 -I $S/check_N1-W05.py $P/APP_NA_N1-W03.tsv $B/ULTIEME_LEESBARE_LIJST.tsv N1 3 $P/check/check_v1_6_NA_N1-W03.tsv --poort --uitzondering=U3-luisteren-08 > $P/check/check_v1_6_NA_N1-W03.out
python3 -I $S/check_N1-W05.py $P/APP_NA_N1-W02.tsv $B/ULTIEME_LEESBARE_LIJST.tsv N1 2 $P/check/check_v1_6_NA_N1-W02.tsv --poort > $P/check/check_v1_6_NA_N1-W02.out
for f in $P/check/check_v1_6_NA_N1-W0*.out; do echo "$(basename $f): $(tail -1 $f)"; done
REPO=${BDI_REPO:-/home/claude/repo_ag}
python3 -I $S/rendertoets_N1-W05.py $REPO $P/APP_NA_N1-W05.tsv $P/APP_NA_N1-W04.tsv $P/APP_NA_N1-W03.tsv $P/APP_NA_N1-W02.tsv --log $N/N1-W05_wijzigingslog_P3.tsv --breedte 900 > $P/bidi/rendertoets_P3_900.out
python3 -I $S/rendertoets_N1-W05.py $REPO $P/APP_NA_N1-W05.tsv $P/APP_NA_N1-W04.tsv $P/APP_NA_N1-W03.tsv $P/APP_NA_N1-W02.tsv --log $N/N1-W05_wijzigingslog_P3.tsv --breedte 330 --wrap > $P/bidi/rendertoets_P3_gsm330.out
grep -h "^POORT" $P/bidi/rendertoets_P3_900.out $P/bidi/rendertoets_P3_gsm330.out
python3 -I $S/maak_sql_N1-W05.py $V5 $P/APP_NA_N1-W05.tsv $P/sql/N1-W05 --week 5 --enum-live "$E" $TL \
  --blokken "L1=luisteren-01;L2=luisteren-02,luisteren-03;L3=luisteren-04,luisteren-05;R1=lezen;S1=spreken,schrijven;G1=grammatica,reflectie" > /dev/null
python3 -I $S/maak_sql_N1-W05.py $V4 $P/APP_NA_N1-W04.tsv $P/sql/N1-W04 --week 4 --start 7 --blokken "W04a=luisteren-01,luisteren-02,luisteren-03;W04b=luisteren-04,luisteren-05,luisteren-06;W04c=lezen,spreken,schrijven,grammatica,reflectie" --enum-live "$E" $TL > /dev/null
python3 -I $S/maak_sql_N1-W05.py $V3 $P/APP_NA_N1-W03.tsv $P/sql/N1-W03 --week 3 --start 10 --blokken "W03a=luisteren-01,luisteren-02,luisteren-03,luisteren-04,luisteren-05;W03b=luisteren-06,luisteren-07,luisteren-08,lezen,spreken,schrijven,grammatica,reflectie" --enum-live "$E" $TL > /dev/null
python3 -I $S/maak_sql_N1-W05.py $V2 $P/APP_NA_N1-W02.tsv $P/sql/N1-W02 --week 2 --start 12 --blokken "W02a=luisteren-01,luisteren-02,luisteren-03;W02b=luisteren-04,luisteren-05,lezen,spreken,schrijven,grammatica,reflectie" --enum-live "$E" $TL > /dev/null
python3 -I $S/maak_manifest_N1-W05.py $P/sql N1-W05 N1-W04 N1-W03 N1-W02 | tail -1
ZI=""; if [ "${LIVE:-0}" = "1" ]; then ZI="--zicht $P/live/leerderszicht_live_2026-10-26_P3.json --ref-p3 $P/live/slot_ref_live_2026-10-26_P3.json"; fi
python3 -I $S/maak_verwacht_per_stap_N1-W05.py $P/sql $P/APP_NA_N1-W05.tsv $P/APP_NA_N1-W04.tsv $P/APP_NA_N1-W03.tsv $P/APP_NA_N1-W02.tsv $V5 $V4 $V3 $V2 --rijen 2299 $ZI | head -4
if [ "${LIVE:-0}" = "1" ]; then chown -R claude $P 2>/dev/null || true; python3 -I $S/replica_test_N1-W05.py . | head -1; fi
md5sum $P/LEESBARE_LIJST_N1-W0?_v?.tsv $P/N1-W05_telrapport.md $P/N1-W05_diff_leesbaar.md $P/json/N1-W05.json $P/sql/N1-W0?/SQL_MANIFEST.tsv $P/sql/BLOKKEN_MANIFEST.tsv $P/sql/VERWACHT_PER_STAP.md $P/sql/slot_tellingen_N1-W05.sql $P/sql/leerderszicht_N1-W05.sql $P/sql/slot_verwacht_N1-W05.json
echo "KETEN P3 GROEN (LIVE=${LIVE:-0})"
