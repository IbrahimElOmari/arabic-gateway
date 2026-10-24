# log_naar_md_N1-W04.py v1 — Regisseur-D · zet p4/uitvoering/P4_log_N1-W04.tsv letterlijk om naar één chronologische markdowntabel
# (alle regels, alle 13 kolommen: ook de voorcontroles, de ruwe uitvoer, het oordeel van p4_stap en de ketenhash) en vervangt het stuk
# tussen <!-- LOG:BEGIN --> en <!-- LOG:END --> in het P4-verslag. Leest alleen het log; geen lesinhoud in dit script.
# Gebruik: python3 -I log_naar_md_N1-W04.py <P4_log.tsv> <P4_uitvoering.md>
import csv, sys, hashlib, collections
csv.field_size_limit(10**9)
LOG, MD = sys.argv[1], sys.argv[2]
rows = list(csv.DictReader(open(LOG, encoding="utf-8", newline=""), delimiter="\t", quoting=csv.QUOTE_NONE))
esc = lambda s: s.replace("|", "\\|")
code = lambda s: f"`{esc(s)}`" if s else "—"
uit = ["| # | tijd | wie | blok | stap | bestand (bytes · md5) | ruwe uitvoer (letterlijk) | uitkomst | exit | oordeel (letterlijk) | ketenhash |",
       "|---|---|---|---|---|---|---|---|---|---|---|"]
for n, r in enumerate(rows, 1):
    best = f"`{r['bestand']}` ({r['bytes']} · `{r['md5_bestand']}`)" if r["bestand"] not in ("-", "") else "—"
    uit.append(f"| {n} | {r['tijd']} | {r['wie']} | {r['blok']} | {r['stap']} | {best} | {code(r['ruwe_uitvoer'])} | {code(r['uitkomst'])} | {r['exit']} | {esc(r['p4_stap'])} | `{r['keten']}` |")
tel = collections.Counter("voorcontrole" if "voorcontrole" in r["stap"] else "aanroep" for r in rows)
stop = sum(1 for r in rows if r["exit"] != "0")
md5 = hashlib.md5(open(LOG, "rb").read()).hexdigest()
staart = (f"\n\nLog: `p4/uitvoering/P4_log_N1-W04.tsv` · {len(rows)} regels (zonder kop) · {tel['aanroep']} aanroepen naar `query_database` "
          f"en {tel['voorcontrole']} voorcontroles · STOP-regels {stop} · md5 `{md5}` · laatste ketenhash `{rows[-1]['keten']}` · "
          f"manifest `{rows[-1]['manifest']}`.\n")
md = open(MD, encoding="utf-8").read()
a, b = md.index("<!-- LOG:BEGIN -->"), md.index("<!-- LOG:END -->")
open(MD, "w", encoding="utf-8").write(md[:a] + "<!-- LOG:BEGIN -->\n" + "\n".join(uit) + staart + md[b:])
print(f"{len(rows)} logregels ({tel['aanroep']} aanroepen, {tel['voorcontrole']} voorcontroles, STOP {stop}) → {MD} · log md5 {md5}")
