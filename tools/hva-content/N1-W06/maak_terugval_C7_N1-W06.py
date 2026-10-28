# maak_terugval_C7_N1-W06.py v1.0 — Verbeteraar-D/T (4D/4T) · N1-W06 · tegenrapport T P2 F6 (en P1-1): de terugval voor C7 als eigen,
# voorwaardelijk wijzigingslog. Wordt C7 (PR #8) vóór P4 niet gemerged («PR #8 akkoord» ontbreekt), dan worden de zes koppelen-items van
# W06 na de weekblokken gedepubliceerd (B12), want zonder de fix crasht de app op elk koppelen-item. Met de merge wordt dit log niet toegepast.
# Het log komt NA het hoofdlog: `oud` = de NA-stand van het hoofdlog (is_published true, vlag leeg). Geen Arabisch → geen native-review.
# Gebruik: python3 -I maak_terugval_C7_N1-W06.py <APP_NA_N1-W06.tsv (proef van het hoofdlog)> <uit_log.tsv>
import sys, csv
csv.field_size_limit(10**9)
na, uit = sys.argv[1:3]
R = {r["item_id"]: r for r in csv.DictReader(open(na, encoding="utf-8", newline=""), delimiter="\t")}
KOP = [i for i, r in R.items() if r["exercise_type"] == "koppelen" and r["is_published"] == "true"]
assert KOP == ["U6-luisteren-03", "U6-lezen-01", "U6-lezen-04", "U6-lezen-06", "U6-grammatica-01", "U6-grammatica-03"], KOP
VLAG = "⚠️ ONTBREEKT · gedepubliceerd tot C7 (PR #8) gemerged is (B12, P1-1)"
REDEN = "P1-1/9T P2 F6: zonder merge van C7 vóór P4 crasht de app op elk koppelen-item (React #310/#300); het item blijft onzichtbaar tot de merge (B12); alleen toe te passen zonder «PR #8 akkoord»"
kol = ["wijziging_id", "item_id", "categorie", "veld", "oud", "nieuw", "reden", "bevinding_id", "type", "ernst", "rol", "status", "besluit_ibra", "herkomst"]
n = 9000; rijen = []
for i in KOP:
    r = R[i]
    assert r["review_flag"] == "", (i, "vlag niet leeg in NA")
    for veld, cat, oud, nieuw in (("is_published", "app:is_published", "true", "false"), ("review_flag", "app:review_flag", "", VLAG)):
        n += 1
        rijen.append([f"W{n}", i, cat, veld, oud, nieuw, REDEN, "RT-C7 (P1-1, techplan T11)", "technisch", "K", "4T", "voorgesteld", "", "C7-terugval (voorwaardelijk)"])
with open(uit, "w", encoding="utf-8", newline="") as f:
    f.write("\t".join(kol) + "\n")
    for x in rijen: f.write("\t".join(x) + "\n")
pts = sum(int(R[i]["points"]) for i in KOP)
print(f"terugval C7: {len(rijen)} regels (W9001–W{n}) · items {len(KOP)} · punten die dan wegvallen: {pts}")
