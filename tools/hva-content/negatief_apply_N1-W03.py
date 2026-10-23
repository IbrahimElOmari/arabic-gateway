# negatief_apply_N1-W03.py — Controleur-T (8T) · N1-W03 · negatieve tests voor apply_log v1.3 (P1-18, 9T V1) op kopieën.
# Elke test maakt een kopie van het proeflog/de proefreview met één fout en verwacht exit 2 (geweigerd). Test 0 = de echte proef: exit 0.
# Gebruik: python3 -I negatief_apply_N1-W03.py <apply_log.py> <apply_log_v1_2.py> <APP.tsv> <log_proef.tsv> <review_proef.tsv> <werkmap>
import sys, csv, subprocess, os
csv.field_size_limit(10**9)
al, al12, app, log, rev, wm = sys.argv[1:7]; os.makedirs(wm, exist_ok=True)
def lees(p): return [l.rstrip("\n").split("\t") for l in open(p, encoding="utf-8")]
def schrijf(rows, p):
    with open(p, "w", encoding="utf-8") as f: f.write("".join("\t".join(r) + "\n" for r in rows))
L, R = lees(log), lees(rev); kl, kr = L[0], R[0]
c = {k: kl.index(k) for k in ("wijziging_id", "item_id", "veld", "oud", "nieuw", "status")}
cr = {k: kr.index(k) for k in kr}
def run(script, logp, revp):
    p = subprocess.run([sys.executable, "-I", script, app, logp, os.path.join(wm, "uit.tsv"), "--apply", "--week", "3", "--review", revp, "--stil"], capture_output=True, text=True)
    return p.returncode, (p.stdout + p.stderr).strip().splitlines()[-1:] 
type_r = next(i for i, r in enumerate(L) if i and r[c["veld"]] == "exercise_type")
rev_ids = {r[cr["wijziging_id"]] for r in R[1:]}
tekst_r = next(i for i, r in enumerate(L) if i and r[c["wijziging_id"]] in rev_ids and r[c["veld"]] == "input_arabic")
gewoon_r = next(i for i, r in enumerate(L) if i and r[c["wijziging_id"]] not in rev_ids and r[c["veld"]] == "instruction_nl")
tests = []
def test(naam, verwacht, script=al, mut_log=None, mut_rev=None):
    l2, r2 = [r[:] for r in L], [r[:] for r in R]
    if mut_log: mut_log(l2)
    if mut_rev: mut_rev(r2)
    lp, rp = os.path.join(wm, f"log_{len(tests)}.tsv"), os.path.join(wm, f"rev_{len(tests)}.tsv"); schrijf(l2, lp); schrijf(r2, rp)
    code, laatste = run(script, lp, rp); tests.append((naam, verwacht, code, laatste))
test("T0 echte proef (v1.3)", 0)
test("T1 v1.2 op hetzelfde log: exercise_type niet schrijfbaar", 2, script=al12)
test("T2 exercise_type buiten de enum ('meerkeus')", 2, mut_log=lambda l: l[type_r].__setitem__(c["nieuw"], "meerkeus"))
test("T3 exercise_type met hoofdletter ('Meerkeuze')", 2, mut_log=lambda l: l[type_r].__setitem__(c["nieuw"], "Meerkeuze"))
test("T4 oud ≠ app (één spatie extra)", 2, mut_log=lambda l: l[gewoon_r].__setitem__(c["oud"], l[gewoon_r][c["oud"]] + " "))
test("T5 status 'goedgekeurd ' (spatie)", 2, mut_log=lambda l: l[gewoon_r].__setitem__(c["status"], "goedgekeurd "))
def zonder_ja(r):
    for x in r[1:]:
        if x[cr["wijziging_id"]] == L[tekst_r][c["wijziging_id"]]: x[cr["akkoord"]] = ""
test("T6 review zonder 'ja' voor een Arabische regel", 2, mut_rev=zonder_ja)
test("T7 nieuw ≠ voorgesteld in de review (één teken)", 2, mut_log=lambda l: l[tekst_r].__setitem__(c["nieuw"], l[tekst_r][c["nieuw"]] + "ْ"))
test("T8 geen enkele regel goedgekeurd", 2, mut_log=lambda l: [x.__setitem__(c["status"], "voorgesteld") for x in l[1:]])
ok = all(code == v for _, v, code, _ in tests)
for naam, v, code, laatste in tests: print(f"{'OK ' if code == v else 'FOUT'} · {naam} · verwacht exit {v} · kreeg {code} · {laatste[0] if laatste else ''}")
print("ALLE NEGATIEVE TESTS GESLAAGD" if ok else "STOP: een test faalt"); sys.exit(0 if ok else 2)
