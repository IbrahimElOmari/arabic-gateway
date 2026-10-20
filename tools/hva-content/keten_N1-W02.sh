#!/bin/bash
# keten_N1-W02.sh v2 (P2, na de tegenrapporten 9D/9T) — herhaalbare testketen op kopieën; schrijft niets in de app.
# 1 maak_log (log + review) → 2 simulatie van Ibra's antwoord (één bericht met ' · ', alles ja) → review_bulk v1.2 --log
# → 3 verwerk_p2 v1.1 (item-atomair; zet de statussen, niet 1D) → 4 fail-closed (zonder --review = STOP)
# → 5 apply_log v1.2: W02 (--week 2) en W01-nazorg (--week 1) → 6 check v1.3 --poort op NA W02 (poort vóór maak_sql)
# → 7 telrapport (0 onverklaard) → 8 negatieve tests (negatief_N1-W02.py) → 9 md5 (twee keer draaien = bit-gelijk).
set -e; cd /home/claude/N1-W02
EXP2=uit/APP_EXPORT_N1-W02_2026-10-19.tsv; EXPN1=uit/APP_EXPORT_N1_2026-10-19.tsv; T=p2/test; LIJST=data/lijst/TSV_prefix_hele_regels.txt
mkdir -p $T   # ook in een verse omgeving (deel 2, na het uitpakken van de bundel)
python3 -I scripts/maak_log_N1-W02.py $EXP2 $EXPN1 uit/N1-W02_revisie_D.tsv uit/N1-W02_revisie_T.tsv p2/N1-W02_wijzigingslog.tsv p2/review_native_N1-W02.tsv > $T/maak_log.out
tail -3 $T/maak_log.out
python3 -I - <<'P'
import csv
T = "/home/claude/N1-W02/p2/test"
R = list(csv.DictReader(open("/home/claude/N1-W02/p2/review_native_N1-W02.tsv", encoding="utf-8"), delimiter="\t"))
with open(T + "/antwoorden_test_alles_ja.txt", "w", encoding="utf-8") as f:
    f.write("# SIMULATIE — niet de review van Ibra (één bericht, zoals Ibra het typt)\n")
    f.write("P2 akkoord · deel 1 ja · 2a ja" + "".join(f" · {r['wijziging_id']} ja" for r in R if r["deel"] == "2b nieuw") + " · 4a\n")
csv.field_size_limit(10**9)
rows = list(csv.DictReader(open("/home/claude/N1-W02/uit/APP_EXPORT_N1_2026-10-19.tsv", encoding="utf-8", newline=""), delimiter="\t"))
with open(T + "/VOOR_N1-W01_2026-10-19.tsv", "w", encoding="utf-8", newline="") as f:
    w = csv.writer(f, delimiter="\t", lineterminator="\n", quoting=csv.QUOTE_MINIMAL); w.writerow(list(rows[0].keys()))
    for r in rows:
        if r["week"] == "1": w.writerow(list(r.values()))
P
echo "--- review_bulk v1.2 (simulatie: alles ja)"
python3 -I scripts/review_bulk.py p2/review_native_N1-W02.tsv $T/antwoorden_test_alles_ja.txt $T/review_test_ja.tsv --log p2/N1-W02_wijzigingslog.tsv | tail -2
echo "--- verwerk_p2 v1.1 (item-atomair)"
python3 -I scripts/verwerk_p2_N1-W02.py p2/N1-W02_wijzigingslog.tsv $T/review_test_ja.tsv $T/log_test_verwerkt.tsv --datum "SIMULATIE"
echo "--- fail-closed: verwerkt log zonder review (verwacht STOP, exit 2)"
set +e; python3 -I scripts/apply_log.py $EXP2 $T/log_test_verwerkt.tsv $T/x.tsv --week 2 --stil | grep -E "^logregels|^STOP"; echo "exit ${PIPESTATUS[0]}"; set -e
echo "--- apply W02 (simulatie)"
python3 -I scripts/apply_log.py $EXP2 $T/log_test_verwerkt.tsv $T/APP_NA_N1-W02_sim.tsv --week 2 --review $T/review_test_ja.tsv --apply --stil | grep -E "^logregels|geschreven|items geraakt"
echo "--- apply W01-nazorg (simulatie)"
python3 -I scripts/apply_log.py $T/VOOR_N1-W01_2026-10-19.tsv $T/log_test_verwerkt.tsv $T/APP_NA_N1-W01_sim.tsv --week 1 --review $T/review_test_ja.tsv --apply --stil | grep -E "^logregels|geschreven|items geraakt"
echo "--- check v1.3 --poort op de NA-stand W02 (poort vóór maak_sql)"
python3 -I scripts/check_N1-W02.py $T/APP_NA_N1-W02_sim.tsv $LIJST N1 2 $T/check_v1_3_NA.tsv --poort > $T/check_v1_3_NA.out; grep -E "^bevindingen|^POORT" $T/check_v1_3_NA.out
echo "--- check v1.3 op de NA-stand W01 (alleen bidi en B25 tellen hier; W01 had zijn eigen P2)"
set +e; python3 -I scripts/check_N1-W02.py $T/APP_NA_N1-W01_sim.tsv $LIJST N1 1 $T/check_v1_3_NA_W01.tsv --poort > $T/check_v1_3_NA_W01.out; echo "exit $?"; set -e
grep -E "^bevindingen|^POORT" $T/check_v1_3_NA_W01.out; grep -c "bidi:" $T/check_v1_3_NA_W01.out || true
echo "--- telrapport W02 en W01"
python3 -I - <<'P'
L = [l for l in open("/home/claude/N1-W02/p2/test/log_test_verwerkt.tsv", encoding="utf-8")]
open("/home/claude/N1-W02/p2/test/log_W02.tsv", "w", encoding="utf-8").write(L[0] + "".join(l for l in L[1:] if l.split("\t")[1].startswith("U2-")))
open("/home/claude/N1-W02/p2/test/log_W01.tsv", "w", encoding="utf-8").write(L[0] + "".join(l for l in L[1:] if l.split("\t")[1].startswith("U1-")))
P
python3 -I bundel_uit/telrapport_N1-W11.py $EXP2 $T/APP_NA_N1-W02_sim.tsv $T/log_W02.tsv | sed -n 2,3p
python3 -I bundel_uit/telrapport_N1-W11.py $T/VOOR_N1-W01_2026-10-19.tsv $T/APP_NA_N1-W01_sim.tsv $T/log_W01.tsv | sed -n 2,3p
echo "--- negatieve tests"
python3 -I scripts/negatief_N1-W02.py | tail -1
md5sum p2/N1-W02_wijzigingslog.tsv p2/review_native_N1-W02.tsv $T/log_test_verwerkt.tsv $T/APP_NA_N1-W02_sim.tsv $T/APP_NA_N1-W01_sim.tsv | sed 's#  .*/#  #'
