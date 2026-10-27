# test_apply_log_v1_4.py v1.1 — Verbeteraar-T/Controleur-T (4T) · N1-W06 · negatieve tests en regressie voor apply_log v1.4.1 (techplan T6, 9T V2–V7;
# v1.1: de randtests R1–R12 van 9T P2 (F2, F3, F8) als vaste tests T14–T22; T0 = een volledige reeks; regressie met een aangevulde review).
# Elke test bouwt een klein log (kopie van een echte regel, één ding fout) op een kopie van de bron, draait apply_log en controleert de
# uitkomst (exitcode en reden). Regressie: v1.4 geeft op de W05-proef (P2 W05) per week byte-gelijk dezelfde NA als v1.3.
# Gebruik: python3 -I test_apply_log_v1_4.py <scripts-map> <werkmap>
import sys, os, csv, json, subprocess, shutil, hashlib
csv.field_size_limit(10**9)
S, W = sys.argv[1:3]
os.makedirs(W, exist_ok=True)
E6 = "bron/APP_EXPORT_N1-W06_2026-10-27.tsv"; LOG = "p2/proef/log_proef.tsv"; REV = "p2/proef/review_proef.tsv"
kop = open(LOG, encoding="utf-8").readline().rstrip("\n").split("\t"); K = {c: i for i, c in enumerate(kop)}
rijen = [l.rstrip("\n").split("\t") for l in open(LOG, encoding="utf-8")][1:]
def regels(**f):
    return [r for r in rijen if all(r[K[k]] == v for k, v in f.items())]
def schrijf(naam, rs):
    p = os.path.join(W, naam)
    with open(p, "w", encoding="utf-8") as fh:
        fh.write("\t".join(kop) + "\n")
        for r in rs: fh.write("\t".join(r) + "\n")
    return p
def draai(log, rev=REV, extra=()):
    c = subprocess.run([sys.executable, "-I", os.path.join(S, "apply_log.py"), E6, log, os.path.join(W, "uit.tsv"), "--week", "6", "--review", rev, "--apply", "--stil", *extra],
                       capture_output=True, text=True)
    return c.returncode, c.stdout
def rij_reeks(iid):   # alle regels van één nieuw item, in logvolgorde
    return [r for r in rijen if r[K["item_id"]] == iid]
def kopie(r, **f):
    r = list(r)
    for k, v in f.items(): r[K[k]] = v
    return r
uitslag = []
def test(naam, log, verwacht_exit, verwacht_tekst, rev=REV):
    code, out = draai(log, rev)
    ok = code == verwacht_exit and (verwacht_tekst in out)
    uitslag.append((naam, ok, code, verwacht_tekst, next((l.strip() for l in out.splitlines() if "GEWEIGERD" in l or l.startswith("STOP") or l.startswith("geschreven")), "")))
# 0. positief: de volledige reeks U6-lezen-05 (macro-rij gedepubliceerd + 6 subitems) → 6 nieuwe rijen, exit 0
REEKS05 = [r for r in rijen if r[K["item_id"]] == "U6-lezen-05" or r[K["item_id"]].startswith("U6-lezen-05-")]
test("T0 positief: reeks U6-lezen-05 volledig (macro-rij false, 6 subitems true)", schrijf("t0.tsv", REEKS05), 0, "nieuwe rijen: 6")
# 1. oud ≠ live
r = regels(item_id="U6-lezen-02", veld="instruction_nl")[0]
test("T1 oud ≠ live → geweigerd", schrijf("t1.tsv", [kopie(r, oud=r[K["oud"]] + " X")]), 2, "oud wijkt af")
# 2. review zonder ja
rv = [l.rstrip("\n").split("\t") for l in open(REV, encoding="utf-8")]
RK = {c: i for i, c in enumerate(rv[0])}
r = regels(item_id="U6-lezen-01", veld="input_arabic")[0]
rv2 = [rv[0]] + [kopie_r if kopie_r[RK["wijziging_id"]] != r[K["wijziging_id"]] else [*kopie_r[:RK["akkoord"]], "nee", *kopie_r[RK["akkoord"] + 1:]] for kopie_r in rv[1:]]
revp = os.path.join(W, "rev_nee.tsv"); open(revp, "w", encoding="utf-8").write("\n".join("\t".join(x) for x in rv2) + "\n")
test("T2 review ≠ ja → geweigerd", schrijf("t2.tsv", [r]), 2, "native-review ontbreekt", rev=revp)
# 3. insert met een bestaand item_id
reeks = rij_reeks("U6-lezen-05-1")
test("T3 (rij) met een bestaand item_id → geweigerd", schrijf("t3.tsv", [kopie(reeks[0], item_id="U6-lezen-02")]), 2, "bestaat al")
# 4. NFC: nieuw niet in NFC (ـَتْ met sukūn vóór fatḥa)
r = regels(item_id="U6-lezen-02", veld="instruction_nl")[0]
test("T4 nieuw niet in NFC → geweigerd", schrijf("t4.tsv", [kopie(r, nieuw=r[K["nieuw"]] + " ذَهَبَتْ".replace("َت", "َ" + "ت").replace("تْ", "ت" + "ْ") + "َْ")]), 2, "NFC")
# 5. (rij) met is_published = true
sp = json.loads(reeks[0][K["nieuw"]]); sp["is_published"] = "true"
test("T5 (rij) met is_published = true → geweigerd", schrijf("t5.tsv", [kopie(reeks[0], nieuw=json.dumps(sp, ensure_ascii=False))]), 2, "is_published = false")
# 6. display_order ≠ die van na (renummering)
sp = json.loads(reeks[0][K["nieuw"]]); sp["display_order"] = "99"
test("T6 (rij) met een andere display_order → geweigerd", schrijf("t6.tsv", [kopie(reeks[0], nieuw=json.dumps(sp, ensure_ascii=False))]), 2, "display_order ≠ die van na")
# 7. meer dan 9 nieuwe rijen in één reeks
tien = []
for k in range(1, 11):
    sp = json.loads(reeks[0][K["nieuw"]]); sp["na"] = "U6-lezen-05" if k == 1 else f"U6-lezen-05-T{k-1}"
    tien.append(kopie(reeks[0], item_id=f"U6-lezen-05-T{k}", nieuw=json.dumps(sp, ensure_ascii=False)))
test("T7 nieuwe rij met een item_id buiten <macro>-1 … -9 → geweigerd", schrijf("t7.tsv", tien), 2, "met k = 1 … 9")
# 8. veldregel op een rij die nog niet bestaat
test("T8 veldregel zonder (rij)-regel → geweigerd", schrijf("t8.tsv", reeks[1:2]), 2, "niet in de export")
# 9. koppelen: options ≠ de linkerkanten
# (U6-grammatica-01: Nederlandse opties, dus geen review-binding op dat veld; alleen de koppelen-controle kan dit vangen)
g01 = regels(item_id="U6-grammatica-01")
def omgedraaid(x):
    if x[K["veld"]] != "options": return x
    o = json.loads(x[K["nieuw"]]); return kopie(x, nieuw=json.dumps(o[::-1], ensure_ascii=False))
test("T9 koppelen: options in een andere volgorde dan de sleutel → STOP", schrijf("t9.tsv", [omgedraaid(x) for x in g01]), 2, "options ≠ de linkerkanten")
# 10. koppelen: twee rechterkanten vallen samen zonder strict
r_key = regels(item_id="U6-grammatica-01", veld="correct_answer")[0]
alles = regels(item_id="U6-grammatica-01")
zonder_strict = [x for x in alles if x[K["veld"]] != "strict_tashkeel"]
test("T10 koppelen zonder strict, rechterkanten verschillen alleen in tashkīl → STOP", schrijf("t10.tsv", zonder_strict), 2, "vallen samen")
# 11. tweede (rij) voor hetzelfde item (dubbele insert)
test("T11 dubbele (rij)-regel → geweigerd", schrijf("t11.tsv", reeks + reeks[:1]), 2, "bestaat al")
# 12. (rij) met een week die niet bij het item_id past
sp = json.loads(reeks[0][K["nieuw"]]); sp["week"] = "5"; sp["unit_code"] = "U5"
test("T12 (rij) met week 5 voor U6-… → geweigerd", schrijf("t12.tsv", [kopie(reeks[0], nieuw=json.dumps(sp, ensure_ascii=False))]), 2, "week past niet")
# 13. (rij) met oud ≠ «(nieuw)»
test("T13 (rij) met oud ≠ «(nieuw)» → geweigerd", schrijf("t13.tsv", [kopie(reeks[0], oud="")]), 2, "oud moet")
# v1.1: randtests van 9T P2 als vaste tests
def zet(rs, wid_of_veld, **f):
    return [kopie(x, **f) if (x[K["wijziging_id"]] == wid_of_veld or x[K["veld"]] == wid_of_veld) else x for x in rs]
r14 = [kopie(x, status="afgewezen") if (x[K["item_id"]] == "U6-lezen-05-1" and x[K["veld"]] == "options") else x for x in REEKS05]
test("T14 (9T R1) nieuwe rij met een afgewezen veldregel → STOP", schrijf("t14.tsv", r14), 2, "alles-of-niets")
r15 = [kopie(x, status="afgewezen") if x[K["item_id"]] != "U6-lezen-05" else x for x in REEKS05]
test("T15 (9T R2) macro-rij gedepubliceerd, alle subitems afgewezen → STOP", schrijf("t15.tsv", r15), 2, "subitems zijn niet gemaakt")
r16 = [kopie(x, status="afgewezen") if x[K["item_id"]] == "U6-lezen-05" else x for x in REEKS05]
test("T16 (9T R12) macro-rij afgewezen, subitems gepubliceerd → STOP", schrijf("t16.tsv", r16), 2, "blijft zichtbaar naast")
a = rij_reeks("U6-lezen-05-1"); b = rij_reeks("U6-lezen-05-2"); sp = json.loads(b[0][K["nieuw"]]); sp["na"] = "U6-lezen-05"
test("T17 (9T R3) twee nieuwe rijen met dezelfde na → geweigerd (geen AssertionError)", schrijf("t17.tsv", a + [kopie(b[0], nieuw=json.dumps(sp, ensure_ascii=False))] + b[1:]), 2, "er staat al een nieuwe rij na")
test("T18 (9T R9) item_id met een andere vaardigheid dan skill → geweigerd", schrijf("t18.tsv", [kopie(x, item_id="U6-luisteren-05-1") for x in a]), 2, "≠ U6-lezen-05-k")
g01 = regels(item_id="U6-grammatica-01"); kk = [x for x in g01 if x[K["veld"]] == "correct_answer"][0]
p_ = kk[K["nieuw"]].split("|"); p_[0] += "=x"
test("T19 (9T R5b) koppelen-paar met twee = → STOP", schrijf("t19.tsv", [kopie(x, nieuw="|".join(p_)) if x is kk else x for x in g01]), 2, "precies één =")
g03 = regels(item_id="U6-grammatica-03"); k3 = [x for x in g03 if x[K["veld"]] == "correct_answer"][0]
p3 = k3[K["nieuw"]].split("|"); L_ = [q.split("=", 1)[0] for q in p3]; R_ = [q.split("=", 1)[1] for q in p3]
test("T20 (9T R6) koppelen-paren verwisseld (zelfde woorden) → review bindt de inhoud", schrijf("t20.tsv", [kopie(x, nieuw="|".join(f"{l}={q}" for l, q in zip(L_, R_[1:] + R_[:1]))) if x is k3 else x for x in g03]), 2, "inhoud ≠ de tekst die in de review")
rv0 = [l.rstrip("\n").split("\t") for l in open(REV, encoding="utf-8")]
revp2 = os.path.join(W, "rev_zonder_gr03.tsv"); open(revp2, "w", encoding="utf-8").write("\n".join("\t".join(x) for x in rv0 if x[0] != k3[K["wijziging_id"]]) + "\n")
test("T21 (9T F3) nieuwe koppeling met dezelfde Arabische woorden, zonder reviewregel → geweigerd", schrijf("t21.tsv", g03), 2, "native-review ontbreekt", rev=revp2)
l3 = regels(item_id="U6-luisteren-03"); x7 = [x for x in l3 if x[K["veld"]] == "feedback_correct"][0]
test("T22 (9T R7) afgeleide reviewregel, inhoud gewijzigd → geweigerd", schrijf("t22.tsv", [kopie(x, nieuw=x[K["nieuw"]].replace("بَاسِم", "بَاسِل")) if x is x7 else x for x in l3]), 2, "inhoud ≠ de tekst die in de review")
r23 = [kopie(x, status="afgewezen") if (x[K["item_id"]].startswith("U6-lezen-05-") and x[K["veld"]] == "is_published") else x for x in REEKS05]
test("T23 (9T R11) publicatie van de subitems afgewezen → STOP", schrijf("t23.tsv", r23), 2, "alles-of-niets")
# Regressie: v1.4.1 ≡ v1.3 op de W05-proef van P2 W05. v1.4.1 vraagt (regel 9) ook een reviewregel voor een herschikking van Arabische
# opties/sleutels; die regels stonden in W05 niet in de review. De regressie draait daarom met de W05-review, aangevuld met precies die
# regels (akkoord ja, voorgesteld = nieuw), en telt ze: de toepassing zelf moet byte-gelijk blijven.
W5 = "/home/claude/N1-W05"; reg = []
for w, src in (("5", "bron/APP_EXPORT_N1-W05_2026-10-26.tsv"), ("4", "bron/APP_EXPORT_N1-W04_2026-10-24_naP4.tsv"), ("3", "bron/APP_EXPORT_N1-W03_2026-10-24_naP4.tsv"), ("2", "bron/APP_EXPORT_N1-W02_2026-10-24_naP4.tsv")):
    md = {}
    rev5 = os.path.join(W5, "p2/proef/review_proef.tsv"); rv5 = [l.rstrip("\n").split("\t") for l in open(rev5, encoding="utf-8")]
    R5K = {c: i for i, c in enumerate(rv5[0])}; in_rev = {x[R5K["wijziging_id"]] for x in rv5[1:]}
    log5 = [l.rstrip("\n").split("\t") for l in open(os.path.join(W5, "p2/proef/log_proef.tsv"), encoding="utf-8")]; L5K = {c: i for i, c in enumerate(log5[0])}
    import unicodedata as _u, re as _re
    extra = []
    for x in log5[1:]:
        o_, n_ = x[L5K["oud"]], x[L5K["nieuw"]]
        if x[L5K["wijziging_id"]] not in in_rev and x[L5K["veld"]] in ("correct_answer", "options") and _re.search(r"[\u0600-\u06ff]", n_) and n_ != _u.normalize("NFC", o_) and _re.match(rf"U{w}-", x[L5K["item_id"]]):
            r_ = [""] * len(rv5[0]); r_[R5K["wijziging_id"]] = x[L5K["wijziging_id"]]; r_[R5K["deel"]] = "2a hergebruik"; r_[R5K["item_id"]] = x[L5K["item_id"]]
            r_[R5K["veld"]] = x[L5K["veld"]]; r_[R5K["voorgesteld"]] = n_; r_[R5K["akkoord"]] = "ja"; extra.append(r_)
    rev5b = os.path.join(W, f"reg_review_W0{w}.tsv"); open(rev5b, "w", encoding="utf-8").write("\n".join("\t".join(x) for x in rv5 + extra) + "\n")
    for versie, sc, rv_ in (("v1.3", os.path.join(W5, "scripts", "apply_log.py"), rev5), ("v1.4.1", os.path.join(S, "apply_log.py"), rev5b)):
        uit = os.path.join(W, f"reg_W0{w}_{versie}.tsv")
        if os.path.exists(uit): os.remove(uit)
        c = subprocess.run([sys.executable, "-I", sc, os.path.join(W5, src), os.path.join(W5, "p2/proef/log_proef.tsv"), uit, "--week", w, "--review", rv_, "--apply", "--stil"], capture_output=True, text=True)
        md[versie] = (c.returncode, hashlib.md5(open(uit, "rb").read()).hexdigest() if os.path.exists(uit) else "—")
    reg.append((w, md["v1.3"], md["v1.4.1"], md["v1.3"] == md["v1.4.1"], len(extra)))
print("| test | uitkomst | exit | verwacht | melding |"); print("|---|---|---|---|---|")
for naam, ok, code, v, msg in uitslag: print(f"| {naam} | {'✓' if ok else '✗'} | {code} | «{v}» | {msg[:110]} |")
print("\n| regressie W05-proef | v1.3 (exit, md5) | v1.4.1 (exit, md5) | gelijk | reviewregels bijgevoegd (regel 9) |"); print("|---|---|---|---|---|")
for w, a, b, g, n in reg: print(f"| W0{w} | {a[0]}, {a[1]} | {b[0]}, {b[1]} | {'✓' if g else '✗'} | {n} |")
fout = sum(1 for x in uitslag if not x[1]) + sum(1 for x in reg if not x[3])
print(f"\nTESTS: {len(uitslag)} negatief/positief · {len(reg)} regressie · {'GROEN' if fout == 0 else f'STOP ({fout})'}")
sys.exit(2 if fout else 0)
