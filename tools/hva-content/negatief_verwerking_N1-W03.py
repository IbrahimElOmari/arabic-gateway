# negatief_verwerking_N1-W03.py v1 — Controleur-T (8T) · N1-W03 · tests voor de verwerking van het P2-antwoord (tegenrapport T P2, V1–V4):
# verwerk_antwoord_P2_N1-W03.py, review_bulk v1.3 en verwerk_p2 v1.2 op W03-data, in een eigen werkmap per test. Leest en schrijft niets
# buiten <scratch>. Exit 0 = alle tests geslaagd.
# Gebruik: python3 -I negatief_verwerking_N1-W03.py <werkmap> <scratch>
import sys, os, subprocess, csv, shutil, re
csv.field_size_limit(10**9)
WM, SC = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
if os.path.exists(SC): shutil.rmtree(SC)
os.makedirs(SC)
V = f"{WM}/scripts/w03/verwerk_antwoord_P2_N1-W03.py"
def rd(p): return list(csv.DictReader(open(p, encoding="utf-8", newline=""), delimiter="\t"))
REV = rd(f"{WM}/p2/review_native_N1-W03.tsv"); LOG = rd(f"{WM}/p2/N1-W03_wijzigingslog.tsv")
IDX = {(r["item_id"], r["veld"]): r["wijziging_id"] for r in LOG}
B2 = [r["wijziging_id"] for r in REV if r["deel"] == "2b nieuw"]
def alle_2b(behalve=()): return " · ".join(f"{w} ja" for w in B2 if w not in behalve)
VOOR3 = {r["item_id"]: r for r in rd(f"{WM}/bron/APP_EXPORT_N1-W03_2026-10-20.tsv")}
res = []
def test(naam, antwoord, verwacht, controle=None):
    d = os.path.join(SC, f"t{len(res):02d}"); os.makedirs(d); a = os.path.join(d, "antwoord.txt"); open(a, "w", encoding="utf-8").write(antwoord + "\n")
    u = os.path.join(d, "uit")
    p = subprocess.run([sys.executable, "-I", V, WM, a, u, "--datum", "test"], capture_output=True, text=True)
    ok, extra = p.returncode == verwacht, ""
    if ok and controle:
        try: extra = controle(u) or ""
        except AssertionError as e: ok, extra = False, f"controle faalt: {e}"
    laatste = [l for l in (p.stdout + p.stderr).strip().splitlines() if l.strip()][-1:] or [""]
    res.append((ok, naam, verwacht, p.returncode, (extra or laatste[0])[:160]))
def terug(u):
    return sorted({r["item_id"] for r in rd(f"{u}/N1-W03_wijzigingslog_P2.tsv") if r["status"] == "afgewezen"})
def na(u, w=3): return {r["item_id"]: r for r in rd(f"{u}/APP_NA_N1-W0{w}_P2.tsv")}
def c_alles(u):
    st = {r["status"] for r in rd(f"{u}/N1-W03_wijzigingslog_P2.tsv")}; assert st == {"goedgekeurd"}, st
    assert open(f"{u}/APP_NA_N1-W03_P2.tsv", "rb").read() == open(f"{WM}/p2/proef/APP_NA_N1-W03_proef.tsv", "rb").read(), "NA ≠ proef"
    return "636 goedgekeurd · NA W03 = proef"
def c_3b(u):
    t = terug(u); assert t == ["U3-lezen-01"], t
    n = sum(1 for r in rd(f"{u}/N1-W03_wijzigingslog_P2.tsv") if r["item_id"] == "U3-lezen-01" and r["status"] == "afgewezen"); assert n == 10, n
    assert na(u)["U3-lezen-01"]["points"] == "5" and na(u)["U3-lezen-01"]["options"] == VOOR3["U3-lezen-01"]["options"]
    return "U3-lezen-01: 10 regels afgewezen, NA = VOOR (5 punten)"
def c_w0525(u):
    t = terug(u); assert t == ["U3-grammatica-02-1"], t
    assert na(u)["U3-grammatica-02-1"]["exercise_type"] == "open-tekst" and na(u)["U3-grammatica-02-2"]["exercise_type"] == "meerkeuze"
    md = open(f"{u}/VERWERKING_P2_N1-W03.md", encoding="utf-8").read(); assert "reeks `U3-grammatica-02`" in md and ("K die blijven: RD" in md or "K die blijven: RT" in md), "K-rapport ontbreekt"
    return "U3-grammatica-02-1 terug (blijft open-tekst), -02-2 meerkeuze; reeks en K's in het rapport"
def c_aangepast(u):
    r = next(x for x in rd(f"{u}/review_native_N1-W03_P2.tsv") if x["wijziging_id"] == IDX[("U3-grammatica-02-1", "input_arabic")])
    assert r["akkoord"] == "aangepast" and r["opmerking"].endswith("Ibra-tekst: أَنَا …دْرُسُ"), r["opmerking"][-60:]
    assert na(u)["U3-luisteren-03"]["correct_answer"] == "wakker worden|ontbijten|naar school gaan", "variant a niet gebruikt"
    return "Ibra-tekst zonder '· 8a'; variant a van U3-luisteren-03 in de NA"
def c_10b(u):
    assert na(u)["U3-luisteren-08"]["review_flag"] == "" and na(u)["U3-luisteren-08"]["is_published"] == "false"; return "vlag U3-luisteren-08 leeg, gedepubliceerd"
def c_4nee(u):
    t = terug(u); assert t == ["U3-reflectie-01"], t; return "U3-reflectie-01 terug"
test("T01 'P2 akkoord' = alle aanbevelingen", "P2 akkoord", 0, c_alles)
test("T02 '3b' → puntenregel nee → U3-lezen-01 item-atomair terug", "P2 akkoord · 3b", 0, c_3b)
test("T03 W-id genoemd maar niet alle 2b → STOP (typfoutvanger)", "P2 akkoord · W0525 nee", 2)
test("T04 'W0525 nee' met alle andere 2b ja", f"P2 akkoord · deel 1 ja · 2a ja · W0525 nee · {alle_2b(('W0525',))}", 0, c_w0525)
test("T05 onbekende beslissing 12", "P2 akkoord · 12a", 2)
test("T06 '2 nee' (log niet goedgekeurd) → STOP", "P2 akkoord · 2 nee", 2)
test("T07 'aangepast' gevolgd door '· 8a'", f"P2 akkoord · W0525 aangepast أَنَا …دْرُسُ · 8a · {alle_2b(('W0525',))}", 0, c_aangepast)
test("T08 zonder 'P2 akkoord' → STOP", "akkoord", 2)
test("T09 twee besluiten voor 3", "P2 akkoord · 3b · 3a", 2)
test("T10 typfout-id buiten 2b, 2b niet genoemd → STOP", "P2 akkoord · W0459 ja", 2)
test("T11 '10b' → vlag leeg", "P2 akkoord · 10b", 0, c_10b)
test("T12 '4 nee' → U3-reflectie-01 terug", "P2 akkoord · 4 nee", 0, c_4nee)
test("T13 onbekend token", "P2 akkoord · misschien", 2)
test("T14 'W0045 ja maar …' → STOP", f"P2 akkoord · W0045 ja maar zonder أَنَا · {alle_2b(('W0045',))}", 2)
test("T15 keuze die niet bestaat (3c)", "P2 akkoord · 3c", 2)
# T16: verwerk_p2 v1.2 zonder --logbesluiten terwijl het bestand bestaat (uit T02)
u2 = os.path.join(SC, "t01", "uit"); d = os.path.join(SC, "t16"); os.makedirs(d)
p = subprocess.run([sys.executable, "-I", f"{WM}/scripts/verwerk_p2_N1-W03.py", f"{u2}/basis/N1-W03_wijzigingslog.tsv", f"{u2}/review_native_N1-W03_P2.tsv", f"{d}/log.tsv"], capture_output=True, text=True)
res.append((p.returncode != 0 and "verplicht" in (p.stdout + p.stderr), "T16 verwerk_p2 v1.2 zonder --logbesluiten (bestand bestaat) → STOP", "≠0", p.returncode, (p.stdout + p.stderr).strip()[-120:]))
# T17: de oude verwerk_p2 v1.1 laat in hetzelfde geval de 'nee' stil door (het lek dat 9T vond)
p = subprocess.run([sys.executable, "-I", f"{WM}/scripts/verwerk_p2_N1-W02.py", f"{u2}/basis/N1-W03_wijzigingslog.tsv", f"{u2}/review_native_N1-W03_P2.tsv", f"{d}/log_oud.tsv"], capture_output=True, text=True)
lek = p.returncode == 0 and next(r for r in rd(f"{d}/log_oud.tsv") if r["wijziging_id"] == IDX[("U3-lezen-01", "points")])["status"] == "goedgekeurd"
res.append((lek, "T17 controle: v1.1 zonder vlag keurt de 'nee' stil goed (daarom v1.2)", "lek", p.returncode, "bevestigd" if lek else "niet gereproduceerd"))
alles = all(r[0] for r in res)
for ok, naam, v, c, x in res: print(f"{'OK ' if ok else 'FOUT'} · {naam} · verwacht {v} · kreeg {c} · {x}")
print("ALLE TESTS GESLAAGD" if alles else "STOP: een test faalt"); sys.exit(0 if alles else 2)
