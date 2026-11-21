# maak_weeklog_N1-W11.py v1.0 — Maker-T (7T) · P3 N1-W11 · voegt de vier goedgekeurde W11-logs (groep 1, delta groep 1, groep 2, groep 3) en hun
#   reviewlijsten samen tot één weeklog en één weekreview, en maakt de P3-delta met de display_order-regels van blok V_W11 (B30).
#   Waarom: de drie groepslogs gebruiken elk de reeks W0001 …, dus een wijziging_id is pas uniek met de groep erbij. Elke id krijgt daarom een
#   voorvoegsel (G1-, D1-, G2-, G3-); verder wordt GEEN veld gewijzigd: de regels staan byte-gelijk (op het voorvoegsel na) en in dezelfde volgorde.
#   De bronbestanden blijven ongewijzigd naast de samenvoeging; `bewijs` toont per bron dat elke regel terug te vinden is.
#   De V-regels: display_order = rangnummer in de didactische volgorde luisteren → lezen → spreken → schrijven → grammatica → cultuur → reflectie,
#   subitems op nummer, 1 … n (B30, zoals W01–W10); status «voorgesteld» tot «P3 akkoord»; met --proef status «goedgekeurd» en besluit «proef P3 (B30)».
#   Platte tabregels zonder csv-quoting (B35).
# Gebruik: python3 -I maak_weeklog_N1-W11.py <uitmap> <VOOR.tsv> G1=<log>,<review> D1=<log>,<review> G2=<log>,<review> G3=<log>,<review> [--proef]
import sys, os, csv, io, re, hashlib
csv.field_size_limit(10**9)
A = sys.argv[1:]; PROEF = "--proef" in A; A = [a for a in A if a != "--proef"]
UIT, VOOR = A[0], A[1]; BRONNEN = [(x.split("=", 1)[0], *x.split("=", 1)[1].split(",")) for x in A[2:]]
assert [b[0] for b in BRONNEN] == ["G1", "D1", "G2", "G3"], "volgorde G1, D1, G2, G3 (de toepassingsvolgorde van P3)"
LOGKOP = "wijziging_id\titem_id\tveld\toud\tnieuw\tvoorgesteld\ttype\ternst\treden\therkomst\tstatus\tbesluit_ibra"
REVKOP = "wijziging_id\titem_id\tveld\tdeel\tgroep\toud\tvoorgesteld\treden\takkoord\topmerking"
md5 = lambda p: hashlib.md5(open(p, "rb").read()).hexdigest()
def regels(p, kop):
    L = open(p, encoding="utf-8").read().split("\n")
    assert L[0] == kop, f"{p}: kop ≠ {kop!r}"
    assert L[-1] == "", f"{p}: geen afsluitend regeleinde"
    R = [l.split("\t") for l in L[1:-1]]
    assert all(len(r) == kop.count("\t") + 1 for r in R), f"{p}: niet elke regel heeft {kop.count(chr(9)) + 1} kolommen"
    return R
os.makedirs(UIT, exist_ok=True)
log, rev, ids, bewijs = [], [], set(), []
for pre, lp, rp in BRONNEN:
    L = regels(lp, LOGKOP); R = regels(rp, REVKOP)
    assert {r[10] for r in L} == {"goedgekeurd"}, f"{lp}: niet alle regels goedgekeurd"
    assert {r[8] for r in R} == {"ja"}, f"{rp}: niet alle reviewregels op ja"
    lid = {r[0] for r in L}
    assert len(lid) == len(L) and {r[0] for r in R} <= lid, f"{pre}: dubbele id of reviewregel zonder logregel"
    for r in L:
        n = f"{pre}-{r[0]}"; assert n not in ids; ids.add(n); log.append([n] + r[1:])
    for r in R: rev.append([f"{pre}-{r[0]}"] + r[1:])
    bewijs.append(f"{pre}\t{os.path.basename(lp)}\t{md5(lp)}\t{len(L)}\t{os.path.basename(rp)}\t{md5(rp)}\t{len(R)}")
# V-regels (B30)
VOLG = ["luisteren", "lezen", "spreken", "schrijven", "grammatica", "cultuur", "reflectie"]
rd = list(csv.reader(io.StringIO(open(VOOR, encoding="utf-8", newline="").read()), delimiter="\t")); K = rd[0]
V = [dict(zip(K, r)) for r in rd[1:]]
assert {r["display_order"] for r in V} == {"0"}, "display_order is niet overal 0 in VOOR"
def sleutel(r):
    d = r["item_id"].split("-"); assert d[0] == "U11" and d[1] == r["skill"], r["item_id"]
    return (VOLG.index(r["skill"]), tuple(int(x) for x in d[2:]))
orde = sorted(V, key=sleutel)
REDEN = ("B30: display_order = rangnummer in de didactische volgorde luisteren → lezen → spreken → schrijven → grammatica → cultuur → reflectie, subitems op nummer, 1 … n. "
         "Alle 182 items van W11 staan op 0, dus de unitpagina sorteert alfabetisch (cultuur eerst, -10 vóór -2; check v1.10 K «app-volgorde», tot nu met --uitzondering=U11-lezen-02). "
         "Eigen laatste blok V_W11 (B17, B30).")
vlog = [[f"V-V{n:04d}", r["item_id"], "display_order", "0", str(n), str(n), "technisch", "K", REDEN, "P3 N1-W11 · 4D (P3) · B30",
         "goedgekeurd" if PROEF else "voorgesteld", "proef P3 (B30)" if PROEF else ""] for n, r in enumerate(orde, 1)]
def schrijf(p, kop, R):
    for r in R:
        for v in r: assert "\t" not in v and "\n" not in v and "\r" not in v, f"{p}: echte tab of regeleinde in een veld (B35)"
    open(p, "w", encoding="utf-8", newline="").write(kop + "\n" + "".join("\t".join(r) + "\n" for r in R))
    return md5(p)
m1 = schrijf(f"{UIT}/N1-W11_wijzigingslog.tsv", LOGKOP, log)
m2 = schrijf(f"{UIT}/review_native_N1-W11.tsv", REVKOP, rev)
vnaam = "N1-W11_V_wijzigingslog_PROEF.tsv" if PROEF else "N1-W11_V_wijzigingslog.tsv"
m3 = schrijf(f"{UIT}/{vnaam}", LOGKOP, vlog)
open(f"{UIT}/HERKOMST_weeklog_N1-W11.tsv", "w", encoding="utf-8").write("voorvoegsel\tlog\tmd5_log\tregels_log\treview\tmd5_review\tregels_review\n" + "\n".join(bewijs) + "\n")
print(f"weeklog: {len(log)} regels (md5 {m1}) · weekreview: {len(rev)} regels (md5 {m2}) · {vnaam}: {len(vlog)} regels (md5 {m3})")
for b in bewijs: print("  bron", b.replace("\t", " · "))
print("  volgorde V: " + ", ".join(f"{n}={r['item_id']}" for n, r in list(enumerate(orde, 1))[:3]) + " … " + ", ".join(f"{n}={r['item_id']}" for n, r in list(enumerate(orde, 1))[-2:]))
