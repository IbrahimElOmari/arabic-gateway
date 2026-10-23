# rendertoets_N1-W03.py v1.0.1 —Reviseur-T/Controleur-T (3T/8T) · N1-W03 · B27 met P1-15 (a) en 9T V3 (P1-18).
# Rendert elke leerders- en docenttekst van een app-export in Chromium (Playwright, headless) zoals de app hem toont, en meet per teken
# de x-positie (Range.getBoundingClientRect). Twee manieren (P1-15 a):
#   PLAT = de tekst als platte tekst (zoals vóór PR #2, en zoals het leerlingdossier en exports hem tonen) = het vangnet;
#   APP  = zoals CurriculumItemPage.tsx @ main hem toont:
#          · Opdracht, Vraag, vertaling, feedback en 'Juist antwoord' via isolateArabic() (maak_html_bdi.mjs haalt de hulp letterlijk uit de TSX);
#          · opties en tegels als platte tekst in een <Label>/<span> binnen de LTR-pagina (r. 380–450);
#          · input_arabic als platte tekst in <p dir="rtl"> (r. 585);
#          · bij gatentekst, rangschikken en koppelen met '|' in correct_answer: elk segment in <span dir="auto"> (PR #1, r. 680–690).
# Treffers (zoals check_bidi_render_N1-W02.py): SAMEN = twee Arabische stukken die logisch na elkaar staan en alleen door leestekens, cijfers of
# spaties gescheiden zijn, staan zichtbaar in de verkeerde volgorde (in een LTR-context: het eerste rechts; in een RTL-context: het eerste links);
# CIJFER = een cijfer dat logisch na een Arabisch stuk komt, staat zichtbaar aan de verkeerde kant ervan.
# Elke treffer krijgt 'leerder' of 'docent' (B24: open-tekst toont de leerder geen feedback en geen sleutel; B26: opname/upload toont de
# Feedback ✓ wel, de Feedback ✗ niet) en, met --log, of het veld door het wijzigingslog wordt geschreven (P1-15 a: dan moet PLAT ook 0 zijn).
# Gebruik: python3 -I rendertoets_N1-W03.py <repo> <app.tsv> [<app.tsv> …] [--log wijzigingslog.tsv] [--breedte 900] [--wrap]
import sys, csv, json, re, html, os, subprocess, tempfile, collections
from playwright.sync_api import sync_playwright
csv.field_size_limit(10**9)
argv = sys.argv[1:]
def opt(naam, std=None):
    if naam in argv:
        i = argv.index(naam); v = argv[i + 1]; del argv[i:i + 2]; return v
    return std
logpad = opt("--log"); breedte = int(opt("--breedte", "900")); wrap = "--wrap" in argv
argv = [a for a in argv if a != "--wrap"]
repo, apps = argv[0], argv[1:]
AR = "".join(f"{chr(a)}-{chr(b)}" for a, b in [(0x600, 0x6FF), (0x750, 0x77F), (0xFB50, 0xFDFF), (0xFE70, 0xFEFF)])
TUSSEN = " " + chr(0xA0) + chr(0x60C) + chr(0x61B) + chr(0x61F)
STUK = re.compile(f"[{AR}]+(?:[{TUSSEN}]+[{AR}]+)*")
LATIJN = re.compile(r"[A-Za-zÀ-ÿĀ-ž]")
LTR6 = ["instruction_nl", "question", "feedback_correct", "feedback_incorrect", "input_translation_nl", "correct_answer"]
GESLOTEN = ("meerkeuze", "meerdere-antwoorden", "rangschikken", "koppelen", "gatentekst")
gewijzigd = set()
if logpad:
    for r in csv.DictReader(open(logpad, encoding="utf-8", newline=""), delimiter="\t"): gewijzigd.add((r["item_id"], r["veld"]))
def wie(r, veld):
    t = r["exercise_type"]
    if veld in ("instruction_nl", "question", "options", "input_arabic", "input_translation_nl"): return "leerder"
    if t in GESLOTEN: return "leerder"
    if t in ("audio-opname", "bestand-upload"): return "leerder" if veld == "feedback_correct" else "docent"
    return "docent"   # open-tekst: feedback en sleutel ziet alleen de docent (B24)
# metingen: (sleutel, tekst, context) — context: 'ltr-plat', 'ltr-app' (isolateArabic), 'rtl-plat', 'auto-seg'
metingen = []; meta = {}
for pad in apps:
    for r in csv.DictReader(open(pad, encoding="utf-8", newline=""), delimiter="\t"):
        if r.get("is_published") == "false": continue
        iid = r["item_id"]
        seg_type = r["exercise_type"] in ("gatentekst", "rangschikken", "koppelen") and "|" in r["correct_answer"]
        for v in LTR6:
            if not r[v]: continue
            meta[(iid, v)] = (wie(r, v), (iid, v) in gewijzigd)
            metingen.append(((iid, v, "PLAT"), r[v], "ltr-plat"))
            if v == "correct_answer" and seg_type:
                for k, s in enumerate(r[v].split("|"), 1): metingen.append(((iid, v, f"APP#{k}"), s, "auto-seg"))
            else:
                metingen.append(((iid, v, "APP"), r[v], "ltr-app"))
        try: opties = json.loads(r["options"] or "[]")
        except Exception: opties = []
        if opties:
            meta[(iid, "options")] = (wie(r, "options"), (iid, "options") in gewijzigd)
            for k, o in enumerate(opties, 1):
                metingen.append(((iid, "options", f"PLAT#{k}"), o, "ltr-plat")); metingen.append(((iid, "options", f"APP#{k}"), o, "ltr-plat"))
        if r["input_arabic"]:
            meta[(iid, "input_arabic")] = (wie(r, "input_arabic"), (iid, "input_arabic") in gewijzigd)
            metingen.append(((iid, "input_arabic", "PLAT"), r["input_arabic"], "rtl-plat")); metingen.append(((iid, "input_arabic", "APP"), r["input_arabic"], "rtl-plat"))
# HTML van isolateArabic (letterlijk uit de TSX van de checkout)
app_teksten = [[f"{k[0]}\t{k[1]}\t{k[2]}", t] for k, t, c in metingen if c == "ltr-app"]
with tempfile.TemporaryDirectory() as d:
    i_p, u_p = os.path.join(d, "in.json"), os.path.join(d, "uit.json")
    json.dump(app_teksten, open(i_p, "w", encoding="utf-8"), ensure_ascii=False)
    hier = os.path.dirname(os.path.abspath(__file__))   # v1.0.1: maak_html_bdi.mjs naast dit script (repo) of in ../deel3 (werkmap)
    mjs = next(p for p in (os.path.join(hier, "maak_html_bdi.mjs"), os.path.join(hier, "..", "deel3", "maak_html_bdi.mjs")) if os.path.exists(p))
    p_ = subprocess.run(["node", mjs, repo, i_p, u_p], capture_output=True, text=True)
    if p_.returncode != 0: print(p_.stdout, p_.stderr); sys.exit(2)
    print(p_.stdout.strip())
    app_html = {k: h for k, _, h in json.load(open(u_p, encoding="utf-8"))}
JS = """([h, dir]) => { const p = document.getElementById('t'); p.setAttribute('dir', dir); p.innerHTML = h;
  const w = document.createTreeWalker(p, NodeFilter.SHOW_TEXT); const nodes = []; let n;
  while ((n = w.nextNode())) nodes.push(n);
  const xs = [];
  for (const nd of nodes) for (let i = 0; i < nd.data.length; i++) {
    const r = document.createRange(); r.setStart(nd, i); r.setEnd(nd, i + 1); const b = r.getBoundingClientRect();
    xs.push([b.left, b.right, b.top]); }
  return [nodes.map(x => x.data).join(''), xs]; }"""
def analyse(t, xs, rtl):
    st = [(m.start(), m.end()) for m in STUK.finditer(t)]
    def regels(a, b): return {round(xs[i][2]) for i in range(a, b) if xs[i][1] > xs[i][0]}
    def midden(a, b, op):
        v = [(xs[i][0] + xs[i][1]) / 2 for i in range(a, b) if xs[i][1] > xs[i][0] and round(xs[i][2]) == op]
        return sum(v) / len(v) if v else None
    def vergelijk(a1, b1, a2, b2):   # per regel: alleen de tekens op een regel die beide stukken delen
        g = regels(a1, b1) & regels(a2, b2)
        if not g: return None
        op = min(g); m1, m2 = midden(a1, b1, op), midden(a2, b2, op)
        return None if m1 is None or m2 is None else (m1, m2)
    fout = (lambda x1, x2: x1 < x2) if rtl else (lambda x1, x2: x1 > x2)
    tr = []
    for (a1, b1), (a2, b2) in zip(st, st[1:]):
        if LATIJN.search(t[b1:a2]): continue
        r = vergelijk(a1, b1, a2, b2)
        if r and fout(*r): tr.append(("SAMEN", t[a1:b1], t[b1:a2], t[a2:b2]))
    for m in re.finditer(r"\(?\d+\)?", t):
        vorige = [s for s in st if s[1] <= m.start()]
        if not vorige: continue
        a1, b1 = vorige[-1]
        if LATIJN.search(t[b1:m.start()]): continue
        r = vergelijk(a1, b1, m.start(), m.end())
        if r and fout(*r): tr.append(("CIJFER", t[a1:b1], t[b1:m.start()], m.group()))
    return tr
treffers = []; integriteit = []; n_gemeten = 0
with sync_playwright() as pw:
    br = pw.chromium.launch(); pg = br.new_page()
    pg.set_content(f"<!doctype html><html dir='ltr' lang='nl'><body style='margin:0'><p id='t' style='width:{breedte}px;"
                   f"white-space:{'normal' if wrap else 'nowrap'};font:16px sans-serif'></p></body></html>")
    for (iid, v, wijze), t, ctx in metingen:
        if len(t.encode("utf-16-le")) // 2 != len(t): continue
        if ctx == "ltr-app": h, d = app_html[f"{iid}\t{v}\t{wijze}"], "ltr"
        elif ctx == "auto-seg": h, d = f'<span dir="auto">{html.escape(t)}</span>', "ltr"
        elif ctx == "rtl-plat": h, d = html.escape(t), "rtl"
        else: h, d = html.escape(t), "ltr"
        txt, xs = pg.evaluate(JS, [h, d]); n_gemeten += 1
        if txt != t: integriteit.append((iid, v, wijze))
        for soort, a, tus, b in analyse(t, xs, d == "rtl"):
            wiew, gew = meta[(iid, v)]
            treffers.append((iid, v, wijze.split("#")[0], soort, wiew, "gewijzigd" if gew else "ongewijzigd", f"«{a}» {tus!r} «{b}»"))
    br.close()
print(f"breedte {breedte}px ({'regelafbreking, per regel' if wrap else 'één regel'}) · metingen {n_gemeten} · bestanden {len(apps)} · integriteit (DOM ≠ bron): {len(integriteit)}")
c = collections.Counter((w, s, g) for _, _, w, _, s, g, _ in treffers)
for wijze in ("APP", "PLAT"):
    print(f"{wijze}: " + " · ".join(f"{s}/{g} {c[(wijze, s, g)]}" for s in ("leerder", "docent") for g in ("gewijzigd", "ongewijzigd")))
poort_app = [t for t in treffers if t[2] == "APP" and t[4] == "leerder"]
poort_plat = [t for t in treffers if t[2] == "PLAT" and t[5] == "gewijzigd"]
print(f"POORT (P1-15 a): APP-treffers in leerdersvelden {len(poort_app)} · PLAT-treffers in velden die het log wijzigt {len(poort_plat)}")
print("--- treffers (item · veld · wijze · soort · leerder/docent · gewijzigd/ongewijzigd · stukken)")
for t in treffers: print("\t".join(t))
sys.exit(2 if (poort_app or poort_plat) and logpad else 0)
