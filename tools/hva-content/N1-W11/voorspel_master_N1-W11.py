# voorspel_master_N1-W11.py v2.8 (= voorspel_master_N1-W10.py v2.7, md5 bd031159967a3eff69fc37c8ed42eb7a, voor W11) — Maker-T (7T) · P3 N1-W11: hoofdweek 11 + nazorgweek 10;
#   bron = de N1-export van stap 0 P3 (bron/APP_EXPORT_N1_2026-11-21.tsv, 4d2cffa5…, 2.323 rijen, met de drift op U10-grammatica-02-3) en de app-ware master
#   van stap 0 (bron/LEESBARE_LIJST_MASTER_appwaar_2026-11-21.tsv, 7df0d60e… = master 009b9cd2… na P4 W10 met de live rij van U10-grammatica-02-3); de tekst
#   noemt de md5 van de export nu uit het bestand (v2.7 had een vaste md5 van een vorige week in de tekst).
# voorspel_master_N1-W09.py v2.6 (= voorspel_master_N1-W10.py v2.5, md5 fe45e195358704a8821d810d44b14208, voor W09) — Maker-T (7T) · P3 N1-W09: hoofdweek 9 + nazorgweek 8;
#   bron = de N1-export van stap 0 W09 (bron/APP_EXPORT_N1_2026-11-17.tsv, 50a50f94…, 2.323 rijen) en de master na P4 W08 (bron/LEESBARE_LIJST_MASTER_e2bb3d3d.tsv). Basis: de kop van v2.5 hieronder.
# voorspel_master_N1-W10.py v2.5 (= v2.4, md5 b9daa42ab35ec495cca3a11c99dede80, + de P3-delta-2 N1-W08 E1; 8T C-T11) — Maker-T (7T): de herbouwtest wist
#   alleen wat ze zelf maakte: <uitmap>/herbouwtest mag vooraf niet bestaan (anders STOP, niets gewist); daarna worden alleen haar eigen drie bestanden (n1.tsv, rest.tsv,
#   master.tsv) verwijderd en de lege map met os.rmdir (vroeger: elk bestand in die map). De voorspelling is byte-gelijk aan v2.4.
# Basis: de kop van v2.4 hieronder.
# voorspel_master_N1-W10.py v2.4 (= voorspel_master_N1-W07.py v2.3, md5 4aa5015858d392fa6a1c3f96e7b99df1, voor W08 · 7T P3 N1-W08): de master zoals hij na P4 van N1-W08 moet zijn,
#   vooraf uit de N1-export na P4 W07 (bron/APP_EXPORT_N1_naP4_N1-W07.tsv, 18251ce4…, 2.323 rijen) met de weken van de SQL-root (`--sql`; met W07n: W08, W07, W05, W04;
#   zonder W07n: W08, W05, W04 — W07 blijft dan de stand na P4 W07) = de NA van P3, en de rest uit de huidige master f04cb6f3… (bron/LEESBARE_LIJST_MASTER_f04cb6f3.tsv).
#   NIEUW t.o.v. v2.3: (a) de weken komen uit BLOKKEN_MANIFEST.tsv van de root (één voorspelling per variant, elk in een eigen uitmap); (b) herbouwtest: de master uit de
#   ONGEWIJZIGDE export moet byte-gelijk zijn aan de huidige master (anders STOP: de rest of de export klopt niet); (c) geen vaste rijtelling: rijen = de NA-bestanden.
#   De rijen van de hoofdweek krijgen display_order 1 … n (B30): de master sorteert erop. Schrijft ook VOORSPELDE_MD5.txt.
# Gebruik: python3 -I voorspel_master_N1-W10.py <werkmap> <uitmap> --sql <SQL-root, bv. p3/sql of p3/sql_zonder_W07n>
import sys, os, csv, subprocess, hashlib, collections
csv.field_size_limit(10**9)
WM, UIT = sys.argv[1], sys.argv[2]; os.makedirs(UIT, exist_ok=True)
SQLR = sys.argv[sys.argv.index("--sql") + 1] if "--sql" in sys.argv else "p3/sql"
S = os.path.join(WM, "scripts")
md5 = lambda p: hashlib.md5(open(p, "rb").read()).hexdigest()
HW = 11; WKN = lambda w: f"N1-W{w:02d}"   # v2.8 (W11): hoofdweek 11, nazorgweek 10 (uit het manifest)
EXP = f"{WM}/bron/APP_EXPORT_N1_2026-11-21.tsv"; MASTER = f"{WM}/bron/LEESBARE_LIJST_MASTER_appwaar_2026-11-21.tsv"   # v2.8 (W11), 8T-bron: de N1-export en de app-ware master van stap 0
assert md5(EXP) == "4d2cffa52d76b257a5e32d27f089c455" and md5(MASTER) == "7df0d60ed4415e61b0c38721a0bab84f", "bron wijkt af"   # 8T-bron: stap 0 P3 N1-W11
WEKEN = [int(w[-2:]) for w in dict.fromkeys(l.split("\t")[1] for l in list(open(f"{WM}/{SQLR}/BLOKKEN_MANIFEST.tsv", encoding="utf-8"))[1:])]
assert WEKEN[0] == HW, WEKEN
run = lambda *a: subprocess.run(["python3", "-I", *a], capture_output=True, text=True, check=True).stdout
# (b) herbouwtest: export ongewijzigd → master = de huidige master
_h = f"{UIT}/herbouwtest"; assert not os.path.lexists(_h), f"{_h} bestaat al (niet door deze aanroep gemaakt): STOP, niets gewist (v2.5)"; os.makedirs(_h)
run(f"{S}/app_naar_master.py", EXP, f"{_h}/n1.tsv", "N1"); run(f"{S}/master_rest_uit_master.py", MASTER, f"{_h}/n1.tsv", f"{_h}/rest.tsv"); run(f"{S}/maak_master.py", f"{_h}/n1.tsv", f"{_h}/rest.tsv", f"{_h}/master.tsv")
HERBOUW = md5(f"{_h}/master.tsv"); assert HERBOUW == md5(MASTER), f"herbouwtest: master uit de ongewijzigde export {HERBOUW} ≠ de huidige master"
for f_ in ("n1.tsv", "rest.tsv", "master.tsv"): os.remove(f"{_h}/{f_}")   # v2.5: alleen de eigen bestanden
os.rmdir(_h)
E = list(csv.DictReader(open(EXP, encoding="utf-8", newline=""), delimiter="\t")); kop = list(E[0].keys())
NAP = {w: f"{WM}/p3/APP_NA_{WKN(w)}.tsv" for w in WEKEN}
NA = {}
for w, p in NAP.items():
    R = list(csv.DictReader(open(p, encoding="utf-8", newline=""), delimiter="\t")); assert list(R[0].keys()) == kop and all(r["week"] == str(w) for r in R)
    NA.update({r["item_id"]: r for r in R})
bestaand = {r["item_id"] for r in E}
NIEUW = [i for i in NA if i not in bestaand]
assert len(NIEUW) == 0, "geen nieuwe rijen deze week"
assert sum(r["item_id"] in NA for r in E) == len(NA) == sum(1 for r in E if int(r["week"]) in WEKEN)
rows = [NA.get(r["item_id"], r) for r in E]
rows.sort(key=lambda r: (int(r["week"]), int(r["display_order"] or 0), r["item_id"]))   # = app_export_week.py
with open(f"{UIT}/n1_voorspeld.tsv", "w", encoding="utf-8", newline="") as f:
    w = csv.writer(f, delimiter="\t", lineterminator="\n", quoting=csv.QUOTE_MINIMAL); w.writerow(kop)
    for r in rows: w.writerow([r[k] for k in kop])
run(f"{S}/app_naar_master.py", f"{UIT}/n1_voorspeld.tsv", f"{UIT}/n1_lijst.tsv", "N1")
run(f"{S}/master_rest_uit_master.py", MASTER, f"{UIT}/n1_lijst.tsv", f"{UIT}/rest.tsv")
run(f"{S}/maak_master.py", f"{UIT}/n1_lijst.tsv", f"{UIT}/rest.tsv", f"{UIT}/LEESBARE_LIJST_MASTER_voorspeld.tsv")
P = f"{UIT}/LEESBARE_LIJST_MASTER_voorspeld.tsv"
oud = open(MASTER, encoding="utf-8").read().split("\n"); nieuw = open(P, encoding="utf-8").read().split("\n")
co, cn = collections.Counter(oud), collections.Counter(nieuw)
weg, bij = co - cn, cn - co
def soort(l):
    c = l.split("\t")
    if len(c) > 4 and c[3] == "app:is_published": return f"app:is_published W{c[1]}"
    return f"W{c[1]}" if len(c) > 1 else "leeg"
sw, sb = collections.Counter(soort(l) for l in weg.elements()), collections.Counter(soort(l) for l in bij.elements())
buiten = {k: v for k, v in (sw + sb).items() if not (k in tuple(f"W{w}" for w in WEKEN) or k.startswith("app:is_published"))}
assert not buiten, f"verschillen buiten de weken van de root: {buiten}"
pub = lambda w: sum(1 for l in nieuw if l.split("\t")[3:4] == ["app:is_published"] and l.split("\t")[1] == str(w))
L = [f"# Voorspelde master na P4 · {WKN(HW)} · SQL-root `{SQLR}`", f"Gemaakt door `scripts/{os.path.basename(__file__)}` v2.8 uit de N1-export van stap 0 (`{md5(EXP)[:8]}…`) met " + "/".join(f"W{w:02d}" for w in WEKEN) + " = de NA van P3 (" + ", ".join(f"W{w:02d} `{md5(NAP[w])}`" for w in WEKEN) + "), zonder nieuwe rijen, en de rest uit de master `f04cb6f3…` (herbouwtest: de master uit de ongewijzigde export = `f04cb6f3…` ✓).", "",
     f"- **Voorspelde export:** {len(rows)} rijen (geen nieuwe); `n1_voorspeld.tsv` md5 `{md5(f'{UIT}/n1_voorspeld.tsv')}`.",
     f"- **Voorspelde master:** md5 `{md5(P)}`, {len(nieuw) - 1 if nieuw[-1] == '' else len(nieuw)} regels (met kop).",
     f"- **Regels `app:is_published`:** {sum(1 for l in nieuw if l.split(chr(9))[3:4] == ['app:is_published'])} (" + "; ".join(f"W{w:02d}: {pub(w)}" for w in WEKEN) + ").",
     f"- **Weg uit de huidige master:** {sum(sw.values())} regels ({', '.join(f'{k} {v}' for k, v in sorted(sw.items()))}).",
     f"- **Erbij:** {sum(sb.values())} regels ({', '.join(f'{k} {v}' for k, v in sorted(sb.items()))}).",
     f"- **Verschillen buiten " + ", ".join(f"W{w:02d}" for w in WEKEN) + " en `app:is_published`:** 0.", "",
     f"Na de rooktest: verse export W01–W25 → `herbouw_master_{WKN(HW)}.py --sql {SQLR}`. De nieuwe master moet byte-gelijk zijn aan deze voorspelling als de rest van N1 ongewijzigd is. Anders: geen master, het verschil naar Ibra."]
open(f"{UIT}/MASTER_VOORSPELLING_{WKN(HW)}.md", "w", encoding="utf-8").write("\n".join(L) + "\n")
open(f"{UIT}/VOORSPELDE_MD5.txt", "w", encoding="utf-8").write(md5(P) + "\n")
print("\n".join(L[3:9]))
