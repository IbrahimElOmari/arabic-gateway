# check_bidi_render_N1-W02.py v1 — Reviseur-T/Controleur-T · P3 N1-W02 · rendertoets voor de bidi-weergave (tegenrapport 9D, C4).
# De app toont Opdracht, Vraag, feedback, vertaling en "juist antwoord" in een <p> zonder dir in een pagina met dir="ltr"
# (index.html; CurriculumItemPage.tsx). Dit script rendert elk leerdersveld zo in Chromium (Playwright, headless), meet per teken
# de x-positie en vergelijkt de zichtbare volgorde met de logische volgorde:
#   SAMEN  twee Arabische stukken die logisch na elkaar staan en alleen door leestekens/cijfers/spaties gescheiden zijn, staan
#          zichtbaar in omgekeerde volgorde (één RTL-reeks: "X; Y" wordt "Y ;X");
#   CIJFER een cijfer (met haakjes) dat logisch ná een Arabisch stuk staat, staat zichtbaar links ervan (het nummer springt in).
# Of een treffer de leerder misleidt, beslist een mens (bv. "بَتَ / بَاتَ" zonder Latijnse tegenhanger mag volgens §13.3-15).
# v1.1: --wrap = gewone regelafbreking op de opgegeven breedte (gsm: 330 px); dan worden alleen stukken op dezelfde regel vergeleken.
# Gebruik: python3 -I check_bidi_render_N1-W02.py <app.tsv> [<app.tsv> …] [--breedte 900] [--wrap] [--teksten <tsv met id\ttekst>]
import sys, csv, json, re, asyncio
csv.field_size_limit(10**9)
from playwright.sync_api import sync_playwright
args = [a for a in sys.argv[1:] if not a.startswith("--")]
wrap = "--wrap" in sys.argv
breedte = int(sys.argv[sys.argv.index("--breedte") + 1]) if "--breedte" in sys.argv else 900
if "--breedte" in sys.argv: args.remove(str(breedte))
teksten = []  # (sleutel, tekst)
if "--teksten" in sys.argv:
    p = sys.argv[sys.argv.index("--teksten") + 1]; args.remove(p)
    for l in open(p, encoding="utf-8"):
        if "\t" in l: k, t = l.rstrip("\n").split("\t", 1); teksten.append((k, t.replace("\\n", "\n")))
VELDEN = ["instruction_nl", "question", "feedback_correct", "feedback_incorrect", "input_translation_nl", "correct_answer"]
for pad in args:
    for r in csv.DictReader(open(pad, encoding="utf-8", newline=""), delimiter="\t"):
        for v in VELDEN:
            if r[v]: teksten.append((f"{r['item_id']}\t{v}", r[v]))
AR = re.compile(r"[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]")
def arabisch_stukken(t):
    # maximale stukken van Arabische tekens, tashkīl, spaties en Arabische leestekens (، ؛ ؟) met minstens één Arabische letter
    out = []; i = 0
    for m in re.finditer(r"[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]+(?:[  ،؛؟]+[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]+)*", t):
        out.append((m.start(), m.end()))
    return out
JS = """(t) => { const p = document.getElementById('t'); p.textContent = t; const n = p.firstChild; const xs = [];
  for (let i = 0; i < t.length; i++) { const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + 1); const b = r.getBoundingClientRect(); xs.push([b.left, b.right, b.top]); }
  return xs; }"""
treffers = []
with sync_playwright() as pw:
    br = pw.chromium.launch(); pg = br.new_page()
    pg.set_content(f"<!doctype html><html dir='ltr' lang='nl'><body style='margin:0'><p id='t' style='width:{breedte}px;white-space:{'normal' if wrap else 'nowrap'};font:16px sans-serif'></p></body></html>")
    for sleutel, t in teksten:
        xs = pg.evaluate(JS, t)
        st = arabisch_stukken(t)
        def midden(a, b):
            v = [((xs[i][0] + xs[i][1]) / 2) for i in range(a, b) if xs[i][1] > xs[i][0]]
            return sum(v) / len(v) if v else None
        def regel(a, b):
            v = [xs[i][2] for i in range(a, b) if xs[i][1] > xs[i][0]]
            return round(min(v)) if v else None
        for (a1, b1), (a2, b2) in zip(st, st[1:]):
            tussen = t[b1:a2]
            if re.search(r"[A-Za-zÀ-ÿĀ-ž]", tussen): continue          # Latijnse tekst ertussen: aparte reeksen
            m1, m2 = midden(a1, b1), midden(a2, b2)
            if m1 is not None and m2 is not None and m1 > m2 and regel(a1, b1) == regel(a2, b2):
                treffers.append((sleutel, "SAMEN", f"«{t[a1:b1]}» {tussen!r} «{t[a2:b2]}»", t))
        for m in re.finditer(r"\(?\d+\)?", t):
            vorige = [s for s in st if s[1] <= m.start()]
            if not vorige: continue
            a1, b1 = vorige[-1]
            if re.search(r"[A-Za-zÀ-ÿĀ-ž]", t[b1:m.start()]): continue
            mc, ma = midden(m.start(), m.end()), midden(a1, b1)
            if mc is not None and ma is not None and mc < ma and regel(m.start(), m.end()) == regel(a1, b1):
                treffers.append((sleutel, "CIJFER", f"«{t[a1:b1]}» {t[b1:m.start()]!r} {m.group()!r}", t))
    br.close()
print(f"teksten {len(teksten)} · breedte {breedte}px ({'met regelafbreking' if wrap else 'één regel'}) · treffers {len(treffers)} (SAMEN {sum(1 for x in treffers if x[1]=='SAMEN')} · CIJFER {sum(1 for x in treffers if x[1]=='CIJFER')})")
for s, soort, wat, t in treffers: print(f"{s}\t{soort}\t{wat}")
