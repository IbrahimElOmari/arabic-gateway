# negatief_N1-W02.py — Controleur-T (8T) · P2 N1-W02 · negatieve en randtests voor de verwerkingsketen na de tegenrapporten 9D/9T
# (review_bulk v1.2, verwerk_p2 v1.1, apply_log v1.2, check v1.3). Werkt alleen op kopieën in p2/test/neg/; schrijft niets in de app.
# Elke test noemt wat hij verwacht; het script eindigt met exit 1 als één test anders uitkomt.
# Gebruik: python3 -I scripts/negatief_N1-W02.py   (vanuit /home/claude/N1-W02, na keten_N1-W02.sh)
import subprocess, csv, os, sys, re
B = "/home/claude/N1-W02"; T = B + "/p2/test/neg"; os.makedirs(T, exist_ok=True)
EXP2 = B + "/uit/APP_EXPORT_N1-W02_2026-10-19.tsv"; LOG = B + "/p2/N1-W02_wijzigingslog.tsv"; REV = B + "/p2/review_native_N1-W02.tsv"
LIJST = B + "/data/lijst/TSV_prefix_hele_regels.txt"; S = B + "/scripts/"
def run(*a):
    p = subprocess.run(["python3", "-I", *a], capture_output=True, text=True)
    return p.returncode, p.stdout + p.stderr
def lees(p): return list(csv.DictReader(open(p, encoding="utf-8", newline=""), delimiter="\t"))
def schrijf_log(rows, p):
    kop = list(rows[0].keys())
    with open(p, "w", encoding="utf-8") as f:
        f.write("\t".join(kop) + "\n")
        for r in rows: f.write("\t".join(r[c] for c in kop) + "\n")
REVR = lees(REV); LOGR = lees(LOG)
B2 = [r["wijziging_id"] for r in REVR if r["deel"] == "2b nieuw"]
def antwoorden(extra="", zonder=(), bulk="P2 akkoord · deel 1 ja · 2a ja"):
    return "\n".join([bulk + "".join(f" · {w} ja" for w in B2 if w not in zonder), extra]) + "\n"
def bulkrun(naam, tekst, log=True):
    a = f"{T}/{naam}.txt"; open(a, "w", encoding="utf-8").write(tekst)
    return run(S + "review_bulk.py", REV, a, f"{T}/{naam}_review.tsv", *(["--log", LOG] if log else []))
uitslag = []
def test(naam, verwacht, ok, detail=""):
    uitslag.append((naam, verwacht, "OK" if ok else "FOUT", detail)); print(f"{'OK  ' if ok else 'FOUT'} {naam} — {verwacht}" + (f" · {detail}" if detail else ""))
item_regels = lambda i: [r["wijziging_id"] for r in LOGR if r["item_id"] == i]
exp_rij = {r["item_id"]: r for r in lees(EXP2)}

# T0: het volledige antwoordsjabloon uit het poortrapport (één bericht) wordt zonder handwerk gelezen
SJABLOON = "P2 akkoord · deel 1 ja · 2a ja · " + " · ".join(f"{w} ja" for w in B2) + " · 2 ja · 3 ja · 4a · 5 ja · 6 ja · 7 ja"
rc, out = bulkrun("t0", SJABLOON + "\n")
rv0 = lees(f"{T}/t0_review.tsv") if rc == 0 else []
test("T0 antwoordsjabloon uit het poortrapport", "exit 0, 266 × ja, 0 open", rc == 0 and len(rv0) == len(REVR) and all(r["akkoord"] == "ja" for r in rv0))
rc, out = bulkrun("t0b", SJABLOON.replace("W0072 ja", "W0072 aangepast بِ / بِي") + "\n")
rv0b = {r["wijziging_id"]: r for r in lees(f"{T}/t0b_review.tsv")} if rc == 0 else {}
test("T0b sjabloon met 'W0072 aangepast بِ / بِي'", "W0072 = aangepast, Ibra-tekst 'بِ / بِي', vlag W0076 = nee", rc == 0 and rv0b["W0072"]["akkoord"] == "aangepast" and rv0b["W0072"]["opmerking"].endswith("Ibra-tekst: بِ / بِي") and rv0b["W0076"]["akkoord"] == "nee")

# basis: alles ja → verwerkt log (voor T9–T14, T16–T17)
rc, out = bulkrun("basis", antwoorden()); assert rc == 0, out
rc, out = run(S + "verwerk_p2_N1-W02.py", LOG, f"{T}/basis_review.tsv", f"{T}/basis_log.tsv", "--datum", "TEST"); assert rc == 0, out
basislog = lees(f"{T}/basis_log.tsv")

# T1 (9T E1): los 'nee' vóór de bulk wint, item-atomair terug naar 4D, het item blijft ongewijzigd in de app
rc, out = bulkrun("t1", "W0068 nee test-E1\n" + antwoorden())
rv = {r["wijziging_id"]: r for r in lees(f"{T}/t1_review.tsv")} if rc == 0 else {}
test("T1a los besluit wint van bulk (nee vóór '2a ja')", "W0068 = nee, vlag W0070 = nee", rc == 0 and rv["W0068"]["akkoord"] == "nee" and rv["W0070"]["akkoord"] == "nee", "waarschuwing 'geen 2b-regel' getoond" if "bedoeld?" in out else "geen waarschuwing")
rc, out = run(S + "verwerk_p2_N1-W02.py", LOG, f"{T}/t1_review.tsv", f"{T}/t1_log.tsv", "--datum", "TEST")
l1 = {r["wijziging_id"]: r for r in lees(f"{T}/t1_log.tsv")} if rc == 0 else {}
ids = item_regels("U2-luisteren-03-3")
test("T1b item-atomair: alle regels van U2-luisteren-03-3 afgewezen", f"{len(ids)} regels afgewezen, de rest goedgekeurd", rc == 0 and all(l1[w]["status"] == "afgewezen" for w in ids) and sum(r["status"] == "afgewezen" for r in l1.values()) == len(ids))
rc, out = run(S + "apply_log.py", EXP2, f"{T}/t1_log.tsv", f"{T}/t1_NA.tsv", "--week", "2", "--review", f"{T}/t1_review.tsv", "--apply", "--stil")
na = {r["item_id"]: r for r in lees(f"{T}/t1_NA.tsv")} if rc == 0 else {}
test("T1c apply: U2-luisteren-03-3 byte-gelijk aan de export", "rij ongewijzigd", rc == 0 and na["U2-luisteren-03-3"] == exp_rij["U2-luisteren-03-3"])
rc, out = run(S + "check_N1-W02.py", f"{T}/t1_NA.tsv", LIJST, "N1", "2", "--poort")
test("T1d check --poort met het oude item", "poort volgt de oude bevindingen van het item (exit 2 als die K/H hebben)", rc in (0, 2), (re.search(r"POORT \w+: K \d+ · H \d+", out) or [""])[0])
rc2, out2 = run(S + "check_N1-W02.py", f"{T}/t1_NA.tsv", LIJST, "N1", "2", "--poort", "--uitzondering=U2-luisteren-03-3")
test("T1e check --poort --uitzondering=U2-luisteren-03-3", "exit 0 en de uitzondering staat in de uitvoer", rc2 == 0 and "uitzonderingen (Ibra)" in out2, (re.search(r"POORT \w+: K \d+ · H \d+", out2) or [""])[0])

# T2–T6, T8b: antwoorden die moeten stoppen
for naam, tekst, kern, log in [
    ("T2 'ja maar' (9T E2)", "W0064 ja maar مَاتَ eruit\n" + antwoorden(zonder=("W0064",)), "'ja' met tekst", True),
    ("T3a onbekend id (9T E3)", "W9999 ja\n" + antwoorden(), "onbekend wijziging_id", True),
    ("T3b typfout: 2b-regel zonder eigen besluit", antwoorden(zonder=("W0255", "W0254")) + "W0225 ja\n", "2b zonder eigen besluit", True),
    ("T4 twee besluiten voor één id (9T E5)", antwoorden() + "W0059 nee test\n", "twee besluiten", True),
    ("T5 besluit op een afgeleide regel", antwoorden() + "W0034 ja\n", "is afgeleid", True),
    ("T6 onbekende groep in bulk", antwoorden() + "2a luisteren-99 ja\n", "onbekende groep", True),
    ("T8b logregel buiten de review zonder --log", antwoorden() + "W0065 nee test\n", "geef dan --log mee", False),
    ("T8c 'aangepast' zonder tekst", antwoorden(zonder=("W0031",)) + "W0031 aangepast\n", "'aangepast' zonder tekst", True)]:
    rc, out = bulkrun(re.sub(r"\W+", "_", naam)[:12], tekst, log)
    test(naam, f"STOP ({kern})", rc != 0 and kern in out, out.strip().splitlines()[-1][:110] if out.strip() else "")

# T7: 'aangepast' met ' · ' in de tekst blijft heel; item terug naar 4D met de Ibra-tekst in besluit_ibra
tekst7 = "huwa kabīr · hiya jamīla · anta ṭawīl · anti ṣaghīra"
rc, out = bulkrun("t7", antwoorden(zonder=("W0308",)) + f"W0308 aangepast {tekst7}\n")
rv7 = {r["wijziging_id"]: r for r in lees(f"{T}/t7_review.tsv")} if rc == 0 else {}
test("T7a aangepast-tekst met ' · ' blijft heel", "opmerking eindigt op de volledige tekst", rc == 0 and rv7["W0308"]["opmerking"].endswith("Ibra-tekst: " + tekst7))
rc, out = run(S + "verwerk_p2_N1-W02.py", LOG, f"{T}/t7_review.tsv", f"{T}/t7_log.tsv", "--datum", "TEST")
l7 = {r["wijziging_id"]: r for r in lees(f"{T}/t7_log.tsv")} if rc == 0 else {}
ids7 = item_regels("U2-spreken-02")
test("T7b aangepast → item terug naar 4D (P3)", f"{len(ids7)} regels van U2-spreken-02 afgewezen, Ibra-tekst bewaard", rc == 0 and all(l7[w]["status"] == "afgewezen" for w in ids7) and l7["W0308"]["besluit_ibra"].endswith("Ibra-tekst: " + tekst7))

# T8: logbesluit buiten de review (met --log) → via --logbesluiten item-atomair
rc, out = bulkrun("t8", antwoorden() + "W0065 nee test-T8\n")
rc2, out2 = run(S + "verwerk_p2_N1-W02.py", LOG, f"{T}/t8_review.tsv", f"{T}/t8_log.tsv", "--logbesluiten", f"{T}/t8_review_logbesluiten.tsv", "--datum", "TEST")
l8 = {r["wijziging_id"]: r for r in lees(f"{T}/t8_log.tsv")} if rc2 == 0 else {}
test("T8a logregel buiten de review: 'nee' → item terug", "U2-luisteren-03-3 afgewezen", rc == 0 and rc2 == 0 and all(l8[w]["status"] == "afgewezen" for w in item_regels("U2-luisteren-03-3")))

# T9–T14: apply_log v1.2 weigert
def apply_met(naam, rows, *extra, review=f"{T}/basis_review.tsv"):
    p = f"{T}/{naam}_log.tsv"; schrijf_log(rows, p)
    return run(S + "apply_log.py", EXP2, p, f"{T}/{naam}_NA.tsv", "--week", "2", "--review", review, "--apply", "--stil", *extra)
rvb = {r["wijziging_id"]: r for r in lees(f"{T}/basis_review.tsv")}
kandidaat = next(r for r in basislog if r["wijziging_id"] in rvb and rvb[r["wijziging_id"]]["deel"] == "2a hergebruik" and rvb[r["wijziging_id"]]["veld"] == r["veld"] and r["item_id"].startswith("U2-"))
w9 = kandidaat["wijziging_id"]
rows = [dict(r) for r in basislog]
for r in rows:
    if r["wijziging_id"] == w9: r["nieuw"] = r["nieuw"] + " (gewijzigd na de review)"
rc, out = apply_met("t9", rows)
test(f"T9 (9T A1) inhoud ≠ review ({w9})", "geweigerd, exit 2", rc == 2 and f"GEWEIGERD {w9}" in out and "inhoud ≠" in out)
rows = [dict(r) for r in basislog]; rv10 = [dict(r) for r in lees(f"{T}/basis_review.tsv")]
for r in rows:
    if r["wijziging_id"] == w9: r["status"] = "aangepast"; r["besluit_ibra"] = "tekst B"
for r in rv10:
    if r["wijziging_id"] == w9: r["akkoord"] = "aangepast"; r["opmerking"] = "Ibra-tekst: tekst A"
schrijf_log(rv10, f"{T}/t10_review.tsv")
rc, out = apply_met("t10", rows, review=f"{T}/t10_review.tsv")
test("T10 aangepast: besluit_ibra ≠ Ibra-tekst van de review", "geweigerd, exit 2", rc == 2 and f"GEWEIGERD {w9}" in out)
rows = [dict(r) for r in basislog]
for r in rows:
    if r["wijziging_id"] == w9: r["status"] = "aangepast"; r["besluit_ibra"] = ""
rc, out = apply_met("t11", rows, review=f"{T}/t10_review.tsv")
test("T11 (9T A2) aangepast met lege besluit_ibra", "geweigerd, exit 2", rc == 2 and "aangepast zonder tekst" in out)
rows = [dict(r) for r in basislog]; rows[0]["status"] = "goedgekeurd "
rc, out = apply_met("t12", rows)
test("T12 (9T A3) status 'goedgekeurd ' (spatie)", "geweigerd, exit 2", rc == 2 and "onbekende status" in out)
rc, out = run(S + "apply_log.py", EXP2, f"{T}/basis_log.tsv", f"{T}/t13_NA.tsv", "--week", "02", "--review", f"{T}/basis_review.tsv", "--apply", "--stil")
rc_b, out_b = run(S + "apply_log.py", EXP2, f"{T}/basis_log.tsv", f"{T}/t13b_NA.tsv", "--week", "2", "--review", f"{T}/basis_review.tsv", "--apply", "--stil")
n = lambda o: (re.search(r"toegepast: (\d+)", o) or [None, "?"])[1]
test("T13 --week 02 = --week 2", "zelfde aantal toegepast", rc == 0 and rc_b == 0 and n(out) == n(out_b) != "0", f"{n(out)} = {n(out_b)}")
rc, out = run(S + "apply_log.py", EXP2, f"{T}/basis_log.tsv", f"{T}/t14_NA.tsv", "--week", "3", "--review", f"{T}/basis_review.tsv", "--apply", "--stil")
test("T14 --apply met 0 toegepaste regels (--week 3)", "STOP, exit 2", rc == 2 and "0 regels toegepast" in out)

# T15 (9T A6): 'nee' op de opties van een strict-item → het hele item blijft zoals het is (geen half B25)
strict_items = {r["item_id"] for r in LOGR if r["veld"] == "strict_tashkeel" and r["item_id"].startswith("U2-")}
w15 = next(r["wijziging_id"] for r in REVR if r["item_id"] in strict_items and r["veld"] == "options" and r["deel"] in ("2a hergebruik", "1 mechanisch", "2b nieuw"))
i15 = next(r["item_id"] for r in REVR if r["wijziging_id"] == w15)
rc, out = bulkrun("t15", antwoorden(zonder=(w15,)) + f"{w15} nee test-A6\n")
rc2, _ = run(S + "verwerk_p2_N1-W02.py", LOG, f"{T}/t15_review.tsv", f"{T}/t15_log.tsv", "--datum", "TEST")
rc3, _ = run(S + "apply_log.py", EXP2, f"{T}/t15_log.tsv", f"{T}/t15_NA.tsv", "--week", "2", "--review", f"{T}/t15_review.tsv", "--apply", "--stil")
na15 = {r["item_id"]: r for r in lees(f"{T}/t15_NA.tsv")} if rc3 == 0 else {}
rc4, out4 = run(S + "check_N1-W02.py", f"{T}/t15_NA.tsv", LIJST, "N1", "2")
test(f"T15 nee op opties van strict-item {i15} ({w15})", "item ongewijzigd; geen B25-bevinding", rc == rc2 == rc3 == 0 and na15[i15] == exp_rij[i15] and not re.search(re.escape(i15) + r" \| correct_answer \| .* \| K \| strict", out4))

# T16 verwerk_p2 op een al verwerkt log; T17 fail-closed zonder review; T18 poort dicht op de VOOR-stand
rc, out = run(S + "verwerk_p2_N1-W02.py", f"{T}/basis_log.tsv", f"{T}/basis_review.tsv", f"{T}/t16_log.tsv")
test("T16 verwerk_p2 twee keer", "STOP (al verwerkt?)", rc != 0 and "al verwerkt" in out)
rc, out = run(S + "apply_log.py", EXP2, f"{T}/basis_log.tsv", f"{T}/t17_NA.tsv", "--week", "2", "--apply", "--stil")
test("T17 apply zonder --review (fail-closed)", "STOP, exit 2, niets geschreven", rc == 2 and not os.path.exists(f"{T}/t17_NA.tsv"))
rc, out = run(S + "check_N1-W02.py", EXP2, LIJST, "N1", "2", "--poort")
test("T18 check --poort op de VOOR-stand", "POORT DICHT, exit 2", rc == 2 and "POORT DICHT" in out, (re.search(r"POORT \w+: K \d+ · H \d+", out) or [""])[0])

with open(f"{T}/negatief_uitslag.tsv", "w", encoding="utf-8") as f:
    f.write("test\tverwacht\tuitslag\tdetail\n")
    for u in uitslag: f.write("\t".join(u) + "\n")
fout = [u for u in uitslag if u[2] != "OK"]
print(f"negatieve tests: {len(uitslag)} · OK {len(uitslag) - len(fout)} · FOUT {len(fout)}")
sys.exit(1 if fout else 0)
