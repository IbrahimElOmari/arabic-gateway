# review_bulk.py v1.3 — Verbeteraar-T (4T) · N1-W02 · techplan T16 (P1-beslissing 12 en 16): zet de antwoorden van de native reviewer
# om naar een antwoord per wijziging_id in review_native_{week}.tsv, omdat apply_log per regel leest.
# Antwoordbestand: één besluit per regel (of meerdere op één regel, gescheiden door ' · ' of ';'), hoofdletters maken niet uit:
#   deel 1 ja                    → alle regels van deel "1 mechanisch"
#   2a ja                        → alle regels van deel "2a hergebruik"
#   2a <groep> ja                → de 2a-regels van die groep (bv. "2a luisteren-03 ja")
#   W0031 ja                     → één regel
#   W0064 nee <toelichting>      → één regel afgewezen (toelichting komt in opmerking)
#   W0064 aangepast <tekst>      → één regel met de volledige nieuwe veldtekst van Ibra (komt in opmerking als "Ibra-tekst: …")
# v1.1 (tegenrapport T P2, voorwaarde V1):
#   - een los besluit wint altijd van een bulkbesluit, in elke volgorde;
#   - twee losse besluiten voor hetzelfde id, of "ja" met tekst erachter ("ja maar …") = STOP;
#   - elke 2b-regel moet een los besluit hebben (vangt typfouten in id's) = anders STOP;
#   - een los besluit op een regel buiten 2b geeft een waarschuwing (bedoeld?);
#   - per los besluit toont het script item, veld en voorstel terug, zodat het antwoord te controleren is.
# v1.2 (P2, voorwaarde V4 van 9T): met --log <wijzigingslog.tsv> mag het antwoord ook id's bevatten die wel in het log maar niet in de
#   review staan (regels zonder Arabische wijziging); die besluiten gaan ongewijzigd naar <uit>_logbesluiten.tsv voor verwerk_p2
#   (één parser, dezelfde STOP-regels). Zonder --log blijft zo'n id een STOP.
# v1.3 (N1-W03, tegenrapport T P2, V3): poortbesluiten met een nummer van 1 tot 99 ("10a", "12 ja") worden herkend en overgeslagen,
#   ook direct na een 'aangepast'-tekst (die eindigt dus vóór " · 12a"); "2a" blijft een reviewbesluit (geen poortbeslissing 2a gebruiken).
# Afgeleide regels krijgen "ja" als alle regels waarvan ze afgeleid zijn "ja" hebben, "nee" als één ervan nee of aangepast is.
# Gebruik: python3 -I review_bulk.py <review_native.tsv> <antwoorden.txt> <uit.tsv> [--log <wijzigingslog.tsv>]
import sys, csv, re, collections
logpad = sys.argv[sys.argv.index("--log") + 1] if "--log" in sys.argv else None
sys.argv = [a for i, a in enumerate(sys.argv) if a != "--log" and (i == 0 or sys.argv[i - 1] != "--log")]
logids = {l.split("\t", 1)[0] for l in list(open(logpad, encoding="utf-8"))[1:]} if logpad else set()
logbes = collections.OrderedDict()
rv = [l.rstrip("\n").split("\t") for l in open(sys.argv[1], encoding="utf-8")]
kop, rows = rv[0], rv[1:]
K = {c: i for i, c in enumerate(kop)}
by = {r[K["wijziging_id"]]: r for r in rows}
assert len(by) == len(rows), "dubbele wijziging_id in de review"
bulk, los = [], collections.OrderedDict()
def stop(m): sys.exit("STOP: " + m)
for regel in open(sys.argv[2], encoding="utf-8"):
    # splitsen alleen vóór het begin van een nieuw besluit, zodat een 'aangepast'-tekst met ' · ' (bv. een transliteratie) heel blijft
    for t in re.split(r"\s*[·;]\s*(?=(?i:W\d{4}\b|deel\s*1\b|(?:deel\s*)?2a\b|p[0-4]\s+akkoord|[1-9]\d?\s*[a-z]?(?:\s+(?:ja|nee|akkoord))?\s*(?:[·;]|$)|#))", regel.strip()):
        if not t or t.startswith("#"): continue
        if re.fullmatch(r"(?i)p[0-4]\s+akkoord|(?!2a\b)[1-9]\d?\s*[a-z]?(?:\s+(?:ja|nee|akkoord))?", t): continue   # poortbesluit ("P2 akkoord", "3 ja", "4a"); "2a …" is wél review
        m1 = re.fullmatch(r"(?i)deel\s*1\s+ja", t)
        m2 = re.fullmatch(r"(?i)(?:deel\s*)?2a(?:\s+(\S+))?\s+ja", t)
        m3 = re.fullmatch(r"(?i)(W\d{4})\s+(ja|nee|aangepast)\b\s*(.*)", t)
        if m1: bulk.append((t, [r for r in rows if r[K["deel"]] == "1 mechanisch"]))
        elif m2:
            doel = [r for r in rows if r[K["deel"]] == "2a hergebruik" and (m2.group(1) is None or r[K["groep"]] == m2.group(1))]
            if not doel: stop(f"besluit raakt geen enkele regel (onbekende groep?): {t!r}")
            bulk.append((t, doel))
        elif m3:
            wid, ant, tekst = m3.group(1).upper(), m3.group(2).lower(), m3.group(3).strip()
            if ant == "ja" and tekst.strip(" .,!") == "": tekst = ""
            if ant == "ja" and tekst: stop(f"'ja' met tekst erachter is dubbelzinnig: {t!r} — schrijf 'ja', of 'aangepast <volledige tekst>', of 'nee <reden>'")
            if ant == "aangepast" and not tekst: stop(f"'aangepast' zonder tekst: {t!r}")
            if wid not in by:
                if wid not in logids: stop(f"onbekend wijziging_id {wid} in {t!r}" + ("" if logpad else " (staat het in het log? geef dan --log mee)"))
                if wid in logbes: stop(f"twee besluiten voor {wid}: {logbes[wid][2]!r} en {t!r}")
                logbes[wid] = (ant, tekst, t); continue
            if by[wid][K["deel"]] == "afgeleid": stop(f"{wid} is afgeleid; beantwoord de regel waarvan hij afgeleid is")
            if wid in los: stop(f"twee besluiten voor {wid}: {los[wid][2]!r} en {t!r}")
            los[wid] = (ant, tekst, t)
        else: stop(f"besluit niet herkend: {t!r}")
for _, doel in bulk:
    for r in doel: r[K["akkoord"]] = "ja"
if logbes:
    lb = sys.argv[3].rsplit(".tsv", 1)[0] + "_logbesluiten.tsv"
    with open(lb, "w", encoding="utf-8") as f:
        f.write("wijziging_id\takkoord\ttekst\n")
        for wid, (ant, tekst, t) in logbes.items(): f.write(f"{wid}\t{ant}\t{tekst}\n")
    print(f"besluiten over logregels buiten de review: {len(logbes)} → {lb}")
for wid, (ant, tekst, t) in los.items():
    r = by[wid]; r[K["akkoord"]] = ant
    if tekst: r[K["opmerking"]] = (r[K["opmerking"]] + " · " if r[K["opmerking"]] else "") + ("Ibra-tekst: " if ant == "aangepast" else "Ibra: ") + tekst
    waarsch = "" if r[K["deel"]] == "2b nieuw" else f"   ⚠ geen 2b-regel ({r[K['deel']]}) — bedoeld?"
    print(f"  {wid} {ant:9s} {r[K['item_id']]} · {r[K['veld']]} · voorstel: {r[K['voorgesteld']][:60]}{waarsch}")
zonder = [r[K["wijziging_id"]] for r in rows if r[K["deel"]] == "2b nieuw" and r[K["wijziging_id"]] not in los]
if zonder: stop(f"{len(zonder)} regels van 2b zonder eigen besluit: {zonder} (typfout in een id?)")
for _ in range(5):   # afgeleide regels oplossen (ook ketens: kopie → vlag)
    for r in rows:
        if r[K["deel"]] != "afgeleid": continue
        deps = re.findall(r"W\d{4}", r[K["opmerking"]].split("Ibra")[0])
        assert deps, r[K["wijziging_id"]]
        st = [by[d][K["akkoord"]] for d in deps]
        r[K["akkoord"]] = "ja" if all(s == "ja" for s in st) else ("" if any(s == "" for s in st) else "nee")
with open(sys.argv[3], "w", encoding="utf-8") as f:
    f.write("\t".join(kop) + "\n")
    for r in rows: f.write("\t".join(r) + "\n")
for t, doel in bulk: print(f"bulk {t!r}: {len(doel)} regels")
c = collections.Counter((r[K["deel"]], r[K["akkoord"]] or "(leeg)") for r in rows)
print("stand per deel:", dict(sorted(c.items())))
open_ = [r[K["wijziging_id"]] for r in rows if not r[K["akkoord"]]]
print("nog zonder antwoord:", len(open_), open_[:20])
