# voorspel_master_N1-W03.py v1 — Maker-T (7T) · P4 N1-W03 · 9T P4 V7: de master zoals hij na P4 moet zijn, vooraf uit
# de N1-export van 2026-10-20 met de rijen van W01–W03 vervangen door APP_NA (= de stand na P4) → app_naar_master v1.1 → master_rest_uit_master
# (rest uit de huidige master d993217d) → maak_master. In deel 3 moet de master uit de verse export byte-gelijk zijn aan deze voorspelling
# (als W04–W25 in de verse export gelijk zijn aan 10-20); anders geen master en het verschil naar Ibra.
# Daarnaast de diff huidige master → voorspelling op regelniveau: alleen W01–W03 (logparen) en 164 + 1 regels app:is_published.
# Gebruik: python3 -I voorspel_master_N1-W03.py <werkmap> <uitmap>
import sys, os, csv, subprocess, hashlib, collections
csv.field_size_limit(10**9)
WM, UIT = sys.argv[1], sys.argv[2]; os.makedirs(UIT, exist_ok=True)
S = os.path.join(WM, "scripts")
md5 = lambda p: hashlib.md5(open(p, "rb").read()).hexdigest()
EXP = f"{WM}/bron/APP_EXPORT_N1_2026-10-20_W03stap0b.tsv"; MASTER = f"{WM}/bron/LEESBARE_LIJST_MASTER.tsv"
assert md5(EXP) == "36ce4507cca4fdf52e3e3f3de3735a21" and md5(MASTER) == "d993217dc205a994222bb195e8107536", "bron wijkt af"
E = list(csv.DictReader(open(EXP, encoding="utf-8", newline=""), delimiter="\t")); kop = list(E[0].keys())
NA = {}
for w in (1, 2, 3):
    R = list(csv.DictReader(open(f"{WM}/p3/APP_NA_N1-W0{w}.tsv", encoding="utf-8", newline=""), delimiter="\t")); assert list(R[0].keys()) == kop
    NA.update({r["item_id"]: r for r in R})
assert sum(r["item_id"] in NA for r in E) == len(NA) == 202
with open(f"{UIT}/n1_voorspeld.tsv", "w", encoding="utf-8", newline="") as f:
    w = csv.writer(f, delimiter="\t", lineterminator="\n", quoting=csv.QUOTE_MINIMAL); w.writerow(kop)
    for r in E: w.writerow([NA.get(r["item_id"], r)[k] for k in kop])
run = lambda *a: subprocess.run(["python3", "-I", *a], capture_output=True, text=True, check=True).stdout
run(f"{S}/app_naar_master.py", f"{UIT}/n1_voorspeld.tsv", f"{UIT}/n1_lijst.tsv", "N1")
run(f"{S}/master_rest_uit_master.py", MASTER, f"{UIT}/n1_lijst.tsv", f"{UIT}/rest.tsv")
run(f"{S}/maak_master.py", f"{UIT}/n1_lijst.tsv", f"{UIT}/rest.tsv", f"{UIT}/LEESBARE_LIJST_MASTER_voorspeld.tsv")
P = f"{UIT}/LEESBARE_LIJST_MASTER_voorspeld.tsv"
oud = open(MASTER, encoding="utf-8").read().split("\n"); nieuw = open(P, encoding="utf-8").read().split("\n")
co, cn = collections.Counter(oud), collections.Counter(nieuw)
weg, bij = co - cn, cn - co
wk = lambda l: (l.split("\t") + ["", "", ""])[1] if l else ""
def soort(l):
    c = l.split("\t")
    if len(c) > 4 and c[3] == "app:is_published": return f"app:is_published W{c[1]}"
    return f"W{c[1]}" if len(c) > 1 else "leeg"
sw, sb = collections.Counter(soort(l) for l in weg.elements()), collections.Counter(soort(l) for l in bij.elements())
buiten = {k: v for k, v in (sw + sb).items() if not (k in ("W1", "W2", "W3") or k.startswith("app:is_published"))}
L = [f"# Voorspelde master na P4 · N1-W03", f"Gemaakt door `scripts/w03/voorspel_master_N1-W03.py` v1 (9T P4 V7) uit de N1-export van 2026-10-20 (`36ce4507…`) met W01–W03 = `p3/APP_NA_N1-W0x.tsv`, en de rest uit de master `d993217d…`.", "",
     f"- **Voorspelde master:** md5 `{md5(P)}`, {len(nieuw) - 1 if nieuw[-1] == '' else len(nieuw)} regels (met kop).",
     f"- **Regels `app:is_published`:** {sum(1 for l in nieuw if l.split(chr(9))[3:4] == ['app:is_published'])} (W25: {sb.get('app:is_published W25', 0)}, W03: {sb.get('app:is_published W3', 0)}).",
     f"- **Weg uit de huidige master:** {sum(sw.values())} regels ({', '.join(f'{k} {v}' for k, v in sorted(sw.items()))}).",
     f"- **Erbij:** {sum(sb.values())} regels ({', '.join(f'{k} {v}' for k, v in sorted(sb.items()))}).",
     f"- **Verschillen buiten W01–W03 en `app:is_published`:** {sum(buiten.values())} ({buiten or 'geen'}).", "",
     "In deel 3 (na de rooktest): verse export W01–W25 → dezelfde keten. De nieuwe master moet byte-gelijk zijn aan deze voorspelling als W04–W25 in de verse export gelijk zijn aan 10-20. Anders: geen master, het verschil naar Ibra."]
open(f"{UIT}/MASTER_VOORSPELLING_N1-W03.md", "w", encoding="utf-8").write("\n".join(L) + "\n")
print("\n".join(L[2:7]))
