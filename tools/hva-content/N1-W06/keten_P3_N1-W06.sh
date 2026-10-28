#!/bin/bash
# keten_P3_N1-W06.sh v1.2 (P3-antwoord 2026-10-28: log en review van P3 = P2 + W0545–W0546 (groep 1, «2.a»); nieuwe NA-pins W06 en W06-terugval) · v1.1 (8T P3 C-T07: ook de live-JSON's, het schema van de replica, de rendertoets-bron en de SQL_MANIFEST's verankerd; scriptmd5's in de uitvoer · 9D P3 R1: variant B zonder venster — de zes koppelen-items worden in hun eigen weekblok gedepubliceerd, geen apart blok C7t na de weekblokken) · v1.0 — 7D/7T/8T · P3 N1-W06 · bouwt de P3-stand van N1-W06 opnieuw op uit de bronnen en het goedgekeurde log van P2
# (p2/verwerking/, «P2 akkoord. Ja voor alle aanbevelingen»); deterministisch (tweede run bit-gelijk); schrijft niets in de app.
# apply_log v1.4.1 (W06 met 24 nieuwe rijen, W05- en W04-nazorg; variant B = terugvallog C7 op de NA van W06) → lijsten (app_naar_master)
# → telrapport + diff (rapport_7D) → JSON + structuurtoets → check v1.7.1 (--poort op W06 A en B, uitzondering = precies de gedepubliceerde rijen;
# W05/W04: VOOR ↔ NA zonder nieuwe bevinding) → rendertoets 900/330 → maak_sql v4.6 (root A = p3/sql, root B = p3/sql_B) → BLOKKEN_MANIFEST v1.1
# → VERWACHT_PER_STAP v1.9 + slottellingen + leerderszicht → [LIVE=1] replica v4.1.
# Gebruik: bash keten_P3_N1-W06.sh   (WM = werkmap; TESTLEERDER=<uuid>; BDI_REPO = vaste kopie van main @ 244de3e; LIVE=1 na de live leesacties)
set -euo pipefail
cd "${WM:-$(dirname "$0")/..}"
S=scripts; B=bron; P=p3; V=p2/verwerking
TL=""; if [ -n "${TESTLEERDER:-}" ]; then TL="--testleerder $TESTLEERDER"; echo "testleerder: $TESTLEERDER (maak_sql v4.6)"; fi
E="meerkeuze|meerdere-antwoorden|open-tekst|gatentekst|bestand-upload|audio-opname|rangschikken|koppelen"   # live enum 2026-10-27 20:48 UTC (READ ONLY)
md5sum -c --quiet - <<'MD5'
bce088092f40d0b9676130c5f15fea13  bron/APP_BACKUP_N1-W06_2026-10-27.tsv
441bf75aae4eeb19313d557f871e72ed  bron/APP_BACKUP_N1-W05_2026-10-27_P3.tsv
d4a2980ef0d9caf622de4038c05000f9  bron/APP_BACKUP_N1-W04_2026-10-27_P3.tsv
0083dcacf54795737249ca7df5aea08e  bron/APP_EXPORT_N1_2026-10-27_naP4.tsv
0100d326155c0f443af0a437e8d202c2  bron/ULTIEME_LEESBARE_LIJST_N1N2.tsv
963a9c732e6196a2b78da8b17670e7ed  p3/verwerking/N1-W06_wijzigingslog_P3.tsv
d8fa618dff93e7556682908bc44d6de8  p2/verwerking/N1-W06_wijzigingslog_terugval_C7_P2.tsv
67badbe156b15188eb61d5b4c116c286  p3/verwerking/review_native_N1-W06_P3.tsv
c08508c379cb919b50efdd748ad338ab  p3/live/leerderszicht_live_2026-10-27_P3.json
7b1e8fd2bc126573e62e578b99b463e2  p3/live/slot_ref_live_2026-10-27_P3.json
475e804a039e81688100c23556a172ea  p3/live/schema_live_2026-10-27_P3.json
bceceaf31fb34ad7f887bec7e4b23318  p3/schema_metadata_2026-10-27.json
691e35d63073eab28094d91e33395db4  p3/replica_schema/schema_replica_v2.sql
b6eaa00d693799e44fcbaba09cefeb52  scripts/replica_policies_N1-W06.sql
MD5
REPO=${BDI_REPO:-/home/claude/rt_repo}
echo "e9fc90647c97caf0f0d62c4ce6172e8e  $REPO/src/pages/CurriculumItemPage.tsx" | md5sum -c --quiet -   # rendertoets-bron = vaste kopie van main @ 244de3e (8T P3 C-T07)
echo "invoer: md5 ✓"
LOG=p3/verwerking/N1-W06_wijzigingslog_P3.tsv; LOGB=$V/N1-W06_wijzigingslog_terugval_C7_P2.tsv; REV=p3/verwerking/review_native_N1-W06_P3.tsv; LIJST=$B/ULTIEME_LEESBARE_LIJST_N1N2.tsv
for f in $LOG $LOGB; do if grep -qP "\tgoedgekeurd\t[^\t]*[Pp]roef" $f; then echo "STOP: proefregel(s) met status goedgekeurd in $f (9T V3)"; exit 3; fi; done
rm -rf $P/sql $P/sql_B $P/json $P/check $P/bidi $P/APP_NA_N1-W0?.tsv $P/APP_NA_N1-W06_terugval.tsv $P/LEESBARE_LIJST_N1-W0?_v?.tsv $P/LIJST_N1-W0?_VOOR_uit_app.tsv $P/N1-W06_telrapport.md $P/N1-W06_diff_leesbaar.md $P/replica/REPLICA_RAPPORT_N1-W06*.md
mkdir -p $P/json $P/check $P/bidi
V6=$B/APP_BACKUP_N1-W06_2026-10-27.tsv; V5=$B/APP_BACKUP_N1-W05_2026-10-27_P3.tsv; V4=$B/APP_BACKUP_N1-W04_2026-10-27_P3.tsv
for w in 6 5 4; do eval src=\$V$w; python3 -I $S/apply_log.py $src $LOG $P/APP_NA_N1-W0${w}.tsv --week $w --review $REV --apply --stil | grep -v "^  " | head -2; done
python3 -I $S/apply_log.py $P/APP_NA_N1-W06.tsv $LOGB $P/APP_NA_N1-W06_terugval.tsv --week 6 --apply --stil | grep -v "^  " | head -2
md5sum -c --quiet - <<'MD5'
58e0a2dc76fb2f3f728af156b9717267  p3/APP_NA_N1-W06.tsv
abcc068986e32cc9d9fcb7c4d4763e9f  p3/APP_NA_N1-W05.tsv
8ccf6aa9127d00d99bdff9f18d812051  p3/APP_NA_N1-W04.tsv
889280d63a2a788d31658f784a870912  p3/APP_NA_N1-W06_terugval.tsv
MD5
echo "NA = P3-definitief (= proef groep 1; W05/W04 = P2) (4 bestanden, md5 ✓)"
for w in 6 5 4; do eval src=\$V$w; python3 -I $S/app_naar_master.py $src $P/LIJST_N1-W0${w}_VOOR_uit_app.tsv N1 > /dev/null; done
python3 -I $S/app_naar_master.py $P/APP_NA_N1-W06.tsv $P/LEESBARE_LIJST_N1-W06_v1.tsv N1 | tail -1
python3 -I $S/app_naar_master.py $P/APP_NA_N1-W05.tsv $P/LEESBARE_LIJST_N1-W05_v2.tsv N1 | tail -1
python3 -I $S/app_naar_master.py $P/APP_NA_N1-W04.tsv $P/LEESBARE_LIJST_N1-W04_v3.tsv N1 | tail -1
python3 -I $S/rapport_7D_N1-W06.py $P $LOG "2026-10-27" | tail -1
python3 -I $S/maak_json_N1-W02.py $P/APP_NA_N1-W06.tsv $LOG $P/LEESBARE_LIJST_N1-W06_v1.tsv N1 6 $P/json/N1-W06.json "2026-10-27T22:00:00+01:00" | tail -1
python3 -I $S/valideer_structuur_N1-W02.py $P/json/N1-W06.json $P/APP_NA_N1-W06.tsv $P/LEESBARE_LIJST_N1-W06_v1.tsv $P/schema_metadata_2026-10-27.json | grep -E "^items"
verborgen() { python3 -I -c "
import csv, sys
csv.field_size_limit(10**9)
print(','.join(r['item_id'] for r in csv.DictReader(open(sys.argv[1], encoding='utf-8', newline=''), delimiter='\t') if r['is_published'] == 'false'))" "$1"; }
UITZ=$(verborgen $P/APP_NA_N1-W06.tsv); UITZ_B=$(verborgen $P/APP_NA_N1-W06_terugval.tsv)
test "$UITZ" = "U6-luisteren-01,U6-luisteren-02,U6-luisteren-04,U6-luisteren-06,U6-lezen-05,U6-grammatica-02" || { echo "STOP: gedepubliceerde rijen in NA = $UITZ"; exit 2; }
test "$UITZ_B" = "U6-luisteren-01,U6-luisteren-02,U6-luisteren-03,U6-luisteren-04,U6-luisteren-06,U6-lezen-01,U6-lezen-04,U6-lezen-05,U6-lezen-06,U6-grammatica-01,U6-grammatica-02,U6-grammatica-03" || { echo "STOP: gedepubliceerd in variant B = $UITZ_B"; exit 2; }
python3 -I $S/check_N1-W06.py $P/APP_NA_N1-W06.tsv $LIJST N1 6 $P/check/check_v1_7_NA_N1-W06.tsv --poort --uitzondering=$UITZ > $P/check/check_v1_7_NA_N1-W06.out
python3 -I $S/check_N1-W06.py $P/APP_NA_N1-W06_terugval.tsv $LIJST N1 6 $P/check/check_v1_7_NA_N1-W06_terugval.tsv --poort --uitzondering=$UITZ_B > $P/check/check_v1_7_NA_N1-W06_terugval.out
echo "check W06 A: $(tail -1 $P/check/check_v1_7_NA_N1-W06.out) · B: $(tail -1 $P/check/check_v1_7_NA_N1-W06_terugval.out)"
for w in 5 4; do eval src=\$V$w
  python3 -I $S/check_N1-W06.py $src $LIJST N1 $w $P/check/check_v1_7_VOOR_N1-W0${w}.tsv > $P/check/check_v1_7_VOOR_N1-W0${w}.out
  python3 -I $S/check_N1-W06.py $P/APP_NA_N1-W0${w}.tsv $LIJST N1 $w $P/check/check_v1_7_NA_N1-W0${w}.tsv > $P/check/check_v1_7_NA_N1-W0${w}.out
done
python3 -I - $P/check <<'PY'
import csv, sys
csv.field_size_limit(10**9)
fout = 0
for w in "54":
    S = {s: {(r["item_id"], r["categorie"], r["probleem"], r["ernst"]) for r in csv.DictReader(open(f"{sys.argv[1]}/check_v1_7_{s}_N1-W0{w}.tsv", encoding="utf-8", newline=""), delimiter="\t")} for s in ("VOOR", "NA")}
    nieuw = sorted(S["NA"] - S["VOOR"]); weg = sorted(S["VOOR"] - S["NA"])
    print(f"check W0{w}-nazorg: bevindingen {len(S['VOOR'])} → {len(S['NA'])} · nieuw in NA {len(nieuw)} · opgelost {len(weg)}")
    for x in nieuw: print("  NIEUW", x)
    fout += len(nieuw)
sys.exit(2 if fout else 0)
PY
python3 -I $S/rendertoets_N1-W06.py $REPO $P/APP_NA_N1-W06.tsv $P/APP_NA_N1-W05.tsv $P/APP_NA_N1-W04.tsv --log $LOG --breedte 900 > $P/bidi/rendertoets_P3_900.out
python3 -I $S/rendertoets_N1-W06.py $REPO $P/APP_NA_N1-W06.tsv $P/APP_NA_N1-W05.tsv $P/APP_NA_N1-W04.tsv --log $LOG --breedte 330 --wrap > $P/bidi/rendertoets_P3_gsm330.out
grep -h "^POORT" $P/bidi/rendertoets_P3_900.out $P/bidi/rendertoets_P3_gsm330.out
# maak_sql v4.6: root A (met C7) en root B (C7-terugval: de weekblokken gaan rechtstreeks van VOOR naar de NA van variant B, zodat een koppelen-item
# in hetzelfde blok koppelen wordt én gedepubliceerd; 9D P3 R1); W05-luisteren in vier blokken (B17: generale repetitie < 63 kB)
INS="W06ia=luisteren-01-,luisteren-02-;W06ib=lezen-05-,grammatica-02-"
BL6="L1=luisteren-01;L2=luisteren-02,luisteren-03,luisteren-04,luisteren-05,luisteren-06;R1=lezen;S1=spreken,schrijven;G1=grammatica,cultuur,reflectie"
BL5="W05a=luisteren-01;W05b=luisteren-02,luisteren-03;W05c=luisteren-04,luisteren-05;W05d=lezen,spreken,schrijven,grammatica,reflectie"
for root in sql sql_B; do
  R=$P/$root; mkdir -p $R; n5=8; NA6=$P/APP_NA_N1-W06.tsv; [ $root = sql_B ] && NA6=$P/APP_NA_N1-W06_terugval.tsv
  python3 -I $S/maak_sql_N1-W06.py $V6 $NA6 $R/N1-W06 --week 6 --enum-live "$E" --insert "$INS" --blokken "$BL6" $TL > /dev/null
  python3 -I $S/maak_sql_N1-W06.py $V5 $P/APP_NA_N1-W05.tsv $R/N1-W05 --week 5 --start $n5 --enum-live "$E" --blokken "$BL5" $TL > /dev/null
  python3 -I $S/maak_sql_N1-W06.py $V4 $P/APP_NA_N1-W04.tsv $R/N1-W04 --week 4 --start $((n5 + 4)) --enum-live "$E" --blokken "W04=*" $TL > /dev/null
  python3 -I $S/maak_manifest_N1-W06.py $R N1-W06 N1-W05 N1-W04 | tail -1
done
# A en B: dezelfde blokindeling; byte-gelijk zijn de insertblokken, 3_L1 en de nazorgblokken; 4_L2 … 7_G1 verschillen alleen in de zes koppelen-items (6_S1 alleen via de week-vingerafdruk)
python3 -I - $P <<'PY'
import sys, os, filecmp, csv
csv.field_size_limit(10**9)
P = sys.argv[1]; ANDERS = {"4_L2", "5_R1", "6_S1", "7_G1"}; KOPPELEN = {"U6-luisteren-03", "U6-lezen-01", "U6-lezen-04", "U6-lezen-06", "U6-grammatica-01", "U6-grammatica-03"}
for wk in ("N1-W06", "N1-W05", "N1-W04"):
    a = sorted(d for d in os.listdir(f"{P}/sql/{wk}") if os.path.isdir(f"{P}/sql/{wk}/{d}")); b = sorted(d for d in os.listdir(f"{P}/sql_B/{wk}") if os.path.isdir(f"{P}/sql_B/{wk}/{d}"))
    assert a == b, (wk, a, b)
    for d in a:
        gelijk = all(filecmp.cmp(f"{P}/sql/{wk}/{d}/{f}", f"{P}/sql_B/{wk}/{d}/{f}", shallow=False) for f in os.listdir(f"{P}/sql/{wk}/{d}"))
        assert gelijk == (d not in ANDERS), (wk, d, gelijk)
        if d in ANDERS:   # het verschil zit alleen in de koppelen-items van dat blok: is_published en review_flag
            n = d.split("_", 1)[1]; L = lambda r: {x["item_id"]: x for x in csv.DictReader(open(f"{P}/{r}/{wk}/{d}/NA_{n}.tsv", encoding="utf-8", newline=""), delimiter="\t")}
            A_, B_ = L("sql"), L("sql_B"); dif = {(i, k) for i in A_ for k in A_[i] if A_[i][k] != B_[i][k]}
            assert {i for i, k in dif} <= KOPPELEN and {k for i, k in dif} <= {"is_published", "review_flag"} and dif, (d, sorted(dif)[:4])
print("variant A en B: zelfde blokken; byte-gelijk: insertblokken, 3_L1 en de nazorg; 4_L2 … 7_G1 verschillen alleen in is_published/review_flag van de koppelen-items (6_S1 alleen in de week-vingerafdruk) ✓")
PY
ZI=""; if [ "${LIVE:-0}" = "1" ]; then ZI="--zicht $P/live/leerderszicht_live_2026-10-27_P3.json --ref-p3 $P/live/slot_ref_live_2026-10-27_P3.json"; fi
python3 -I $S/maak_verwacht_per_stap_N1-W06.py $P/sql $P/APP_NA_N1-W06.tsv $P/APP_NA_N1-W05.tsv $P/APP_NA_N1-W04.tsv $V6 $V5 $V4 --rijen-voor 2299 --variant A $ZI | head -4
python3 -I $S/maak_verwacht_per_stap_N1-W06.py $P/sql_B $P/APP_NA_N1-W06_terugval.tsv $P/APP_NA_N1-W05.tsv $P/APP_NA_N1-W04.tsv $V6 $V5 $V4 --rijen-voor 2299 --variant B $ZI | head -4
if [ "${LIVE:-0}" = "1" ]; then chown -R claude $P 2>/dev/null || true; python3 -I $S/replica_test_N1-W06.py . A | head -1; python3 -I $S/replica_test_N1-W06.py . B | head -1; fi
md5sum scripts/*.py scripts/*.sh scripts/*.sql scripts/*.mjs | sed 's/^/script /'   # 8T P3 C-T07: scriptversies in de uitvoer
md5sum $P/sql/N1-W0?/SQL_MANIFEST.tsv $P/sql_B/N1-W0?/SQL_MANIFEST.tsv
md5sum $P/LEESBARE_LIJST_N1-W0?_v?.tsv $P/N1-W06_telrapport.md $P/N1-W06_diff_leesbaar.md $P/json/N1-W06.json $P/sql/BLOKKEN_MANIFEST.tsv $P/sql_B/BLOKKEN_MANIFEST.tsv \
  $P/sql/VERWACHT_PER_STAP.md $P/sql_B/VERWACHT_PER_STAP.md $P/sql/slot_verwacht_N1-W06.json $P/sql_B/slot_verwacht_N1-W06.json $P/sql/slot_tellingen_N1-W06.sql $P/sql/leerderszicht_N1-W06.sql
echo "KETEN P3 GROEN (LIVE=${LIVE:-0})"
