#!/bin/bash
# keten_P3_N1-W11.sh v1.7 (= keten_P3_N1-W10.sh v1.6, voor W11; na «1a · 2a» en «A1 · B1 · C1 · D1» van Ibra, 2026-11-21) — Maker-T (7T) · P3 N1-W11.
#   Bouwt de P3-stand van N1-W11 opnieuw op uit de bronnen; deterministisch (tweede run bit-gelijk); schrijft niets in de app, geen databank (LIVE=0),
#   geen Lovable, geen GitHub. Verschillen met v1.6: twee weken (W11 + de nazorg van W10, B43); één P3-log uit vier logs (maak_P3log v1.0: weeklog 1.064 ·
#   P3-delta 4 · V 182 · nazorg W10 6); PROEF=1 (standaard tot «P3 akkoord») bouwt met de PROEF-kopieën van de P3-delta en V, PROEF=0 eist alles goedgekeurd;
#   check v1.10 ongewijzigd (week: --poort; grammatica op de inhoud-NA = 6 bevindingen, K 0 · H 0 · M 6); rendertoets v1.3 (B48 + --aanvaard van B1/C1/D1);
#   maak_sql v4.11 (13 blokken: 11 inhoud W11 · 12_W10n · 13_V_W11; strictgrendel op G3, grendel zonder score op C1) met vijf negatieve tests; geen C10-blok
#   en geen offline-rollback deze week; de rendertoetsbron is de git-checkout van ibrahimelomari/arabic-gateway op 244de3e (9T T1 W10 opgelost).
# Gebruik: bash scripts/keten_P3_N1-W11.sh   (PROEF=1 standaard; REPLICA=0 slaat de replica over; LIVE=1 na de live leesacties)
set -euo pipefail
cd "${WM:-$(dirname "$0")/..}"
WMP=$(pwd -P)
case "$WMP" in /|/tmp|/var/tmp|/home|/home/claude|/root) echo "STOP: de keten draait in $WMP: geen werkmap → niets gewist (8T C-T11)"; exit 3;; esac
{ test -f scripts/keten_P3_N1-W11.sh && test -d p3 && test ! -L p3 && test -d p2/definitief && test -d bron; } || { echo "STOP: $WMP is geen werkmap van N1-W11 → niets gewist (8T C-T11)"; exit 3; }
BM=$( (ls -d MANIFEST_*_P4bundel.tsv P4_VARIANT_*.md p4/uitvoering/P4_log* 2>/dev/null || true) | head -3 | tr '\n' ' ')
[ -z "$BM" ] || { echo "STOP: $WMP is een uitgepakte P4-bundel of heeft een P4-log ($BM) → niets gewist (9T DA-T-10)"; exit 3; }
S=scripts; B=bron; P=p3; D=p2/definitief; HW=11; NZ=10; PROEF=${PROEF:-1}
TL="b483998f-c96f-4185-9485-ec4f7bb24da7"   # P1-16a: het studentaccount van Ibra = testleerder
E="meerkeuze|meerdere-antwoorden|open-tekst|gatentekst|bestand-upload|audio-opname|rangschikken|koppelen"   # live enum (stap 0 P3, READ ONLY)
BUCKET="application/pdf,audio/mp4,audio/mpeg,audio/wav,audio/webm,image/heic,image/heif,image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"   # live sinds C10 (B31)
V11=$B/APP_BACKUP_N1-W11_2026-11-21.tsv; V10=$B/APP_BACKUP_N1-W10_2026-11-21.tsv
EN=$B/APP_EXPORT_N1_2026-11-21.tsv   # 8T-bron: de N1-export van stap 0 P3 = de driftbron
MASTER=$B/LEESBARE_LIJST_MASTER_appwaar_2026-11-21.tsv; LIJST=$B/ULTIEME_LEESBARE_LIJST_N1N2.tsv
chk() { echo "$1  $2" | md5sum -c --quiet - || { echo "STOP: md5 van $2 ≠ $1"; exit 3; }; }
chk 0de80bc22cc89f083995dcbde94d9262 $V11; chk 074c19307e054711d507215bf15c63e6 $V10
chk 4d2cffa52d76b257a5e32d27f089c455 $EN; chk 7df0d60ed4415e61b0c38721a0bab84f $MASTER; chk 0100d326155c0f443af0a437e8d202c2 $LIJST
chk 009b9cd219cb90a45679d4126d377aa9 $B/LEESBARE_LIJST_MASTER_naP4_N1-W10.tsv
chk 6fdac8e6418dbcd17fd02650e42e7afb $D/N1-W11_wijzigingslog.tsv; chk fb8464942f530464ebad51da2fc45fc4 $D/review_native_N1-W11.tsv
chk 9f4e908a1a5b6544b9b643ddcb66ef5f $D/bronlogs/N1-W10_nazorg_wijzigingslog_na_P2.tsv; chk 75e9507ec43497a9b71dd7769c93bf50 $D/bronlogs/review_native_N1-W10_nazorg_na_P2.tsv
chk 37f8b813acaaa4251f1b083ea63c013e $D/APP_NA_N1-W11_inhoud.tsv; chk 190bc0255d0baf1b654b8b0402bb34ca $D/APP_NA_N1-W10.tsv
chk 8d669b1e0de30141bd2e6786616376b4 p2/P2_poortrapport_N1-W11-groep3.md
chk 735aaca34ae9f4919dd1a14f5560dc14 $P/replica_schema/schema_replica_v3.sql; chk 84aa156c7873d8eaba7042af8f8118c5 $S/replica_policies_N1-W11.sql
chk bceceaf31fb34ad7f887bec7e4b23318 $P/schema_metadata_2026-10-27.json
REPO=${BDI_REPO:-$WMP/checkout_git}
chk e9fc90647c97caf0f0d62c4ce6172e8e $REPO/src/pages/CurriculumItemPage.tsx   # rendertoetsbron = git show 244de3e:src/pages/CurriculumItemPage.tsx
chk 2c6b87044bc15487d0ca7761f555050f $P/bidi/AANVAARD_rendertoets_N1-W11.tsv   # B1 · C1 · D1 (Ibra, 2026-11-21 04:20): 92 exacte treffers
if [ "$PROEF" = "1" ]; then
  chk 1442ac442db4ab9aca42e25f9cb67fb3 $P/delta/proef/N1-W11_P3delta_wijzigingslog_PROEF.tsv; chk 3f274e76e9d2d665176595859c06c6bf $P/delta/proef/review_native_N1-W11_P3delta_PROEF.tsv
  chk 3f66ccedaff13caee057446ca08fa2ad $P/delta/proef/N1-W11_V_wijzigingslog_PROEF.tsv
  LOG=$P/proef/N1-W11_wijzigingslog_P3_PROEF.tsv; REV=$P/proef/review_native_N1-W11_P3_PROEF.tsv; MODUS="PROEF (vóór «P3 akkoord»)"
else
  LOG=$P/N1-W11_wijzigingslog_P3.tsv; REV=$P/review_native_N1-W11_P3.tsv; MODUS="definitief (na «P3 akkoord»)"
fi
echo "invoer: md5 ✓ · modus $MODUS"
python3 -I $S/maak_P3log_N1-W11.py . $LOG $REV $([ "$PROEF" = "1" ] && echo --proef)
NA11=e1f09a278542de316b849c19fe8b981a; NA10=190bc0255d0baf1b654b8b0402bb34ca; NPUB11=182; NPUB10=65
rm -rf $P/sql $P/json $P/check $P/master $P/APP_NA_N1-W11.tsv $P/APP_NA_N1-W10.tsv $P/LEESBARE_LIJST_N1-W11_v1.tsv $P/LEESBARE_LIJST_N1-W10_v2.tsv \
       $P/LIJST_N1-W11_VOOR_uit_app.tsv $P/LIJST_N1-W10_VOOR_uit_app.tsv $P/N1-W11_telrapport.md $P/N1-W11_diff_leesbaar.md $P/export_N1_naP4.sql $P/export_hash_N1_naP4.sql \
       $P/P4_DRAAIBOEK_N1-W11.md $P/ROOKTEST_N1-W11.md $P/RECEPT_MAKER-T_blok_N1-W11.md $P/replica/REPLICA_RAPPORT_N1-W11.md $P/8T_grep_N1-W11.tsv $P/T15_N1-W11.out $P/negatief_maak_sql.out \
       $P/bidi/rendertoets_P3_v13_900.out $P/bidi/rendertoets_P3_v13_gsm330.out
mkdir -p $P/json $P/check $P/bidi $P/replica
TMP=$P/.tmp_keten; rm -rf $TMP; mkdir -p $TMP; trap 'rm -rf "$TMP"' EXIT
python3 -I $S/apply_log.py $V11 $LOG $P/APP_NA_N1-W11.tsv --week $HW --review $REV --apply --stil --display-order | grep -v "^  " | sed -n "1,2p"
python3 -I $S/apply_log.py $V10 $LOG $P/APP_NA_N1-W10.tsv --week $NZ --review $REV --apply --stil | grep -v "^  " | sed -n "1,2p"
chk $NA11 $P/APP_NA_N1-W11.tsv; chk $NA10 $P/APP_NA_N1-W10.tsv
echo "NA W11 = ${NA11:0:8}… (= inhoud 37f8b813 + P3-delta 1a + V) · NA W10 = ${NA10:0:8}… (= p2/definitief), byte-gelijk"
python3 -I $S/app_naar_master.py $V11 $P/LIJST_N1-W11_VOOR_uit_app.tsv N1 > /dev/null; python3 -I $S/app_naar_master.py $V10 $P/LIJST_N1-W10_VOOR_uit_app.tsv N1 > /dev/null
python3 -I $S/app_naar_master.py $P/APP_NA_N1-W11.tsv $P/LEESBARE_LIJST_N1-W11_v1.tsv N1 | tail -1
python3 -I $S/app_naar_master.py $P/APP_NA_N1-W10.tsv $P/LEESBARE_LIJST_N1-W10_v2.tsv N1 | tail -1
python3 -I $S/rapport_7D_N1-W11.py $P $LOG "2026-11-21" --voor $P | tail -1
python3 -I $S/maak_json_N1-W02.py $P/APP_NA_N1-W11.tsv $LOG $P/LEESBARE_LIJST_N1-W11_v1.tsv N1 $HW $P/json/N1-W11.json "2026-11-21T00:00:00+01:00" | tail -1
python3 -I $S/valideer_structuur_N1-W02.py $P/json/N1-W11.json $P/APP_NA_N1-W11.tsv $P/LEESBARE_LIJST_N1-W11_v1.tsv $P/schema_metadata_2026-10-27.json | grep -E "^items"
python3 -I $S/maak_json_N1-W02.py $P/APP_NA_N1-W10.tsv $LOG $P/LEESBARE_LIJST_N1-W10_v2.tsv N1 $NZ $P/json/N1-W10.json "2026-11-21T00:00:00+01:00" | tail -1
python3 -I $S/valideer_structuur_N1-W02.py $P/json/N1-W10.json $P/APP_NA_N1-W10.tsv $P/LEESBARE_LIJST_N1-W10_v2.tsv $P/schema_metadata_2026-10-27.json | grep -E "^items"
npub() { python3 -I -c "import csv,sys; csv.field_size_limit(10**9); print(sum(r['is_published']=='true' for r in csv.DictReader(open(sys.argv[1],encoding='utf-8',newline=''),delimiter='\t')))" $1; }
test "$(npub $P/APP_NA_N1-W11.tsv)" = "$NPUB11" && test "$(npub $P/APP_NA_N1-W10.tsv)" = "$NPUB10" || { echo "STOP: gepubliceerd in de NA ≠ $NPUB11 (W11) / $NPUB10 (W10)"; exit 2; }
echo "gepubliceerd: W11 $NPUB11/182 · W10 $NPUB10/85 (ongewijzigd)"
# check v1.10 (ongewijzigd, e75a0249…): de week met --poort op de NA; grammatica op de inhoud-NA = de verwachting van de overdracht (6 · K 0 · H 0 · M 6)
chk e75a0249d9ac9d37bfbb977ee7fd22ae $S/check_N1-W11.py
python3 -I $S/check_N1-W11.py $P/APP_NA_N1-W11.tsv $LIJST N1 $HW $P/check/check_v1_10_NA_N1-W11.tsv --poort > $P/check/check_v1_10_NA_N1-W11.out || { tail -1 $P/check/check_v1_10_NA_N1-W11.out; echo "STOP: check --poort op de NA dicht"; exit 2; }
grep -q "^bevindingen: 61 · K 0 · H 0 · M 61 " $P/check/check_v1_10_NA_N1-W11.out || { grep "^bevindingen" $P/check/check_v1_10_NA_N1-W11.out; echo "STOP: check v1.10 op de NA ≠ 61 · K 0 · H 0 · M 61"; exit 2; }
echo "check v1.10 NA (week, --poort): $(grep '^bevindingen' $P/check/check_v1_10_NA_N1-W11.out | sed 's/ · L .*//') · $(tail -1 $P/check/check_v1_10_NA_N1-W11.out)"
python3 -I $S/check_N1-W11.py $D/APP_NA_N1-W11_inhoud.tsv $LIJST N1 $HW $P/check/check_v1_10_inhoud_grammatica.tsv --skill=grammatica --poort > $P/check/check_v1_10_inhoud_grammatica.out
grep -q "^bevindingen: 6 · K 0 · H 0 · M 6 " $P/check/check_v1_10_inhoud_grammatica.out || { echo "STOP: grammatica op de inhoud-NA ≠ 6 · K 0 · H 0 · M 6"; exit 2; }
echo "check v1.10 grammatica (inhoud-NA): 6 · K 0 · H 0 · M 6 ✓ (= verwacht)"
python3 -I $S/check_N1-W11.py $V11 $LIJST N1 $HW $P/check/check_v1_10_VOOR_N1-W11.tsv > $P/check/check_v1_10_VOOR_N1-W11.out
python3 -I $S/check_N1-W11.py $P/APP_NA_N1-W10.tsv $LIJST N1 $NZ $P/check/check_v1_10_NA_N1-W10.tsv > $P/check/check_v1_10_NA_N1-W10.out || true
echo "check v1.10 NA W10 (meting): $(grep '^bevindingen' $P/check/check_v1_10_NA_N1-W10.out | sed 's/ · L .*//')"
# rendertoets v1.3 (B48 + --aanvaard B1/C1/D1) op 900 px en de gsm (330 px)
python3 -I $S/rendertoets_N1-W11.py $REPO $P/APP_NA_N1-W11.tsv $P/APP_NA_N1-W10.tsv --log $LOG --aanvaard $P/bidi/AANVAARD_rendertoets_N1-W11.tsv --breedte 900 > $P/bidi/rendertoets_P3_v13_900.out || { grep "^POORT" $P/bidi/rendertoets_P3_v13_900.out; echo "STOP: rendertoets 900"; exit 2; }
python3 -I $S/rendertoets_N1-W11.py $REPO $P/APP_NA_N1-W11.tsv $P/APP_NA_N1-W10.tsv --log $LOG --aanvaard $P/bidi/AANVAARD_rendertoets_N1-W11.tsv --breedte 330 --wrap > $P/bidi/rendertoets_P3_v13_gsm330.out || { grep "^POORT" $P/bidi/rendertoets_P3_v13_gsm330.out; echo "STOP: rendertoets 330"; exit 2; }
for f in $P/bidi/rendertoets_P3_v13_900.out $P/bidi/rendertoets_P3_v13_gsm330.out; do grep -q "^POORT .*APP-treffers in leerdersvelden 0 · PLAT-treffers in velden die het log wijzigt 0" $f || { echo "STOP: rendertoets $f niet 0/0"; exit 2; }; done
echo "rendertoets v1.3: 900 en 330 → 0/0 · $(grep '^aanvaard' $P/bidi/rendertoets_P3_v13_900.out | cut -c1-120)"
# 8T-grep (harde stap) op elk script van deze week
W11S="$S/maak_P3log_N1-W11.py $S/maak_weeklog_N1-W11.py $S/maak_delta_P3_N1-W11.py $S/maak_sql_N1-W11.py $S/maak_manifest_N1-W11.py $S/maak_verwacht_per_stap_N1-W11.py $S/voorspel_master_N1-W11.py $S/herbouw_master_N1-W11.py $S/export_hash_N1-W11.py $S/rapport_7D_N1-W11.py $S/rendertoets_N1-W11.py $S/maak_bundel_N1-W11.py"
[ "${P4TOOLS:-1}" = "1" ] && W11S="$W11S $S/maak_rooktest_N1-W11.py $S/maak_draaiboek_P4_N1-W11.py $S/p4_tekst_N1-W11.py $S/p4_stap_N1-W11.py $S/p4_log_stap_N1-W11.py $S/p4_status_N1-W11.py $S/replica_test_N1-W11.py $S/replay_draaiboek_N1-W11.py $S/toets_sjabloonresten_N1-W11.py"   # P4TOOLS=0: de P4-gereedschappen zijn nog niet geport (deel 2)
python3 -I $S/grep_8T_N1-W11.py $W11S > $P/8T_grep_N1-W11.tsv || { cat $P/8T_grep_N1-W11.tsv | tail -20; echo "STOP: 8T-grep"; exit 2; }
tail -1 $P/8T_grep_N1-W11.tsv
python3 -I $S/const_week_N1-W11.py $W11S > $TMP/const.out || { cat $TMP/const.out | tail -20; echo "STOP: const_week"; exit 2; }
tail -1 $TMP/const.out
# maak_sql v4.11: W11 in 11 inhoudsblokken + V_W11 (13), de nazorg van W10 in blok 12; met vijf negatieve tests (geen uitmap, geen traceback)
BL="L1=luisteren-01,luisteren-02,luisteren-03;L2=luisteren-04,luisteren-05,luisteren-06;L3=luisteren-07,luisteren-08;L4=luisteren-09,luisteren-1;R1=lezen;S1=spreken;S2=schrijven;G1=grammatica-01,grammatica-02,grammatica-03,grammatica-04,grammatica-05,grammatica-06;G2=grammatica-07,grammatica-08,grammatica-09,grammatica-10,grammatica-11;G3=grammatica-12,grammatica-13,grammatica-14,grammatica-15,grammatica-16;C1=cultuur,reflectie"
SQLA=(--week $HW --enum-live "$E" --blokken "$BL" --display-order-blok "V_W11=13" --testleerder $TL)
: > $P/negatief_maak_sql.out
for NEGV in "--zonder-score-grendel C1=0|--strict-grendel []" "--strict-grendel G3|--zonder-score-grendel []" "--strict-grendel G2 --zonder-score-grendel C1=0|--strict-grendel ['G2']" \
            "--strict-grendel G3 --zonder-score-grendel S1=0|--zonder-score-grendel ['S1']" "--strict-grendel G3 --zonder-score-grendel C1=0 --regressie-v410|gaat niet samen"; do
  SPEC=${NEGV%%|*}; VERW=${NEGV##*|}; rm -rf $TMP/neg $TMP/neg.bouw
  if python3 -I $S/maak_sql_N1-W11.py $V11 $P/APP_NA_N1-W11.tsv $TMP/neg "${SQLA[@]}" $SPEC >> $P/negatief_maak_sql.out 2>&1; then echo "STOP: maak_sql weigert «$SPEC» niet"; exit 2; fi
  grep -qF -- "$VERW" $P/negatief_maak_sql.out && test ! -e $TMP/neg && test ! -e $TMP/neg.bouw || { echo "STOP: negatieve test «$SPEC»: verkeerde melding of uitmap"; exit 2; }
done
sed -i "s#$TMP#<tmp>#g; s#$WMP#<werkmap>#g" $P/negatief_maak_sql.out
if grep -q "Traceback\|/home/\|/tmp/" $P/negatief_maak_sql.out; then echo "STOP: negatieve test bevat een traceback of een absoluut pad (D7)"; exit 2; fi
echo "negatieve tests maak_sql (grendels) ✓ (5 × exit ≠ 0, juiste melding, geen uitmap)"
python3 -I $S/maak_sql_N1-W11.py $V11 $P/APP_NA_N1-W11.tsv $P/sql/N1-W11 "${SQLA[@]}" --strict-grendel G3 --zonder-score-grendel C1=0 > /dev/null
python3 -I $S/maak_sql_N1-W11.py $V10 $P/APP_NA_N1-W10.tsv $P/sql/N1-W10 --week $NZ --enum-live "$E" --blokken "W10n=*" --start 12 --testleerder $TL > /dev/null
python3 -I $S/maak_manifest_N1-W11.py $P/sql N1-W11 N1-W10 | tail -1
MMD5_VOOR=$(md5sum $P/sql/BLOKKEN_MANIFEST.tsv | cut -c1-32)
if python3 -I $S/maak_manifest_N1-W11.py $P/sql N1-W11 N1-W10 --max-gr 40000 > $TMP/t15.out; then echo "STOP: T15-guard weigert niet"; exit 2; fi
if python3 -I $S/maak_manifest_N1-W11.py $P/sql N1-W11 N1-W10 --max-apply 15000 > $TMP/t15b.out; then echo "STOP: T15-guard (apply) weigert niet"; exit 2; fi
test "$(md5sum $P/sql/BLOKKEN_MANIFEST.tsv | cut -c1-32)" = "$MMD5_VOOR" || { echo "STOP: T15-test wijzigde het manifest"; exit 2; }
{ echo "== --max-gr 40000"; sed "s#$P/##" $TMP/t15.out; echo "== --max-apply 15000"; sed "s#$P/##" $TMP/t15b.out; } > $P/T15_N1-W11.out
echo "T15-guard negatieve test ✓ (exit 2 bij --max-gr 40000 en --max-apply 15000; manifest ongewijzigd)"
ZI=""; if [ "${LIVE:-0}" = "1" ]; then ZI="--zicht $P/live/leerderszicht_live_P3.json --ref-p3 $P/live/slot_ref_live_P3.json"; fi
python3 -I $S/maak_verwacht_per_stap_N1-W11.py $P/sql --week $HW $P/APP_NA_N1-W11.tsv $V11 --week $NZ $P/APP_NA_N1-W10.tsv $V10 --rijen-voor 2323 --testleerder $TL --drift-bron $EN --bucket-live "$BUCKET" --pogingen-hw-ref 0 $ZI | sed -n "1,2p"
python3 -I $S/voorspel_master_N1-W11.py . $P/master --sql $P/sql | sed -n '2p'
python3 -I $S/export_hash_N1-W11.py sql . $P/export_hash_N1_naP4.sql --sql $P/sql | tail -1
python3 -I $S/export_hash_N1-W11.py export $P/export_N1_naP4.sql | tail -1
if [ "${P4TOOLS:-1}" = "1" ]; then
BDI_REPO=$REPO python3 -I $S/maak_rooktest_N1-W11.py . $P/ROOKTEST_N1-W11.md --sql $P/sql --voor $V11
python3 -I $S/maak_draaiboek_P4_N1-W11.py . $P/P4_DRAAIBOEK_N1-W11.md --sql $P/sql --recept $P/RECEPT_MAKER-T_blok_N1-W11.md
cmp -s <(sed -n '/^> \*\*Wat jij typt/,/^$/p' $P/P4_DRAAIBOEK_N1-W11.md) <(sed -n '/^> \*\*Wat jij typt/,/^$/p' $P/ROOKTEST_N1-W11.md) || { echo "STOP: kader «Wat jij typt» verschilt tussen draaiboek en rooktest (D1/D3)"; exit 2; }
python3 -I $S/p4_tekst_N1-W11.py keuzelijst $P/sql > $TMP/keuzelijst.md
for f_ in $P/P4_DRAAIBOEK_N1-W11.md $P/sql/VERWACHT_PER_STAP.md; do cmp -s $TMP/keuzelijst.md <(sed -n '/^\*\*Keuzelijst na een STOP\*\*/,/^\*(einde keuzelijst)\*$/p' $f_) || { echo "STOP: de keuzelijst in $f_ ≠ p4_tekst keuzelijst"; exit 2; }; done
python3 -I $S/p4_tekst_N1-W11.py zinnen $P/sql | while IFS= read -r z_; do python3 -I $S/p4_tekst_N1-W11.py toets keuze "$z_" --sql $P/sql > /dev/null || { echo "STOP: p4_tekst aanvaardt zijn eigen keuzezin niet: $z_"; exit 2; }; done
echo "kader «Wat jij typt» gelijk in draaiboek en rooktest · keuzelijst gelijk in p4_tekst, draaiboek en VERWACHT_PER_STAP ✓"
if [ "${REPLICA:-1}" = "1" ]; then
  chown -R claude $P/replica 2>/dev/null || true
  python3 -I $S/replica_test_N1-W11.py . --sql $P/sql | sed -n "1p"
  set +e; REPLICA_TOETS_VROEGE_STOP=1 python3 -I $S/replica_test_N1-W11.py . --sql $P/sql > $TMP/vroeg.out 2>&1; rcv=$?; set -e
  if runuser -u claude -- /usr/lib/postgresql/16/bin/pg_ctl -D "$WMP/$P/replica/pgdata" status > /dev/null 2>&1; then echo "STOP: na een vroege STOP van de replica draait postgres nog (G3)"; exit 2; fi
  { [ "$rcv" = "2" ] && grep -q "vroege STOP op verzoek" $TMP/vroeg.out; } || { cat $TMP/vroeg.out; echo "STOP: de vroege STOP van de replica gaf exit $rcv in plaats van 2 (G3)"; exit 2; }
  echo "replica: vroege STOP (exit 2) → postgres gestopt ✓"
fi
NEGW=$TMP/sjabloon_neg; mkdir -p $NEGW/scripts $NEGW/p3/sql
printf 'x = "akkoord: zijn zin «%sTZIN[r[%s]]}»"\n' '{' "'blok'" > $NEGW/scripts/neg.py; printf '| 1_L1 | zijn zin «%sTZIN[r[%s]]}» |\n' '{' "'blok'" > $NEGW/p3/sql/VERWACHT_PER_STAP.md
set +e; python3 -I $S/toets_sjabloonresten_N1-W11.py $NEGW > $TMP/sjabloon_neg.out; rcn=$?; set -e
[ "$rcn" = "2" ] && [ "$(grep -c '^SJABLOONREST' $TMP/sjabloon_neg.out)" = "2" ] || { cat $TMP/sjabloon_neg.out; echo "STOP: de sjabloontoets vindt de twee geplante resten niet (exit $rcn)"; exit 2; }
python3 -I $S/toets_sjabloonresten_N1-W11.py . || { echo "STOP: sjabloonresten (F1)"; exit 2; }
echo "sjabloontoets negatief ✓ (2 geplante resten → exit 2)"
else echo "P4-gereedschappen (rooktest, draaiboek, p4_tekst, replica, sjabloontoets): niet in deze run (P4TOOLS=0, deel 2)"; fi
md5sum $S/*.py $S/*.sh $S/*.sql $S/*.mjs | sed 's/^/script /'
md5sum $P/sql/BLOKKEN_MANIFEST.tsv $P/sql/N1-W11/SQL_MANIFEST.tsv $P/sql/N1-W10/SQL_MANIFEST.tsv $P/sql/VERWACHT_PER_STAP.md $P/sql/slot_verwacht_N1-W11.json \
       $P/sql/rooktest_N1-W11.sql $P/sql/rooktest_start_N1-W11.sql $P/sql/rooktest_verwacht_N1-W11.tsv
md5sum $LOG $REV $P/APP_NA_N1-W11.tsv $P/APP_NA_N1-W10.tsv $P/LEESBARE_LIJST_N1-W11_v1.tsv $P/LEESBARE_LIJST_N1-W10_v2.tsv $P/N1-W11_telrapport.md $P/N1-W11_diff_leesbaar.md \
       $P/json/N1-W11.json $P/json/N1-W10.json $P/master/VOORSPELDE_MD5.txt $P/export_N1_naP4.sql $P/export_hash_N1_naP4.sql $P/8T_grep_N1-W11.tsv $P/bidi/rendertoets_P3_v13_900.out $P/bidi/rendertoets_P3_v13_gsm330.out
[ "${P4TOOLS:-1}" = "1" ] && md5sum $P/ROOKTEST_N1-W11.md $P/RECEPT_MAKER-T_blok_N1-W11.md $P/P4_DRAAIBOEK_N1-W11.md
echo "KETEN P3 GROEN (PROEF=$PROEF, LIVE=${LIVE:-0}, REPLICA=${REPLICA:-1}, P4TOOLS=${P4TOOLS:-1})"
