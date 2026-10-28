# voorspel_master_N1-W06.py v2.2 — Maker-T (7T) · P3/P4 N1-W06 · = voorspel_master_N1-W05.py v2.1 voor W06 + nazorg W05/W04, met NIEUWE RIJEN
# (architectuur T v1.1 §7, 8T P3 C-T10): de master zoals hij na P4 van N1-W06 moet zijn, vooraf uit de N1-export van 2026-10-27 na P4 W05
# (0083dcac…, 2.299 rijen) met W06, W05 en W04 = de NA van P3 (W06: variant B = APP_NA_N1-W06_terugval.tsv, of A) en de 24 nieuwe rijen erbij
# (id, created_at en updated_at van een nieuwe rij zijn pas na P4 bekend: in de voorspelde export leeg; app_naar_master gebruikt ze niet)
# → app_naar_master v1.1 → master_rest_uit_master (rest uit de huidige master c32981b9…) → maak_master. Schrijft ook VOORSPELDE_MD5.txt.
# Na P4 (herbouw_master_N1-W06.py) moet de master uit de verse export byte-gelijk zijn aan deze voorspelling.
# Gebruik: python3 -I voorspel_master_N1-W06.py <werkmap> <uitmap> --variant A|B
import sys, os, csv, subprocess, hashlib, collections
csv.field_size_limit(10**9)
WM, UIT = sys.argv[1], sys.argv[2]; VAR = sys.argv[sys.argv.index("--variant") + 1]; assert VAR in ("A", "B"); os.makedirs(UIT, exist_ok=True)
S = os.path.join(WM, "scripts")
md5 = lambda p: hashlib.md5(open(p, "rb").read()).hexdigest()
EXP = f"{WM}/bron/APP_EXPORT_N1_2026-10-27_naP4.tsv"; MASTER = f"{WM}/bron/LEESBARE_LIJST_MASTER_c32981b9.tsv"
assert md5(EXP) == "0083dcacf54795737249ca7df5aea08e" and md5(MASTER) == "c32981b9ebfb08f201d53e9609da0112", "bron wijkt af"
E = list(csv.DictReader(open(EXP, encoding="utf-8", newline=""), delimiter="\t")); kop = list(E[0].keys())
NAP = {6: f"{WM}/p3/APP_NA_N1-W06{'_terugval' if VAR == 'B' else ''}.tsv", 5: f"{WM}/p3/APP_NA_N1-W05.tsv", 4: f"{WM}/p3/APP_NA_N1-W04.tsv"}
NA = {}
for w, p in NAP.items():
    R = list(csv.DictReader(open(p, encoding="utf-8", newline=""), delimiter="\t")); assert list(R[0].keys()) == kop and all(r["week"] == str(w) for r in R)
    NA.update({r["item_id"]: r for r in R})
bestaand = {r["item_id"] for r in E}
NIEUW = [i for i in NA if i not in bestaand]
assert len(NIEUW) == 24 and all(NA[i]["id"] == NA[i]["created_at"] == NA[i]["updated_at"] == "" for i in NIEUW)
assert sum(r["item_id"] in NA for r in E) == len(NA) - len(NIEUW) == 27 + 82 + 109
rows = [NA.get(r["item_id"], r) for r in E] + [NA[i] for i in NIEUW]
rows.sort(key=lambda r: (int(r["week"]), int(r["display_order"] or 0), r["item_id"]))   # = app_export_week.py
with open(f"{UIT}/n1_voorspeld.tsv", "w", encoding="utf-8", newline="") as f:
    w = csv.writer(f, delimiter="\t", lineterminator="\n", quoting=csv.QUOTE_MINIMAL); w.writerow(kop)
    for r in rows: w.writerow([r[k] for k in kop])
run = lambda *a: subprocess.run(["python3", "-I", *a], capture_output=True, text=True, check=True).stdout
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
buiten = {k: v for k, v in (sw + sb).items() if not (k in ("W4", "W5", "W6") or k.startswith("app:is_published"))}
L = [f"# Voorspelde master na P4 · N1-W06 · variant {VAR}", f"Gemaakt door `scripts/voorspel_master_N1-W06.py` v2.2 uit de N1-export van 2026-10-27 na P4 W05 (`0083dcac…`) met W06/W05/W04 = de NA van P3 (`{os.path.basename(NAP[6])}` `{md5(NAP[6])}`, W05 `{md5(NAP[5])}`, W04 `{md5(NAP[4])}`), plus {len(NIEUW)} nieuwe rijen, en de rest uit de master `c32981b9…`.", "",
     f"- **Voorspelde export:** {len(rows)} rijen (2.299 + {len(NIEUW)}); `n1_voorspeld.tsv` md5 `{md5(f'{UIT}/n1_voorspeld.tsv')}` (id/created_at/updated_at van de nieuwe rijen leeg).",
     f"- **Voorspelde master:** md5 `{md5(P)}`, {len(nieuw) - 1 if nieuw[-1] == '' else len(nieuw)} regels (met kop).",
     f"- **Regels `app:is_published`:** {sum(1 for l in nieuw if l.split(chr(9))[3:4] == ['app:is_published'])} (W06: {sum(1 for l in nieuw if l.split(chr(9))[3:4] == ['app:is_published'] and l.split(chr(9))[1] == '6')}).",
     f"- **Weg uit de huidige master:** {sum(sw.values())} regels ({', '.join(f'{k} {v}' for k, v in sorted(sw.items()))}).",
     f"- **Erbij:** {sum(sb.values())} regels ({', '.join(f'{k} {v}' for k, v in sorted(sb.items()))}).",
     f"- **Verschillen buiten W04–W06 en `app:is_published`:** {sum(buiten.values())} ({buiten or 'geen'}).", "",
     "Na de rooktest: verse export W01–W25 → `herbouw_master_N1-W06.py`. De nieuwe master moet byte-gelijk zijn aan deze voorspelling als de rest van N1 ongewijzigd is. Anders: geen master, het verschil naar Ibra."]
open(f"{UIT}/MASTER_VOORSPELLING_N1-W06.md", "w", encoding="utf-8").write("\n".join(L) + "\n")
open(f"{UIT}/VOORSPELDE_MD5.txt", "w", encoding="utf-8").write(md5(P) + "\n")
print("\n".join(L[3:9]))
